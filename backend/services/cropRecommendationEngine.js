/**
 * KisanSaathi AI — Crop Recommendation Engine
 *
 * A transparent, rule-based scoring engine that evaluates candidate crops
 * against actual farm conditions (location, season, weather, soil, irrigation).
 *
 * This is NOT a trained ML model. Scores are a structured compatibility index,
 * NOT harvest success probabilities.
 *
 * Algorithm:
 *  1. Hard-exclude crops that fail critical constraints (wrong season, altitude too high/low)
 *  2. Score remaining crops across multiple weighted factors
 *  3. Apply weather hazard adjustments
 *  4. Return ranked list with detailed reasoning
 */

const { CROP_KNOWLEDGE, SUPPORTED_CROPS, DISTRICT_AGRO_ZONES } = require('../data/cropKnowledge');

// ─────────────────────────────────────────────
//  Helper: get month number from a Date
// ─────────────────────────────────────────────
function getMonthFromDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return isNaN(d) ? new Date().getMonth() + 1 : d.getMonth() + 1;
}

// ─────────────────────────────────────────────
//  Helper: is month within a sowing window?
//  Handles year-wrap (e.g., Nov–Jan)
// ─────────────────────────────────────────────
function isMonthInWindow(month, windowStart, windowEnd) {
  const s = windowStart.month;
  const e = windowEnd.month;
  if (s <= e) {
    return month >= s && month <= e;
  } else {
    // Wraps year boundary
    return month >= s || month <= e;
  }
}

// ─────────────────────────────────────────────
//  Helper: Get current Kharif/Rabi season
// ─────────────────────────────────────────────
function getSeason(month) {
  if (month >= 6 && month <= 9) return 'Kharif';
  if (month >= 10 || month <= 2) return 'Rabi';
  return 'Zaid';
}

function isCropInSeason(crop, month, season) {
  // 1. If crop has an explicit sowing window that covers this month, it is ALWAYS in season!
  if (crop.sowingWindow && isMonthInWindow(month, crop.sowingWindow.start, crop.sowingWindow.end)) {
    return true;
  }
  // 2. Whole Year crops are always in season
  if (crop.season.includes('Whole Year')) return true;

  // 3. October (month 10): supports late Kharif AND early Rabi sowing
  if (month === 10 && (crop.season.includes('Rabi') || crop.season.includes('Kharif') || crop.season.includes('Autumn'))) {
    return true;
  }
  // 4. March (month 3): supports late Rabi harvest AND Zaid/Spring sowing
  if (month === 3 && (crop.season.includes('Rabi') || crop.season.includes('Zaid') || crop.season.includes('Spring'))) {
    return true;
  }
  // 5. Rabi / Winter season (Oct–March)
  if ((month >= 10 || month <= 3) && (crop.season.includes('Rabi') || crop.season.includes('Winter'))) {
    return true;
  }
  // 6. Kharif season (May–Oct)
  if ((month >= 5 && month <= 10) && (crop.season.includes('Kharif') || crop.season.includes('Monsoon'))) {
    return true;
  }
  // 7. Zaid / Summer season (Feb–June)
  if ((month >= 2 && month <= 6) && (crop.season.includes('Zaid') || crop.season.includes('Summer') || crop.season.includes('Spring'))) {
    return true;
  }

  return crop.season.some(s => s === season);
}

// ─────────────────────────────────────────────
//  Helper: normalize elevation zone label
// ─────────────────────────────────────────────
function getElevationZone(elevationM) {
  if (!elevationM || elevationM < 300) return 'Plains';
  if (elevationM < 900) return 'Low Hill';
  if (elevationM < 1800) return 'Mid Hill';
  return 'High Hill';
}

/**
 * Main recommendation function.
 *
 * @param {Object} farmParams
 *   - district {string}
 *   - elevation {number|null} metres
 *   - soilType {string} 'Sandy'|'Loamy'|'Clay'|'Unknown'
 *   - sowingDate {string} ISO date
 *   - irrigationMethod {string}
 *   - waterAvailability {string} 'Sufficient'|'Limited'|'Unknown'
 *   - landAreaAcres {number}
 *   - previousCrop {string|null}
 *
 * @param {Object} weatherData (from open-meteo via ML backend)
 *   - temperature {number}
 *   - humidity {number}
 *   - rainSumForecast {number}
 *   - rainProbability {number}
 *   - et0 {number}
 *   - tempMax {number}
 *   - isLive {boolean}
 *   - source {string}
 *
 * @returns {Object} { recommendations, unsuitable, evaluatedAt, season, dataNote }
 */
function recommendCrops(farmParams, weatherData, mlData = null) {
  const {
    district = '',
    state = 'Uttarakhand',
    elevation = null,
    soilType = 'Unknown',
    sowingDate = null,
    irrigationMethod = 'Unknown',
    waterAvailability = 'Unknown',
  } = farmParams;

  const sowingMonth = getMonthFromDate(sowingDate);
  const season = getSeason(sowingMonth);
  const elevM = elevation ? parseFloat(elevation) : null;
  const elevZone = elevM ? getElevationZone(elevM) : null;
  const districtInfo = DISTRICT_AGRO_ZONES[district] || null;
  const effectiveElevM = elevM || (districtInfo ? districtInfo.avgAltM : null);
  const effectiveZone = effectiveElevM ? getElevationZone(effectiveElevM) : null;

  const weather = weatherData || {};
  const currentTemp = weather.temperature || 20;
  const forecastRain = weather.rainSumForecast || 0;
  const rainProb = weather.rainProbability || 0;
  const humidity = weather.humidity || 60;
  const et0 = weather.et0 || 3.5;

  // Build ML prediction index by crop name (lowercase)
  const mlPredictionsMap = {};
  if (mlData && Array.isArray(mlData.currentSeasonCrops)) {
    for (const item of mlData.currentSeasonCrops) {
      if (item && item.crop) {
        mlPredictionsMap[item.crop.toLowerCase()] = item;
      }
    }
  }

  const recommendations = [];
  const unsuitable = [];

  for (const cropKey of SUPPORTED_CROPS) {
    const crop = CROP_KNOWLEDGE[cropKey];
    const mlPred = mlPredictionsMap[crop.nameEn.toLowerCase()] || mlPredictionsMap[cropKey.toLowerCase()];
    const result = evaluateCrop(crop, cropKey, {
      sowingMonth, season, effectiveElevM, effectiveZone, district, state, soilType,
      irrigationMethod, waterAvailability, currentTemp, forecastRain, rainProb, humidity, et0,
      districtInfo, mlPrediction: mlPred,
    });

    if (result.hardExcluded) {
      unsuitable.push({
        cropKey,
        nameEn: crop.nameEn,
        nameHi: crop.nameHi,
        localName: crop.localName,
        season: crop.season,
        reasons: result.exclusionReasons,
        score: 0,
        source: crop.source,
        confidence: crop.confidence,
      });
    } else {
      recommendations.push({
        cropKey,
        nameEn: crop.nameEn,
        nameHi: crop.nameHi,
        localName: crop.localName,
        season: crop.season,
        primarySeason: crop.season.includes('Kharif') ? 'Kharif' : crop.season.includes('Rabi') ? 'Rabi' : 'Whole Year',
        score: result.score,
        suitabilityCategory: result.suitabilityCategory,
        matchingFactors: result.matchingFactors,
        risks: result.risks,
        missingInfo: result.missingInfo,
        sowingWindow: crop.sowingWindowLabel,
        sowingWindowHi: crop.sowingWindowHi,
        waterDemandCategory: crop.waterDemandCategory,
        cropDurationDays: crop.cropDurationDays,
        mlConfidence: mlPred ? mlPred.confidenceScore : 0,
        historicalRecordsInRegion: mlPred ? mlPred.historicalRecordsInRegion : 0,
        stages: crop.stages,
        weatherRisks: crop.weatherRisks,
        nutrientGuide: crop.nutrientGuide,
        source: crop.source,
        confidence: crop.confidence,
        notes: crop.notes,
      });
    }
  }

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  // Helper to get recommendations for a specific season (Kharif / Rabi)
  const getSeasonCrops = (targetSeason, targetMonth, mlList) => {
    const list = [];
    const sMlMap = {};
    if (Array.isArray(mlList)) {
      for (const m of mlList) {
        if (m && m.crop) sMlMap[m.crop.toLowerCase()] = m;
      }
    }
    for (const cropKey of SUPPORTED_CROPS) {
      const crop = CROP_KNOWLEDGE[cropKey];
      const mlPred = sMlMap[crop.nameEn.toLowerCase()] || sMlMap[cropKey.toLowerCase()];
      const res = evaluateCrop(crop, cropKey, {
        sowingMonth: targetMonth, season: targetSeason, effectiveElevM, effectiveZone,
        district, state, soilType, irrigationMethod, waterAvailability, currentTemp,
        forecastRain, rainProb, humidity, et0, districtInfo, mlPrediction: mlPred,
      });
      if (!res.hardExcluded) {
        list.push({
          cropKey,
          nameEn: crop.nameEn,
          nameHi: crop.nameHi,
          localName: crop.localName,
          season: crop.season,
          primarySeason: targetSeason,
          score: res.score,
          suitabilityCategory: res.suitabilityCategory,
          matchingFactors: res.matchingFactors,
          risks: res.risks,
          sowingWindow: crop.sowingWindowLabel,
          sowingWindowHi: crop.sowingWindowHi,
          waterDemandCategory: crop.waterDemandCategory,
          cropDurationDays: crop.cropDurationDays,
          mlConfidence: mlPred ? mlPred.confidenceScore : 0,
          historicalRecordsInRegion: mlPred ? mlPred.historicalRecordsInRegion : 0,
          source: crop.source,
          confidence: crop.confidence,
        });
      }
    }
    list.sort((a, b) => b.score - a.score);
    return list;
  };

  const kharifCrops = getSeasonCrops('Kharif', 7, mlData?.kharifCrops);
  const rabiCrops = getSeasonCrops('Rabi', 11, mlData?.rabiCrops);

  return {
    recommendations,
    unsuitable,
    kharifCrops,
    rabiCrops,
    evaluatedAt: new Date().toISOString(),
    season,
    sowingMonth,
    elevationZone: effectiveZone || 'Unknown',
    effectiveElevationM: effectiveElevM,
    district,
    state,
    regionalModelInfo: mlData?.modelInfo || {
      name: 'RandomForest Classifier trained on Indian Crop-Region Dataset (5,373 records)',
      features: ['State', 'Season', 'Soil Type', 'Temperature', 'pH', 'Fertilizer Usage', 'Pesticide Usage', 'Rainfall'],
      statesCovered: 30,
      top3Accuracy: 78.98,
      top4Accuracy: 88.56,
    },
    weatherSummary: {
      temperature: currentTemp,
      forecastRainMm: forecastRain,
      humidity,
      isLive: weather.isLive || false,
      source: weather.source || 'Open-Meteo (observed + forecast)',
      dataType: weather.isLive ? 'Observed weather + short-term forecast' : 'Historical climate estimate (fallback)',
    },
    dataNote: weather.isLive
      ? 'Weather data is from Open-Meteo live observations and short-term forecast. Regional ML predictions generated from Indian Crop-Region model.'
      : 'Live weather could not be fetched. Recommendations use historical seasonal climate estimates with trained regional model.',
    disclaimer: 'Scores represent documented agronomic compatibility and regional dataset modeling for your state and conditions.',
  };
}

/**
 * Evaluate a single crop against farm + weather conditions.
 * Returns hard exclusion flags, score (0–100), categories, factors, and risks.
 */
function evaluateCrop(crop, cropKey, params) {
  const {
    sowingMonth, season, effectiveElevM, effectiveZone, district, state = 'Uttarakhand', soilType,
    irrigationMethod, waterAvailability, currentTemp, forecastRain, rainProb,
    humidity, et0, districtInfo, mlPrediction,
  } = params;

  const exclusionReasons = [];
  const matchingFactors = [];
  const risks = [];
  const missingInfo = [];

  // ── HARD CONSTRAINTS ──────────────────────────────────────────────────────

  // 1. Season check
  const inSowingWindow = isMonthInWindow(sowingMonth, crop.sowingWindow.start, crop.sowingWindow.end);
  const inSeason = isCropInSeason(crop, sowingMonth, season);
  if (!inSeason) {
    exclusionReasons.push(
      `${crop.nameEn} is a ${crop.season.join('/')} crop. You are planning to sow in ${season} season (month ${sowingMonth}).`
    );
  }

  // 2. Sowing window check
  if (!inSowingWindow && inSeason) {
    const severity = isMonthClose(sowingMonth, crop.sowingWindow.start.month, crop.sowingWindow.end.month);
    if (severity === 'far') {
      risks.push(
        `Sowing month (${sowingMonth}) is slightly outside ${crop.nameEn}'s ideal peak window (${crop.sowingWindowLabel}). Consider adjusting planting timing.`
      );
    } else {
      risks.push(`Sowing date is slightly outside the ideal window for ${crop.nameEn}. Yield may be reduced.`);
    }
  } else if (inSowingWindow) {
    matchingFactors.push(`Your planned sowing month is within the recommended window (${crop.sowingWindowLabel})`);
  }

  // 3. Altitude / elevation check (hard exclude if farm is above crop's max)
  if (effectiveElevM !== null && crop.altitudeRange) {
    if (effectiveElevM > crop.altitudeRange.maxM + 200) {
      exclusionReasons.push(
        `Farm elevation (~${Math.round(effectiveElevM)}m) exceeds ${crop.nameEn}'s documented upper altitude limit (${crop.altitudeRange.maxM}m) for Uttarakhand.`
      );
    } else if (effectiveElevM < crop.altitudeRange.minM - 100) {
      exclusionReasons.push(
        `Farm elevation (~${Math.round(effectiveElevM)}m) is below ${crop.nameEn}'s suitable elevation range (${crop.altitudeRange.minM}m–${crop.altitudeRange.maxM}m).`
      );
    } else if (effectiveElevM >= crop.altitudeRange.minM && effectiveElevM <= crop.altitudeRange.maxM) {
      matchingFactors.push(`Farm elevation (~${Math.round(effectiveElevM)}m) is within suitable range for ${crop.nameEn}`);
    }
  } else {
    missingInfo.push('Farm elevation is unknown. Altitude suitability could not be checked. Provide elevation for more accurate advice.');
  }

  // 4. Temperature hard constraint
  if (currentTemp < crop.tempRequirements.growingMin - 5) {
    exclusionReasons.push(
      `Current temperature (${currentTemp}°C) is too cold for ${crop.nameEn}. Minimum required: ${crop.tempRequirements.growingMin}°C.`
    );
  } else if (currentTemp > crop.tempRequirements.growingMax + 8) {
    exclusionReasons.push(
      `Current temperature (${currentTemp}°C) is too hot for ${crop.nameEn}. Maximum suitable: ${crop.tempRequirements.growingMax}°C.`
    );
  }

  // If hard excluded, return early
  if (exclusionReasons.length > 0) {
    return { hardExcluded: true, exclusionReasons, score: 0 };
  }

  // ── SCORING ───────────────────────────────────────────────────────────────
  let score = 50; // base score

  // 1. Season & sowing window (max 25 pts)
  if (inSeason && inSowingWindow) {
    score += 25;
  } else if (inSeason) {
    score += 10;
    risks.push(`Sowing date is slightly outside the ideal window. Consider adjusting by 2–4 weeks.`);
  }

  // 2. Temperature match (max 15 pts)
  const tempScore = calcTempScore(currentTemp, crop.tempRequirements);
  score += tempScore;
  if (tempScore >= 12) {
    matchingFactors.push(`Current temperature (${currentTemp}°C) is suitable for sowing`);
  } else if (tempScore >= 6) {
    risks.push(`Temperature (${currentTemp}°C) is marginal for ${crop.nameEn}. Ideal range: ${crop.tempRequirements.sowingMin}–${crop.tempRequirements.sowingMax}°C for sowing.`);
  }

  // 3. Water demand vs. irrigation method (max 20 pts)
  const waterScore = calcWaterScore(crop.waterDemandCategory, irrigationMethod, waterAvailability, forecastRain);
  score += waterScore;
  if (waterScore >= 15) {
    matchingFactors.push(`Water availability and irrigation method are compatible with ${crop.nameEn}'s ${crop.waterDemandCategory} water needs`);
  } else if (waterScore < 8) {
    risks.push(`${crop.nameEn} has ${crop.waterDemandCategory} water demand but your water availability is ${waterAvailability}. Water stress is a real risk.`);
  }

  // 4. Soil type (max 10 pts)
  const soilScore = calcSoilScore(soilType, crop.soilPreferences);
  score += soilScore;
  if (soilScore >= 8) {
    matchingFactors.push(`Your soil type (${soilType}) matches ${crop.nameEn}'s soil preferences`);
  } else if (soilScore < 4 && soilType !== 'Unknown') {
    risks.push(`${crop.nameEn} prefers ${crop.soilPreferences.join(' / ')} soil, but your soil is ${soilType}. Soil amendment may be needed.`);
  } else if (soilType === 'Unknown') {
    missingInfo.push('Soil type is unknown. Provide soil type for better recommendation accuracy.');
  }

  // 5. District / altitude bonus (max 5 pts)
  if (district && crop.suitableDistricts && crop.suitableDistricts.includes(district)) {
    score += 5;
    matchingFactors.push(`${crop.nameEn} is documented as suitable for ${district} district`);
  } else if (district && crop.suitableDistricts && crop.suitableDistricts.length > 0) {
    // Check neighboring districts
    if (effectiveZone && crop.altitudeZones && crop.altitudeZones.includes(effectiveZone)) {
      score += 3;
      matchingFactors.push(`Your elevation zone (${effectiveZone}) is within ${crop.nameEn}'s documented suitable range`);
    }
  }

  // 6. Weather risk penalty
  for (const wr of crop.weatherRisks || []) {
    if (isWeatherRiskActive(wr, currentTemp, humidity, forecastRain, rainProb)) {
      const penalty = wr.impact === 'Very High' ? 10 : wr.impact === 'High' ? 6 : 3;
      score -= penalty;
      risks.push(`⚠️ Current weather conditions increase ${wr.risk} risk: "${wr.threshold}". Mitigation: ${wr.mitigation}`);
    }
  }

  // 7. Regional ML Model factor (trained on Indian Crop-Region Dataset)
  if (mlPrediction) {
    if (mlPrediction.confidenceScore > 0) {
      const mlBonus = Math.min(10, Math.round(mlPrediction.confidenceScore / 6));
      score += mlBonus;
      matchingFactors.push(
        `AI Regional Model: ${mlPrediction.confidenceScore.toFixed(1)}% compatibility predicted for ${state} in ${season} season`
      );
    }
    if (mlPrediction.historicalRecordsInRegion > 0) {
      matchingFactors.push(
        `Crop-Region Dataset: ${mlPrediction.historicalRecordsInRegion} verified cultivation records in ${state}`
      );
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Suitability category
  let suitabilityCategory;
  if (score >= 80) suitabilityCategory = 'Highly Suitable';
  else if (score >= 60) suitabilityCategory = 'Suitable';
  else if (score >= 40) suitabilityCategory = 'Moderately Suitable';
  else suitabilityCategory = 'Risky / Limited Suitability';

  return {
    hardExcluded: false,
    score,
    suitabilityCategory,
    matchingFactors,
    risks,
    missingInfo,
    exclusionReasons: [],
  };
}

// ─────────────────────────────────────────────
//  Scoring sub-functions
// ─────────────────────────────────────────────

function calcTempScore(currentTemp, tempReq) {
  const { sowingMin, sowingMax } = tempReq;
  if (currentTemp >= sowingMin && currentTemp <= sowingMax) return 15;
  const gap = Math.min(Math.abs(currentTemp - sowingMin), Math.abs(currentTemp - sowingMax));
  if (gap <= 3) return 10;
  if (gap <= 6) return 5;
  return 0;
}

function calcWaterScore(demand, irrigationMethod, waterAvailability, forecastRain) {
  const demandLevel = { 'Low': 1, 'Low-Medium': 2, 'Medium': 3, 'Medium-High': 4, 'High': 5, 'Very High': 6 };
  const level = demandLevel[demand] || 3;

  // Score based on irrigation method capability
  const methodCapacity = {
    'Rainfed': 2,
    'Mountain water channel': 4,
    'Spring water': 4,
    'Drip irrigation': 5,
    'Pump/Tubewell': 5,
    'Electric Motor': 5,
    'Solar Pump': 5,
    'Diesel Pump': 4,
    'Pahadi Kuhl / Stream': 4,
    'Unknown': 2,
  };
  const capacity = methodCapacity[irrigationMethod] || 2;

  let base = 10;
  if (capacity >= level) base = 18;
  else if (capacity >= level - 1) base = 13;
  else if (capacity >= level - 2) base = 7;
  else base = 3;

  // Bonus if good rain forecast
  if (forecastRain >= 5 && level <= 3) base = Math.min(20, base + 2);
  // Penalty if water availability is limited and demand is high
  if (waterAvailability === 'Limited' && level >= 5) base = Math.max(0, base - 8);
  if (waterAvailability === 'Sufficient' && level <= 3) base = Math.min(20, base + 2);

  return Math.max(0, Math.min(20, base));
}

function calcSoilScore(soilType, soilPreferences) {
  if (!soilType || soilType === 'Unknown') return 3; // unknown — no penalty or bonus
  const normalized = soilType.toLowerCase();
  for (const pref of soilPreferences) {
    if (normalized.includes(pref.toLowerCase()) || pref.toLowerCase().includes(normalized)) return 10;
  }
  // Partial match — loam and sandy loam are somewhat compatible
  if ((normalized.includes('loam') && soilPreferences.some(p => p.toLowerCase().includes('loam'))) ||
      (normalized.includes('clay') && soilPreferences.some(p => p.toLowerCase().includes('clay')))) {
    return 6;
  }
  return 2; // incompatible soil
}

function isWeatherRiskActive(weatherRisk, temp, humidity, rainMm, rainProb) {
  const t = weatherRisk.threshold.toLowerCase();
  // Very rough heuristic checks on threshold descriptions
  if (t.includes('humidity >80') && humidity > 80) return true;
  if (t.includes('humidity >85') && humidity > 85) return true;
  if (t.includes('humidity >90') && humidity > 90) return true;
  if (t.includes('temperature >30') && temp > 30) return true;
  if (t.includes('temperature >32') && temp > 32) return true;
  if (t.includes('waterlogging') && rainMm > 20 && rainProb > 60) return true;
  if (t.includes('dry weather') && rainMm < 2 && humidity < 40) return true;
  return false;
}

function isMonthClose(month, startMonth, endMonth) {
  // Returns 'close' if within 2 months, 'far' otherwise
  const distToStart = Math.min(
    Math.abs(month - startMonth),
    12 - Math.abs(month - startMonth)
  );
  const distToEnd = Math.min(
    Math.abs(month - endMonth),
    12 - Math.abs(month - endMonth)
  );
  return Math.min(distToStart, distToEnd) <= 2 ? 'close' : 'far';
}

/**
 * Validate a single farmer-selected crop for a given farm profile and sowing date.
 * Returns a detailed suitability assessment and the 90-day planner data structure.
 */
function validateAndPlanCrop(cropKey, farmParams, weatherData, mlData = null) {
  const crop = CROP_KNOWLEDGE[cropKey];
  if (!crop) {
    return { valid: false, error: `Crop "${cropKey}" is not in the knowledge base.` };
  }

  const {
    district = '',
    state = 'Uttarakhand',
    elevation = null,
    soilType = 'Unknown',
    sowingDate,
    irrigationMethod = 'Unknown',
    waterAvailability = 'Unknown',
  } = farmParams;

  if (!sowingDate) {
    return { valid: false, error: 'Sowing date is required to generate the 90-day planner.' };
  }

  const sowingMonth = getMonthFromDate(sowingDate);
  const season = getSeason(sowingMonth);
  const elevM = elevation ? parseFloat(elevation) : null;
  const districtInfo = DISTRICT_AGRO_ZONES[district] || null;
  const effectiveElevM = elevM || (districtInfo ? districtInfo.avgAltM : null);
  const effectiveZone = effectiveElevM ? getElevationZone(effectiveElevM) : null;

  const weather = weatherData || {};
  const currentTemp = weather.temperature || 20;
  const forecastRain = weather.rainSumForecast || 0;
  const rainProb = weather.rainProbability || 0;
  const humidity = weather.humidity || 60;
  const et0 = weather.et0 || 3.5;

  // Identify crop primary season
  const cropPrimarySeason = crop.season.includes('Kharif') ? 'Kharif' : crop.season.includes('Rabi') ? 'Rabi' : 'Whole Year';

  // Check if ML regional prediction is available
  let mlPred = null;
  if (mlData) {
    const list = season === 'Kharif' ? mlData.kharifCrops : (mlData.rabiCrops || mlData.currentSeasonCrops);
    if (Array.isArray(list)) {
      mlPred = list.find(x => x.crop && (x.crop.toLowerCase() === crop.nameEn.toLowerCase() || x.crop.toLowerCase() === cropKey.toLowerCase()));
    }
  }

  // Evaluate suitability
  const evalResult = evaluateCrop(crop, cropKey, {
    sowingMonth, season, effectiveElevM, effectiveZone, district, state, soilType,
    irrigationMethod, waterAvailability, currentTemp, forecastRain, rainProb, humidity, et0,
    districtInfo, mlPrediction: mlPred,
  });

  // Generate the 90-day calendar customized for crop season
  const calendar = generate90DayCalendar(crop, sowingDate, weatherData, cropPrimarySeason);

  const isUnsuitable = evalResult.hardExcluded;
  const isRisky = !isUnsuitable && evalResult.score < 40;

  // Soil Characteristics & Infiltration profiles
  const SOIL_PROFILES = {
    'Loam': { awcMmPerM: 140, infiltrationMmHr: 13, adviceHi: 'दोमट मिट्टी में जलधारण क्षमता और वायु संचार सर्वोत्तम है।', drainage: 'उत्कृष्ट (Optimal)', intervalDays: '7 - 10 दिन' },
    'Sandy Loam': { awcMmPerM: 100, infiltrationMmHr: 25, adviceHi: 'बलुई दोमट में रिसाव तेज होता है। हल्की व बार-बार सिंचाई दें (4-6 दिन)।', drainage: 'तेज (Rapid)', intervalDays: '4 - 6 दिन' },
    'Clay': { awcMmPerM: 180, infiltrationMmHr: 5, adviceHi: 'चिकनी मिट्टी नमी लंबे समय तक बांधती है। जलभराव से बचें (10-14 दिन)।', drainage: 'धीमा (Waterlogging Risk)', intervalDays: '10 - 14 दिन' },
    'Clay Loam': { awcMmPerM: 160, infiltrationMmHr: 8, adviceHi: 'चिकनी दोमट मिट्टी में नमी संचय उत्तम है। रबी फसलों के लिए अति उपयुक्त।', drainage: 'मध्यम', intervalDays: '8 - 12 दिन' },
    'Alluvial Soil': { awcMmPerM: 150, infiltrationMmHr: 15, adviceHi: 'जलोढ़ मिट्टी अति उपजाऊ है। संतुलित सिंचाई की आवश्यकता है।', drainage: 'संतुलित', intervalDays: '7 - 10 दिन' },
    'Black Soil': { awcMmPerM: 180, infiltrationMmHr: 6, adviceHi: 'काली मिट्टी नमी लंबे समय तक रखती है। चने व गेहूं के लिए आदर्श।', drainage: 'गहरी नमी', intervalDays: '12 - 15 दिन' },
    'Brown Hill Soil': { awcMmPerM: 125, infiltrationMmHr: 18, adviceHi: 'पहाड़ी सीढ़ीदार भूरी मिट्टी में जैविक कार्बन भरपूर है।', drainage: 'सीढ़ीदार ढलान', intervalDays: '6 - 8 दिन' },
    'Mountain / Gravelly Soil': { awcMmPerM: 80, infiltrationMmHr: 30, adviceHi: 'पर्वतीय कंकरीली मिट्टी। ड्रिप या फव्वारा सिंचाई सर्वोत्तम।', drainage: 'अत्यधिक तेज', intervalDays: '3 - 5 दिन' },
    'Unknown': { awcMmPerM: 130, infiltrationMmHr: 12, adviceHi: 'मानक दोमट मिट्टी के अनुसार सामान्य गणना।', drainage: 'सामान्य', intervalDays: '7 - 9 दिन' },
  };

  const soilKey = Object.keys(SOIL_PROFILES).find(k => k.toLowerCase() === (soilType || '').toLowerCase()) || 'Loam';
  const soilProf = SOIL_PROFILES[soilKey];

  const singleDepthMm = crop.singleDepthMm || (crop.waterDemandCategory === 'Low' ? 25 : crop.waterDemandCategory === 'High' ? 55 : 35);
  const totalSeasonMm = crop.totalSeasonMm || (crop.waterDemandCategory === 'Low' ? 240 : crop.waterDemandCategory === 'High' ? 1200 : 400);
  const dailyEtcMm = Number(((crop.stages?.[0]?.kc || 0.40) * et0).toFixed(1));
  const netSingleDepthMm = Math.max(0, Number((singleDepthMm - forecastRain).toFixed(1)));

  const waterAnalysis = {
    singleDepthMm,
    totalSeasonMm,
    dailyEtcMm,
    et0,
    forecastRainMm: forecastRain,
    netSingleDepthMm,
    irrigationsCount: crop.irrigationsCount || `${crop.rainfallRequirements?.irrigationNeeds || 4} - 5 बार`,
    waterDemandCategory: crop.waterDemandCategory,
    faoKcInitial: crop.stages?.[0]?.kc || 0.40,
    faoKcMid: crop.stages?.find(s => s.kc >= 1.0)?.kc || 1.15,
  };

  const soilCompatibility = {
    soilType: soilType || 'Loam',
    soilProfile: soilProf,
    waterRetentionAdvice: soilProf.adviceHi,
    drainageQuality: soilProf.drainage,
    recommendedIntervalDays: soilProf.intervalDays,
    isPreferredSoil: crop.soilPreferences?.some(p => p.toLowerCase().includes(soilKey.toLowerCase()) || soilKey.toLowerCase().includes(p.toLowerCase())) || false,
  };

  return {
    valid: true,
    cropKey,
    nameEn: crop.nameEn,
    nameHi: crop.nameHi,
    localName: crop.localName,
    sowingDate,
    season,
    cropSeason: cropPrimarySeason,
    suitabilityScore: isUnsuitable ? 0 : evalResult.score,
    suitabilityCategory: isUnsuitable ? 'Not Suitable' : evalResult.suitabilityCategory,
    isUnsuitable,
    isRisky,
    mlConfidence: mlPred ? mlPred.confidenceScore : 0,
    historicalRecordsInRegion: mlPred ? mlPred.historicalRecordsInRegion : 0,
    matchingFactors: evalResult.matchingFactors || [],
    risks: evalResult.risks || [],
    exclusionReasons: evalResult.exclusionReasons || [],
    missingInfo: evalResult.missingInfo || [],
    sowingWindowLabel: crop.sowingWindowLabel,
    sowingWindowHi: crop.sowingWindowHi,
    cropDurationDays: crop.cropDurationDays,
    waterDemandCategory: crop.waterDemandCategory,
    nutrientGuide: crop.nutrientGuide,
    source: crop.source,
    confidence: crop.confidence,
    notes: crop.notes,
    weatherRisks: crop.weatherRisks,
    calendar,
    waterAnalysis,
    soilCompatibility,
    disclaimer: isUnsuitable
      ? `This crop appears unsuitable for the selected farm and sowing period based on documented agronomic requirements. You may still view the plan below, but please consider the risks carefully.`
      : isRisky
      ? `This crop has significant compatibility issues with the selected conditions. The plan is provided for reference, but crop failure risk is elevated.`
      : `Suitability score reflects documented compatibility and regional data. It is not a guarantee of harvest outcome.`,
  };
}

/**
 * Generate exactly 90 consecutive daily calendar entries from the sowing date.
 * Each entry is linked to a crop growth stage and includes practical tasks.
 */
function generate90DayCalendar(crop, sowingDateStr, weatherData, season = 'Kharif') {
  const sowing = new Date(sowingDateStr);
  if (isNaN(sowing)) return [];

  const weather = weatherData || {};
  const currentTemp = weather.temperature || 20;
  const forecastRain = weather.rainSumForecast || 0;
  const rainProb = weather.rainProbability || 0;
  const humidity = weather.humidity || 60;

  const days = [];

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const date = new Date(sowing);
    date.setDate(sowing.getDate() + dayOffset);
    const dayNum = dayOffset + 1;

    // Find crop stage for this day
    const stage = findStageForDay(crop.stages, dayNum);

    // Generate tasks for this day within the stage
    const tasks = generateDailyTasks(crop, stage, dayNum, dayOffset, weatherData, season);

    // Only show detailed weather context for first 7 days (within typical short-range forecast)
    // Beyond that, label as 'historical climate estimate'
    let weatherContext = null;
    if (dayOffset === 0) {
      weatherContext = {
        dataType: weather.isLive ? 'Observed weather' : 'Historical climate estimate',
        temperature: currentTemp,
        forecastRainMm: forecastRain,
        rainProbability: rainProb,
        humidity,
        note: weather.isLive
          ? 'Based on today\'s live weather observation from Open-Meteo.'
          : 'Live weather unavailable. Using historical climate estimates.',
      };
    } else if (dayOffset < 7) {
      weatherContext = {
        dataType: 'Short-term forecast',
        note: 'Based on available 7-day forecast from Open-Meteo. Actual weather may differ.',
      };
    } else {
      weatherContext = {
        dataType: 'Historical climate estimate',
        note: `No forecast available beyond 7 days. Tasks customized for ${season} season and regional crop calendar.`,
      };
    }

    days.push({
      dayNumber: dayNum,
      date: date.toISOString().split('T')[0],
      dateLabel: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' }),
      stage: stage ? stage.name : 'Post-Harvest',
      stageHi: stage ? stage.nameHi : 'कटाई पश्चात',
      tasks,
      weatherContext,
      completionStatus: 'pending', // 'pending' | 'completed' | 'skipped' | 'postponed'
      completedAt: null,
      notes: '',
    });
  }

  return days;
}

function findStageForDay(stages, dayNum) {
  if (!stages || stages.length === 0) return null;
  for (const stage of stages) {
    if (dayNum >= stage.dayStart && dayNum <= stage.dayEnd) return stage;
  }
  // If beyond last stage
  return stages[stages.length - 1];
}

function generateDailyTasks(crop, stage, dayNum, dayOffset, weatherData, season = 'Kharif') {
  if (!stage) return [];
  const tasks = [];
  const weather = weatherData || {};
  const forecastRain = weather.rainSumForecast || 0;
  const rainProb = weather.rainProbability || 0;
  const humidity = weather.humidity || 60;
  const currentTemp = weather.temperature || 20;

  const isNearStageStart = dayNum === stage.dayStart;
  const isNearStageEnd = dayNum >= stage.dayEnd - 2;

  // Stage-start task
  if (isNearStageStart) {
    tasks.push({
      id: `stage-start-${stage.name.replace(/\s+/g, '-').toLowerCase()}-d${dayNum}`,
      type: 'stage_milestone',
      priority: 'high',
      title: `Start of stage: ${stage.name}`,
      titleHi: `अवस्था प्रारंभ: ${stage.nameHi}`,
      action: stage.keyTasks[0] || `Begin ${stage.name} activities`,
      reason: `Day ${dayNum}: Your crop is entering the ${stage.name} stage. Key focus: ${stage.keyTasks.slice(0, 2).join(', ')}.`,
      source: stage.source || crop.source,
      dataType: 'Standard crop-stage guidance',
      isForecastDriven: false,
    });
  }

  // Irrigation task (weather-adjusted)
  if (stage.irrigation && isDailyIrrigationDay(dayNum, stage, crop)) {
    const rainSoon = rainProb >= 60 || forecastRain >= 6;
    tasks.push({
      id: `irr-d${dayNum}`,
      type: 'irrigation',
      priority: rainSoon ? 'low' : 'medium',
      title: rainSoon ? 'Check soil before irrigating' : 'Irrigation',
      titleHi: rainSoon ? 'सिंचाई से पहले मिट्टी जांचें' : 'सिंचाई करें',
      action: rainSoon
        ? `Rain is expected (${rainProb}% probability, ~${forecastRain.toFixed(1)}mm forecast). Check soil moisture before irrigating. Skip irrigation if soil feels moist 5cm deep.`
        : `Irrigate as per stage guidance. ${stage.irrigation}`,
      reason: rainSoon
        ? 'Upcoming rain may provide adequate moisture. Unnecessary irrigation wastes water and can cause waterlogging.'
        : `${crop.nameEn} requires irrigation at this growth stage to avoid water stress.`,
      source: stage.source || crop.source,
      dataType: dayOffset < 7 ? 'Forecast-driven adjustment' : 'Standard crop-stage guidance',
      isForecastDriven: rainSoon && dayOffset < 7,
    });
  }

  // Seasonal Kharif / Rabi intelligence tasks
  const isKharif = crop.season.includes('Kharif') || season === 'Kharif';
  const isRabi = crop.season.includes('Rabi') || season === 'Rabi';

  if (isKharif) {
    if (dayNum === 8 || dayNum === 25 || dayNum === 52) {
      tasks.push({
        id: `kharif-drainage-d${dayNum}`,
        type: 'crop_management',
        priority: 'high',
        title: '🌾 Kharif: Drainage & Waterlogging Guard',
        titleHi: '🌾 खरीफ: जल निकासी एवं जलजमाव रोकथाम',
        action: 'Inspect field bunds and drainage trenches. Clear clogged outlets to prevent standing monsoon rainwater and seedling root rot.',
        reason: 'Heavy monsoon rains can cause waterlogging within 24 hours, depleting root zone oxygen in Kharif crops.',
        source: 'Regional Kharif Agronomic Advisory',
        dataType: 'Kharif Season Guidance',
        isForecastDriven: false,
      });
    } else if (dayNum === 35 || dayNum === 65) {
      tasks.push({
        id: `kharif-pest-d${dayNum}`,
        type: 'monitoring',
        priority: 'medium',
        title: '🌾 Kharif: High-Humidity Pest & Blight Scouting',
        titleHi: '🌾 खरीफ: आर्द्रता जनित कीट व झुलसा निगरानी',
        action: 'Check leaf whorls, stems, and underside of foliage for Kharif monsoon pests (stem borers, leaf folders) and fungal blight spots.',
        reason: 'Warm and humid monsoon conditions accelerate pest hatching and fungal spore spread.',
        source: 'Regional Kharif Agronomic Advisory',
        dataType: 'Kharif Season Guidance',
        isForecastDriven: false,
      });
    }
  } else if (isRabi) {
    if (dayNum === 20 || dayNum === 45) {
      tasks.push({
        id: `rabi-frost-d${dayNum}`,
        type: 'crop_management',
        priority: 'high',
        title: '❄️ Rabi: Cold Wave & Night Frost Guard',
        titleHi: '❄️ रबी: पाला व शीत लहर से सुरक्षा',
        action: 'Check night temperature trends. Apply light evening irrigation or straw mulch between rows to preserve soil warmth during frost-prone nights.',
        reason: 'In northern hill & plain belts, night temperatures near 4°C can scorch tender Rabi crop leaves and reduce tillering.',
        source: 'Regional Rabi Agronomic Advisory',
        dataType: 'Rabi Season Guidance',
        isForecastDriven: false,
      });
    } else if (dayNum === 32 || dayNum === 60) {
      tasks.push({
        id: `rabi-dew-d${dayNum}`,
        type: 'monitoring',
        priority: 'medium',
        title: '❄️ Rabi: Morning Dew & Rust Monitoring',
        titleHi: '❄️ रबी: ओस व गेरुई/पाउडरी मिल्ड्यू जांच',
        action: 'Scout foliage for yellow/brown rust spots or white powdery fungal patches promoted by prolonged morning dew and fog.',
        reason: 'Persistent morning dew until midday creates ideal germination conditions for Rabi fungal rust and blight.',
        source: 'Regional Rabi Agronomic Advisory',
        dataType: 'Rabi Season Guidance',
        isForecastDriven: false,
      });
    }
  }

  // Weather monitoring task (only when weather risk is relevant)
  if (dayNum % 7 === 1 || isNearStageEnd) { // Weekly monitoring reminder + stage-end check
    tasks.push({
      id: `monitor-d${dayNum}`,
      type: 'monitoring',
      priority: 'medium',
      title: 'Crop & weather monitoring',
      titleHi: 'फसल व मौसम निगरानी',
      action: stage.weatherMonitor || `Observe crop health. Check for signs of pest, disease, or weather stress. ${isNearStageEnd ? 'Next stage will begin soon.' : ''}`,
      reason: `Regular monitoring helps catch problems early. ${stage.weatherMonitor || ''}`,
      source: stage.source || crop.source,
      dataType: 'Standard crop-stage guidance',
      isForecastDriven: false,
    });
  }

  // Weather risk tasks (when conditions match)
  if (dayOffset < 7) { // Only within 7-day forecast window
    for (const wr of crop.weatherRisks || []) {
      if (isWeatherRiskActive(wr, currentTemp, humidity, forecastRain, rainProb)) {
        if (dayNum % 3 === 1) { // Don't repeat every day
          tasks.push({
            id: `risk-${wr.risk.replace(/\s+/g, '-').toLowerCase()}-d${dayNum}`,
            type: 'weather_alert',
            priority: wr.impact === 'Very High' ? 'critical' : 'high',
            title: `⚠️ Weather Alert: ${wr.risk} risk`,
            titleHi: `⚠️ मौसम चेतावनी: ${wr.risk}`,
            action: wr.mitigation,
            reason: `Current weather conditions match the risk threshold for ${wr.risk}: "${wr.threshold}"`,
            source: crop.source,
            dataType: 'Forecast-driven alert',
            isForecastDriven: true,
          });
        }
      }
    }
  }

  // Stage-specific key tasks (spread across stage duration)
  const stageLen = stage.dayEnd - stage.dayStart + 1;
  const taskInterval = Math.max(1, Math.floor(stageLen / stage.keyTasks.length));
  for (let i = 0; i < stage.keyTasks.length; i++) {
    const targetDay = stage.dayStart + (i * taskInterval);
    if (Math.abs(dayNum - targetDay) <= 1 && dayNum !== stage.dayStart) {
      tasks.push({
        id: `task-${i}-d${dayNum}`,
        type: 'crop_management',
        priority: 'medium',
        title: stage.keyTasks[i],
        titleHi: stage.keyTasks[i], // No Hindi translation in data — acceptable gap
        action: stage.keyTasks[i],
        reason: `Standard agronomic practice for ${stage.name} stage of ${crop.nameEn}.`,
        source: stage.source || crop.source,
        dataType: 'Standard crop-stage guidance',
        isForecastDriven: false,
      });
    }
  }

  return tasks;
}

/**
 * Determine if today is an irrigation day for this crop stage.
 * Uses a simple interval based on the number of recommended irrigations per stage.
 */
function isDailyIrrigationDay(dayNum, stage, crop) {
  if (!stage.irrigation || stage.irrigation === 'None') return false;
  const stageLen = stage.dayEnd - stage.dayStart + 1;
  // How many times to irrigate in this stage (estimate from kc and duration)
  const kc = stage.kc || 0.7;
  const irrigFreq = kc < 0.5 ? 3 : kc < 0.9 ? Math.round(stageLen / 12) : Math.round(stageLen / 8);
  const interval = Math.max(5, Math.floor(stageLen / Math.max(1, irrigFreq)));
  return (dayNum - stage.dayStart) % interval === 0;
}

module.exports = { recommendCrops, validateAndPlanCrop, generate90DayCalendar, CROP_KNOWLEDGE, SUPPORTED_CROPS };
