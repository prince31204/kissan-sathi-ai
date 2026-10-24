// Agricultural Digital Twin & Smart Irrigation Advisor (Module 1)
// FAO-56 Standard Crop Water Balance & Hill Irrigation Management

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme } from '../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { LanguageSwitchButton } from '../components/LanguageSwitchButton';
import { useLanguage } from '../context/LanguageContext';
import { BACKEND_URL } from '@/config/api';
import {
  CROPS,
  SOILS,
  IRRIGATION_METHODS,
  computeSmartIrrigation,
  SmartIrrigationOutput,
} from '../services/smartIrrigation';
import { getUnifiedWeather } from '../services/weatherService';

// Helper: Dynamically get distinct visual icon and color for each crop & growth stage
const getCropVisual = (cropKey: string, stage: 'initial' | 'vegetative' | 'mid' | 'late') => {
  if (stage === 'initial') return { icon: 'sprout', color: '#16A34A', size: 34 };

  switch (cropKey.toLowerCase()) {
    case 'rice':
      return {
        icon: stage === 'late' ? 'barley' : stage === 'mid' ? 'rice' : 'grass',
        color: stage === 'late' ? '#D97706' : '#059669',
        size: 52,
      };
    case 'maize':
      return {
        icon: stage === 'late' ? 'corn' : stage === 'mid' ? 'corn' : 'grass',
        color: stage === 'late' ? '#F59E0B' : '#16A34A',
        size: 52,
      };
    case 'tomato':
      return {
        icon: stage === 'late' ? 'fruit-cherries' : stage === 'mid' ? 'flower-tulip' : 'grass',
        color: stage === 'late' ? '#DC2626' : stage === 'mid' ? '#EA580C' : '#16A34A',
        size: 50,
      };
    case 'potato':
      return {
        icon: stage === 'late' ? 'circle-slice-8' : stage === 'mid' ? 'flower-tulip' : 'grass',
        color: stage === 'late' ? '#B45309' : '#15803D',
        size: 48,
      };
    case 'mustard':
      return {
        icon: stage === 'mid' || stage === 'late' ? 'flower' : 'grass',
        color: stage === 'mid' || stage === 'late' ? '#EAB308' : '#16A34A',
        size: 52,
      };
    case 'sugarcane':
      return {
        icon: 'bamboo',
        color: stage === 'late' ? '#D97706' : '#15803D',
        size: 54,
      };
    case 'pulses':
      return {
        icon: stage === 'mid' || stage === 'late' ? 'seed' : 'sprout',
        color: stage === 'late' ? '#A16207' : '#059669',
        size: 48,
      };
    case 'wheat':
    default:
      return {
        icon: stage === 'late' ? 'barley' : stage === 'mid' ? 'flower-tulip' : 'grass',
        color: stage === 'late' ? '#D97706' : '#16A34A',
        size: 54,
      };
  }
};

const UTTARAKHAND_DISTRICTS = [
  { name: 'Chamoli', nameHi: 'चमोली', lat: 30.412, lon: 79.331 },
  { name: 'Tehri Garhwal', nameHi: 'टिहरी गढ़वाल', lat: 30.38, lon: 78.48 },
  { name: 'Pithoragarh', nameHi: 'पिथौरागढ़', lat: 29.5867, lon: 80.2186 },
  { name: 'Uttarkashi', nameHi: 'उत्तरकाशी', lat: 30.7268, lon: 78.4354 },
  { name: 'Rudraprayag', nameHi: 'रुद्रप्रयाग', lat: 30.2844, lon: 78.9811 },
  { name: 'Almora', nameHi: 'अल्मोड़ा', lat: 29.5971, lon: 79.6591 },
  { name: 'Dehradun', nameHi: 'देहरादून', lat: 30.3165, lon: 78.0322 },
  { name: 'Haridwar', nameHi: 'हरिद्वार', lat: 29.9457, lon: 78.1642 },
  { name: 'Nainital', nameHi: 'नैनीताल', lat: 29.3803, lon: 79.4636 },
  { name: 'Bageshwar', nameHi: 'बागेश्वर', lat: 29.8406, lon: 79.7694 },
  { name: 'Champawat', nameHi: 'चंपावत', lat: 29.3364, lon: 80.103 },
  { name: 'Pauri Garhwal', nameHi: 'पौड़ी गढ़वाल', lat: 30.1468, lon: 78.7806 },
  { name: 'Udham Singh Nagar', nameHi: 'ऊधम सिंह नगर', lat: 28.98, lon: 79.4 },
];

const GROWTH_STAGES: Array<{ id: 'initial' | 'vegetative' | 'mid' | 'late'; en: string; hi: string; icon: string }> = [
  { id: 'initial', en: '1. Initial / Sprout', hi: '1. अंकुरण / शुरुआत', icon: 'sprout-outline' },
  { id: 'vegetative', en: '2. Vegetative', hi: '2. बढ़वार / कल्ले', icon: 'grass' },
  { id: 'mid', en: '3. Flowering / Grain', hi: '3. फूल / दाना भराव', icon: 'flower-tulip' },
  { id: 'late', en: '4. Maturity / Ripe', hi: '4. परिपक्वता / पकना', icon: 'barley' },
];

const FIELD_UNITS = [
  { id: 'Acre', en: 'Acre', hi: 'एकड़' },
  { id: 'Bigha', en: 'Bigha', hi: 'बीघा' },
  { id: 'Hectare', en: 'Hectare', hi: 'हेक्टेयर' },
];

export default function DigitalTwinScreen() {
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const params = useLocalSearchParams<{
    crop?: string;
    soilType?: string;
    fieldSize?: string;
    fieldUnit?: string;
    soilMoisture?: string;
  }>();

  // 1. Farmer & Farm Inputs
  const [district, setDistrict] = useState(UTTARAKHAND_DISTRICTS[0]);
  const [village, setVillage] = useState('Chopta / गोपेश्वर');
  const [farmArea, setFarmArea] = useState<number>(() => {
    if (params.fieldSize) {
      const sz = parseFloat(params.fieldSize);
      if (!isNaN(sz) && sz > 0) return sz;
    }
    return 1.0;
  });
  const [areaUnit, setAreaUnit] = useState<string>(params.fieldUnit || 'Acre');
  const [selectedCropKey, setSelectedCropKey] = useState<string>(() => {
    if (params.crop) {
      const match = Object.keys(CROPS).find((k) => k.toLowerCase() === params.crop?.toLowerCase());
      if (match) return match;
    }
    return 'Wheat';
  });
  const [growthStage, setGrowthStage] = useState<'initial' | 'vegetative' | 'mid' | 'late'>('mid');
  const [soilType, setSoilType] = useState<string>(() => {
    if (params.soilType) {
      const match = Object.keys(SOILS).find((s) => s.toLowerCase() === params.soilType?.toLowerCase());
      if (match) return match;
    }
    return 'Loam';
  });
  const [irrigationMethod, setIrrigationMethod] = useState<string>('Drip');
  const [soilMoisturePct, setSoilMoisturePct] = useState<number>(() => {
    if (params.soilMoisture) {
      const sm = parseFloat(params.soilMoisture);
      if (!isNaN(sm) && sm > 0) return sm;
    }
    return 22.0;
  });
  const [moistureSource, setMoistureSource] = useState<'manual' | 'simulated' | 'sensor'>(
    params.soilMoisture ? 'manual' : 'simulated'
  );
  const [pumpHp, setPumpHp] = useState<number>(5.0);

  // 2. Weather State
  const [weather, setWeather] = useState({
    temperature: 22.0,
    humidity: 58.0,
    forecastRainfallMm: 3.5,
    recentRainfallMm: 0.0,
    source: 'Open-Meteo & UK Telemetry',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
  const [loadingWeather, setLoadingWeather] = useState(false);

  // 3. Calculation & Active Scenario
  const [calculation, setCalculation] = useState<SmartIrrigationOutput | null>(null);
  const [activeScenario, setActiveScenario] = useState<'lowRain' | 'expectedRain' | 'highRain'>('expectedRain');

  // 4. Audit History Modal
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  // ---- Dynamic parameter syncing from navigation ----
  useEffect(() => {
    if (params.crop) {
      const match = Object.keys(CROPS).find((k) => k.toLowerCase() === params.crop?.toLowerCase());
      if (match) setSelectedCropKey(match);
    }
    if (params.soilType) {
      const matchSoil = Object.keys(SOILS).find((s) => s.toLowerCase() === params.soilType?.toLowerCase());
      if (matchSoil) setSoilType(matchSoil);
    }
    if (params.fieldSize) {
      const sz = parseFloat(params.fieldSize);
      if (!isNaN(sz) && sz > 0) setFarmArea(sz);
    }
    if (params.fieldUnit) {
      setAreaUnit(params.fieldUnit);
    }
    if (params.soilMoisture) {
      const sm = parseFloat(params.soilMoisture);
      if (!isNaN(sm) && sm > 0) {
        setSoilMoisturePct(sm);
        setMoistureSource('manual');
      }
    }
  }, [params.crop, params.soilType, params.fieldSize, params.fieldUnit, params.soilMoisture]);

  // ---- Pre-fill from existing stored profile and persisted crop ----
  useEffect(() => {
    (async () => {
      try {
        if (!params.crop) {
          const storedCrop = await AsyncStorage.getItem('@farmer_selected_crop');
          if (storedCrop) {
            const match = Object.keys(CROPS).find((k) => k.toLowerCase() === storedCrop.toLowerCase());
            if (match) setSelectedCropKey(match);
          }
        }
        if (!params.soilType) {
          const storedSoil = await AsyncStorage.getItem('@farmer_selected_soil');
          if (storedSoil) {
            const matchSoil = Object.keys(SOILS).find((s) => s.toLowerCase() === storedSoil.toLowerCase());
            if (matchSoil) setSoilType(matchSoil);
          }
        }
        const storedVillage = await AsyncStorage.getItem('userVillage');
        const storedDistrict = await AsyncStorage.getItem('userDistrict');
        if (storedVillage) setVillage(storedVillage);
        if (storedDistrict) {
          const match = UTTARAKHAND_DISTRICTS.find(
            (d) => d.name.toLowerCase() === storedDistrict.toLowerCase()
          );
          if (match) setDistrict(match);
        }
        loadAuditHistory();
      } catch {
        // ignore
      }
    })();
  }, []);

  // ---- Fetch Live Weather for selected District ----
  const fetchWeather = useCallback(async (d: typeof UTTARAKHAND_DISTRICTS[0]) => {
    setLoadingWeather(true);
    try {
      const data = await getUnifiedWeather(d.lat, d.lon);
      if (data) {
        const sumForecast = (data.forecast || []).slice(0, 3).reduce((a, b) => a + (b.rainSumMm || 0), 0);
        setWeather({
          temperature: Math.round(data.temperature * 10) / 10,
          humidity: Math.round(data.humidity),
          forecastRainfallMm: Math.round(sumForecast * 10) / 10,
          recentRainfallMm: Math.round((data.precipitationMm || data.forecast?.[0]?.rainSumMm || 0) * 10) / 10,
          source: data.source.includes('OpenWeatherMap') ? 'OpenWeatherMap API Verified' : data.source,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch {
      // Keep existing weather state
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(district);
  }, [district, fetchWeather]);

  // ---- Recompute Smart Irrigation & Digital Twin ----
  useEffect(() => {
    // If active scenario is lowRain (0 mm rain) or highRain (+25 mm rain), override forecast rain
    let rainForCalc = weather.forecastRainfallMm;
    if (activeScenario === 'lowRain') rainForCalc = 0.0;
    else if (activeScenario === 'highRain') rainForCalc = Math.max(25.0, weather.forecastRainfallMm + 25.0);

    const calc = computeSmartIrrigation({
      crop: selectedCropKey,
      growthStage,
      soilType,
      farmArea,
      areaUnit,
      irrigationMethod,
      currentSoilMoisturePct: soilMoisturePct,
      forecastRainfallMm: rainForCalc,
      recentRainfallMm: weather.recentRainfallMm,
      temperatureC: weather.temperature,
      humidityPct: weather.humidity,
      pumpHp,
      isHindi,
    });
    setCalculation(calc);
  }, [
    selectedCropKey,
    growthStage,
    soilType,
    farmArea,
    areaUnit,
    irrigationMethod,
    soilMoisturePct,
    pumpHp,
    weather,
    activeScenario,
    isHindi,
  ]);

  // ---- Save Field Snapshot to Audit Trail ----
  const saveSnapshotToAudit = async () => {
    if (!calculation) return;
    const newEntry = {
      id: `twin_${Date.now()}`,
      timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      district: isHindi ? district.nameHi : district.name,
      village,
      crop: isHindi ? calculation.cropHi : calculation.crop,
      stage: isHindi ? calculation.growthStageLabelHi : calculation.growthStageLabel,
      area: `${farmArea} ${areaUnit}`,
      method: isHindi ? calculation.irrigationMethodHi : calculation.irrigationMethod,
      soilMoisture: `${calculation.currentSoilMoisturePct}% (${moistureSource})`,
      netDeficitMm: calculation.netDeficitMm,
      waterReqLiters: calculation.grossWaterLiters,
      statusBadge: calculation.statusBadge,
      statusColor: calculation.statusColor,
      pumpHours: calculation.pumpRuntimeHours,
      scenario: activeScenario,
      calculationMethod: calculation.audit.calculationMethod,
      version: calculation.audit.version,
    };

    try {
      const stored = await AsyncStorage.getItem('@digital_twin_audit');
      const list = stored ? JSON.parse(stored) : [];
      const updated = [newEntry, ...list].slice(0, 30); // keep last 30 entries
      await AsyncStorage.setItem('@digital_twin_audit', JSON.stringify(updated));
      setAuditHistory(updated);

      // Also attempt backend POST
      try {
        await fetch(`${BACKEND_URL}/api/v1/digital-twin/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            district: district.name,
            village,
            crop: selectedCropKey,
            growthStage,
            farmArea,
            areaUnit,
            soilType,
            irrigationMethod,
            soilMoisturePct,
            soilMoistureSource: moistureSource,
            pumpHp,
            language: isHindi ? 'hi' : 'en',
          }),
        });
      } catch {
        // offline backend fallback
      }

      Alert.alert(
        isHindi ? 'सफलतापूर्वक सहेजा गया' : 'Snapshot Saved',
        isHindi
          ? `डिजिटल ट्विन स्थिति ऑडिट लॉग में सुरक्षित कर दी गई है।`
          : `Field state has been recorded to the audit trail.`
      );
    } catch (e) {
      console.warn('Error saving audit log', e);
    }
  };

  const loadAuditHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('@digital_twin_audit');
      if (stored) setAuditHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  };

  const clearAuditHistory = async () => {
    const doClear = async () => {
      await AsyncStorage.removeItem('@digital_twin_audit');
      setAuditHistory([]);
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm
        ? window.confirm(
            isHindi
              ? 'क्या आप सभी पिछले फील्ड ऑडिट रिकॉर्ड हटाना चाहते हैं?'
              : 'Clear all stored audit trail records?'
          )
        : true;
      if (confirmed) await doClear();
      return;
    }

    Alert.alert(
      isHindi ? 'ऑडिट इतिहास हटाएं' : 'Clear Audit Log',
      isHindi ? 'क्या आप सभी पिछले फील्ड ऑडिट रिकॉर्ड हटाना चाहते हैं?' : 'Clear all stored audit trail records?',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'हटाएं' : 'Clear',
          style: 'destructive',
          onPress: doClear,
        },
      ]
    );
  };

  const deleteAuditItem = async (id: string) => {
    const doDelete = async () => {
      const updated = auditHistory.filter((item, idx) => (item.id || idx.toString()) !== id);
      setAuditHistory(updated);
      await AsyncStorage.setItem('@digital_twin_audit', JSON.stringify(updated));
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm
        ? window.confirm(
            isHindi ? 'क्या आप इस रिकॉर्ड को हटाना चाहते हैं?' : 'Delete this record?'
          )
        : true;
      if (confirmed) await doDelete();
      return;
    }

    Alert.alert(
      isHindi ? 'रिकॉर्ड हटाएं' : 'Delete Record',
      isHindi ? 'क्या आप इस रिकॉर्ड को हटाना चाहते हैं?' : 'Delete this record?',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        { text: isHindi ? 'हटाएं' : 'Delete', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  const currentCropObj = CROPS[selectedCropKey] || CROPS.Wheat;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'कृषि डिजिटल ट्विन' : 'Agricultural Digital Twin'}
          </Text>
          <Text style={styles.headerSub}>
            {isHindi ? 'स्मार्ट सिंचाई सलाहकार (FAO-56 मॉडल)' : 'Smart Irrigation Advisor (FAO-56)'}
          </Text>
        </View>
        <LanguageSwitchButton />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Visual Digital Twin Field Cross-Section ── */}
        <Card style={styles.twinCard}>
          <View style={styles.twinHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="cube-scan" size={20} color={Theme.Colors.primary} />
              <Text style={styles.twinTitle}>
                {isHindi ? 'खेत की लाइव स्थिति (डिजिटल ट्विन)' : 'Live Field Twin Representation'}
              </Text>
            </View>
            <View style={styles.simBadge}>
              <MaterialCommunityIcons
                name={moistureSource === 'sensor' ? 'access-point' : 'tune-variant'}
                size={12}
                color="#0369A1"
              />
              <Text style={styles.simBadgeText}>
                {moistureSource === 'sensor'
                  ? isHindi ? 'लाइव सेंसर' : 'Live Sensor'
                  : isHindi ? 'सिम्युलेटेड / कृषक इनपुट' : 'Simulated / Farmer Input'}
              </Text>
            </View>
          </View>

          {/* Graphic Visualization Canvas */}
          <View style={styles.twinCanvas}>
            {/* Sky / Atmosphere */}
            <View style={styles.skyLayer}>
              <View style={styles.skyMetaRow}>
                <View style={styles.skyTag}>
                  <MaterialCommunityIcons name="weather-sunny" size={16} color="#EA580C" />
                  <Text style={styles.skyTagText}>{weather.temperature}°C</Text>
                </View>
                <View style={styles.skyTag}>
                  <MaterialCommunityIcons name="water-percent" size={16} color="#0284C7" />
                  <Text style={styles.skyTagText}>{weather.humidity}%</Text>
                </View>
                <View style={styles.skyTag}>
                  <MaterialCommunityIcons name="weather-pouring" size={16} color="#2563EB" />
                  <Text style={styles.skyTagText}>
                    {activeScenario === 'lowRain' ? '0 mm' : `${weather.forecastRainfallMm} mm`}
                  </Text>
                </View>
              </View>
              {/* Rain Clouds Animation Hint */}
              <View style={styles.cloudsRow}>
                <MaterialCommunityIcons
                  name={activeScenario === 'highRain' ? 'weather-pouring' : weather.forecastRainfallMm > 1 ? 'weather-cloudy' : 'weather-partly-cloudy'}
                  size={36}
                  color={activeScenario === 'highRain' ? '#3B82F6' : '#94A3B8'}
                />
              </View>
            </View>

            {/* Crop Canopy Layer */}
            <View style={styles.canopyLayer}>
              <View style={styles.cropVisualGroup}>
                {(() => {
                  const vis = getCropVisual(selectedCropKey, growthStage);
                  return (
                    <MaterialCommunityIcons
                      name={vis.icon as any}
                      size={vis.size}
                      color={vis.color}
                    />
                  );
                })()}
                <Text style={styles.cropCanopyLabel}>
                  {isHindi ? currentCropObj.hi : currentCropObj.en}
                  {' ('}
                  {growthStage === 'initial'
                    ? isHindi ? 'अंकुरण' : 'Sprout'
                    : growthStage === 'vegetative'
                      ? isHindi ? 'वानस्पतिक' : 'Vegetative'
                      : growthStage === 'mid'
                        ? isHindi ? 'फूल/दाना' : 'Flowering'
                        : isHindi ? 'परिपक्व' : 'Maturity'}
                  {')'}
                </Text>
              </View>
            </View>

            {/* Soil Cross-Section Layer */}
            <View style={styles.soilLayer}>
              {/* Ground surface line */}
              <View style={styles.surfaceLine} />

              {/* Root Zone Depth indicator */}
              <View style={styles.rootZoneIndicator}>
                <View style={styles.rootLine} />
                <Text style={styles.rootDepthText}>
                  {isHindi ? 'जड़ गहराई: ' : 'Root Depth: '}
                  {calculation ? `${calculation.rootDepthM} m` : '0.6 m'}
                </Text>
              </View>

              {/* Soil Moisture Water Level Bar */}
              <View style={styles.moistureLevelContainer}>
                <View style={styles.moistureLevelHeader}>
                  <Text style={styles.moistureLevelTitle}>
                    {isHindi ? 'मृदा नमी स्तर (Volume %)' : 'Root Zone Soil Moisture'}
                  </Text>
                  <Text style={[styles.moistureValText, { color: calculation?.statusColor || Theme.Colors.primary }]}>
                    {soilMoisturePct}%
                  </Text>
                </View>
                <View style={styles.moistureTrack}>
                  <View
                    style={[
                      styles.moistureFill,
                      {
                        width: `${Math.min(100, Math.max(5, (soilMoisturePct / 45) * 100))}%`,
                        backgroundColor:
                          soilMoisturePct < currentCropObj.criticalSmPct
                            ? '#EF4444'
                            : soilMoisturePct < 28
                              ? '#F59E0B'
                              : '#0284C7',
                      },
                    ]}
                  />
                </View>
                <View style={styles.moistureLimitsRow}>
                  <Text style={styles.limitText}>
                    {isHindi ? 'मुरझान (WP)' : 'Wilting Pt'} ({calculation?.wiltingPointPct || 13}%)
                  </Text>
                  <Text style={styles.limitText}>
                    {isHindi ? 'क्रांतिक सीमा' : 'Critical'} ({currentCropObj.criticalSmPct}%)
                  </Text>
                  <Text style={styles.limitText}>
                    {isHindi ? 'संतृप्त (FC)' : 'Field Cap'} ({calculation?.fieldCapacityPct || 28}%)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Hardware Notice */}
          <Text style={styles.twinFooterNotice}>
            {isHindi
              ? 'ℹ️ सूचना: यह डिजिटल ट्विन वर्तमान में कृषक इनपुट व मौसम उपग्रह आंकड़ों पर आधारित है। जब तक भौतिक IoT सेंसर खेत में कनेक्ट नहीं होते, तब तक यह सत्यापित सिम्युलेशन है।'
              : 'ℹ️ Notice: This digital twin is computed using farmer inputs & weather telemetry. It is explicitly labeled simulated unless physical field IoT probes are paired.'}
          </Text>
        </Card>

        {/* ── 3 Scenario Comparison Buttons (Section D) ── */}
        <Text style={styles.sectionHeader}>
          {isHindi ? '📊 तीन वर्षा परिदृश्य तुलना (Scenario Stress-Test)' : '📊 Three Rainfall Scenario Comparisons'}
        </Text>
        <View style={styles.scenarioRow}>
          {[
            {
              id: 'lowRain' as const,
              title: isHindi ? 'कम वर्षा' : 'Low Rain',
              sub: '0 mm (सूखा)',
              icon: 'weather-sunny',
              color: '#EF4444',
            },
            {
              id: 'expectedRain' as const,
              title: isHindi ? 'अनुमानित वर्षा' : 'Expected Rain',
              sub: `${weather.forecastRainfallMm} mm (मौसम)`,
              icon: 'weather-partly-cloudy',
              color: '#0284C7',
            },
            {
              id: 'highRain' as const,
              title: isHindi ? 'भारी वर्षा' : 'High Rain',
              sub: `+25 mm (अतिवृष्टि)`,
              icon: 'weather-pouring',
              color: '#059669',
            },
          ].map((sc) => {
            const active = activeScenario === sc.id;
            return (
              <TouchableOpacity
                key={sc.id}
                onPress={() => setActiveScenario(sc.id)}
                activeOpacity={0.8}
                style={[
                  styles.scenarioBtn,
                  active && { borderColor: sc.color, backgroundColor: `${sc.color}10`, borderWidth: 2 },
                ]}
              >
                <MaterialCommunityIcons name={sc.icon as any} size={22} color={sc.color} />
                <Text style={[styles.scenarioTitle, active && { color: sc.color, fontWeight: '700' }]}>
                  {sc.title}
                </Text>
                <Text style={styles.scenarioSub}>{sc.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Smart Irrigation Advice Card (Section C) ── */}
        {calculation && (
          <Card style={[styles.resultCard, { borderLeftColor: calculation.statusColor, borderLeftWidth: 5 }]}>
            <View style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultPreTitle}>
                  {isHindi ? 'स्मार्ट सिंचाई सिफारिश (FAO-56)' : 'Smart Irrigation Recommendation'}
                </Text>
                <Text style={[styles.resultStatusText, { color: calculation.statusColor }]}>
                  {calculation.statusBadge}
                </Text>
              </View>
              <StatusBadge
                status={
                  calculation.status === 'critical_deficit'
                    ? 'error'
                    : calculation.status === 'mild_deficit'
                      ? 'warning'
                      : 'success'
                }
                label={calculation.status.toUpperCase().replace('_', ' ')}
              />
            </View>

            {/* Core Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>
                  {calculation.netDeficitMm > 0 ? `${calculation.netDeficitMm} mm` : '0 mm'}
                </Text>
                <Text style={styles.metricLbl}>{isHindi ? 'जल घाटा (Deficit)' : 'Water Deficit'}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>
                  {calculation.grossWaterLiters > 0
                    ? `${(calculation.grossWaterLiters / 1000).toFixed(1)} m³`
                    : '0 m³'}
                </Text>
                <Text style={styles.metricLbl}>
                  {calculation.grossWaterLiters > 0
                    ? `${calculation.grossWaterLiters.toLocaleString()} L`
                    : isHindi ? 'आवश्यकता नहीं' : 'Not needed'}
                </Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricBox}>
                <Text style={styles.metricVal}>
                  {calculation.irrigationMethod === 'Kuhl'
                    ? `${calculation.kuhlRuntimeHours} hrs`
                    : `${calculation.pumpRuntimeHours} hrs`}
                </Text>
                <Text style={styles.metricLbl}>
                  {calculation.irrigationMethod === 'Kuhl'
                    ? isHindi ? 'कूल प्रवाह समय' : 'Kuhl Run Time'
                    : isHindi ? `${pumpHp}HP पंप समय` : `${pumpHp}HP Pump Run`}
                </Text>
              </View>
            </View>

            {/* Scientific Explanation & Reason */}
            <View style={styles.explainBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <MaterialCommunityIcons name="information-outline" size={16} color={Theme.Colors.primary} />
                <Text style={styles.explainHeader}>
                  {isHindi ? 'वैज्ञानिक कारण व आधार:' : 'Scientific Basis & Reason:'}
                </Text>
              </View>
              <Text style={styles.explainText}>{calculation.reason}</Text>
              <Text style={[styles.explainText, { marginTop: 4, fontStyle: 'italic' }]}>
                👉 {calculation.explanation}
              </Text>
            </View>

            {/* Save snapshot to audit log button */}
            <TouchableOpacity onPress={saveSnapshotToAudit} style={styles.saveAuditBtn} activeOpacity={0.8}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={18} color="#FFFFFF" />
              <Text style={styles.saveAuditText}>
                {isHindi ? 'इस सिफारिश को ऑडिट में सुरक्षित करें' : 'Record Snapshot in Audit Trail'}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ── Farm & Crop Input Configurator (Section A) ── */}
        <Text style={styles.sectionHeader}>
          {isHindi ? '🌾 खेत व फसल विवरण (Farm Configuration)' : '🌾 Farm & Crop Configuration'}
        </Text>
        <Card style={styles.configCard}>
          {/* District & Village */}
          <Text style={styles.inputLabel}>
            {isHindi ? '1. जनपद व ग्राम चुनें' : '1. District & Village'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
            {UTTARAKHAND_DISTRICTS.map((d) => {
              const sel = district.name === d.name;
              return (
                <TouchableOpacity
                  key={d.name}
                  onPress={() => setDistrict(d)}
                  style={[styles.chip, sel && styles.chipActive]}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextActive]}>
                    {isHindi ? d.nameHi : d.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Farm Area & Unit */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>{isHindi ? '2. खेत का क्षेत्रफल' : '2. Farm Area'}</Text>
            <View style={styles.areaRow}>
              <View style={styles.areaPresets}>
                {[0.5, 1.0, 2.0, 5.0].map((val) => {
                  const active = farmArea === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setFarmArea(val)}
                      style={[styles.areaPresetBtn, active && styles.areaPresetActive]}
                    >
                      <Text style={[styles.areaPresetText, active && styles.areaPresetTextActive]}>{val}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.unitSelector}>
                {FIELD_UNITS.map((u) => {
                  const act = areaUnit === u.id;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => setAreaUnit(u.id)}
                      style={[styles.unitBtn, act && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitBtnText, act && styles.unitBtnTextActive]}>
                        {isHindi ? u.hi : u.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Crop Selector */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>{isHindi ? '3. फसल चुनें' : '3. Select Crop'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
              {Object.keys(CROPS).map((cropKey) => {
                const c = CROPS[cropKey];
                const sel = selectedCropKey === cropKey;
                return (
                  <TouchableOpacity
                    key={cropKey}
                    onPress={() => {
                      setSelectedCropKey(cropKey);
                      AsyncStorage.setItem('@farmer_selected_crop', cropKey).catch(() => { });
                    }}
                    style={[styles.chip, sel && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextActive]}>
                      {isHindi ? c.hi : c.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Growth Stage Selector */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>
              {isHindi ? '4. फसल की अवस्था (Growth Stage)' : '4. Crop Growth Stage'}
            </Text>
            <View style={styles.stagesRow}>
              {GROWTH_STAGES.map((st) => {
                const act = growthStage === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => setGrowthStage(st.id)}
                    style={[styles.stageBtn, act && styles.stageBtnActive]}
                  >
                    <MaterialCommunityIcons
                      name={st.icon as any}
                      size={20}
                      color={act ? '#FFF' : Theme.Colors.textSecondary}
                    />
                    <Text style={[styles.stageBtnText, act && styles.stageBtnTextActive]}>
                      {isHindi ? st.hi : st.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Soil Type Selector */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>{isHindi ? '5. मिट्टी का प्रकार (Soil Type)' : '5. Soil Type'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
              {Object.keys(SOILS).map((sKey) => {
                const s = SOILS[sKey];
                const sel = soilType === sKey;
                return (
                  <TouchableOpacity
                    key={sKey}
                    onPress={() => setSoilType(sKey)}
                    style={[styles.chip, sel && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextActive]}>
                      {isHindi ? s.hi : s.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Irrigation Method */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.inputLabel}>
              {isHindi ? '6. सिंचाई विधि व दक्षता' : '6. Irrigation Method & Efficiency'}
            </Text>
            <View style={styles.methodsRow}>
              {Object.keys(IRRIGATION_METHODS).map((mKey) => {
                const m = IRRIGATION_METHODS[mKey];
                const act = irrigationMethod === mKey;
                return (
                  <TouchableOpacity
                    key={mKey}
                    onPress={() => setIrrigationMethod(mKey)}
                    style={[styles.methodBtn, act && styles.methodBtnActive]}
                  >
                    <Text style={[styles.methodBtnTitle, act && styles.methodBtnTitleActive]}>
                      {isHindi ? m.hi : m.en}
                    </Text>
                    <Text style={[styles.methodBtnSub, act && styles.methodBtnSubActive]}>
                      {Math.round(m.efficiency * 100)}% {isHindi ? 'दक्षता' : 'efficiency'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Soil Moisture Slider / Presets */}
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.inputLabel}>
                {isHindi ? '7. वर्तमान मृदा नमी' : '7. Soil Moisture Reading'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: Theme.Colors.primary }}>
                {soilMoisturePct}%
              </Text>
            </View>
            <View style={styles.moisturePresetsRow}>
              {[
                { val: 12, lbl: isHindi ? 'सूखी (12%)' : 'Dry (12%)' },
                { val: 20, lbl: isHindi ? 'हल्की नमी (20%)' : 'Low (20%)' },
                { val: 26, lbl: isHindi ? 'संतुलित (26%)' : 'Optimal (26%)' },
                { val: 34, lbl: isHindi ? 'तर/गीली (34%)' : 'Moist (34%)' },
              ].map((p) => {
                const sel = soilMoisturePct === p.val;
                return (
                  <TouchableOpacity
                    key={p.val}
                    onPress={() => {
                      setSoilMoisturePct(p.val);
                      setMoistureSource('manual');
                    }}
                    style={[styles.moisturePresetBtn, sel && styles.moisturePresetBtnActive]}
                  >
                    <Text style={[styles.moisturePresetText, sel && styles.moisturePresetTextActive]}>
                      {p.lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>

        {/* ── Field History & Audit Trail Button (Section E) ── */}
        <TouchableOpacity
          onPress={() => setHistoryModalVisible(true)}
          style={styles.historyOpenBtn}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="history" size={20} color={Theme.Colors.primary} />
          <Text style={styles.historyOpenText}>
            {isHindi ? '📜 फील्ड इतिहास व ऑडिट ट्रेल देखें' : '📜 View Field History & Audit Trail'}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.Colors.primary} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Field History & Audit Trail Modal ── */}
      <Modal visible={historyModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.modalCloseBtn}>
              <MaterialCommunityIcons name="close" size={24} color={Theme.Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isHindi ? 'फील्ड इतिहास व ऑडिट ट्रेल' : 'Field History & Audit Trail'}
            </Text>
            {auditHistory.length > 0 && (
              <TouchableOpacity onPress={clearAuditHistory} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={Theme.Colors.error} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.auditIntro}>
              {isHindi
                ? 'यह ऑडिट ट्रेल सभी सिंचाई गणनाओं, मौसम इनपुट, और वैज्ञानिक सिफारिशों का समयबद्ध रिकॉर्ड रखता है।'
                : 'This audit trail logs all crop water calculations, weather observations, and recommendations for full compliance and history.'}
            </Text>

            {auditHistory.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="database-off-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>
                  {isHindi ? 'कोई ऑडिट रिकॉर्ड नहीं मिला' : 'No Audit Records Yet'}
                </Text>
                <Text style={styles.emptySub}>
                  {isHindi
                    ? 'डिजिटल ट्विन स्क्रीन से सिफारिश को ऑडिट में सुरक्षित करें।'
                    : 'Save a recommendation snapshot from the Digital Twin screen.'}
                </Text>
              </View>
            ) : (
              auditHistory.map((entry, idx) => (
                <Card key={entry.id || idx} style={styles.auditCard}>
                  <View style={styles.auditCardHeader}>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.auditCrop}>{entry.crop} ({entry.stage})</Text>
                      <Text style={styles.auditTime}>{entry.timestamp} • {entry.district}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <StatusBadge status="info" label={entry.scenario || 'SCENARIO'} />
                      <TouchableOpacity
                        onPress={() => deleteAuditItem(entry.id || idx.toString())}
                        style={{ padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.auditRow}>
                    <Text style={styles.auditLabel}>{isHindi ? 'खेत / विधि:' : 'Area / Method:'}</Text>
                    <Text style={styles.auditVal}>{entry.area} • {entry.method}</Text>
                  </View>
                  <View style={styles.auditRow}>
                    <Text style={styles.auditLabel}>{isHindi ? 'मृदा नमी:' : 'Soil Moisture:'}</Text>
                    <Text style={styles.auditVal}>{entry.soilMoisture}</Text>
                  </View>
                  <View style={styles.auditRow}>
                    <Text style={styles.auditLabel}>{isHindi ? 'जल आवश्यकता:' : 'Water Required:'}</Text>
                    <Text style={[styles.auditVal, { fontWeight: '700', color: entry.statusColor || Theme.Colors.primary }]}>
                      {entry.waterReqLiters ? `${entry.waterReqLiters.toLocaleString()} L` : '0 L'}
                    </Text>
                  </View>
                  <View style={styles.auditMethodRow}>
                    <MaterialCommunityIcons name="shield-check-outline" size={14} color="#059669" />
                    <Text style={styles.auditMethodText}>
                      {entry.calculationMethod || 'FAO-56 Soil Water Depletion'} ({entry.version || 'v2.1'})
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    width: '100%',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Theme.Colors.text },
  headerSub: { fontSize: 11, color: Theme.Colors.textSecondary, marginTop: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 85,
    width: '100%',
  },

  // Digital Twin Card & Canvas
  twinCard: { padding: 14, marginBottom: 16, backgroundColor: '#FFFFFF' },
  twinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  twinTitle: { fontSize: 14, fontWeight: '700', color: Theme.Colors.text, marginLeft: 6 },
  simBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  simBadgeText: { fontSize: 10, fontWeight: '600', color: '#0369A1', marginLeft: 4 },

  twinCanvas: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  skyLayer: {
    padding: 12,
    backgroundColor: '#E0F2FE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skyMetaRow: { flexDirection: 'row', gap: 6 },
  skyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skyTagText: { fontSize: 11, fontWeight: '600', color: Theme.Colors.text, marginLeft: 4 },
  cloudsRow: { paddingRight: 4 },

  canopyLayer: {
    height: 90,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropVisualGroup: { alignItems: 'center' },
  cropCanopyLabel: { fontSize: 11, fontWeight: '700', color: '#78350F', marginTop: 2 },

  soilLayer: {
    backgroundColor: '#78350F',
    padding: 12,
    position: 'relative',
  },
  surfaceLine: {
    height: 4,
    backgroundColor: '#16A34A',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  rootZoneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rootLine: { width: 14, height: 2, backgroundColor: '#FDE68A', marginRight: 6 },
  rootDepthText: { fontSize: 10, color: '#FEF3C7', fontWeight: '600' },

  moistureLevelContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  moistureLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  moistureLevelTitle: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  moistureValText: { fontSize: 12, fontWeight: '700' },
  moistureTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  moistureFill: { height: '100%', borderRadius: 5 },
  moistureLimitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  limitText: { fontSize: 9, color: '#FDE68A' },

  twinFooterNotice: { fontSize: 10, color: '#64748B', marginTop: 8, fontStyle: 'italic' },

  // Scenarios
  sectionHeader: { fontSize: 14, fontWeight: '700', color: Theme.Colors.text, marginBottom: 8, marginTop: 4 },
  scenarioRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  scenarioBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scenarioTitle: { fontSize: 11, fontWeight: '600', color: Theme.Colors.text, marginTop: 4 },
  scenarioSub: { fontSize: 9, color: Theme.Colors.textSecondary, marginTop: 1 },

  // Recommendation Card
  resultCard: { padding: 14, marginBottom: 16, backgroundColor: '#FFFFFF' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultPreTitle: { fontSize: 11, color: Theme.Colors.textSecondary },
  resultStatusText: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  metricBox: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: 15, fontWeight: '700', color: Theme.Colors.text },
  metricLbl: { fontSize: 10, color: Theme.Colors.textSecondary, marginTop: 2 },
  metricDivider: { width: 1, height: '70%', backgroundColor: '#E2E8F0', alignSelf: 'center' },

  explainBox: {
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  explainHeader: { fontSize: 11, fontWeight: '700', color: '#166534', marginLeft: 4 },
  explainText: { fontSize: 11, color: '#15803D', lineHeight: 16 },

  saveAuditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
  },
  saveAuditText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 },

  // Farm Configuration Card
  configCard: { padding: 14, marginBottom: 16, backgroundColor: '#FFFFFF' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Theme.Colors.text, marginBottom: 6 },
  horizontalChips: { gap: 6, paddingVertical: 2 },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: Theme.Colors.primary,
    borderColor: Theme.Colors.primary,
  },
  chipText: { fontSize: 11, color: Theme.Colors.text, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  areaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  areaPresets: { flexDirection: 'row', gap: 6 },
  areaPresetBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  areaPresetActive: { backgroundColor: Theme.Colors.primary, borderColor: Theme.Colors.primary },
  areaPresetText: { fontSize: 12, fontWeight: '600', color: Theme.Colors.text },
  areaPresetTextActive: { color: '#FFFFFF' },
  unitSelector: { flexDirection: 'row', gap: 4 },
  unitBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F8FAFC' },
  unitBtnActive: { backgroundColor: '#E2E8F0' },
  unitBtnText: { fontSize: 11, color: Theme.Colors.textSecondary },
  unitBtnTextActive: { fontWeight: '700', color: Theme.Colors.text },

  stagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
  },
  stageBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageBtnActive: { backgroundColor: Theme.Colors.primary, borderColor: Theme.Colors.primary },
  stageBtnText: { fontSize: 11, color: Theme.Colors.text, marginLeft: 6, flexShrink: 1 },
  stageBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },

  methodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
  },
  methodBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6', borderWidth: 1.5 },
  methodBtnTitle: { fontSize: 11, fontWeight: '600', color: Theme.Colors.text },
  methodBtnTitleActive: { color: '#1D4ED8' },
  methodBtnSub: { fontSize: 9, color: Theme.Colors.textSecondary, marginTop: 1 },
  methodBtnSubActive: { color: '#2563EB' },

  moisturePresetsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  moisturePresetBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moisturePresetBtnActive: { backgroundColor: Theme.Colors.primary, borderColor: Theme.Colors.primary },
  moisturePresetText: { fontSize: 10, color: Theme.Colors.text, fontWeight: '500' },
  moisturePresetTextActive: { color: '#FFFFFF', fontWeight: '700' },

  historyOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyOpenText: { fontSize: 13, fontWeight: '700', color: Theme.Colors.primary },

  // Audit Modal
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCloseBtn: { padding: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Theme.Colors.text },
  auditIntro: { fontSize: 11, color: '#64748B', marginBottom: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 30 },
  auditCard: { padding: 12, marginBottom: 10, backgroundColor: '#FFFFFF' },
  auditCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  auditCrop: { fontSize: 13, fontWeight: '700', color: Theme.Colors.text },
  auditTime: { fontSize: 10, color: '#64748B', marginTop: 1 },
  auditRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  auditLabel: { fontSize: 11, color: '#64748B' },
  auditVal: { fontSize: 11, color: Theme.Colors.text },
  auditMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
    marginTop: 6,
  },
  auditMethodText: { fontSize: 10, color: '#059669', marginLeft: 4 },
});
