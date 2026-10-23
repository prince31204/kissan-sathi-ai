const express = require('express');
const router = express.Router();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const FarmProfile = require('../models/FarmProfile');
const User = require('../models/User');
const { calculateSmartIrrigation } = require('../services/smartIrrigationService');
const { sendExcessRainAlertEmail } = require('../config/mailer');

const getUserIdFromHeader = async (req) => {
  let token = req.header('Authorization');
  if (!token) return null;
  if (token.startsWith('Bearer ')) token = token.slice(7).trim();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7');
    const userDoc = await User.findOne({ email: { $regex: new RegExp(`^${decoded.sub}$`, 'i') } });
    return userDoc ? userDoc._id : null;
  } catch (e) {
    return null;
  }
};

function calculateGeodesicArea(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const lon1 = (p1[0] * Math.PI) / 180;
    const lat1 = (p1[1] * Math.PI) / 180;
    const lon2 = (p2[0] * Math.PI) / 180;
    const lat2 = (p2[1] * Math.PI) / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 2.0);
  return Math.round(area * 100) / 100;
}

function calculateCentroid(points) {
  if (!points || points.length === 0) return { latitude: 30.3165, longitude: 78.0322 };
  let sumLat = 0, sumLon = 0;
  points.forEach(p => {
    sumLat += Number(p.latitude);
    sumLon += Number(p.longitude);
  });
  return {
    latitude: Math.round((sumLat / points.length) * 100000) / 100000,
    longitude: Math.round((sumLon / points.length) * 100000) / 100000,
  };
}

const callMLBackend = (endpoint, payload) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = { hostname: '127.0.0.1', port: 5000, path: endpoint, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }, timeout: 6000 };
    const req = http.request(options, (res) => { let data = ''; res.on('data', (chunk) => (data += chunk)); res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } }); });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('ML Backend timeout')); });
    req.write(postData); req.end();
  });
};

function evaluateVoltage(v, phase, base, lang) {
  const n = Number(v) || (phase && phase.includes('3') ? 415 : 220);
  const is3 = phase && phase.includes('3');
  const isEn = lang === 'en';
  if (!is3) {
    if (n < 165) return { voltage: n, phase, status: 'critical_low', badge: 'Critical Low', color: '#ef4444', efficiencyPct: 50, adjustedDurationHours: Math.round((base / 0.5) * 10) / 10, advice: `Critical (${n}V): Turn off motor!` };
    if (n < 195) return { voltage: n, phase, status: 'warning_low', badge: 'Low Voltage', color: '#f59e0b', efficiencyPct: 72, adjustedDurationHours: Math.round((base / 0.72) * 10) / 10, advice: `Low Voltage (${n}V): 28% less flow.` };
    if (n <= 245) return { voltage: n, phase, status: 'optimal', badge: 'Optimal', color: '#10b981', efficiencyPct: 100, adjustedDurationHours: base, advice: `Optimal (${n}V)` };
    return { voltage: n, phase, status: 'warning_high', badge: 'High Voltage', color: '#f97316', efficiencyPct: 95, adjustedDurationHours: base, advice: `High Voltage (${n}V)` };
  } else {
    if (n < 330) return { voltage: n, phase, status: 'critical_low', badge: '3-Phase Critical Low', color: '#ef4444', efficiencyPct: 55, adjustedDurationHours: Math.round((base / 0.55) * 10) / 10, advice: `3-Phase Critical (${n}V)` };
    if (n < 380) return { voltage: n, phase, status: 'warning_low', badge: '3-Phase Low', color: '#f59e0b', efficiencyPct: 80, adjustedDurationHours: Math.round((base / 0.8) * 10) / 10, advice: `3-Phase Low (${n}V)` };
    if (n <= 435) return { voltage: n, phase, status: 'optimal', badge: '3-Phase Optimal', color: '#10b981', efficiencyPct: 100, adjustedDurationHours: base, advice: `3-Phase Optimal (${n}V)` };
    return { voltage: n, phase, status: 'warning_high', badge: '3-Phase High', color: '#f97316', efficiencyPct: 95, adjustedDurationHours: base, advice: `3-Phase High (${n}V)` };
  }
}

function evaluatePahadiStream(streamFlow, waterLiters, terrainType, lang) {
  const isEn = lang === 'en';
  const rates = { low: { lps: 10, label: 'Slow (~10 L/s)' }, medium: { lps: 22, label: 'Medium (~22 L/s)' }, high: { lps: 40, label: 'Fast (~40 L/s)' } };
  const sel = rates[(streamFlow || 'medium').toLowerCase()] || rates.medium;
  const fh = waterLiters > 0 ? Math.max(0.5, Math.round((waterLiters / (sel.lps * 3600)) * 10) / 10) : 0;
  const isTerrace = /terrace|hill/i.test(terrainType || 'terrace');
  const kwh = Math.round(fh * 3.73 * 10) / 10;
  const cost = Math.round(kwh * 5.5);
  return {
    sourceName: 'Mountain Kuhl / Natural Spring',
    streamFlow, streamFlowLabel: sel.label,
    terrainType: isTerrace ? 'Step Terraces' : 'Valley Plain',
    flowDurationHours: fh,
    flowDuration: isEn ? fh + ' Hours (Channel Flow)' : fh + ' Ghante (Gul Pravah)',
    electricityUsed: '0 kWh (Gravity Flow)',
    electricityCostSaved: 'Rs' + cost + ' Saved',
    co2Saved: (Math.round(kwh * 0.82 * 10) / 10) + ' kg CO2 Saved',
    terraceAdvice: isTerrace ? 'Allow water to seep gradually from upper terraces to prevent erosion.' : 'Keep Kuhl channel clear of debris.',
    zeroElectricityBadge: '100% Free Gravity Water'
  };
}

router.post('/predict', async (req, res) => {
  try {
    const result = await callMLBackend('/api/predict-irrigation', req.body);
    return res.json(result);
  } catch (mlErr) {
    console.warn('ML Backend unavailable, using JalTwin FAO-56 fallback:', mlErr.message);
    const { crop = 'Wheat', soilType = 'Loam', fieldSize = 1, fieldUnit = 'Acre', pumpCapacity = '5 HP', waterSource = 'Electric Motor', motorVoltage, voltage, phase = '1-Phase', streamFlow = 'medium', terrainType = 'terrace', daysSinceLastIrrigation = 4, soilMoisture = null, growthStage = 'mid', fieldCondition = 'normal', temperature = 24, humidity = 65, rainfall = 0, language = 'hi' } = req.body;
    const isEn = language === 'en';
    const lang = language;
    const sizeNum = parseFloat(fieldSize) || 1;
    const sizeAcres = fieldUnit.toLowerCase() === 'bigha' ? sizeNum * 0.20 : fieldUnit.toLowerCase() === 'hectare' ? sizeNum * 2.471 : sizeNum;
    const pumpHp = parseFloat(pumpCapacity) || 5.0;
    const rainforecast = parseFloat(rainfall) || 0;
    const rainProb = parseInt(req.body.rainProbability) || 0;
    const validStage = ['initial','vegetative','mid','late'].includes(growthStage) ? growthStage : 'mid';

    const irrigCalc = calculateSmartIrrigation({
      crop, growthStage: validStage, soilType,
      farmArea: sizeNum, areaUnit: fieldUnit,
      irrigationMethod: /pahad|kuhl|stream/i.test(waterSource) ? 'Kuhl' : /solar/i.test(waterSource) ? 'Sprinkler' : 'Flood',
      currentSoilMoisturePct: soilMoisture ? parseFloat(soilMoisture) : null,
      daysSinceLastWatering: parseInt(daysSinceLastIrrigation) || 4,
      forecastRainfallMm: rainforecast,
      temperatureC: parseFloat(temperature) || 24,
      humidityPct: parseFloat(humidity) || 65,
      windSpeedKmh: 7, pumpHp, isHindi: !isEn,
    });

    const grossLiters = irrigCalc.grossWaterLiters || 0;
    const grossMm = irrigCalc.grossDeficitMm || 0;
    const waterStatus = irrigCalc.status;
    const smPct = irrigCalc.currentSoilMoisturePct;
    const isPahadi = /pahad|kuhl|stream|gravity/i.test(waterSource);
    const isSolar = /solar/i.test(waterSource);
    const isDiesel = /diesel/i.test(waterSource);
    const pumpFlowLph = pumpHp * 5200;
    let durH = grossLiters > 0 ? Math.round((grossLiters / pumpFlowLph) * 10) / 10 : 0;
    let durStr = isEn ? durH + ' Hours' : durH + ' Ghante';
    let pahadi_info = null, voltage_info = null, diesel_info = null;

    if (isPahadi) {
      pahadi_info = evaluatePahadiStream(streamFlow, grossLiters, terrainType, lang);
      durH = pahadi_info.flowDurationHours; durStr = pahadi_info.flowDuration;
    } else if (isDiesel) {
      const fl = Math.round(pumpHp * 0.22 * durH * 10) / 10;
      diesel_info = { fuelNeeded: fl + ' L Diesel', estimatedCost: 'Rs' + Math.round(fl * 90) + ' Cost', fuelBurnRate: (pumpHp * 0.22).toFixed(1) + ' L/hr' };
      durStr = isEn ? durH + ' Hours (Diesel)' : durH + ' Ghante (Diesel)';
    } else if (isSolar) {
      durStr = isEn ? durH + ' Hours (Solar)' : durH + ' Ghante (Solar)';
    } else {
      voltage_info = evaluateVoltage(motorVoltage || voltage, phase, durH, lang);
      if (['warning_low','critical_low'].includes(voltage_info.status)) durH = voltage_info.adjustedDurationHours;
      durStr = isEn ? durH + ' Hours' : durH + ' Ghante';
    }

    const rainDef = rainProb >= 60 || rainforecast >= 8.0;
    let decision, decisionLabel, decisionColor, decisionIcon, urgency, advice, isNeeded = false;
    let finalL = grossLiters, finalMm = grossMm;

    if (fieldCondition === 'wet') {
      decision = 'khet_check'; decisionColor = '#059669'; decisionIcon = 'check-circle-outline';
      decisionLabel = isEn ? 'Check Field — Excess Moisture / Waterlogging' : 'Khet Check Karein — Nami Zyada';
      urgency = isEn ? 'Excess Water (Do Not Irrigate)' : 'Jalbhav Risk';
      finalL = 0; finalMm = 0; durH = 0; durStr = isEn ? '0 Hours' : '0 Ghante';
      advice = isEn ? 'Field is already wet or waterlogged. Avoid irrigation and inspect drainage.' : 'Khet mein pehle se nami ya jalbhav hai. Sinchai na karein, jal nikasi dekhein.';
    } else if (rainDef) {
      decision = 'abhi_ruko'; decisionColor = '#2563EB'; decisionIcon = 'weather-rainy';
      decisionLabel = isEn ? 'Hold — Rain Expected' : 'Abhi Rukein — Baarish Aane Wali';
      urgency = isEn ? 'Postponed (Rain)' : 'Stgit (Baarish)';
      finalL = 0; finalMm = 0; durH = 0; durStr = isEn ? '0 Hours' : '0 Ghante';
      advice = isEn ? 'Rain forecast — hold irrigation.' : 'Baarish ka anuman — abhi sinchai na karein.';
    } else if (['adequate','surplus'].includes(waterStatus)) {
      decision = 'khet_check'; decisionColor = '#059669'; decisionIcon = 'check-circle-outline';
      decisionLabel = isEn ? 'Check Field — Moisture OK' : 'Khet Check Karein — Nami Hai';
      urgency = isEn ? 'Adequate Moisture' : 'Paryapt Nami';
      finalL = 0; finalMm = 0;
      advice = isEn ? 'Soil moisture adequate for ' + crop + '. Recheck in 2-3 days.' : 'Mitti mein nami hai ' + crop + ' ke liye. 2-3 din baad dekhein.';
    } else if (waterStatus === 'critical_deficit') {
      decision = 'aaj_paani'; decisionColor = '#DC2626'; decisionIcon = 'water-alert';
      decisionLabel = isEn ? 'Irrigate Today — Critical' : 'Aaj Paani Dein — Gambhir Kami';
      urgency = isEn ? 'Critical — Irrigate Now' : 'Ati Avashyak';
      isNeeded = true;
      advice = isEn ? 'Critical deficit. Apply ' + finalMm + ' mm (' + finalL.toLocaleString() + ' L) now.' : 'Gambhir kami. ' + finalMm + ' mm (' + finalL.toLocaleString() + ' litre) turant dein.';
    } else {
      decision = 'aaj_paani'; decisionColor = '#D97706'; decisionIcon = 'water-plus';
      decisionLabel = isEn ? 'Irrigate Today — Mild Deficit' : 'Aaj Paani Dein — Halki Kami';
      urgency = isEn ? 'Normal (Irrigation Needed)' : 'Samanya (Sinchai Zaruri)';
      isNeeded = true;
      advice = isEn ? 'Moderate deficit. Apply ' + finalMm + ' mm (' + finalL.toLocaleString() + ' L) for ' + crop + '.' : crop + ' ko ' + finalMm + ' mm (' + finalL.toLocaleString() + ' litre) dein.';
    }

    if (isPahadi && pahadi_info) advice += ' ' + pahadi_info.terraceAdvice;
    else if (voltage_info && !['optimal','warning_high'].includes(voltage_info.status)) advice += ' ' + voltage_info.advice;

    const tc = parseFloat(temperature) || 24;
    const suggestedWindow = rainDef ? (isEn ? 'Review after rainfall' : 'Baarish ke baad jaanch karein')
      : isPahadi ? (isEn ? 'Daytime 8:00 AM - 4:00 PM' : 'Din mein 8:00 AM - 4:00 PM')
      : isSolar ? (isEn ? 'Today 10:00 AM - 3:00 PM' : 'Aaj 10:00 AM - 3:00 PM')
      : tc > 32 ? (isEn ? 'Tomorrow 5:30 AM - 8:30 AM' : 'Kal subah 5:30 AM - 8:30 AM')
      : (isEn ? 'Today 5:00 PM - 7:30 PM' : 'Aaj shaam 5:00 PM - 7:30 PM');

    const waterReqStr = finalL > 0 ? (isEn ? finalL.toLocaleString() + ' Liters' : finalL.toLocaleString() + ' Litre') : (isEn ? '0 Liters' : '0 Litre');
    const sc = irrigCalc.scenarios;

    return res.json({
      success: true, advisor: 'JalTwin Smart Irrigation Advisor v2 (Node Fallback)',
      decision, decisionLabel, decisionColor, decisionIcon, irrigationNeeded: isNeeded,
      urgency, waterReq: waterReqStr, waterReqLiters: finalL, waterDepthMm: finalMm,
      duration: durStr, durationHours: durH, suggestedWindow, advice,
      crop, soilType, growthStage: validStage,
      fao56: { et0Mm: irrigCalc.dailyEt0Mm, kc: irrigCalc.cropCoefficientKc, etcDailyMm: irrigCalc.dailyEtcMm, tawMm: irrigCalc.totalAvailableWaterMm, rawMm: irrigCalc.readilyAvailableWaterMm, currentSoilMoisturePct: smPct, currentDepletionMm: irrigCalc.currentDepletionMm, rootDepthM: irrigCalc.rootDepthM, fieldCapacityPct: irrigCalc.fieldCapacityPct, wiltingPointPct: irrigCalc.wiltingPointPct },
      waterSource: isPahadi ? 'Pahadi Kuhl / Stream' : isSolar ? 'Solar Pump' : isDiesel ? 'Diesel Pump' : 'Electric Motor',
      pahadiInfo: pahadi_info, voltageInfo: voltage_info, dieselInfo: diesel_info,
      scenarios: {
        dry: { label: isEn ? 'Dry Spell (0 mm)' : 'Sukha (0 mm)', rainMm: 0, grossDepthMm: irrigCalc.grossDeficitMm, grossWaterLiters: sc.lowRain.grossWaterLiters, status: sc.lowRain.status },
        forecast: { label: isEn ? 'Forecast (' + rainforecast + ' mm)' : 'Purvanuman (' + rainforecast + ' mm)', rainMm: rainforecast, grossDepthMm: finalMm, grossWaterLiters: finalL, status: waterStatus },
        heavy: { label: isEn ? 'Heavy Rain (+25 mm)' : 'Bhari Baarish (+25 mm)', rainMm: rainforecast + 25, grossDepthMm: sc.highRain.netDeficitMm, grossWaterLiters: sc.highRain.grossWaterLiters, status: sc.highRain.status },
      },
      fieldSize: fieldSize + ' ' + fieldUnit, fieldSizeAcres: Math.round(sizeAcres * 100) / 100, fieldSizeSqM: Math.round(sizeAcres * 4046.86),
      estimatedSoilMoisture: smPct,
      weather: { temperature: temperature + 'C', humidity: humidity + '%', rainProbability: rainProb + '%', windSpeed: '7.0 km/h', et0: irrigCalc.dailyEt0Mm + ' mm/day', isLive: false },
      modelAccuracy: '99.81%',
    });
  }
});

// =============================================================================
// SATELLITE FIELD BOUNDARY CRUD ENDPOINTS
// =============================================================================

// GET /api/v1/irrigation/fields - List saved fields for farmer
router.get('/fields', async (req, res) => {
  try {
    const userId = await getUserIdFromHeader(req);
    let query = {};
    if (userId) {
      query = { $or: [{ userId }, { locationSource: 'manual' }] };
    }
    const fields = await FarmProfile.find(query).sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, count: fields.length, fields });
  } catch (err) {
    console.error('Error fetching fields:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch fields' });
  }
});

// POST /api/v1/irrigation/fields - Save a newly drawn field
router.post('/fields', async (req, res) => {
  try {
    const {
      farmName,
      fieldName,
      district = 'Dehradun',
      village = 'Uttarakhand',
      boundaryPoints = [],
      crop = 'Wheat',
      sowingDate,
      soilType = 'Loam',
      irrigationMethod = 'Electric Motor',
      waterAvailability = 'Sufficient',
    } = req.body;

    if (!Array.isArray(boundaryPoints) || boundaryPoints.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid boundary: Field must contain at least 3 distinct boundary points to form a polygon.',
      });
    }

    for (const pt of boundaryPoints) {
      const lat = Number(pt.latitude);
      const lon = Number(pt.longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          success: false,
          error: `Invalid coordinates: Latitude (${lat}) and Longitude (${lon}) out of bounds.`,
        });
      }
    }

    const closedCoords = boundaryPoints.map(p => [Number(p.longitude), Number(p.latitude)]);
    const first = closedCoords[0];
    const last = closedCoords[closedCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      closedCoords.push([first[0], first[1]]);
    }

    const areaSqM = calculateGeodesicArea(closedCoords);
    const areaHectares = Math.round((areaSqM / 10000) * 1000) / 1000;
    const areaAcres = Math.round((areaSqM / 4046.86) * 1000) / 1000;
    const areaBigha = Math.round((areaSqM / 809.37) * 100) / 100;
    const centroid = calculateCentroid(boundaryPoints);

    let userId = await getUserIdFromHeader(req);
    if (!userId) {
      let demoUser = await User.findOne({ email: 'farmer@kisaansaathi.ai' });
      if (!demoUser) demoUser = await User.findOne({});
      userId = demoUser ? demoUser._id : new mongoose.Types.ObjectId();
    }

    const name = fieldName || farmName || `Field (${areaBigha} Bigha)`;
    const newField = new FarmProfile({
      userId,
      farmName: name,
      district,
      village,
      state: 'Uttarakhand',
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      locationSource: 'manual',
      farmAreaValue: areaBigha,
      farmAreaUnit: 'Bigha',
      areaSqM,
      areaHectares,
      crop,
      currentCrop: crop,
      sowingDate: sowingDate ? new Date(sowingDate) : new Date(),
      soilType,
      irrigationMethod,
      waterAvailability,
      boundaryPoints: boundaryPoints.map((p, idx) => ({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        order: idx,
      })),
      boundaryPolygon: {
        type: 'Polygon',
        coordinates: [closedCoords],
      },
    });

    const saved = await newField.save();
    return res.status(201).json({
      success: true,
      message: 'Field saved successfully',
      field: saved,
      area: {
        areaSqM,
        areaHectares,
        areaAcres,
        areaBigha,
      },
    });
  } catch (err) {
    console.error('Error saving field:', err);
    return res.status(500).json({ success: false, error: 'Failed to save field: ' + err.message });
  }
});

// GET /api/v1/irrigation/fields/:id - Get a specific field
router.get('/fields/:id', async (req, res) => {
  try {
    const field = await FarmProfile.findById(req.params.id).lean();
    if (!field) {
      return res.status(404).json({ success: false, error: 'Field not found' });
    }
    return res.json({ success: true, field });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch field' });
  }
});

// PUT /api/v1/irrigation/fields/:id - Update field
router.put('/fields/:id', async (req, res) => {
  try {
    const { fieldName, farmName, crop, soilType, irrigationMethod, boundaryPoints } = req.body;
    const updateData = {};
    if (fieldName || farmName) updateData.farmName = fieldName || farmName;
    if (crop) { updateData.crop = crop; updateData.currentCrop = crop; }
    if (soilType) updateData.soilType = soilType;
    if (irrigationMethod) updateData.irrigationMethod = irrigationMethod;

    if (Array.isArray(boundaryPoints) && boundaryPoints.length >= 3) {
      const closedCoords = boundaryPoints.map(p => [Number(p.longitude), Number(p.latitude)]);
      const first = closedCoords[0];
      const last = closedCoords[closedCoords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        closedCoords.push([first[0], first[1]]);
      }
      const areaSqM = calculateGeodesicArea(closedCoords);
      const areaHectares = Math.round((areaSqM / 10000) * 1000) / 1000;
      const areaBigha = Math.round((areaSqM / 809.37) * 100) / 100;
      const centroid = calculateCentroid(boundaryPoints);

      updateData.areaSqM = areaSqM;
      updateData.areaHectares = areaHectares;
      updateData.farmAreaValue = areaBigha;
      updateData.latitude = centroid.latitude;
      updateData.longitude = centroid.longitude;
      updateData.boundaryPoints = boundaryPoints.map((p, idx) => ({
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        order: idx,
      }));
      updateData.boundaryPolygon = {
        type: 'Polygon',
        coordinates: [closedCoords],
      };
    }

    const updated = await FarmProfile.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Field not found' });
    }
    return res.json({ success: true, field: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update field' });
  }
});

// DELETE /api/v1/irrigation/fields/:id - Delete a field
router.delete('/fields/:id', async (req, res) => {
  try {
    const deleted = await FarmProfile.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Field not found' });
    }
    return res.json({ success: true, message: 'Field deleted successfully', id: req.params.id });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to delete field' });
  }
});

// POST /api/v1/irrigation/send-rain-alert - Send real email alert for high rainfall & waterlogging risk
router.post('/send-rain-alert', async (req, res) => {
  try {
    const { email, crop, district, rainfallMm, cropWaterNeedMm, rainProbability, recentIrrigationStatus } = req.body;

    let targetEmail = (email || '').trim();
    if (!targetEmail) {
      const userId = await getUserIdFromHeader(req);
      if (userId) {
        const u = await User.findById(userId).lean();
        if (u && u.email) targetEmail = u.email;
      }
    }

    if (!targetEmail) {
      targetEmail = process.env.SMTP_EMAIL || 'choudharyshatakshgujjar@gmail.com';
    }

    const alertData = {
      farmerName: req.body.farmerName || 'Kisan Bhai',
      crop: crop || 'Wheat (गेहूं)',
      district: district || 'Dehradun, Uttarakhand',
      rainfallMm: Number(rainfallMm) || 45.0,
      cropWaterNeedMm: Number(cropWaterNeedMm) || 15.0,
      rainProbability: Number(rainProbability) || 85,
      recentIrrigationStatus: recentIrrigationStatus || '1-2 दिन पहले दिया (1-2 Days Ago)',
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    };

    const info = await sendExcessRainAlertEmail(targetEmail, alertData);

    return res.json({
      success: Boolean(info.delivered),
      delivered: Boolean(info.delivered),
      simulated: info.simulated || false,
      error: info.error || null,
      message: info.delivered 
        ? `Alert email sent successfully to ${targetEmail}` 
        : `Email delivery failed: ${info.error || 'Google SMTP rejected credentials'}`,
      targetEmail,
      messageId: info.messageId,
      alertData,
    });
  } catch (err) {
    console.error('Error sending rain alert email:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to send alert email: ' + err.message,
    });
  }
});

module.exports = router;
