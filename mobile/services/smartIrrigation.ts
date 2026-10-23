/**
 * Smart Irrigation & Digital Twin Calculation Engine (Mobile Service)
 * FAO-56 Penman-Monteith & Soil Water Depletion Balance Standard
 */

export interface CropStageInfo {
  label: string;
  labelHi: string;
  days: number;
  kc: number;
  rootDepthM: number;
}

export interface CropInfo {
  id: string;
  en: string;
  hi: string;
  stages: {
    initial: CropStageInfo;
    vegetative: CropStageInfo;
    mid: CropStageInfo;
    late: CropStageInfo;
  };
  depletionFraction: number; // allowable depletion 'p'
  criticalSmPct: number;
}

export interface SoilInfo {
  id: string;
  en: string;
  hi: string;
  fc: number;
  wp: number;
  descHi: string;
}

export interface IrrigationMethodInfo {
  id: string;
  en: string;
  hi: string;
  efficiency: number;
  descHi: string;
}

export const CROPS: Record<string, CropInfo> = {
  Wheat: {
    id: 'Wheat',
    en: 'Wheat',
    hi: 'गेहूं',
    stages: {
      initial: { label: 'Initial (Germination)', labelHi: 'अंकुरण अवस्था', days: 20, kc: 0.70, rootDepthM: 0.3 },
      vegetative: { label: 'Vegetative (Tillering)', labelHi: 'कल्ले फूटना / बढ़वार', days: 40, kc: 1.05, rootDepthM: 0.6 },
      mid: { label: 'Flowering & Grain Filling', labelHi: 'फूल व दाना भराव', days: 40, kc: 1.15, rootDepthM: 0.9 },
      late: { label: 'Maturity / Ripening', labelHi: 'पकने की अवस्था', days: 20, kc: 0.40, rootDepthM: 0.9 },
    },
    depletionFraction: 0.55,
    criticalSmPct: 24.0,
  },
  Rice: {
    id: 'Rice',
    en: 'Paddy / Rice',
    hi: 'धान',
    stages: {
      initial: { label: 'Transplanting / Nursery', labelHi: 'रोपाई अवस्था', days: 25, kc: 1.05, rootDepthM: 0.3 },
      vegetative: { label: 'Vegetative / Tillering', labelHi: 'कल्ले फूटना', days: 35, kc: 1.15, rootDepthM: 0.5 },
      mid: { label: 'Panicle / Flowering', labelHi: 'बाली व फूल निकलना', days: 40, kc: 1.25, rootDepthM: 0.6 },
      late: { label: 'Ripening', labelHi: 'पकने की अवस्था', days: 25, kc: 0.70, rootDepthM: 0.6 },
    },
    depletionFraction: 0.20,
    criticalSmPct: 35.0,
  },
  Maize: {
    id: 'Maize',
    en: 'Maize / Corn',
    hi: 'मक्का',
    stages: {
      initial: { label: 'Initial (Emergence)', labelHi: 'उगने की अवस्था', days: 20, kc: 0.40, rootDepthM: 0.3 },
      vegetative: { label: 'Vegetative Growth', labelHi: 'वानस्पतिक वृद्धि', days: 35, kc: 0.85, rootDepthM: 0.6 },
      mid: { label: 'Tasseling & Silking', labelHi: 'नरमंजर व भुट्टा निर्माण', days: 40, kc: 1.15, rootDepthM: 0.8 },
      late: { label: 'Maturity', labelHi: 'पकने की अवस्था', days: 25, kc: 0.60, rootDepthM: 0.8 },
    },
    depletionFraction: 0.50,
    criticalSmPct: 22.0,
  },
  Mustard: {
    id: 'Mustard',
    en: 'Mustard',
    hi: 'सरसों',
    stages: {
      initial: { label: 'Initial (Emergence)', labelHi: 'शुरुआती अवस्था', days: 20, kc: 0.35, rootDepthM: 0.3 },
      vegetative: { label: 'Vegetative & Rosette', labelHi: 'शाखा निर्माण', days: 30, kc: 0.75, rootDepthM: 0.6 },
      mid: { label: 'Flowering & Pods', labelHi: 'फूल व फली निर्माण', days: 45, kc: 1.05, rootDepthM: 0.9 },
      late: { label: 'Pod Filling & Maturity', labelHi: 'परिपक्वता', days: 25, kc: 0.35, rootDepthM: 0.9 },
    },
    depletionFraction: 0.60,
    criticalSmPct: 18.0,
  },
  Potato: {
    id: 'Potato',
    en: 'Potato',
    hi: 'आलू',
    stages: {
      initial: { label: 'Sprouting / Early', labelHi: 'अंकुरण अवस्था', days: 25, kc: 0.50, rootDepthM: 0.25 },
      vegetative: { label: 'Vegetative Growth', labelHi: 'पौध विकास', days: 30, kc: 0.80, rootDepthM: 0.45 },
      mid: { label: 'Tuber Initiation & Bulking', labelHi: 'कंद निर्माण व बढ़वार', days: 40, kc: 1.15, rootDepthM: 0.6 },
      late: { label: 'Maturity / Die-down', labelHi: 'परिपक्वता', days: 20, kc: 0.75, rootDepthM: 0.6 },
    },
    depletionFraction: 0.35,
    criticalSmPct: 26.0,
  },
  Tomato: {
    id: 'Tomato',
    en: 'Tomato',
    hi: 'टमाटर',
    stages: {
      initial: { label: 'Transplanting / Early', labelHi: 'रोपाई व शुरुआती', days: 25, kc: 0.60, rootDepthM: 0.25 },
      vegetative: { label: 'Vegetative Growth', labelHi: 'शाखा फैलाव', days: 35, kc: 0.90, rootDepthM: 0.50 },
      mid: { label: 'Flowering & Fruit Setting', labelHi: 'फूल व फल लगना', days: 45, kc: 1.15, rootDepthM: 0.70 },
      late: { label: 'Harvesting / Maturity', labelHi: 'तुड़ाई व परिपक्वता', days: 30, kc: 0.80, rootDepthM: 0.70 },
    },
    depletionFraction: 0.40,
    criticalSmPct: 23.0,
  },
  Sugarcane: {
    id: 'Sugarcane',
    en: 'Sugarcane',
    hi: 'गन्ना',
    stages: {
      initial: { label: 'Germination & Tillering', labelHi: 'अंकुरण व कल्ले', days: 60, kc: 0.40, rootDepthM: 0.4 },
      vegetative: { label: 'Grand Growth', labelHi: 'तेज बढ़वार', days: 120, kc: 1.00, rootDepthM: 0.8 },
      mid: { label: 'Elongation & Cane Dev', labelHi: 'गन्ना विकास', days: 120, kc: 1.25, rootDepthM: 1.2 },
      late: { label: 'Maturity & Ripening', labelHi: 'पकने की अवस्था', days: 60, kc: 0.75, rootDepthM: 1.2 },
    },
    depletionFraction: 0.65,
    criticalSmPct: 24.0,
  },
  Pulses: {
    id: 'Pulses',
    en: 'Pulses / Lentil (Dal)',
    hi: 'दालें / दलहन',
    stages: {
      initial: { label: 'Initial (Emergence)', labelHi: 'अंकुरण', days: 20, kc: 0.40, rootDepthM: 0.25 },
      vegetative: { label: 'Vegetative & Branching', labelHi: 'शाखा फैलाव', days: 30, kc: 0.70, rootDepthM: 0.50 },
      mid: { label: 'Flowering & Podding', labelHi: 'फूल व फली निर्माण', days: 40, kc: 1.05, rootDepthM: 0.80 },
      late: { label: 'Pod Ripening', labelHi: 'फली पकना', days: 20, kc: 0.35, rootDepthM: 0.80 },
    },
    depletionFraction: 0.55,
    criticalSmPct: 18.0,
  },
};

export const SOILS: Record<string, SoilInfo> = {
  Loam: { id: 'Loam', en: 'Loam', hi: 'दोमट', fc: 28.0, wp: 13.0, descHi: 'उत्तम जल धारण और वायु संचार' },
  Clay: { id: 'Clay', en: 'Clay', hi: 'चिकनी', fc: 38.0, wp: 20.0, descHi: 'अधिक जल धारण, भारी मिट्टी' },
  'Clay Loam': { id: 'Clay Loam', en: 'Clay Loam', hi: 'चिकनी दोमट', fc: 32.0, wp: 16.0, descHi: 'उपजाऊ व संतुलित' },
  'Sandy Loam': { id: 'Sandy Loam', en: 'Sandy Loam', hi: 'बलुई दोमट', fc: 20.0, wp: 9.0, descHi: 'शीघ्र सूखने वाली हल्की मिट्टी' },
  Sandy: { id: 'Sandy', en: 'Sandy', hi: 'रेतीली', fc: 14.0, wp: 5.0, descHi: 'कम जल धारण, तुरंत सिंचाई आवश्यक' },
};

export const IRRIGATION_METHODS: Record<string, IrrigationMethodInfo> = {
  Drip: { id: 'Drip', en: 'Drip Irrigation', hi: 'टपक सिंचाई (ड्रिप)', efficiency: 0.90, descHi: '90% दक्षता — सीधे जड़ों तक' },
  Sprinkler: { id: 'Sprinkler', en: 'Sprinkler Irrigation', hi: 'फव्वारा सिंचाई (स्प्रिंकलर)', efficiency: 0.75, descHi: '75% दक्षता — समान छिड़काव' },
  Kuhl: { id: 'Kuhl', en: 'Mountain Kuhl / Stream', hi: 'पहाड़ी कूल / नाली प्रवाह', efficiency: 0.65, descHi: '65% दक्षता — प्राकृतिक गुरुत्वाकर्षण प्रवाह' },
  Flood: { id: 'Flood', en: 'Flood / Basin', hi: 'खुला प्रवाह / क्यारी (बाढ़)', efficiency: 0.60, descHi: '60% दक्षता — वाष्पीकरण अधिक' },
};

export function areaToSquareMeters(area: number, unit: string): number {
  const a = Math.max(0.01, area || 1.0);
  const u = (unit || 'acre').toLowerCase();
  if (u.includes('bigha')) return a * 809.37;
  if (u.includes('hectare') || u.includes('हेक्टेयर')) return a * 10000.0;
  return a * 4046.86;
}

export function calculateEffectiveRainfall(totalRainfallMm: number): number {
  const p = Math.max(0, totalRainfallMm || 0);
  if (p <= 2.0) return 0.0;
  const peff = p > 50.0 ? 0.8 * 50.0 + 0.5 * (p - 50.0) : 0.8 * (p - 2.0);
  return Math.round(Math.max(0, peff) * 10) / 10;
}

export interface ScenarioResult {
  rainMm: number;
  label: string;
  status: 'adequate' | 'deficit' | 'surplus';
  netDeficitMm: number;
  grossWaterLiters: number;
  advice: string;
}

export interface SmartIrrigationOutput {
  crop: string;
  cropHi: string;
  growthStage: 'initial' | 'vegetative' | 'mid' | 'late';
  growthStageLabel: string;
  growthStageLabelHi: string;
  soilType: string;
  soilTypeHi: string;
  irrigationMethod: string;
  irrigationMethodHi: string;
  efficiencyPct: number;
  farmArea: number;
  areaUnit: string;
  areaSqM: number;
  rootDepthM: number;
  currentSoilMoisturePct: number;
  fieldCapacityPct: number;
  wiltingPointPct: number;
  totalAvailableWaterMm: number;
  readilyAvailableWaterMm: number;
  currentDepletionMm: number;
  dailyEtcMm: number;
  dailyEt0Mm: number;
  cropCoefficientKc: number;
  forecastRainfallMm: number;
  effectiveRainfallMm: number;
  netDeficitMm: number;
  grossDeficitMm: number;
  grossWaterLiters: number;
  grossWaterM3: number;
  pumpRuntimeHours: number;
  kuhlRuntimeHours: number;
  status: 'adequate' | 'mild_deficit' | 'critical_deficit' | 'surplus';
  statusBadge: string;
  statusColor: string;
  reason: string;
  explanation: string;
  isHindi: boolean;
  scenarios: {
    lowRain: ScenarioResult;
    expectedRain: ScenarioResult;
    highRain: ScenarioResult;
  };
  audit: {
    calculationMethod: string;
    version: string;
    formula: string;
    calculatedAt: string;
    assumptions: string[];
  };
}

export function computeSmartIrrigation(params: {
  crop?: string;
  growthStage?: 'initial' | 'vegetative' | 'mid' | 'late';
  soilType?: string;
  farmArea?: number;
  areaUnit?: string;
  irrigationMethod?: string;
  currentSoilMoisturePct?: number | null;
  daysSinceLastWatering?: number;
  forecastRainfallMm?: number;
  recentRainfallMm?: number;
  temperatureC?: number;
  humidityPct?: number;
  windSpeedKmh?: number;
  pumpHp?: number;
  isHindi?: boolean;
}): SmartIrrigationOutput {
  const {
    crop = 'Wheat',
    growthStage = 'mid',
    soilType = 'Loam',
    farmArea = 1.0,
    areaUnit = 'Acre',
    irrigationMethod = 'Drip',
    currentSoilMoisturePct = null,
    daysSinceLastWatering = 4,
    forecastRainfallMm = 0.0,
    recentRainfallMm = 0.0,
    temperatureC = 22.0,
    humidityPct = 60.0,
    pumpHp = 5.0,
    isHindi = false,
  } = params;

  const cropData = CROPS[crop] || CROPS.Wheat;
  const stageData = cropData.stages[growthStage] || cropData.stages.mid;
  const soilData = SOILS[soilType] || SOILS.Loam;
  const methodData = IRRIGATION_METHODS[irrigationMethod] || IRRIGATION_METHODS.Flood;

  // ET0 estimation
  const temp = Math.max(5.0, temperatureC || 22.0);
  const rh = Math.max(10.0, Math.min(100.0, humidityPct || 60.0));
  const baseEt0 = Math.max(1.8, 0.0023 * (temp + 17.8) * Math.sqrt(Math.max(1.0, temp - 8.0)) * (1.1 - rh / 200.0) * 2.5);
  const et0 = Math.round(baseEt0 * 10) / 10;

  // Crop water demand: ETc = Kc * ET0
  const kc = stageData.kc;
  const etcDaily = Math.round(kc * et0 * 10) / 10;

  // Effective rainfall
  const effectiveRainMm = calculateEffectiveRainfall(forecastRainfallMm);

  // TAW & RAW
  const rootDepthM = stageData.rootDepthM;
  const fc = soilData.fc;
  const wp = soilData.wp;
  const tawMm = Math.round(((fc - wp) / 100.0) * rootDepthM * 1000.0 * 10) / 10;
  const p = cropData.depletionFraction;
  const rawMm = Math.round(p * tawMm * 10) / 10;

  // Soil moisture
  let currentSm = currentSoilMoisturePct !== null && currentSoilMoisturePct !== undefined
    ? currentSoilMoisturePct
    : Math.max(wp + 1.0, fc - (daysSinceLastWatering * 1.5) + (recentRainfallMm * 0.4));
  currentSm = Math.max(4.0, Math.min(48.0, Math.round(currentSm * 10) / 10));

  // Current Depletion Dr (mm)
  const currentDepletionMm = Math.max(0, Math.round(((fc - currentSm) / 100.0) * rootDepthM * 1000.0 * 10) / 10);

  // Net Deficit
  let netDeficitMm = 0;
  let status: 'adequate' | 'mild_deficit' | 'critical_deficit' | 'surplus' = 'adequate';

  if (effectiveRainMm >= etcDaily * 3 && currentSm >= fc - 2) {
    status = 'surplus';
    netDeficitMm = 0;
  } else if (currentDepletionMm > rawMm) {
    status = 'critical_deficit';
    netDeficitMm = Math.max(0, currentDepletionMm - effectiveRainMm);
  } else if (currentDepletionMm > rawMm * 0.6) {
    status = 'mild_deficit';
    netDeficitMm = Math.max(0, (currentDepletionMm + (etcDaily * 2)) - effectiveRainMm);
  } else {
    status = 'adequate';
    netDeficitMm = 0;
  }
  netDeficitMm = Math.round(netDeficitMm * 10) / 10;

  // Gross Deficit & Volumes
  const efficiency = methodData.efficiency;
  const grossDeficitMm = netDeficitMm > 0 ? Math.round((netDeficitMm / efficiency) * 10) / 10 : 0;
  const areaSqM = areaToSquareMeters(farmArea, areaUnit);
  const grossWaterLiters = Math.round(grossDeficitMm * areaSqM);
  const grossWaterM3 = Math.round((grossWaterLiters / 1000.0) * 10) / 10;

  // Runtime
  const hp = Math.max(1.0, pumpHp || 5.0);
  const pumpFlowRateLph = hp * 5200.0;
  const pumpRuntimeHours = grossWaterLiters > 0 ? Math.round((grossWaterLiters / pumpFlowRateLph) * 10) / 10 : 0.0;
  const kuhlRuntimeHours = grossWaterLiters > 0 ? Math.round((grossWaterLiters / 79200.0) * 10) / 10 : 0.0;

  // Status Badge & Explanations
  let statusBadge = '';
  let statusColor = '';
  let reason = '';
  let explanation = '';

  if (status === 'surplus') {
    statusBadge = isHindi ? 'अतिरिक्त नमी — सिंचाई न करें' : 'Moisture Surplus — Do Not Irrigate';
    statusColor = '#0284C7';
    reason = isHindi
      ? `पर्याप्त वर्षा (${forecastRainfallMm} मिमी) और उच्च मृदा नमी (${currentSm}%) के कारण पर्याप्त जल उपलब्ध है।`
      : `Adequate rain (${forecastRainfallMm} mm) and high soil moisture (${currentSm}%) provide sufficient water.`;
    explanation = isHindi
      ? 'सीढ़ीदार खेतों में जलनिकासी नालियों को खुला रखें ताकि जड़ों में पानी न भरे।'
      : 'Keep terrace field drains clear to avoid root rot from excess moisture.';
  } else if (status === 'adequate') {
    statusBadge = isHindi ? 'संतोषजनक नमी — सिंचाई अभी आवश्यक नहीं' : 'Adequate Moisture — No Irrigation Needed';
    statusColor = '#10B981';
    reason = isHindi
      ? `वर्तमान नमी (${currentSm}%) पौधे की जड़ सीमा (${rootDepthM} मी) के लिए अनुकूल है।`
      : `Current moisture (${currentSm}%) is within the safe root zone (${rootDepthM}m) threshold.`;
    explanation = isHindi
      ? 'फसल पर कोई जल तनाव नहीं है। 2-3 दिनों बाद पुनः जांच करें।'
      : 'Crop is not in water stress. Recheck moisture after 2-3 days.';
  } else if (status === 'mild_deficit') {
    statusBadge = isHindi ? 'हल्की कमी — 24 से 48 घंटे में सिंचाई करें' : 'Mild Deficit — Irrigate within 24-48 Hours';
    statusColor = '#F59E0B';
    reason = isHindi
      ? `दैनिक वाष्पीकरण (${etcDaily} मिमी/दिन) के कारण जड़ क्षेत्र में नमी घट रही है।`
      : `Daily evapotranspiration (${etcDaily} mm/day) is depleting root zone moisture.`;
    explanation = isHindi
      ? `अनुशंसित जल: ${grossWaterLiters.toLocaleString()} लीटर (${methodData.hi} से)।`
      : `Apply ${grossWaterLiters.toLocaleString()} Liters using ${methodData.en}.`;
  } else {
    statusBadge = isHindi ? 'गंभीर कमी — तुरंत सिंचाई आवश्यक' : 'Critical Deficit — Immediate Irrigation Required';
    statusColor = '#DC2626';
    reason = isHindi
      ? `मृदा नमी (${currentSm}%) क्रांतिक सीमा (${cropData.criticalSmPct}%) से नीचे पहुंच गई है।`
      : `Soil moisture (${currentSm}%) has fallen below critical threshold (${cropData.criticalSmPct}%).`;
    explanation = isHindi
      ? `जल्द से जल्द ${grossWaterLiters.toLocaleString()} लीटर पानी लगाएं (सुबह या शाम)।`
      : `Apply ${grossWaterLiters.toLocaleString()} Liters urgently (early morning or late evening).`;
  }

  // Scenarios
  const lowRainDeficit = Math.round(Math.max(0, currentDepletionMm) * 10) / 10;
  const lowRainGrossL = Math.round((lowRainDeficit / efficiency) * areaSqM);

  const highRainMm = Math.max(25.0, forecastRainfallMm + 25.0);
  const highRainPeff = calculateEffectiveRainfall(highRainMm);
  const highRainDeficit = Math.round(Math.max(0, currentDepletionMm - highRainPeff) * 10) / 10;
  const highRainGrossL = highRainDeficit > 0 ? Math.round((highRainDeficit / efficiency) * areaSqM) : 0;

  return {
    crop: cropData.en,
    cropHi: cropData.hi,
    growthStage,
    growthStageLabel: stageData.label,
    growthStageLabelHi: stageData.labelHi,
    soilType: soilData.en,
    soilTypeHi: soilData.hi,
    irrigationMethod: methodData.en,
    irrigationMethodHi: methodData.hi,
    efficiencyPct: Math.round(efficiency * 100),
    farmArea,
    areaUnit,
    areaSqM: Math.round(areaSqM),
    rootDepthM,
    currentSoilMoisturePct: currentSm,
    fieldCapacityPct: fc,
    wiltingPointPct: wp,
    totalAvailableWaterMm: tawMm,
    readilyAvailableWaterMm: rawMm,
    currentDepletionMm,
    dailyEtcMm: etcDaily,
    dailyEt0Mm: et0,
    cropCoefficientKc: kc,
    forecastRainfallMm,
    effectiveRainfallMm: effectiveRainMm,
    netDeficitMm,
    grossDeficitMm,
    grossWaterLiters,
    grossWaterM3,
    pumpRuntimeHours,
    kuhlRuntimeHours,
    status,
    statusBadge,
    statusColor,
    reason,
    explanation,
    isHindi: !!isHindi,
    scenarios: {
      lowRain: {
        rainMm: 0.0,
        label: isHindi ? 'कम वर्षा (सूखा काल)' : 'Low Rainfall (Dry Spell)',
        status: lowRainDeficit > 0 ? 'deficit' : 'adequate',
        netDeficitMm: lowRainDeficit,
        grossWaterLiters: lowRainGrossL,
        advice: isHindi
          ? 'वर्षा न होने पर पूर्ण कृत्रिम सिंचाई आवश्यक होगी।'
          : 'Zero rainfall requires full artificial irrigation.',
      },
      expectedRain: {
        rainMm: forecastRainfallMm,
        label: isHindi ? 'अनुमानित वर्षा (पूर्वानुमान)' : 'Expected Rainfall (Forecast)',
        status: status === 'critical_deficit' || status === 'mild_deficit' ? 'deficit' : status,
        netDeficitMm,
        grossWaterLiters,
        advice: isHindi
          ? 'मौसम पूर्वानुमान के अनुसार अनुकूलित सिंचाई योजना।'
          : 'Optimized watering schedule adjusted for forecast rain.',
      },
      highRain: {
        rainMm: highRainMm,
        label: isHindi ? 'भारी वर्षा (+25 मिमी)' : 'High Rainfall (+25 mm Event)',
        status: highRainGrossL === 0 ? 'surplus' : 'adequate',
        netDeficitMm: highRainDeficit,
        grossWaterLiters: highRainGrossL,
        advice: isHindi
          ? 'भारी वर्षा की स्थिति में सिंचाई रोक दें और जलनिकासी सुरक्षित रखें।'
          : 'Heavy rainfall expected — halt irrigation and ensure drainage.',
      },
    },
    audit: {
      calculationMethod: 'FAO-56 Soil Water Depletion Balance & Penman-Monteith ETc',
      version: 'v2.1',
      formula: 'NIR = max(0, Dr - Peff); GIR = NIR / MethodEfficiency; Vol = GIR * Area',
      calculatedAt: new Date().toISOString(),
      assumptions: [
        'Root zone water distribution is assumed uniform across terraces.',
        'Effective rainfall accounts for surface runoff and deep percolation losses.',
        'Telemetry / sensor readings are labeled as simulated if hardware probe is offline.',
      ],
    },
  };
}
