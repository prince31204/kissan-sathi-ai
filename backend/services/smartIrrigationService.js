/**
 * Smart Irrigation Calculation Service (FAO-56 Standard)
 * Scientific estimation of crop water demand, soil water depletion,
 * effective rainfall, and irrigation requirements across growth stages and irrigation methods.
 * 
 * References:
 * - FAO Irrigation and Drainage Paper No. 56 (Crop Evapotranspiration)
 * - ICAR / Indian Agricultural Research Institute (IARI) Crop Parameters
 * - USDA Soil Conservation Service (Effective Rainfall Method)
 */

// -----------------------------------------------------------------------------
// Crop Parameters (FAO-56 Standard for Indian Agriculture)
// -----------------------------------------------------------------------------
const CROP_DATABASE = {
  Wheat: {
    en: 'Wheat',
    hi: 'गेहूं',
    stages: {
      initial: { label: 'Initial (Germination)', labelHi: 'अंकुरण / शुरुआती', days: 20, kc: 0.70, rootDepthM: 0.3 },
      vegetative: { label: 'Vegetative (Tillering/Jointing)', labelHi: 'कल्ले फूटना / वानस्पतिक', days: 40, kc: 1.05, rootDepthM: 0.6 },
      mid: { label: 'Flowering & Grain Filling', labelHi: 'फूल व दाना भराव', days: 40, kc: 1.15, rootDepthM: 0.9 },
      late: { label: 'Maturity / Ripening', labelHi: 'पकने की अवस्था', days: 20, kc: 0.40, rootDepthM: 0.9 },
    },
    depletionFraction: 0.55, // Allowable depletion 'p'
    criticalSmPct: 24.0,
  },
  Rice: {
    en: 'Paddy / Rice',
    hi: 'धान',
    stages: {
      initial: { label: 'Transplanting / Nursery', labelHi: 'रोपाई अवस्था', days: 25, kc: 1.05, rootDepthM: 0.3 },
      vegetative: { label: 'Vegetative / Tillering', labelHi: 'कल्ले फूटना', days: 35, kc: 1.15, rootDepthM: 0.5 },
      mid: { label: 'Panicle / Flowering', labelHi: 'बाली निकलना व फूल', days: 40, kc: 1.25, rootDepthM: 0.6 },
      late: { label: 'Ripening', labelHi: 'पकने की अवस्था', days: 25, kc: 0.70, rootDepthM: 0.6 },
    },
    depletionFraction: 0.20, // Rice requires saturated/near-saturated soil
    criticalSmPct: 35.0,
  },
  Maize: {
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
    en: 'Mustard',
    hi: 'सरसों',
    stages: {
      initial: { label: 'Initial (Emergence)', labelHi: 'शुरुआती अवस्था', days: 20, kc: 0.35, rootDepthM: 0.3 },
      vegetative: { label: 'Vegetative & Rosette', labelHi: 'शाखा निर्माण', days: 30, kc: 0.75, rootDepthM: 0.6 },
      mid: { label: 'Flowering & Pod Formation', labelHi: 'फूल व फली निर्माण', days: 45, kc: 1.05, rootDepthM: 0.9 },
      late: { label: 'Pod Filling & Maturity', labelHi: 'दाना भराव व परिपक्वता', days: 25, kc: 0.35, rootDepthM: 0.9 },
    },
    depletionFraction: 0.60,
    criticalSmPct: 18.0,
  },
  Potato: {
    en: 'Potato',
    hi: 'आलू',
    stages: {
      initial: { label: 'Sprouting / Early', labelHi: 'अंकुरण अवस्था', days: 25, kc: 0.50, rootDepthM: 0.25 },
      vegetative: { label: 'Vegetative Growth', labelHi: 'पौध विकास', days: 30, kc: 0.80, rootDepthM: 0.45 },
      mid: { label: 'Tuber Initiation & Bulking', labelHi: 'कंद निर्माण व बढ़वार', days: 40, kc: 1.15, rootDepthM: 0.6 },
      late: { label: 'Maturity / Die-down', labelHi: 'परिपक्वता', days: 20, kc: 0.75, rootDepthM: 0.6 },
    },
    depletionFraction: 0.35, // Shallow roots, sensitive to water stress
    criticalSmPct: 26.0,
  },
  Sugarcane: {
    en: 'Sugarcane',
    hi: 'गन्ना',
    stages: {
      initial: { label: 'Germination & Tillering', labelHi: 'अंकुरण व कल्ले', days: 60, kc: 0.40, rootDepthM: 0.4 },
      vegetative: { label: 'Formative / Grand Growth', labelHi: 'तेज बढ़वार', days: 120, kc: 1.00, rootDepthM: 0.8 },
      mid: { label: 'Elongation & Sugar Accumulation', labelHi: 'गन्ना विकास', days: 120, kc: 1.25, rootDepthM: 1.2 },
      late: { label: 'Maturity & Ripening', labelHi: 'पकने की अवस्था', days: 60, kc: 0.75, rootDepthM: 1.2 },
    },
    depletionFraction: 0.65,
    criticalSmPct: 24.0,
  },
  Tomato: {
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
  Pulses: {
    en: 'Pulses / Lentil (Dal)',
    hi: 'दालें / मसूर',
    stages: {
      initial: { label: 'Initial (Emergence)', labelHi: 'अंकुरण', days: 20, kc: 0.40, rootDepthM: 0.25 },
      vegetative: { label: 'Vegetative & Branching', labelHi: 'पौध फैलाव', days: 30, kc: 0.70, rootDepthM: 0.50 },
      mid: { label: 'Flowering & Podding', labelHi: 'फूल व फली निर्माण', days: 40, kc: 1.05, rootDepthM: 0.80 },
      late: { label: 'Pod Ripening', labelHi: 'फली पकना', days: 20, kc: 0.35, rootDepthM: 0.80 },
    },
    depletionFraction: 0.55,
    criticalSmPct: 18.0,
  },
};

// -----------------------------------------------------------------------------
// Soil Characteristics (Volumetric Water Content %)
// -----------------------------------------------------------------------------
const SOIL_DATABASE = {
  Loam: { en: 'Loam', hi: 'दोमट', fc: 28.0, wp: 13.0, descHi: 'उत्तम जल धारण और वायु संचार' },
  Clay: { en: 'Clay', hi: 'चिकनी', fc: 38.0, wp: 20.0, descHi: 'अधिक जल धारण, भारी मिट्टी' },
  'Clay Loam': { en: 'Clay Loam', hi: 'चिकनी दोमट', fc: 32.0, wp: 16.0, descHi: 'उपजाऊ व संतुलित' },
  'Sandy Loam': { en: 'Sandy Loam', hi: 'बलुई दोमट', fc: 20.0, wp: 9.0, descHi: 'शीघ्र सूखने वाली हल्की मिट्टी' },
  Sandy: { en: 'Sandy', hi: 'रेतीली', fc: 14.0, wp: 5.0, descHi: 'कम जल धारण क्षमता, शीघ्र सिंचाई आवश्यक' },
};

// -----------------------------------------------------------------------------
// Irrigation Method Efficiencies
// -----------------------------------------------------------------------------
const IRRIGATION_METHODS = {
  Drip: { en: 'Drip Irrigation', hi: 'टपक सिंचाई (ड्रिप)', efficiency: 0.90, descHi: '90% दक्षता — सीधे जड़ों तक' },
  Sprinkler: { en: 'Sprinkler Irrigation', hi: 'फव्वारा सिंचाई (स्प्रिंकलर)', efficiency: 0.75, descHi: '75% दक्षता — समान छिड़काव' },
  Kuhl: { en: 'Mountain Kuhl / Furrow', hi: 'पहाड़ी कूल / नाली प्रवाह', efficiency: 0.65, descHi: '65% दक्षता — प्राकृतिक गुरुत्वाकर्षण प्रवाह' },
  Flood: { en: 'Flood / Basin Irrigation', hi: 'खुला प्रवाह / क्यारी (बाढ़)', efficiency: 0.60, descHi: '60% दक्षता — वाष्पीकरण व रिसाव अधिक' },
};

// -----------------------------------------------------------------------------
// Unit Conversions to Standard Square Meters
// -----------------------------------------------------------------------------
function areaToSquareMeters(area, unit) {
  const a = Math.max(0.01, parseFloat(area) || 1.0);
  const u = (unit || 'acre').toLowerCase();
  if (u.includes('bigha')) return a * 809.37; // Standard North Indian Bigha (~1/5 Acre)
  if (u.includes('hectare') || u.includes('हेक्टेयर')) return a * 10000.0;
  return a * 4046.86; // 1 Acre in m²
}

// -----------------------------------------------------------------------------
// USDA / FAO Effective Rainfall Calculation
// -----------------------------------------------------------------------------
function calculateEffectiveRainfall(totalRainfallMm) {
  const p = Math.max(0, parseFloat(totalRainfallMm) || 0);
  if (p <= 2.0) return 0.0; // Ineffective trace rainfall lost to canopy interception & surface evaporation
  // FAO simplified effective precipitation formula
  const peff = p > 50.0 ? 0.8 * 50.0 + 0.5 * (p - 50.0) : 0.8 * (p - 2.0);
  return Math.round(Math.max(0, peff) * 10) / 10;
}

// -----------------------------------------------------------------------------
// Smart Irrigation Core Calculator (FAO-56 Soil Water Depletion Balance)
// -----------------------------------------------------------------------------
function calculateSmartIrrigation(params) {
  const {
    crop = 'Wheat',
    growthStage = 'mid', // 'initial' | 'vegetative' | 'mid' | 'late'
    soilType = 'Loam',
    farmArea = 1.0,
    areaUnit = 'Acre',
    irrigationMethod = 'Drip',
    currentSoilMoisturePct = null, // null = estimate from days/rain
    daysSinceLastWatering = 4,
    forecastRainfallMm = 0.0,
    recentRainfallMm = 0.0,
    temperatureC = 22.0,
    humidityPct = 60.0,
    windSpeedKmh = 6.0,
    pumpHp = 5.0,
    isHindi = false,
  } = params;

  // 1. Resolve crop and stage
  const cropData = CROP_DATABASE[crop] || CROP_DATABASE.Wheat;
  const stageData = cropData.stages[growthStage] || cropData.stages.mid;
  const soilData = SOIL_DATABASE[soilType] || SOIL_DATABASE.Loam;
  const methodData = IRRIGATION_METHODS[irrigationMethod] || IRRIGATION_METHODS.Flood;

  // 2. Reference Evapotranspiration (ET0) estimation
  // Hargreaves / Simplified Penman-Monteith approximation for hill regions
  const temp = Math.max(5.0, parseFloat(temperatureC) || 22.0);
  const rh = Math.max(10.0, Math.min(100.0, parseFloat(humidityPct) || 60.0));
  const baseEt0 = Math.max(1.8, 0.0023 * (temp + 17.8) * Math.sqrt(Math.max(1.0, temp - 8.0)) * (1.1 - rh / 200.0) * 2.5);
  const et0 = Math.round(baseEt0 * 10) / 10; // mm/day

  // 3. Crop Water Demand: ETc = Kc * ET0 (mm/day)
  const kc = stageData.kc;
  const etcDaily = Math.round(kc * et0 * 10) / 10;

  // 4. Effective Rainfall (Forecasted over next 3-4 days planning window)
  const effectiveRainMm = calculateEffectiveRainfall(forecastRainfallMm);

  // 5. Soil Moisture & Total Available Water (TAW)
  // TAW = 1000 * (FC - WP) * Zr (in mm of water depth)
  const rootDepthM = stageData.rootDepthM;
  const fc = soilData.fc;
  const wp = soilData.wp;
  const tawMm = Math.round(((fc - wp) / 100.0) * rootDepthM * 1000.0 * 10) / 10;
  
  // Readily Available Water (RAW) = p * TAW (before water stress starts)
  const p = cropData.depletionFraction;
  const rawMm = Math.round(p * tawMm * 10) / 10;

  // Current Soil Moisture Volumetric %
  let currentSm = currentSoilMoisturePct !== null && currentSoilMoisturePct !== undefined
    ? parseFloat(currentSoilMoisturePct)
    : Math.max(wp + 1.0, fc - (daysSinceLastWatering * 1.5) + (recentRainfallMm * 0.4));
  currentSm = Math.max(4.0, Math.min(48.0, Math.round(currentSm * 10) / 10));

  // Current Depletion Dr in Root Zone (mm)
  // Dr = 1000 * (FC - currentSm) * Zr
  const currentDepletionMm = Math.max(0, Math.round(((fc - currentSm) / 100.0) * rootDepthM * 1000.0 * 10) / 10);

  // 6. Net Irrigation Requirement (NIR mm)
  // If current depletion exceeds RAW or ETc exceeds effective rainfall
  let netDeficitMm = 0;
  let status = 'adequate'; // 'adequate' | 'mild_deficit' | 'critical_deficit' | 'surplus'

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

  // 7. Gross Irrigation Requirement (GIR mm & Liters)
  const efficiency = methodData.efficiency;
  const grossDeficitMm = netDeficitMm > 0 ? Math.round((netDeficitMm / efficiency) * 10) / 10 : 0;
  const areaSqM = areaToSquareMeters(farmArea, areaUnit);

  // 1 mm depth over 1 m² = 1 Liter of water
  const grossWaterLiters = Math.round(grossDeficitMm * areaSqM);
  const grossWaterM3 = Math.round((grossWaterLiters / 1000.0) * 10) / 10;

  // 8. Pump & Flow Runtime
  // Standard agricultural pump discharge: ~5,200 Liters/hour per HP
  const hp = Math.max(1.0, parseFloat(pumpHp) || 5.0);
  const pumpFlowRateLph = hp * 5200.0;
  const pumpRuntimeHours = grossWaterLiters > 0 ? Math.round((grossWaterLiters / pumpFlowRateLph) * 10) / 10 : 0.0;

  // Mountain Kuhl flow (~22 Liters/second = ~79,200 L/hour)
  const kuhlRuntimeHours = grossWaterLiters > 0 ? Math.round((grossWaterLiters / 79200.0) * 10) / 10 : 0.0;

  // 9. Status Badge & Farmer Explanation
  let statusBadge = '';
  let statusColor = '';
  let explanation = '';
  let reason = '';

  if (status === 'surplus') {
    statusBadge = isHindi ? 'अतिरिक्त नमी — सिंचाई न करें' : 'Moisture Surplus — Do Not Irrigate';
    statusColor = '#0284C7';
    reason = isHindi
      ? `पर्याप्त वर्षा (${forecastRainfallMm} मिमी) और उच्च मृदा नमी (${currentSm}%) के कारण खेत में पानी की कोई कमी नहीं है।`
      : `Adequate rain (${forecastRainfallMm} mm) and high soil moisture (${currentSm}%) provide sufficient water.`;
    explanation = isHindi
      ? 'सीढ़ीदार खेतों में जलनिकासी नालियों को खुला रखें ताकि जड़ों में पानी न भरे।'
      : 'Keep terrace field drains clear to avoid root rot from excess moisture.';
  } else if (status === 'adequate') {
    statusBadge = isHindi ? 'संतोषजनक नमी — सिंचाई अभी आवश्यक नहीं' : 'Adequate Moisture — No Irrigation Needed';
    statusColor = '#10B981';
    reason = isHindi
      ? `वर्तमान नमी (${currentSm}%) पौधे की जड़ सीमा (${rootDepthM} मी) के लिए अनुकूल है। तनाव सीमा अभी नहीं आई है।`
      : `Current moisture (${currentSm}%) is within the safe root zone (${rootDepthM}m) threshold.`;
    explanation = isHindi
      ? 'अगले 2-3 दिनों में फिर से जांचें। वर्तमान में फसल जल तनाव में नहीं है।'
      : 'Crop is not in water stress. Recheck moisture after 2-3 days.';
  } else if (status === 'mild_deficit') {
    statusBadge = isHindi ? 'हल्की कमी — 24 से 48 घंटे में सिंचाई करें' : 'Mild Deficit — Irrigate within 24-48 Hours';
    statusColor = '#F59E0B';
    reason = isHindi
      ? `दैनिक वाष्पीकरण (${etcDaily} मिमी/दिन) के कारण नमी घट रही है। समय पर पानी देने से पैदावार सुरक्षित रहेगी।`
      : `Daily evapotranspiration (${etcDaily} mm/day) is depleting root zone moisture. Water soon to protect yield.`;
    explanation = isHindi
      ? `अनुशंसित जल: ${grossWaterLiters.toLocaleString()} लीटर (${grossWaterM3} घनमीटर), ${methodData.hi} से।`
      : `Apply ${grossWaterLiters.toLocaleString()} Liters (${grossWaterM3} m³) using ${methodData.en}.`;
  } else {
    statusBadge = isHindi ? 'गंभीर कमी — तुरंत सिंचाई आवश्यक' : 'Critical Deficit — Immediate Irrigation Required';
    statusColor = '#DC2626';
    reason = isHindi
      ? `मृदा नमी (${currentSm}%) क्रांतिक सीमा (${cropData.criticalSmPct}%) से नीचे है। पौधे को गहरा जल तनाव हो सकता है।`
      : `Soil moisture (${currentSm}%) has fallen below critical threshold (${cropData.criticalSmPct}%). Immediate watering needed.`;
    explanation = isHindi
      ? `जल्द से जल्द ${grossWaterLiters.toLocaleString()} लीटर पानी लगाएं। सुबह या शाम के समय सिंचाई करें।`
      : `Apply ${grossWaterLiters.toLocaleString()} Liters urgently. Water during early morning or late evening.`;
  }

  // 10. Three Scenario Stress Tests
  // Scenario 1: Low Rain (0 mm - Dry spell)
  const lowRainPeff = 0.0;
  const lowRainDeficit = Math.round(Math.max(0, currentDepletionMm - lowRainPeff) * 10) / 10;
  const lowRainGrossL = Math.round((lowRainDeficit / efficiency) * areaSqM);

  // Scenario 2: Expected Rain (using forecasted rain)
  const expRainPeff = effectiveRainMm;
  const expRainDeficit = netDeficitMm;
  const expRainGrossL = grossWaterLiters;

  // Scenario 3: High Rain (Surplus +25 mm)
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
    isHindi,
    scenarios: {
      lowRain: {
        rainMm: 0.0,
        label: isHindi ? 'कम वर्षा (सूखा काल)' : 'Low Rainfall (Dry Spell)',
        status: lowRainDeficit > 0 ? 'deficit' : 'adequate',
        netDeficitMm: lowRainDeficit,
        grossWaterLiters: lowRainGrossL,
        advice: isHindi
          ? 'वर्षा न होने पर पूर्ण कृत्रिम सिंचाई की आवश्यकता होगी।'
          : 'Zero rainfall requires full artificial irrigation.',
      },
      expectedRain: {
        rainMm: forecastRainfallMm,
        label: isHindi ? 'अनुमानित वर्षा (मौसम पूर्वानुमान)' : 'Expected Rainfall (Forecast)',
        status,
        netDeficitMm: expRainDeficit,
        grossWaterLiters: expRainGrossL,
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

module.exports = {
  CROP_DATABASE,
  SOIL_DATABASE,
  IRRIGATION_METHODS,
  areaToSquareMeters,
  calculateEffectiveRainfall,
  calculateSmartIrrigation,
};
