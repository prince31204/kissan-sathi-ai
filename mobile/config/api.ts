/**
 * KisanSaathi AI — Unified API Configuration
 * Supports Local Development & Production Vercel / Cloud Deployments
 */

// Production Backend URL (Node.js API)
export const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

// Production ML Backend URL (Python Flask API)
export const ML_URL =
  (process.env.EXPO_PUBLIC_ML_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

// OpenWeatherMap API Key (from EXPO_PUBLIC_WEATHER_API_KEY)
export const WEATHER_API_KEY =
  process.env.EXPO_PUBLIC_WEATHER_API_KEY || '';
