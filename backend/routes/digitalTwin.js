const express = require('express');
const router = express.Router();
const https = require('https');
const DigitalTwinLog = require('../models/DigitalTwinLog');
const {
  CROP_DATABASE,
  SOIL_DATABASE,
  IRRIGATION_METHODS,
  calculateSmartIrrigation,
} = require('../services/smartIrrigationService');

// District center coordinates for Uttarakhand
const DISTRICT_COORDS = {
  Chamoli: { lat: 30.412, lon: 79.331 },
  'Tehri Garhwal': { lat: 30.38, lon: 78.48 },
  Pithoragarh: { lat: 29.5867, lon: 80.2186 },
  Uttarkashi: { lat: 30.7268, lon: 78.4354 },
  Rudraprayag: { lat: 30.2844, lon: 78.9811 },
  Almora: { lat: 29.5971, lon: 79.6591 },
  Dehradun: { lat: 30.3165, lon: 78.0322 },
  Haridwar: { lat: 29.9457, lon: 78.1642 },
  Nainital: { lat: 29.3803, lon: 79.4636 },
  Bageshwar: { lat: 29.8406, lon: 79.7694 },
  Champawat: { lat: 29.3364, lon: 80.103 },
  'Pauri Garhwal': { lat: 30.1468, lon: 78.7806 },
  'Udham Singh Nagar': { lat: 28.98, lon: 79.4 },
};

const { fetchWeatherForLocation } = require('../services/weatherService');

// Helper: Fetch live weather from WeatherService (OpenWeatherMap API Key)
async function fetchLiveWeather(lat, lon) {
  try {
    const w = await fetchWeatherForLocation(lat, lon);
    return {
      temperature: w.temperature,
      humidity: w.humidity,
      windSpeed: w.windSpeed,
      recentRainfallMm: w.precipitation || 0.0,
      forecastRainfallMm: w.rainSumForecast || 0.0,
      source: w.source || 'OpenWeatherMap Verified Telemetry',
      retrievalTimestamp: new Date(),
    };
  } catch {
    return getFallbackWeather();
  }
}

function getFallbackWeather() {
  return {
    temperature: 21.5,
    humidity: 58.0,
    windSpeed: 5.5,
    recentRainfallMm: 0.0,
    forecastRainfallMm: 2.0,
    source: 'Uttarakhand Baseline Telemetry (Offline Mode)',
    retrievalTimestamp: new Date(),
  };
}

// -----------------------------------------------------------------------------
// GET /api/v1/digital-twin/metadata
// Returns supported crops, growth stages, soils, and methods
// -----------------------------------------------------------------------------
router.get('/metadata', (req, res) => {
  res.json({
    success: true,
    crops: Object.keys(CROP_DATABASE).map((k) => ({
      id: k,
      en: CROP_DATABASE[k].en,
      hi: CROP_DATABASE[k].hi,
      stages: CROP_DATABASE[k].stages,
      criticalSmPct: CROP_DATABASE[k].criticalSmPct,
    })),
    soils: Object.keys(SOIL_DATABASE).map((k) => ({
      id: k,
      en: SOIL_DATABASE[k].en,
      hi: SOIL_DATABASE[k].hi,
      fc: SOIL_DATABASE[k].fc,
      wp: SOIL_DATABASE[k].wp,
      descHi: SOIL_DATABASE[k].descHi,
    })),
    methods: Object.keys(IRRIGATION_METHODS).map((k) => ({
      id: k,
      en: IRRIGATION_METHODS[k].en,
      hi: IRRIGATION_METHODS[k].hi,
      efficiency: IRRIGATION_METHODS[k].efficiency,
      descHi: IRRIGATION_METHODS[k].descHi,
    })),
  });
});

// -----------------------------------------------------------------------------
// POST /api/v1/digital-twin/calculate
// Scientific Smart Irrigation & Digital Twin Calculation
// -----------------------------------------------------------------------------
router.post('/calculate', async (req, res) => {
  try {
    const {
      farmerId = 'guest_farmer',
      farmerName = 'Uttarakhand Farmer',
      village = 'Chopta',
      district = 'Chamoli',
      crop = 'Wheat',
      growthStage = 'mid',
      sowingDate,
      farmArea = 1.0,
      areaUnit = 'Acre',
      soilType = 'Loam',
      irrigationMethod = 'Drip',
      soilMoisturePct = null,
      soilMoistureSource = 'simulated',
      daysSinceLastWatering = 4,
      pumpHp = 5.0,
      language = 'hi',
    } = req.body;

    const isHindi = language === 'hi';

    // 1. Fetch live weather for district coordinates
    const coords = DISTRICT_COORDS[district] || DISTRICT_COORDS.Chamoli;
    const weather = await fetchLiveWeather(coords.lat, coords.lon);

    // 2. Perform FAO-56 Smart Irrigation Calculation
    const result = calculateSmartIrrigation({
      crop,
      growthStage,
      soilType,
      farmArea,
      areaUnit,
      irrigationMethod,
      currentSoilMoisturePct: soilMoisturePct,
      daysSinceLastWatering,
      forecastRainfallMm: weather.forecastRainfallMm,
      recentRainfallMm: weather.recentRainfallMm,
      temperatureC: weather.temperature,
      humidityPct: weather.humidity,
      windSpeedKmh: weather.windSpeed,
      pumpHp,
      isHindi,
    });

    // 3. Save to Audit Trail / Field History
    let auditLog = null;
    try {
      auditLog = await DigitalTwinLog.create({
        farmerId,
        farmerName,
        village,
        district,
        crop: result.crop,
        cropHi: result.cropHi,
        growthStage,
        growthStageLabel: result.growthStageLabel,
        sowingDate: sowingDate ? new Date(sowingDate) : new Date(),
        farmArea,
        areaUnit,
        soilType: result.soilType,
        irrigationMethod: result.irrigationMethod,
        soilMoisturePct: result.currentSoilMoisturePct,
        soilMoistureSource,
        weather: {
          temperature: weather.temperature,
          recentRainfallMm: weather.recentRainfallMm,
          forecastRainfallMm: weather.forecastRainfallMm,
          source: weather.source,
          observationTimestamp: new Date(),
          retrievalTimestamp: weather.retrievalTimestamp,
        },
        calculationResults: {
          status: result.status,
          statusBadge: result.statusBadge,
          dailyEtcMm: result.dailyEtcMm,
          effectiveRainfallMm: result.effectiveRainfallMm,
          netDeficitMm: result.netDeficitMm,
          grossWaterLiters: result.grossWaterLiters,
          grossWaterM3: result.grossWaterM3,
          pumpRuntimeHours: result.pumpRuntimeHours,
          reason: result.reason,
          explanation: result.explanation,
        },
        scenarios: result.scenarios,
        audit: {
          calculationMethod: result.audit.calculationMethod,
          version: result.audit.version,
          formula: result.audit.formula,
          assumptions: result.audit.assumptions,
          createdAt: new Date(),
        },
      });
    } catch (dbErr) {
      console.warn('Could not save DigitalTwin audit record (offline DB mode):', dbErr.message);
    }

    return res.json({
      success: true,
      data: result,
      weather,
      auditLogId: auditLog ? auditLog._id : `audit_${Date.now()}`,
    });
  } catch (err) {
    console.error('Digital Twin calculation error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate smart irrigation requirements',
      error: err.message,
    });
  }
});

// -----------------------------------------------------------------------------
// GET /api/v1/digital-twin/history
// Retrieves field history and audit trail records
// -----------------------------------------------------------------------------
router.get('/history', async (req, res) => {
  try {
    const { farmerId, district, limit = 20 } = req.query;
    const filter = {};
    if (farmerId) filter.farmerId = farmerId;
    if (district) filter.district = district;

    const logs = await DigitalTwinLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: logs.length,
      history: logs,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to load field history',
      error: err.message,
    });
  }
});

// -----------------------------------------------------------------------------
// GET /api/v1/digital-twin/latest
// Retrieves the most recent Digital Twin state for a farmer
// -----------------------------------------------------------------------------
router.get('/latest', async (req, res) => {
  try {
    const { farmerId = 'guest_farmer', district } = req.query;
    const filter = {};
    if (farmerId) filter.farmerId = farmerId;
    if (district) filter.district = district;

    const latest = await DigitalTwinLog.findOne(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      latest,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to load latest state',
      error: err.message,
    });
  }
});

module.exports = router;
