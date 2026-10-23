/**
 * KisanSaathi AI — Agro AI Routes
 * Integrates Crop Recommendation (Workflow A) and Crop Planner (Workflow B)
 *
 * All routes are protected by JWT auth middleware (existing pattern).
 *
 * Routes:
 *   GET    /api/v1/agro/weather             — Live weather for farm location
 *   GET    /api/v1/agro/crops               — List of supported crops
 *   GET    /api/v1/agro/farm-profile        — Get/create farmer's farm profile
 *   POST   /api/v1/agro/farm-profile        — Save/update farm profile
 *
 * Workflow A — Crop Recommendation:
 *   POST   /api/v1/agro/recommend           — Get ranked crop recommendations
 *
 * Workflow B — Crop Planner:
 *   POST   /api/v1/agro/validate-crop       — Check suitability of a selected crop
 *   POST   /api/v1/agro/plan                — Create a 90-day crop plan
 *   GET    /api/v1/agro/plans               — List all plans for this user
 *   GET    /api/v1/agro/plans/:planId       — Get a specific plan
 *   DELETE /api/v1/agro/plans/:planId       — Delete a plan
 *   PATCH  /api/v1/agro/plans/:planId/refresh-weather — Refresh weather and update future tasks
 *   PATCH  /api/v1/agro/plans/:planId/days/:dayNumber/task/:taskId — Mark task status
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const FarmProfile = require('../models/FarmProfile');
const CropPlan = require('../models/CropPlan');
const { fetchWeatherForLocation } = require('../services/weatherService');
const {
  recommendCrops,
  validateAndPlanCrop,
  generate90DayCalendar,
  CROP_KNOWLEDGE,
  SUPPORTED_CROPS,
} = require('../services/cropRecommendationEngine');

// ── Helper to get userId from JWT (existing pattern: req.user = decoded.sub = email or username) ──
async function getUserId(req) {
  // In the existing codebase, req.user is decoded.sub which is the username/email string
  // We need to find the user document
  const sub = req.user;
  const user = await User.findOne({
    $or: [{ email: sub }, { fullName: sub }],
  }).select('_id district village state').lean();
  return user;
}

const jwt = require('jsonwebtoken');

// Optional auth helper: allows weather fetching even if user has not logged in yet
const optionalAuth = (req, res, next) => {
  let token = req.header('Authorization');
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7, token.length).trim();
  }
  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7'
      );
      req.user = decoded.sub;
    } catch (e) {
      // Ignore token failure for public weather queries
    }
  }
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/agro/weather
// Fetch live weather for given coordinates (or farm profile coordinates)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/weather', optionalAuth, async (req, res) => {
  try {
    let { lat, lon } = req.query;

    // If not provided, try to get from farm profile
    if (!lat || !lon) {
      const userDoc = await getUserId(req);
      if (userDoc) {
        const farm = await FarmProfile.findOne({ userId: userDoc._id }).lean();
        if (farm && farm.latitude && farm.longitude) {
          lat = farm.latitude;
          lon = farm.longitude;
        }
      }
    }

    // Validate
    lat = parseFloat(lat) || 30.3165; // Dehradun default
    lon = parseFloat(lon) || 78.0322;

    const weather = await fetchWeatherForLocation(lat, lon);
    res.json({ success: true, weather });
  } catch (err) {
    console.error('[AgroAI] Weather fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch weather data.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET or POST /api/v1/agro/synthetic-crop-recommendation
// Predict synthetic crop & variety based on datasets/synthetic-crop/synthetic_crop_varieties.csv
// ─────────────────────────────────────────────────────────────────────────────
router.all('/synthetic-crop-recommendation', optionalAuth, async (req, res) => {
  try {
    let { lat, lon, temperature, rainfall, soil_moisture, season, top_k } = {
      ...req.query,
      ...req.body,
    };

    lat = parseFloat(lat) || 30.3165;
    lon = parseFloat(lon) || 78.0322;

    const mlPayload = {
      lat,
      lon,
      temperature: temperature != null ? parseFloat(temperature) : undefined,
      rainfall: rainfall != null ? parseFloat(rainfall) : undefined,
      soil_moisture: soil_moisture != null ? parseFloat(soil_moisture) : undefined,
      season,
      top_k: parseInt(top_k) || 4,
    };

    const mlBase = process.env.ML_BACKEND_URL || 'http://localhost:5000';
    const mlRes = await fetch(`${mlBase}/api/v1/ml/synthetic-crop-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload),
      signal: AbortSignal.timeout(6000),
    });

    if (mlRes.ok) {
      const data = await mlRes.json();
      return res.json(data);
    }

    res.status(502).json({ success: false, error: 'ML backend returned error' });
  } catch (err) {
    console.error('[AgroAI] Synthetic crop recommendation error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to invoke the trained Crop-Region ML model
async function fetchRegionalCropMl(params) {
  try {
    const mlBase = process.env.ML_BACKEND_URL || 'http://localhost:5000';
    const res = await fetch(`${mlBase}/api/v1/ml/crop-region-recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[AgroAI] ML crop-region model call skipped:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/agro/crops
// List all supported crops with season indicators and optional filter
// ─────────────────────────────────────────────────────────────────────────────
router.get('/crops', auth, (req, res) => {
  const { season } = req.query; // 'Kharif', 'Rabi', or 'all'
  let crops = SUPPORTED_CROPS.map((key) => {
    const c = CROP_KNOWLEDGE[key];
    const isKharif = c.season.includes('Kharif');
    const isRabi = c.season.includes('Rabi');
    const isWholeYear = c.season.includes('Whole Year');
    const primarySeason = isKharif ? 'Kharif' : isRabi ? 'Rabi' : 'Whole Year';
    return {
      key,
      nameEn: c.nameEn,
      nameHi: c.nameHi,
      localName: c.localName,
      season: c.season,
      primarySeason,
      isKharif,
      isRabi,
      isWholeYear,
      sowingWindowLabel: c.sowingWindowLabel,
      sowingWindowHi: c.sowingWindowHi,
      waterDemandCategory: c.waterDemandCategory,
      cropDurationDays: c.cropDurationDays,
      altitudeRange: c.altitudeRange,
      suitable_for_hill_farmers: c.suitable_for_hill_farmers,
      source: c.source,
      confidence: c.confidence,
    };
  });

  if (season && season.toLowerCase() !== 'all') {
    crops = crops.filter(c =>
      c.season.some(s => s.toLowerCase() === season.toLowerCase() || s === 'Whole Year')
    );
  }

  res.json({ success: true, crops, total: crops.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/agro/farm-profile
// Get the user's farm profile (prefilled from User record if missing)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/farm-profile', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    let farm = await FarmProfile.findOne({ userId: userDoc._id }).lean();

    if (!farm) {
      // Return a prefilled (but not saved) profile from user data
      farm = {
        userId: userDoc._id,
        farmName: 'My Farm',
        state: userDoc.state || 'Uttarakhand',
        district: userDoc.district || '',
        village: userDoc.village || '',
        latitude: null,
        longitude: null,
        elevationM: null,
        soilType: 'Unknown',
        irrigationMethod: 'Unknown',
        waterAvailability: 'Unknown',
        _prefilled: true,
      };
    }

    res.json({ success: true, farmProfile: farm });
  } catch (err) {
    console.error('[AgroAI] farm-profile GET error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load farm profile.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/agro/farm-profile
// Create or update the user's farm profile
// ─────────────────────────────────────────────────────────────────────────────
router.post('/farm-profile', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const {
      farmName, state, district, village, latitude, longitude, elevationM,
      farmAreaValue, farmAreaUnit, soilType, irrigationMethod, waterAvailability,
      previousCrop, notes, locationSource,
    } = req.body;

    // Input validation
    if (latitude && (isNaN(latitude) || latitude < 8 || latitude > 38)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude. Must be between 8°N and 38°N (India).' });
    }
    if (longitude && (isNaN(longitude) || longitude < 68 || longitude > 98)) {
      return res.status(400).json({ success: false, error: 'Invalid longitude. Must be between 68°E and 98°E (India).' });
    }

    const update = {
      farmName, state, district, village,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      elevationM: elevationM ? parseFloat(elevationM) : undefined,
      farmAreaValue, farmAreaUnit, soilType, irrigationMethod, waterAvailability,
      previousCrop, notes, locationSource,
    };

    // Remove undefined keys
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const farm = await FarmProfile.findOneAndUpdate(
      { userId: userDoc._id },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, farmProfile: farm });
  } catch (err) {
    console.error('[AgroAI] farm-profile POST error:', err.message);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Failed to save farm profile.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/agro/recommend
// Workflow A — Generate crop recommendations for given farm + weather conditions
// ─────────────────────────────────────────────────────────────────────────────
router.post('/recommend', auth, async (req, res) => {
  try {
    const {
      district, elevation, soilType, sowingDate, irrigationMethod,
      waterAvailability, farmAreaValue, farmAreaUnit, latitude, longitude,
      previousCrop, state,
    } = req.body;

    if (!sowingDate) {
      return res.status(400).json({ success: false, error: 'Planned sowing date is required.' });
    }

    // Resolve state (from request, farm profile, or fallback to 'Uttarakhand')
    let resolvedState = state;
    if (!resolvedState) {
      const userDoc = await getUserId(req);
      if (userDoc) {
        const farm = await FarmProfile.findOne({ userId: userDoc._id }).lean();
        resolvedState = farm?.state || userDoc.state || 'Uttarakhand';
      } else {
        resolvedState = 'Uttarakhand';
      }
    }

    // Fetch weather
    const lat = parseFloat(latitude) || 30.3165;
    const lon = parseFloat(longitude) || 78.0322;
    const weatherData = await fetchWeatherForLocation(lat, lon);

    // Call ML Regional Model
    const sowingMonth = new Date(sowingDate).getMonth() + 1;
    const detectedSeason = (sowingMonth >= 6 && sowingMonth <= 10) ? 'Kharif' : ((sowingMonth >= 11 || sowingMonth <= 2) ? 'Rabi' : 'Zaid');
    const rainfallEstimate = weatherData.rainSumForecast ? weatherData.rainSumForecast * 20 : 750;
    const tempEstimate = weatherData.temperature || 22;

    const mlData = await fetchRegionalCropMl({
      state: resolvedState,
      season: detectedSeason,
      soilType: soilType || 'Loamy',
      rainfall: rainfallEstimate,
      temperature: tempEstimate,
      pH: 6.5,
    });

    const farmParams = {
      district: district || '',
      state: resolvedState,
      elevation: elevation || null,
      soilType: soilType || 'Unknown',
      sowingDate,
      irrigationMethod: irrigationMethod || 'Unknown',
      waterAvailability: waterAvailability || 'Unknown',
      landAreaAcres: farmAreaUnit === 'Bigha' ? (farmAreaValue || 1) * 0.2
        : farmAreaUnit === 'Hectare' ? (farmAreaValue || 0.5) * 2.471
        : (farmAreaValue || 1),
      previousCrop: previousCrop || null,
    };

    const result = recommendCrops(farmParams, weatherData, mlData);

    res.json({
      success: true,
      ...result,
      regionalMlActive: Boolean(mlData && mlData.success),
    });
  } catch (err) {
    console.error('[AgroAI] recommend error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate crop recommendations.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/agro/validate-crop
// Workflow B (step 1) — Check if a farmer-selected crop is suitable
// ─────────────────────────────────────────────────────────────────────────────
router.post('/validate-crop', auth, async (req, res) => {
  try {
    const {
      cropKey, district, elevation, soilType, sowingDate,
      irrigationMethod, waterAvailability, latitude, longitude, state,
      fieldSize, fieldUnit, pumpCapacity,
    } = req.body;

    if (!cropKey) return res.status(400).json({ success: false, error: 'cropKey is required.' });
    if (!sowingDate) return res.status(400).json({ success: false, error: 'sowingDate is required.' });

    let resolvedState = state;
    if (!resolvedState) {
      const userDoc = await getUserId(req);
      if (userDoc) {
        const farm = await FarmProfile.findOne({ userId: userDoc._id }).lean();
        resolvedState = farm?.state || userDoc.state || 'Uttarakhand';
      } else {
        resolvedState = 'Uttarakhand';
      }
    }

    const lat = parseFloat(latitude) || 30.3165;
    const lon = parseFloat(longitude) || 78.0322;
    const weatherData = await fetchWeatherForLocation(lat, lon);

    const sowingMonth = new Date(sowingDate).getMonth() + 1;
    const isRabiCrop = ['Wheat', 'Mustard', 'Barley', 'Chickpea', 'GreenPeas', 'Potato'].includes(cropKey);
    const detectedSeason = isRabiCrop || (sowingMonth >= 10 || sowingMonth <= 2) ? 'Rabi' : ((sowingMonth >= 5 && sowingMonth <= 9) ? 'Kharif' : 'Zaid');

    const mlData = await fetchRegionalCropMl({
      state: resolvedState,
      season: detectedSeason,
      soilType: soilType || 'Loam',
      rainfall: weatherData.rainSumForecast ? weatherData.rainSumForecast * 20 : 750,
      temperature: weatherData.temperature || 22,
      pH: 6.5,
    });

    const farmParams = {
      district: district || '',
      state: resolvedState,
      elevation: elevation || null,
      soilType: soilType || 'Loam',
      sowingDate,
      irrigationMethod: irrigationMethod || 'Unknown',
      waterAvailability: waterAvailability || 'Unknown',
    };

    const result = validateAndPlanCrop(cropKey, farmParams, weatherData, mlData);

    if (!result.valid) {
      return res.status(400).json({ success: false, error: result.error });
    }

    // Exact Liters and Pump Run-time calculation according to field size & unit
    const sizeVal = parseFloat(fieldSize) || 5.0;
    const unit = fieldUnit || 'Bigha';
    const areaSqm = unit === 'Bigha' ? sizeVal * 809.0 : unit === 'Hectare' ? sizeVal * 10000.0 : sizeVal * 4046.86;
    const singleDepthMm = result.waterAnalysis?.singleDepthMm || 35;
    const totalSeasonMm = result.waterAnalysis?.totalSeasonMm || 400;
    const singleEventLiters = Math.round(singleDepthMm * areaSqm);
    const totalSeasonLiters = Math.round(totalSeasonMm * areaSqm);
    const pumpHp = parseFloat(pumpCapacity) || 5.0;
    const pumpHours = Number((singleEventLiters / (pumpHp * 5200.0)).toFixed(1));

    result.waterRequirement = {
      fieldSize: sizeVal,
      fieldUnit: unit,
      areaSqm: Math.round(areaSqm),
      singleEventLiters,
      totalSeasonLiters,
      pumpHours,
      pumpHp,
      singleDepthMm,
      totalSeasonMm,
      dailyEtcMm: result.waterAnalysis?.dailyEtcMm,
      forecastRainMm: weatherData.rainSumForecast || 0,
      soilRetentionAdvice: result.soilCompatibility?.waterRetentionAdvice,
      recommendedInterval: result.soilCompatibility?.recommendedIntervalDays,
    };

    res.json({ success: true, validation: result, weather: weatherData });
  } catch (err) {
    console.error('[AgroAI] validate-crop error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to validate crop selection.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/agro/plan
// Workflow B (step 2) — Create and save a 90-day crop plan
// ─────────────────────────────────────────────────────────────────────────────
router.post('/plan', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const {
      cropKey, sowingDate, district, elevation, soilType,
      irrigationMethod, waterAvailability, latitude, longitude,
      farmAreaValue, farmAreaUnit, state,
    } = req.body;

    if (!cropKey) return res.status(400).json({ success: false, error: 'cropKey is required.' });
    if (!sowingDate) return res.status(400).json({ success: false, error: 'sowingDate is required.' });

    let resolvedState = state;
    if (!resolvedState) {
      let farm = await FarmProfile.findOne({ userId: userDoc._id }).lean();
      resolvedState = farm?.state || userDoc.state || 'Uttarakhand';
    }

    const lat = parseFloat(latitude) || 30.3165;
    const lon = parseFloat(longitude) || 78.0322;
    const weatherData = await fetchWeatherForLocation(lat, lon);

    const sowingMonth = new Date(sowingDate).getMonth() + 1;
    const isRabiCrop = ['Wheat', 'Mustard', 'Barley', 'Chickpea', 'GreenPeas', 'Potato'].includes(cropKey);
    const detectedSeason = isRabiCrop || (sowingMonth >= 10 || sowingMonth <= 2) ? 'Rabi' : ((sowingMonth >= 5 && sowingMonth <= 9) ? 'Kharif' : 'Zaid');

    const mlData = await fetchRegionalCropMl({
      state: resolvedState,
      season: detectedSeason,
      soilType: soilType || 'Loam',
      rainfall: weatherData.rainSumForecast ? weatherData.rainSumForecast * 20 : 750,
      temperature: weatherData.temperature || 22,
      pH: 6.5,
    });

    const farmParams = {
      district: district || '',
      state: resolvedState,
      elevation: elevation || null,
      soilType: soilType || 'Loam',
      sowingDate,
      irrigationMethod: irrigationMethod || 'Unknown',
      waterAvailability: waterAvailability || 'Unknown',
    };

    const validation = validateAndPlanCrop(cropKey, farmParams, weatherData, mlData);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    // Calculate end date (sowing + 89 days = 90 total days)
    const sowingDateObj = new Date(sowingDate);
    const endDateObj = new Date(sowingDate);
    endDateObj.setDate(sowingDateObj.getDate() + 89);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Get or create farm profile
    let farmProfile = await FarmProfile.findOne({ userId: userDoc._id });

    // Build plan document — upsert to prevent duplicates
    const planData = {
      userId: userDoc._id,
      farmProfileId: farmProfile ? farmProfile._id : undefined,
      cropKey,
      nameEn: validation.nameEn,
      nameHi: validation.nameHi,
      sowingDate,
      endDate,
      cropSeason: validation.cropSeason || 'Kharif',
      mlConfidence: validation.mlConfidence || 0,
      suitabilityScore: validation.suitabilityScore,
      suitabilityCategory: validation.suitabilityCategory,
      isUnsuitable: validation.isUnsuitable,
      isRisky: validation.isRisky,
      matchingFactors: validation.matchingFactors,
      risks: validation.risks,
      exclusionReasons: validation.exclusionReasons,
      missingInfo: validation.missingInfo,
      farmSnapshot: farmParams,
      weatherSnapshot: weatherData,
      weatherLastUpdated: new Date(),
      dailyTasks: validation.calendar,
      status: 'active',
      lastAccessedAt: new Date(),
    };

    // Try upsert (unique index on userId+cropKey+sowingDate)
    let plan;
    try {
      plan = await CropPlan.findOneAndUpdate(
        { userId: userDoc._id, cropKey, sowingDate },
        { $set: planData },
        { upsert: true, new: true }
      );
    } catch (dupErr) {
      // If duplicate key error (E11000), fetch and return existing
      if (dupErr.code === 11000) {
        plan = await CropPlan.findOne({ userId: userDoc._id, cropKey, sowingDate });
        return res.json({
          success: true,
          plan,
          message: 'An existing plan for this crop and sowing date was found and returned.',
        });
      }
      throw dupErr;
    }

    res.json({ success: true, plan });
  } catch (err) {
    console.error('[AgroAI] plan POST error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create crop plan.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/agro/plans
// List all crop plans for this user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/plans', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const plans = await CropPlan.find({ userId: userDoc._id }, {
      cropKey: 1, nameEn: 1, nameHi: 1, sowingDate: 1, endDate: 1,
      suitabilityScore: 1, suitabilityCategory: 1, isUnsuitable: 1, isRisky: 1,
      status: 1, createdAt: 1, lastAccessedAt: 1,
      weatherLastUpdated: 1,
      // Exclude large dailyTasks array for the list view
    }).sort({ createdAt: -1 }).lean();

    res.json({ success: true, plans });
  } catch (err) {
    console.error('[AgroAI] plans GET error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load crop plans.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/agro/plans/:planId
// Get full details of a specific crop plan (including dailyTasks)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/plans/:planId', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    if (!mongoose.Types.ObjectId.isValid(req.params.planId)) {
      return res.status(400).json({ success: false, error: 'Invalid plan ID.' });
    }

    const plan = await CropPlan.findOne({ _id: req.params.planId, userId: userDoc._id });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found or access denied.' });

    // Update lastAccessedAt
    plan.lastAccessedAt = new Date();
    await plan.save();

    res.json({ success: true, plan });
  } catch (err) {
    console.error('[AgroAI] plan GET error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load crop plan.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/agro/plans/:planId
// Delete a crop plan
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/plans/:planId', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const result = await CropPlan.deleteOne({ _id: req.params.planId, userId: userDoc._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Plan not found or access denied.' });
    }
    res.json({ success: true, message: 'Plan deleted.' });
  } catch (err) {
    console.error('[AgroAI] plan DELETE error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete crop plan.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/agro/plans/:planId/refresh-weather
// Refresh weather data and regenerate FUTURE (pending) tasks
// Preserves completed/skipped/postponed tasks.
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/plans/:planId/refresh-weather', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const plan = await CropPlan.findOne({ _id: req.params.planId, userId: userDoc._id });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found or access denied.' });

    const { latitude, longitude } = req.body;
    const lat = parseFloat(latitude) || (plan.farmSnapshot && plan.farmSnapshot.latitude) || 30.3165;
    const lon = parseFloat(longitude) || (plan.farmSnapshot && plan.farmSnapshot.longitude) || 78.0322;

    const newWeather = await fetchWeatherForLocation(lat, lon);
    const crop = CROP_KNOWLEDGE[plan.cropKey];
    if (!crop) return res.status(400).json({ success: false, error: 'Crop data not found.' });

    // Recalculate calendar with new weather
    const today = new Date().toISOString().split('T')[0];
    const newCalendar = generate90DayCalendar(crop, plan.sowingDate, newWeather);

    // Merge: preserve existing completion statuses for days that have been interacted with
    const completionMap = {};
    for (const day of plan.dailyTasks) {
      if (day.completionStatus !== 'pending' || day.completedAt || day.notes) {
        completionMap[day.dayNumber] = {
          completionStatus: day.completionStatus,
          completedAt: day.completedAt,
          notes: day.notes,
          tasks: day.tasks.reduce((acc, t) => {
            if (t.completionStatus !== 'pending' || t.completedAt) {
              acc[t.id] = { completionStatus: t.completionStatus, completedAt: t.completedAt, userNote: t.userNote };
            }
            return acc;
          }, {}),
        };
      }
    }

    // Apply preserved statuses to new calendar
    for (const day of newCalendar) {
      if (completionMap[day.dayNumber]) {
        const saved = completionMap[day.dayNumber];
        day.completionStatus = saved.completionStatus;
        day.completedAt = saved.completedAt;
        day.notes = saved.notes;
        for (const task of day.tasks) {
          if (saved.tasks[task.id]) {
            task.completionStatus = saved.tasks[task.id].completionStatus;
            task.completedAt = saved.tasks[task.id].completedAt;
            task.userNote = saved.tasks[task.id].userNote;
          }
        }
      }
    }

    plan.dailyTasks = newCalendar;
    plan.weatherSnapshot = newWeather;
    plan.weatherLastUpdated = new Date();
    await plan.save();

    res.json({
      success: true,
      message: 'Weather refreshed. Future tasks have been updated. Completed tasks are preserved.',
      weatherLastUpdated: plan.weatherLastUpdated,
      weatherSummary: {
        temperature: newWeather.temperature,
        condition: newWeather.condition,
        rainSumForecast: newWeather.rainSumForecast,
        isLive: newWeather.isLive,
        dataType: newWeather.dataType,
        source: newWeather.source,
        fetchedAt: newWeather.fetchedAt,
      },
      plan,
    });
  } catch (err) {
    console.error('[AgroAI] refresh-weather error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to refresh weather data.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/agro/plans/:planId/days/:dayNumber/task/:taskId
// Mark a specific task's completion status.
// - If skipped -> automatically reschedules to Next Day (Day N+1).
// - If rain halted -> automatically reschedules irrigation to the next dry day.
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/plans/:planId/days/:dayNumber/task/:taskId', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const { completionStatus, userNote, rescheduleReason } = req.body;
    const validStatuses = ['pending', 'completed', 'skipped', 'postponed'];
    if (!validStatuses.includes(completionStatus)) {
      return res.status(400).json({ success: false, error: `completionStatus must be one of: ${validStatuses.join(', ')}` });
    }

    const plan = await CropPlan.findOne({ _id: req.params.planId, userId: userDoc._id });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found or access denied.' });

    const dayNum = parseInt(req.params.dayNumber);
    const taskId = req.params.taskId;

    const dayEntry = plan.dailyTasks.find(d => d.dayNumber === dayNum);
    if (!dayEntry) return res.status(404).json({ success: false, error: `Day ${dayNum} not found in plan.` });

    const task = dayEntry.tasks.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ success: false, error: `Task "${taskId}" not found on day ${dayNum}.` });

    task.completionStatus = completionStatus;
    task.completedAt = completionStatus === 'completed' ? new Date() : null;
    if (userNote !== undefined) task.userNote = userNote;

    let rescheduledToDay = null;
    let rescheduleMessage = null;

    // 1. If user skipped this task -> auto-reschedule to Next Day (Day N+1)
    if (completionStatus === 'skipped' || rescheduleReason === 'skip') {
      const targetDayNum = dayNum + 1;
      if (targetDayNum <= 90) {
        const targetDay = plan.dailyTasks.find(d => d.dayNumber === targetDayNum);
        if (targetDay) {
          const alreadyExists = targetDay.tasks.some(
            t => t.rescheduledOriginalId === task.id || t.id === `${task.id}-rescheduled-d${targetDayNum}`
          );
          if (!alreadyExists) {
            const cleanTitle = (task.titleHi || task.title || '').replace(/^\(पुनर्निर्धारित\)\s*/, '');
            const rescheduledTask = {
              id: `${task.id}-rescheduled-d${targetDayNum}-${Date.now().toString().slice(-4)}`,
              type: task.type || 'crop_management',
              priority: 'high',
              title: task.title,
              titleHi: `(पुनर्निर्धारित) ${cleanTitle}`,
              action: task.action,
              reason: `दिन ${dayNum} पर छूटा हुआ कार्य — आज अवश्य पूरा करें।`,
              source: 'Farmer Rescheduled (Skipped)',
              dataType: 'Rescheduled Task',
              isForecastDriven: false,
              completionStatus: 'pending',
              completedAt: null,
              userNote: userNote || `दिन ${dayNum} से आगे बढ़ाया गया`,
              rescheduledFromDay: dayNum,
              rescheduledReason: 'user_skipped',
              rescheduledOriginalId: task.id,
            };
            targetDay.tasks.push(rescheduledTask);
            if (targetDay.completionStatus === 'completed') {
              targetDay.completionStatus = 'pending';
            }
            task.rescheduledToDay = targetDayNum;
            task.rescheduledReason = 'user_skipped';
            rescheduledToDay = targetDayNum;
            rescheduleMessage = `कार्य दिन ${targetDayNum} के लिए रीशेड्यूल कर दिया गया है।`;
          }
        }
      }
    }

    // 2. If irrigation halted due to rain -> auto-reschedule to next dry day based on weather
    else if (rescheduleReason === 'rain' || (task.type === 'irrigation' && completionStatus === 'postponed')) {
      let dryDayNum = null;
      for (let offset = 1; offset <= 10; offset++) {
        const candidateNum = dayNum + offset;
        if (candidateNum > 90) break;
        const candidateDay = plan.dailyTasks.find(d => d.dayNumber === candidateNum);
        if (candidateDay) {
          const w = candidateDay.weatherContext;
          const rainMm = (w && (w.forecastRainMm || w.rainSumForecast || w.rainSumMm)) || 0;
          const rainProb = (w && (w.rainProbability || w.precipitation_probability_max)) || 0;
          if (rainMm < 3.0 && rainProb < 50) {
            dryDayNum = candidateNum;
            break;
          }
        }
      }
      if (!dryDayNum) dryDayNum = Math.min(90, dayNum + 2);

      const targetDay = plan.dailyTasks.find(d => d.dayNumber === dryDayNum);
      if (targetDay && dryDayNum !== dayNum) {
        const alreadyExists = targetDay.tasks.some(
          t => t.rescheduledOriginalId === task.id || t.id.startsWith(`${task.id}-rain-rescheduled`)
        );
        if (!alreadyExists) {
          const cleanTitle = (task.titleHi || task.title || '').replace(/^\(बारिश पश्चात\)\s*/, '');
          const rescheduledIrrigationTask = {
            id: `${task.id}-rain-rescheduled-d${dryDayNum}-${Date.now().toString().slice(-4)}`,
            type: 'irrigation',
            priority: 'critical',
            title: task.title,
            titleHi: `(बारिश पश्चात) ${cleanTitle}`,
            action: task.action,
            reason: `🌧️ दिन ${dayNum} को बारिश के कारण सिंचाई रोककर शुष्क दिन ${dryDayNum} (${targetDay.dateLabel || targetDay.date}) के लिए रीशेड्यूल की गई।`,
            source: 'Weather-Adaptive Irrigation Rescheduler',
            dataType: 'Weather-Driven Reschedule',
            isForecastDriven: true,
            completionStatus: 'pending',
            completedAt: null,
            userNote: userNote || `बारिश के कारण दिन ${dayNum} से रीशेड्यूल किया गया`,
            rescheduledFromDay: dayNum,
            rescheduledReason: 'rain_delay',
            rescheduledOriginalId: task.id,
          };
          targetDay.tasks.push(rescheduledIrrigationTask);
          if (targetDay.completionStatus === 'completed') {
            targetDay.completionStatus = 'pending';
          }
          task.rescheduledToDay = dryDayNum;
          task.rescheduledReason = 'rain_delay';
          rescheduledToDay = dryDayNum;
          rescheduleMessage = `🌧️ बारिश की वजह से सिंचाई दिन ${dryDayNum} (${targetDay.dateLabel || targetDay.date}) के लिए रीशेड्यूल कर दी गई है।`;
        }
      }
    }

    // Update day-level completion if all tasks are done
    const allDone = dayEntry.tasks.every(t => t.completionStatus === 'completed' || t.completionStatus === 'skipped');
    if (allDone) {
      dayEntry.completionStatus = 'completed';
      dayEntry.completedAt = new Date();
    } else {
      dayEntry.completionStatus = 'pending';
    }

    plan.markModified('dailyTasks');
    await plan.save();

    res.json({
      success: true,
      dayEntry,
      plan,
      rescheduledToDay,
      message: rescheduleMessage || `Task marked as "${completionStatus}".`,
    });
  } catch (err) {
    console.error('[AgroAI] task status update error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update task status.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/agro/plans/:planId/auto-reschedule-weather
// Automatic weather scan: checks 7-day forecast.
// If rain >= 5mm is predicted on a day with pending irrigation,
// it halts/reschedules that irrigation to the next dry day.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/plans/:planId/auto-reschedule-weather', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const plan = await CropPlan.findOne({ _id: req.params.planId, userId: userDoc._id });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found.' });

    const lat = (plan.farmSnapshot && plan.farmSnapshot.latitude) || 30.3165;
    const lon = (plan.farmSnapshot && plan.farmSnapshot.longitude) || 78.0322;

    const weatherData = await fetchWeatherForLocation(lat, lon);
    const forecast7Day = weatherData.forecast7Day || [];

    const sowingTime = new Date(plan.sowingDate).getTime();
    const nowTime = new Date().getTime();
    const currentDayNum = Math.max(1, Math.min(90, Math.floor((nowTime - sowingTime) / (1000 * 60 * 60 * 24)) + 1));

    let rescheduledCount = 0;
    const rescheduledDetails = [];

    // Loop through 7-day forecast
    for (let i = 0; i < forecast7Day.length; i++) {
      const forecastItem = forecast7Day[i];
      const targetDayNum = currentDayNum + i;
      if (targetDayNum > 90) break;

      const dayEntry = plan.dailyTasks.find(d => d.dayNumber === targetDayNum);
      if (!dayEntry) continue;

      dayEntry.weatherContext = {
        dataType: forecastItem.dataType || 'Short-term forecast',
        temperature: forecastItem.tempMax || weatherData.temperature,
        forecastRainMm: forecastItem.rainSumMm || 0,
        rainProbability: forecastItem.rainProbability || 0,
        humidity: weatherData.humidity,
        source: 'Open-Meteo live forecast',
      };

      const rainMm = forecastItem.rainSumMm || 0;
      const rainProb = forecastItem.rainProbability || 0;

      // If heavy rain forecast (>= 5mm or rainProb >= 70%) and irrigation pending on this day
      if (rainMm >= 5.0 || rainProb >= 70) {
        for (const task of dayEntry.tasks) {
          if (task.type === 'irrigation' && task.completionStatus === 'pending') {
            let dryDayNum = null;
            for (let offset = i + 1; offset < forecast7Day.length; offset++) {
              if ((forecast7Day[offset].rainSumMm || 0) < 3.0 && (forecast7Day[offset].rainProbability || 0) < 50) {
                dryDayNum = currentDayNum + offset;
                break;
              }
            }
            if (!dryDayNum) dryDayNum = Math.min(90, targetDayNum + 2);

            const dryDayEntry = plan.dailyTasks.find(d => d.dayNumber === dryDayNum);
            if (dryDayEntry && dryDayNum !== targetDayNum) {
              const alreadyExists = dryDayEntry.tasks.some(
                t => t.rescheduledOriginalId === task.id || t.id.startsWith(`${task.id}-rain-rescheduled`)
              );
              if (!alreadyExists) {
                const cleanTitle = (task.titleHi || task.title || '').replace(/^\(बारिश पश्चात\)\s*/, '');
                dryDayEntry.tasks.push({
                  id: `${task.id}-rain-rescheduled-d${dryDayNum}-${Date.now().toString().slice(-4)}`,
                  type: 'irrigation',
                  priority: 'critical',
                  title: task.title,
                  titleHi: `(बारिश पश्चात) ${cleanTitle}`,
                  action: task.action,
                  reason: `🌧️ मौसम पूर्वानुमान: दिन ${targetDayNum} को ${rainMm}mm बारिश की संभावना है। प्राकृतिक वर्षा से नमी मिलेगी, इसलिए सिंचाई दिन ${dryDayNum} (${dryDayEntry.dateLabel || dryDayEntry.date}) के लिए रीशेड्यूल की गई।`,
                  source: 'Weather-Adaptive Irrigation Rescheduler',
                  dataType: 'Weather-Driven Reschedule',
                  isForecastDriven: true,
                  completionStatus: 'pending',
                  completedAt: null,
                  userNote: `पूर्वानुमानित वर्षा (${rainMm}mm) के कारण दिन ${targetDayNum} से स्थगित`,
                  rescheduledFromDay: targetDayNum,
                  rescheduledReason: 'rain_delay',
                  rescheduledOriginalId: task.id,
                });
                if (dryDayEntry.completionStatus === 'completed') {
                  dryDayEntry.completionStatus = 'pending';
                }

                task.completionStatus = 'postponed';
                task.rescheduledToDay = dryDayNum;
                task.rescheduledReason = 'rain_delay';
                task.userNote = `बारिश (${rainMm}mm) के कारण दिन ${dryDayNum} को स्थानांतरित किया गया`;

                rescheduledCount++;
                rescheduledDetails.push({
                  fromDay: targetDayNum,
                  toDay: dryDayNum,
                  rainForecastMm: rainMm,
                  taskTitle: task.titleHi || task.title,
                });
              }
            }
          }
        }
      }
    }

    plan.weatherSnapshot = weatherData;
    plan.weatherLastUpdated = new Date();
    plan.markModified('dailyTasks');
    await plan.save();

    res.json({
      success: true,
      message: rescheduledCount > 0
        ? `🌦️ मौसम अनुसार ${rescheduledCount} सिंचाई कार्य रीशेड्यूल किए गए।`
        : 'मौसम का पूर्वानुमान जाँचा गया। सिंचाई रीशेड्यूल करने की आवश्यकता नहीं है (मौसम अनुकूल है)।',
      rescheduledCount,
      rescheduledDetails,
      plan,
    });
  } catch (err) {
    console.error('[AgroAI] auto-reschedule-weather error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to auto-reschedule with weather.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/agro/plans/:planId/days/:dayNumber/note
// Add/update a note on a calendar day
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/plans/:planId/days/:dayNumber/note', auth, async (req, res) => {
  try {
    const userDoc = await getUserId(req);
    if (!userDoc) return res.status(401).json({ success: false, error: 'User not found.' });

    const { notes } = req.body;
    const plan = await CropPlan.findOne({ _id: req.params.planId, userId: userDoc._id });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found.' });

    const dayNum = parseInt(req.params.dayNumber);
    const dayEntry = plan.dailyTasks.find(d => d.dayNumber === dayNum);
    if (!dayEntry) return res.status(404).json({ success: false, error: `Day ${dayNum} not found.` });

    dayEntry.notes = notes || '';
    plan.markModified('dailyTasks');
    await plan.save();

    res.json({ success: true, dayEntry });
  } catch (err) {
    console.error('[AgroAI] day note update error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update note.' });
  }
});

module.exports = router;
