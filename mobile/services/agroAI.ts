/**
 * KisanSaathi AI — Agro AI API Service
 * Handles all Agro AI API calls to the backend.
 * Reuses existing auth token pattern (userToken in AsyncStorage).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/api';

const BASE_URL = BACKEND_URL;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiCall(endpoint: string, method = 'GET', body?: object): Promise<any> {
  const headers = await getAuthHeaders();
  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}/api/v1/agro${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || `HTTP ${res.status}`);
  }
  return data;
}

export interface FarmProfile {
  _id?: string;
  farmName?: string;
  state?: string;
  district?: string;
  village?: string;
  latitude?: number | null;
  longitude?: number | null;
  elevationM?: number | null;
  farmAreaValue?: number | null;
  farmAreaUnit?: 'Bigha' | 'Acre' | 'Hectare';
  soilType?: string;
  irrigationMethod?: string;
  waterAvailability?: string;
  previousCrop?: string;
  locationSource?: string;
  _prefilled?: boolean;
}

export interface WeatherData {
  isLive: boolean;
  dataType: string;
  source: string;
  fetchedAt: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  tempMax: number;
  tempMin: number;
  rainSumForecast: number;
  rainProbability: number;
  et0: number;
  forecast7Day: Array<{
    date: string;
    dataType: string;
    tempMax: number;
    tempMin: number;
    rainSumMm: number;
    rainProbability: number;
  }>;
  latitude: number;
  longitude: number;
  note: string;
}

export interface CropRecommendation {
  cropKey: string;
  nameEn: string;
  nameHi: string;
  localName: string;
  season?: string[];
  primarySeason?: string;
  isKharif?: boolean;
  isRabi?: boolean;
  isWholeYear?: boolean;
  score: number;
  suitabilityCategory: string;
  matchingFactors: string[];
  risks: string[];
  missingInfo: string[];
  sowingWindow: string;
  sowingWindowHi: string;
  waterDemandCategory: string;
  cropDurationDays: number;
  mlConfidence?: number;
  historicalRecordsInRegion?: number;
  source: string;
  confidence: string;
  notes: string;
}

export interface TaskItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  titleHi: string;
  action: string;
  reason: string;
  source: string;
  dataType: string;
  isForecastDriven: boolean;
  completionStatus: 'pending' | 'completed' | 'skipped' | 'postponed';
  completedAt?: string | null;
  userNote?: string;
  rescheduledFromDay?: number;
  rescheduledToDay?: number;
  rescheduledReason?: string;
}

export interface DayEntry {
  dayNumber: number;
  date: string;
  dateLabel: string;
  stage: string;
  stageHi: string;
  tasks: TaskItem[];
  weatherContext?: {
    dataType: string;
    temperature?: number;
    forecastRainMm?: number;
    rainProbability?: number;
    humidity?: number;
    note?: string;
  };
  completionStatus: 'pending' | 'completed' | 'skipped' | 'postponed';
  completedAt?: string | null;
  notes?: string;
}

export interface CropPlan {
  _id: string;
  cropKey: string;
  nameEn: string;
  nameHi: string;
  sowingDate: string;
  endDate: string;
  cropSeason?: string;
  mlConfidence?: number;
  suitabilityScore: number;
  suitabilityCategory: string;
  isUnsuitable: boolean;
  isRisky: boolean;
  matchingFactors: string[];
  risks: string[];
  exclusionReasons: string[];
  missingInfo: string[];
  farmSnapshot: Partial<FarmProfile>;
  weatherSnapshot: Partial<WeatherData>;
  weatherLastUpdated: string;
  dailyTasks: DayEntry[];
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
}

// ── API Methods ───────────────────────────────────────────────────

export const agroAPI = {
  /**
   * Fetch live weather for coordinates
   */
  getWeather: async (lat?: number, lon?: number): Promise<{ weather: WeatherData }> => {
    const params = lat && lon ? `?lat=${lat}&lon=${lon}` : '';
    return apiCall(`/weather${params}`);
  },

  /**
   * Get list of supported crops, optionally filtered by season ('Kharif', 'Rabi')
   */
  getCrops: async (season?: string): Promise<{ crops: any[] }> => {
    const query = season ? `?season=${season}` : '';
    return apiCall(`/crops${query}`);
  },

  /**
   * Get the user's farm profile (prefilled from user data if not saved yet)
   */
  getFarmProfile: async (): Promise<{ farmProfile: FarmProfile }> => {
    return apiCall('/farm-profile');
  },

  /**
   * Save/update farm profile
   */
  saveFarmProfile: async (profile: Partial<FarmProfile>): Promise<{ farmProfile: FarmProfile }> => {
    return apiCall('/farm-profile', 'POST', profile);
  },

  /**
   * Workflow A — Get crop recommendations
   */
  getRecommendations: async (params: {
    district?: string;
    elevation?: number | null;
    soilType?: string;
    sowingDate: string;
    irrigationMethod?: string;
    waterAvailability?: string;
    farmAreaValue?: number;
    farmAreaUnit?: string;
    latitude?: number;
    longitude?: number;
    previousCrop?: string;
  }): Promise<{
    recommendations: CropRecommendation[];
    unsuitable: any[];
    kharifCrops?: CropRecommendation[];
    rabiCrops?: CropRecommendation[];
    season: string;
    elevationZone: string;
    regionalModelInfo?: any;
    regionalMlActive?: boolean;
    weatherSummary: any;
    dataNote: string;
    disclaimer: string;
  }> => {
    return apiCall('/recommend', 'POST', params);
  },

  /**
   * Workflow B step 1 — Validate a farmer-selected crop
   */
  validateCrop: async (params: {
    cropKey: string;
    district?: string;
    elevation?: number | null;
    soilType?: string;
    sowingDate: string;
    irrigationMethod?: string;
    waterAvailability?: string;
    latitude?: number;
    longitude?: number;
    fieldSize?: string | number;
    fieldUnit?: string;
    pumpCapacity?: string;
  }): Promise<{ validation: any; weather: WeatherData }> => {
    return apiCall('/validate-crop', 'POST', params);
  },

  /**
   * Workflow B step 2 — Create a 90-day crop plan
   */
  createPlan: async (params: {
    cropKey: string;
    sowingDate: string;
    district?: string;
    elevation?: number | null;
    soilType?: string;
    irrigationMethod?: string;
    waterAvailability?: string;
    latitude?: number;
    longitude?: number;
    farmAreaValue?: number;
    farmAreaUnit?: string;
  }): Promise<{ plan: CropPlan }> => {
    return apiCall('/plan', 'POST', params);
  },

  /**
   * Get all plans for this user (summary, no dailyTasks)
   */
  getPlans: async (): Promise<{ plans: Partial<CropPlan>[] }> => {
    return apiCall('/plans');
  },

  /**
   * Get a specific plan with full dailyTasks
   */
  getPlan: async (planId: string): Promise<{ plan: CropPlan }> => {
    return apiCall(`/plans/${planId}`);
  },

  /**
   * Delete a plan
   */
  deletePlan: async (planId: string): Promise<{ success: boolean }> => {
    return apiCall(`/plans/${planId}`, 'DELETE');
  },

  /**
   * Refresh weather and update future tasks in a plan
   */
  refreshWeather: async (planId: string, lat?: number, lon?: number): Promise<{ plan: CropPlan; weatherSummary: any }> => {
    return apiCall(`/plans/${planId}/refresh-weather`, 'PATCH', { latitude: lat, longitude: lon });
  },

  /**
   * Mark a task's completion status with auto-rescheduling for skipped or rain-affected tasks
   */
  updateTaskStatus: async (
    planId: string,
    dayNumber: number,
    taskId: string,
    status: 'pending' | 'completed' | 'skipped' | 'postponed',
    userNote?: string,
    rescheduleReason?: 'skip' | 'rain' | 'user'
  ): Promise<{ dayEntry: DayEntry; plan?: CropPlan; rescheduledToDay?: number; message?: string }> => {
    return apiCall(`/plans/${planId}/days/${dayNumber}/task/${taskId}`, 'PATCH', {
      completionStatus: status,
      userNote,
      rescheduleReason,
    });
  },

  /**
   * Auto-reschedule pending irrigation tasks based on live weather forecast
   */
  autoRescheduleWeather: async (planId: string): Promise<{
    success: boolean;
    message: string;
    rescheduledCount: number;
    rescheduledDetails: any[];
    plan: CropPlan;
  }> => {
    return apiCall(`/plans/${planId}/auto-reschedule-weather`, 'POST');
  },

  /**
   * Add a note to a calendar day
   */
  updateDayNote: async (planId: string, dayNumber: number, notes: string): Promise<{ dayEntry: DayEntry }> => {
    return apiCall(`/plans/${planId}/days/${dayNumber}/note`, 'PATCH', { notes });
  },
};

