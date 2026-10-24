/**
 * KisanSaathi AI — Unified API Configuration
 * Supports Local Development & Production Vercel / Cloud Deployments
 */

// Production Backend URL (Node.js API on Render)
export const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://kisaansaathi-backend-2j2x.onrender.com').replace(/\/$/, '');

// Production ML Backend URL (Python Flask API on Render)
export const ML_URL =
  (process.env.EXPO_PUBLIC_ML_URL || 'https://kissan-sathi-ai-zgjs.onrender.com').replace(/\/$/, '');

// OpenWeatherMap API Key (from EXPO_PUBLIC_WEATHER_API_KEY)
export const WEATHER_API_KEY =
  process.env.EXPO_PUBLIC_WEATHER_API_KEY || '';
