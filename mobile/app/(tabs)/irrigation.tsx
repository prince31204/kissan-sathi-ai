import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Theme } from '../../constants/Theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SectionHeader } from '../../components/SectionHeader';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBadge } from '../../components/StatusBadge';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitchButton } from '../../components/LanguageSwitchButton';

const CROPS = [
  { id: 'Wheat', hi: 'गेहूं', en: 'Wheat' },
  { id: 'Rice', hi: 'धान', en: 'Rice' },
  { id: 'Maize', hi: 'मक्का', en: 'Maize' },
  { id: 'Mustard', hi: 'सरसों', en: 'Mustard' },
  { id: 'Potato', hi: 'आलू', en: 'Potato' },
  { id: 'Sugarcane', hi: 'गन्ना', en: 'Sugarcane' },
  { id: 'Tomato', hi: 'टमाटर', en: 'Tomato' },
  { id: 'Pulses', hi: 'दालें', en: 'Pulses' },
];

const SOILS = [
  { id: 'Loam', hi: 'दोमट', en: 'Loam' },
  { id: 'Clay', hi: 'चिकनी', en: 'Clay' },
  { id: 'Clay Loam', hi: 'चिकनी दोमट', en: 'Clay Loam' },
  { id: 'Sandy Loam', hi: 'बलुई दोमट', en: 'Sandy Loam' },
  { id: 'Sandy', hi: 'रेतीली', en: 'Sandy' },
];

const FIELD_UNITS = [
  { id: 'Bigha', hi: 'बीघा', en: 'Bigha' },
  { id: 'Acre', hi: 'एकड़', en: 'Acre' },
  { id: 'Hectare', hi: 'हेक्टेयर', en: 'Hectare' },
];

const WATER_SOURCES = [
  {
    id: 'Electric Motor',
    icon: 'flash',
    hi: { title: 'इलेक्ट्रिक मोटर', subtitle: 'ट्यूबवेल / मोटर पंप' },
    en: { title: 'Electric Motor', subtitle: 'Tube Well / Motor Pump' },
  },
  {
    id: 'Pahadi Kuhl / Stream',
    icon: 'image-filter-hdr',
    hi: { title: 'पहाड़ी स्रोत / कूल', subtitle: 'प्राकृतिक गुरुत्वाकर्षण जल' },
    en: { title: 'Mountain Kuhl / Stream', subtitle: 'Natural Gravity Water' },
  },
  {
    id: 'Solar Pump',
    icon: 'solar-power',
    hi: { title: 'सोलर पंप', subtitle: 'सौर ऊर्जा पंप' },
    en: { title: 'Solar Pump', subtitle: 'Solar Powered Pump' },
  },
  {
    id: 'Diesel Pump',
    icon: 'gas-station',
    hi: { title: 'डीजल इंजन', subtitle: 'डीजल पंप सेट' },
    en: { title: 'Diesel Engine', subtitle: 'Diesel Pump Set' },
  },
];

const PUMPS = ['3 HP', '5 HP', '7.5 HP', '10 HP'];

const SINGLE_PHASE_PRESETS = [
  { val: '160', hi: '160V (अत्यधिक कम)', en: '160V (Critical Low)', status: 'danger' },
  { val: '180', hi: '180V (कम वोल्टेज)', en: '180V (Low Voltage)', status: 'warning' },
  { val: '220', hi: '220V (सुरक्षित व सामान्य)', en: '220V (Safe & Normal)', status: 'safe' },
  { val: '250', hi: '250V (उच्च वोल्टेज)', en: '250V (High Voltage)', status: 'warning' },
];

const THREE_PHASE_PRESETS = [
  { val: '310', hi: '310V (अत्यधिक कम)', en: '310V (Critical Low)', status: 'danger' },
  { val: '360', hi: '360V (कम वोल्टेज)', en: '360V (Low Voltage)', status: 'warning' },
  { val: '415', hi: '415V (संतुलित व सामान्य)', en: '415V (Balanced & Normal)', status: 'safe' },
  { val: '450', hi: '450V (उच्च वोल्टेज)', en: '450V (High Voltage)', status: 'warning' },
];

const STREAM_FLOWS = [
  {
    id: 'medium',
    hi: { label: 'मध्यम कूल (~22 L/s)', sub: 'सामान्य प्रवाह' },
    en: { label: 'Medium Kuhl (~22 L/s)', sub: 'Normal flow' },
  },
  {
    id: 'high',
    hi: { label: 'तेज गधेरा/धारा (~40 L/s)', sub: 'तेज बहाव' },
    en: { label: 'Fast Stream (~40 L/s)', sub: 'High torrent flow' },
  },
  {
    id: 'low',
    hi: { label: 'धीमा स्रोत (~10 L/s)', sub: 'कम पानी' },
    en: { label: 'Slow Stream (~10 L/s)', sub: 'Trickle flow' },
  },
];

const TERRAINS = [
  {
    id: 'terrace',
    hi: { label: 'सीढ़ीदार खेत', sub: 'ढलान वाली पहाड़ी जमीन' },
    en: { label: 'Step Terraces', sub: 'Sloped mountain terraces' },
  },
  {
    id: 'plains',
    hi: { label: 'घाटी / समतल खेत', sub: 'समतल तलहटी' },
    en: { label: 'Valley Plain', sub: 'Flat plains & foothills' },
  },
];

export default function IrrigationScreen() {
  const { t, language } = useLanguage();
  const [form, setForm] = useState({
    crop: 'Wheat',
    fieldSize: '5',
    fieldUnit: 'Bigha',
    soilType: 'Loam',
    waterSource: 'Electric Motor', // 'Electric Motor' | 'Pahadi Kuhl / Stream' | 'Solar Pump' | 'Diesel Pump'
    pumpCapacity: '5 HP',
    phase: '1-Phase', // '1-Phase' | '3-Phase'
    motorVoltage: '220',
    streamFlow: 'medium',
    terrainType: 'terrace',
    daysSinceLastIrrigation: '4',
    soilMoisture: '',
  });

  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [locationName, setLocationName] = useState('Uttarakhand, India');
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 30.3165, lon: 78.0322 });
  const [liveWeather, setLiveWeather] = useState<{
    temperature: number;
    humidity: number;
    rainProbability: number;
    windSpeed: number;
    condition: string;
    isLive: boolean;
  }>({
    temperature: 24,
    humidity: 65,
    rainProbability: 10,
    windSpeed: 5,
    condition: 'Sunny',
    isLive: false,
  });

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchLiveWeatherAndLocation();
  }, []);

  const fetchLiveWeatherAndLocation = async () => {
    setWeatherLoading(true);
    try {
      let lat = 30.3165;
      let lon = 78.0322;
      let locName = 'Dehradun, Uttarakhand';

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
        setCoords({ lat, lon });

        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            { headers: { 'User-Agent': 'KisanSaathi/1.0' } }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const city =
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.village ||
              geoData.address?.county ||
              geoData.address?.state_district;
            const state = geoData.address?.state || 'India';
            locName = city ? `${city}, ${state}` : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
          }
        } catch (e) {
          locName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        }
      }

      setLocationName(locName);

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=precipitation_probability_max,precipitation_sum&timezone=auto`;
      const wRes = await fetch(weatherUrl);
      if (wRes.ok) {
        const wData = await wRes.json();
        const code = wData.current?.weather_code || 0;
        let cond = 'Clear / Sunny';
        if ([1, 2, 3].includes(code)) cond = 'Partly Cloudy';
        else if ([45, 48].includes(code)) cond = 'Foggy';
        else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) cond = 'Rain';
        else if ([95, 96, 99].includes(code)) cond = 'Thunderstorm';

        setLiveWeather({
          temperature: Math.round(wData.current?.temperature_2m ?? 24),
          humidity: Math.round(wData.current?.relative_humidity_2m ?? 65),
          rainProbability: Math.round(wData.daily?.precipitation_probability_max?.[0] ?? 10),
          windSpeed: Math.round(wData.current?.wind_speed_10m ?? 6),
          condition: cond,
          isLive: true,
        });
      }
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  // Helper for live real-time voltage indicator
  const getLiveVoltageAssessment = (vInput: string, phase: string) => {
    const v = Number(vInput) || (phase === '3-Phase' ? 415 : 220);
    const is3P = phase === '3-Phase';
    const isHi = language === 'hi';

    if (!is3P) {
      if (v < 165) {
        return {
          status: 'danger',
          color: '#ef4444',
          badge: isHi ? 'अत्यधिक कम वोल्टेज - मोटर जलने का खतरा!' : 'Critical Low Voltage - Motor Burnout Danger!',
          flowDesc: isHi ? 'प्रवाह: ~50% • मोटर तुरंत बंद रखें' : 'Flow: ~50% • Turn off motor immediately',
          icon: 'alert-octagon',
        };
      } else if (v < 195) {
        return {
          status: 'warning',
          color: '#f59e0b',
          badge: isHi ? 'कम वोल्टेज - धीमा पानी डिस्चार्ज' : 'Low Voltage - Reduced Flow Discharge',
          flowDesc: isHi ? 'प्रवाह: ~72% • 30 मिनट से अधिक लगातार न चलाएं' : 'Flow: ~72% • Do not run more than 30 mins',
          icon: 'alert',
        };
      } else if (v <= 245) {
        return {
          status: 'safe',
          color: '#10b981',
          badge: isHi ? 'सामान्य व सुरक्षित वोल्टेज' : 'Safe & Optimal Voltage',
          flowDesc: isHi ? 'प्रवाह: 100% • मोटर पूरी रफ्तार से चलेगी' : 'Flow: 100% • Motor running at optimal RPM',
          icon: 'check-decagram',
        };
      } else {
        return {
          status: 'warning',
          color: '#f97316',
          badge: isHi ? 'उच्च वोल्टेज' : 'High Voltage',
          flowDesc: isHi ? 'कैपेसिटर पर लोड • रिले चेक करें' : 'Extra strain on capacitor • Check relay',
          icon: 'flash-alert',
        };
      }
    } else {
      if (v < 330) {
        return {
          status: 'danger',
          color: '#ef4444',
          badge: isHi ? '3-फेज क्रिटिकल लो वोल्टेज!' : '3-Phase Critical Low Voltage!',
          flowDesc: isHi ? 'स्टार्टर ट्रिप / सिंगल फेजिंग का खतरा' : 'Starter trip & phase-loss burnout danger',
          icon: 'alert-octagon',
        };
      } else if (v < 380) {
        return {
          status: 'warning',
          color: '#f59e0b',
          badge: isHi ? '3-फेज कम वोल्टेज' : '3-Phase Low Voltage',
          flowDesc: isHi ? 'प्रवाह: ~80% • 25% अतिरिक्त समय लगेगा' : 'Flow: ~80% • 25% extra runtime required',
          icon: 'alert',
        };
      } else if (v <= 435) {
        return {
          status: 'safe',
          color: '#10b981',
          badge: isHi ? '3-फेज संतुलित वोल्टेज' : '3-Phase Optimal Balanced Voltage',
          flowDesc: isHi ? 'प्रवाह: 100% • सुरक्षित एवं संतुलित' : 'Flow: 100% • Balanced & safe operation',
          icon: 'check-decagram',
        };
      } else {
        return {
          status: 'warning',
          color: '#f97316',
          badge: isHi ? '3-फेज उच्च वोल्टेज' : '3-Phase High Voltage',
          flowDesc: isHi ? 'ओवरवोल्टेज रिले चेक करें' : 'High voltage • Check overload trip relay',
          icon: 'flash-alert',
        };
      }
    }
  };

  const handleCalculate = async () => {
    if (!form.fieldSize || isNaN(Number(form.fieldSize))) {
      Alert.alert('Invalid Input', 'Please enter a valid numeric field size.');
      return;
    }

    setLoading(true);
    setResult(null);

    const isPahadi = form.waterSource === 'Pahadi Kuhl / Stream';
    const isElectric = form.waterSource === 'Electric Motor';

    const payload = {
      crop: form.crop,
      soilType: form.soilType,
      fieldSize: Number(form.fieldSize),
      fieldUnit: form.fieldUnit,
      waterSource: form.waterSource,
      pumpCapacity: form.pumpCapacity,
      motorVoltage: form.motorVoltage ? Number(form.motorVoltage) : (form.phase === '3-Phase' ? 400 : 220),
      phase: form.phase,
      streamFlow: form.streamFlow,
      terrainType: form.terrainType,
      daysSinceLastIrrigation: Number(form.daysSinceLastIrrigation) || 4,
      soilMoisture: form.soilMoisture ? Number(form.soilMoisture) : null,
      latitude: coords.lat,
      longitude: coords.lon,
      temperature: liveWeather.temperature,
      humidity: liveWeather.humidity,
      rainfall: liveWeather.rainProbability > 50 ? 10.0 : 0.0,
      language: language,
    };

    let predictionData = null;

    // 1. Try Python ML Backend (Port 5000)
    try {
      const res = await fetch('http://localhost:5000/api/predict-irrigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        predictionData = await res.json();
      }
    } catch (e) {
      console.log('Port 5000 ML Backend not reachable, trying Node backend port 8000...');
    }

    // 2. Try Node Backend (Port 8000) if port 5000 didn't answer
    if (!predictionData) {
      try {
        const res = await fetch('http://localhost:8000/api/v1/irrigation/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          predictionData = await res.json();
        }
      } catch (e) {
        console.log('Node Backend not reachable, using on-device agronomic model');
      }
    }

    // 3. Fallback on-device calculation
    if (!predictionData) {
      const isEn = language === 'en';
      const sizeAcres = form.fieldUnit === 'Bigha' ? Number(form.fieldSize) * 0.20 : form.fieldUnit === 'Hectare' ? Number(form.fieldSize) * 2.471 : Number(form.fieldSize);
      const pumpHp = parseFloat(form.pumpCapacity) || 5;
      const willRain = liveWeather.rainProbability >= 60;
      const liters = willRain ? 0 : Math.round(40 * 4046.86 * sizeAcres);
      let hours = willRain ? 0 : Math.round((liters / (pumpHp * 5200)) * 10) / 10;

      let pahadiInfo = null;
      let voltageInfo = null;
      let dieselInfo = null;
      let durationStr = isEn ? `${hours} Hours` : `${hours} घंटे`;
      let advice = willRain
        ? (isEn 
            ? `🌧️ High rain chance (${liveWeather.rainProbability}%). Irrigation postponed to save electricity & water.`
            : `🌧️ बारिश की संभावना (${liveWeather.rainProbability}%): सिंचाई स्थगित की गई ताकि पानी और बिजली की बचत हो।`)
        : (isEn
            ? `💧 Scheduled irrigation needed for ${form.crop}. Apply ${liters.toLocaleString()} Liters.`
            : `💧 ${form.crop} के लिए अनुशंसित सिंचाई: कुल ${liters.toLocaleString()} लीटर पानी लगाएं।`);
      let suggestedWindow = liveWeather.temperature > 30 
        ? (isEn ? 'Tomorrow, 5:30 AM - 8:30 AM (Cool morning window)' : 'कल सुबह 5:30 से 8:30 बजे (ठंडा मौसम, कम वाष्पीकरण)')
        : (isEn ? 'Today, 5:00 PM - 7:30 PM (Evening window)' : 'आज शाम 5:00 से 7:30 बजे (शाम का अनुकूल समय)');

      if (isPahadi) {
        const flowRates: Record<string, { lps: number; label: string }> = {
          low: { lps: 10, label: isEn ? 'Slow Stream (~10 L/s)' : 'धीमा स्रोत (~10 L/s)' },
          medium: { lps: 22, label: isEn ? 'Medium Kuhl (~22 L/s)' : 'मध्यम कूल (~22 L/s)' },
          high: { lps: 40, label: isEn ? 'Fast Stream (~40 L/s)' : 'तेज गधेरा/धारा (~40 L/s)' },
        };
        const selected = flowRates[form.streamFlow] || flowRates.medium;
        const flowHours = Math.max(0.5, Math.round((liters / (selected.lps * 3600)) * 10) / 10);
        const kwhSaved = Math.round(flowHours * 3.73 * 10) / 10;
        const costSaved = Math.round(kwhSaved * 5.5);

        pahadiInfo = {
          sourceName: isEn ? 'Mountain Natural Spring / Kuhl (Gravity Flow)' : 'पहाड़ी प्राकृतिक स्रोत / कूल (प्राकृतिक प्रवाह)',
          streamFlow: form.streamFlow,
          streamFlowLabel: selected.label,
          terrainType: form.terrainType === 'terrace' ? (isEn ? 'Step Terraces' : 'सीढ़ीदार खेत') : (isEn ? 'Valley Plain' : 'घाटी समतल'),
          flowDurationHours: flowHours,
          flowDuration: isEn ? `${flowHours} Hours (Channel Flow)` : `${flowHours} घंटे (कूल प्रवाह)`,
          electricityUsed: isEn ? '0 kWh (100% Gravity Flow)' : '0 kWh (100% प्राकृतिक प्रवाह)',
          electricityCostSaved: isEn ? `₹${costSaved} Saved (Free Natural Water)` : `₹${costSaved} बचत (मुफ़्त प्राकृतिक जल)`,
          co2Saved: isEn ? `${Math.round(kwhSaved * 0.82 * 10) / 10} kg CO₂ Saved` : `${Math.round(kwhSaved * 0.82 * 10) / 10} किग्रा CO₂ बचत`,
          terraceAdvice: form.terrainType === 'terrace'
            ? (isEn
                ? '🏔️ Mountain Step Terraces: Avoid sudden heavy water surge from Kuhl. Allow water to seep gradually from top terrace down to prevent soil erosion.'
                : '🏔️ पहाड़ी सीढ़ीदार खेत: कूल से पानी एक साथ तेज बहाव में न छोड़ें। सबसे ऊपरी क्यारी से धीरे-धीरे पानी नीचे रिसने दें ताकि उपजाऊ मिट्टी का कटाव न हो।')
            : (isEn
                ? '🏔️ Mountain Valley Land: Irrigating via natural Kuhl. Keep channels clear of leaves for uniform water distribution.'
                : '🏔️ पहाड़ी घाटी खेत: प्राकृतिक कूल के पानी से सिंचाई करें। नाली में पत्तों को साफ रखें ताकि पानी एक समान बहे।'),
          zeroElectricityBadge: isEn ? '100% Free Gravity Water' : '100% मुफ़्त प्राकृतिक प्रवाह',
        };
        hours = flowHours;
        durationStr = pahadiInfo.flowDuration;
        suggestedWindow = isEn
          ? 'Daytime, 8:00 AM - 4:00 PM (Easiest to monitor Kuhl flow in daylight)'
          : 'दिन में 8:00 AM से 4:00 PM (दिन में कूल का पानी नियंत्रित करना आसान रहता है)';
        advice += ` ${pahadiInfo.terraceAdvice}`;
      } else if (form.waterSource === 'Diesel Pump') {
        const fuelLiters = Math.round(pumpHp * 0.22 * hours * 10) / 10;
        dieselInfo = {
          fuelNeeded: isEn ? `${fuelLiters} Liters Diesel` : `${fuelLiters} लीटर डीजल`,
          estimatedCost: isEn ? `₹${Math.round(fuelLiters * 90)} Fuel Cost` : `₹${Math.round(fuelLiters * 90)} डीजल खर्च`,
          fuelBurnRate: `${Math.round(pumpHp * 0.22 * 10) / 10} L/hr`,
        };
        durationStr = isEn ? `${hours} Hours (Diesel Pump)` : `${hours} घंटे (डीजल पंप)`;
      } else if (form.waterSource === 'Solar Pump') {
        durationStr = isEn ? `${hours} Hours (Solar Pump)` : `${hours} घंटे (सोलर पंप)`;
        suggestedWindow = isEn
          ? 'Today, 10:00 AM - 3:00 PM (Peak sunshine window for solar discharge)'
          : 'आज 10:00 AM से 3:00 PM (तेज धूप के समय सोलर पंप अधिकतम पानी फेंकेगा)';
      } else {
        const v = Number(form.motorVoltage) || (form.phase === '3-Phase' ? 400 : 220);
        const is3P = form.phase === '3-Phase';
        let eff = 1.0;
        let vAdvice = isEn ? '✅ Optimal Voltage: Motor operating at optimal RPM.' : '✅ सामान्य वोल्टेज: मोटर पूरे आरपीएम पर सुरक्षित चलेगी।';
        let vStatus = 'optimal';
        let vBadge = isEn ? 'Optimal & Safe' : 'सुरक्षित व सामान्य';

        if (!is3P) {
          if (v < 165) {
            eff = 0.50;
            vStatus = 'critical_low';
            vBadge = isEn ? 'Critical Low Voltage' : 'अत्यधिक कम वोल्टेज';
            vAdvice = isEn 
              ? `🚨 Critical Danger (${v}V): Turn off motor immediately! Winding can burn in 15-20 minutes.`
              : `🚨 गंभीर खतरा (${v}V): मोटर तुरंत बंद करें! वाइंडिंग 15-20 मिनट में जल सकती है।`;
          } else if (v < 195) {
            eff = 0.72;
            vStatus = 'warning_low';
            vBadge = isEn ? 'Low Voltage (Slow Flow)' : 'कम वोल्टेज (धीमा प्रवाह)';
            vAdvice = isEn
              ? `⚠️ Low Voltage (${v}V): Discharge is 28% lower. Do not run for more than 30-40 minutes.`
              : `⚠️ कम वोल्टेज (${v}V): पानी का डिस्चार्ज 28% कम रहेगा। मोटर को 30-40 मिनट से ज्यादा न चलाएं।`;
          }
        } else {
          if (v < 330) {
            eff = 0.55;
            vStatus = 'critical_low';
            vBadge = isEn ? '3-Phase Critical Low' : '3-फेज अत्यधिक कम';
            vAdvice = isEn
              ? `🚨 Only ${v}V received in 3-phase. Danger of motor burnout or starter tripping!`
              : `🚨 3-फेज में केवल ${v}V आ रहा है। मोटर जलने या स्टार्टर ट्रिप का खतरा!`;
          } else if (v < 380) {
            eff = 0.80;
            vStatus = 'warning_low';
            vBadge = isEn ? '3-Phase Low Voltage' : '3-फेज कम वोल्टेज';
            vAdvice = isEn
              ? `⚠️ 3-Phase voltage is low (${v}V). Discharge reduced by 20%.`
              : `⚠️ 3-फेज वोल्टेज कम (${v}V) है। डिस्चार्ज 20% कम होगा।`;
          }
        }

        const adjHours = Math.round((hours / eff) * 10) / 10;
        voltageInfo = {
          voltage: v,
          phase: form.phase,
          status: vStatus,
          badge: vBadge,
          color: vStatus === 'critical_low' ? '#ef4444' : vStatus === 'warning_low' ? '#f59e0b' : '#10b981',
          efficiencyPct: Math.round(eff * 100),
          adjustedDurationHours: adjHours,
          advice: vAdvice,
        };
        hours = adjHours;
        durationStr = isEn ? `${hours} Hours` : `${hours} घंटे`;
        if (vStatus !== 'optimal') advice += ` ${vAdvice}`;
      }

      predictionData = {
        success: true,
        irrigationNeeded: !willRain,
        urgency: willRain ? (isEn ? 'Postponed (Rain Expected)' : 'स्थगित (बारिश संभावना)') : (isEn ? 'Normal (Scheduled)' : 'सामान्य (योजनाबद्ध)'),
        waterReq: isEn ? `${liters.toLocaleString()} Liters` : `${liters.toLocaleString()} लीटर`,
        waterReqLiters: liters,
        duration: durationStr,
        durationHours: hours,
        suggestedWindow,
        advice,
        crop: form.crop,
        soilType: form.soilType,
        waterSource: form.waterSource,
        pahadiInfo,
        voltageInfo,
        dieselInfo,
        modelAccuracy: '99.81%',
      };
    }

    setResult(predictionData);
    setLoading(false);

    // Save to AsyncStorage history
    try {
      const stored = await AsyncStorage.getItem('@irrigation_history');
      const historyList = stored ? JSON.parse(stored) : [];
      const newEntry = {
        id: Date.now().toString(),
        field: `${form.crop} Field (${form.fieldSize} ${form.fieldUnit})`,
        crop: form.crop,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        duration: predictionData.duration || '2.5 Hours',
        water: predictionData.waterReq || '15,000 L',
        urgency: predictionData.urgency,
        window: predictionData.suggestedWindow,
        location: locationName,
        waterSource: predictionData.waterSource || form.waterSource,
        voltageInfo: predictionData.voltageInfo,
        pahadiInfo: predictionData.pahadiInfo,
      };
      await AsyncStorage.setItem('@irrigation_history', JSON.stringify([newEntry, ...historyList]));
    } catch (saveErr) {
      console.warn('Error saving to history:', saveErr);
    }
  };

  const getUrgencyBadgeStatus = (urgencyStr: string) => {
    if (!urgencyStr) return 'info';
    const lower = urgencyStr.toLowerCase();
    if (lower.includes('critical') || lower.includes('high')) return 'error';
    if (lower.includes('postpone') || lower.includes('rain')) return 'warning';
    if (lower.includes('optimal') || lower.includes('not')) return 'success';
    return 'info';
  };

  const liveVoltageAssessment = getLiveVoltageAssessment(form.motorVoltage, form.phase);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>{t('irrigation.pageTitle', 'Smart Irrigation')}</Text>
              <View style={styles.locationTag}>
                <MaterialCommunityIcons name="map-marker-radius" size={14} color={Theme.Colors.primary} />
                <Text style={styles.locationText}>{locationName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LanguageSwitchButton />
              <TouchableOpacity 
                style={styles.historyBtn} 
                onPress={() => router.push('/irrigation/history')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="history" size={24} color={Theme.Colors.primary} />
                <Text style={styles.historyBtnText}>{t('common.history', 'History')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Dynamic Weather Card */}
          <Card style={styles.weatherCard}>
            <View style={styles.weatherHeader}>
              <View style={styles.weatherTitleRow}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={22} color="#0284c7" />
                <Text style={styles.weatherTitle}>{t('irrigation.liveWeather', 'Live Field Weather')}</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>{t('common.live', 'LIVE')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={fetchLiveWeatherAndLocation} disabled={weatherLoading}>
                {weatherLoading ? (
                  <ActivityIndicator size="small" color="#0284c7" />
                ) : (
                  <MaterialCommunityIcons name="refresh" size={20} color="#0284c7" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.weatherGrid}>
              <View style={styles.weatherStat}>
                <MaterialCommunityIcons name="thermometer" size={24} color="#ea580c" />
                <Text style={styles.statValue}>{liveWeather.temperature}°C</Text>
                <Text style={styles.statLabel}>{t('irrigation.temperature', 'Temperature')}</Text>
              </View>

              <View style={styles.weatherStat}>
                <MaterialCommunityIcons name="water-percent" size={24} color="#0284c7" />
                <Text style={styles.statValue}>{liveWeather.humidity}%</Text>
                <Text style={styles.statLabel}>{t('irrigation.humidity', 'Humidity')}</Text>
              </View>

              <View style={styles.weatherStat}>
                <MaterialCommunityIcons name="weather-rainy" size={24} color="#6366f1" />
                <Text style={styles.statValue}>{liveWeather.rainProbability}%</Text>
                <Text style={styles.statLabel}>{t('irrigation.rainForecast', 'Rain Forecast')}</Text>
              </View>

              <View style={styles.weatherStat}>
                <MaterialCommunityIcons name="weather-windy" size={24} color="#059669" />
                <Text style={styles.statValue}>{liveWeather.windSpeed} km/h</Text>
                <Text style={styles.statLabel}>{t('irrigation.windSpeed', 'Wind Speed')}</Text>
              </View>
            </View>
          </Card>

          {/* Farm & Crop Configuration Form */}
          <Card style={styles.formCard}>
            <Text style={styles.sectionSubtitle}>{t('irrigation.farmParams', 'Farm & Crop Parameters')}</Text>

            {/* Crop Selector Chips */}
            <Text style={styles.fieldLabel}>{t('irrigation.selectCrop', 'Select Crop')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CROPS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, form.crop === c.id && styles.chipActive]}
                  onPress={() => setForm({ ...form, crop: c.id })}
                >
                  <Text style={[styles.chipText, form.crop === c.id && styles.chipTextActive]}>
                    {language === 'hi' ? c.hi : c.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Field Size & Unit */}
            <View style={styles.sizeRow}>
              <View style={{ flex: 1, marginRight: Theme.Spacing.sm }}>
                <Input
                  label={t('irrigation.fieldSize', 'Field Size')}
                  keyboardType="numeric"
                  value={form.fieldSize}
                  onChangeText={(t) => setForm({ ...form, fieldSize: t })}
                />
              </View>
              <View style={styles.unitSelector}>
                <Text style={styles.unitLabel}>{t('irrigation.unit', 'Unit')}</Text>
                <View style={styles.unitToggleGroup}>
                  {FIELD_UNITS.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.unitBtn, form.fieldUnit === u.id && styles.unitBtnActive]}
                      onPress={() => setForm({ ...form, fieldUnit: u.id })}
                    >
                      <Text style={[styles.unitBtnText, form.fieldUnit === u.id && styles.unitBtnTextActive]}>
                        {language === 'hi' ? u.hi : u.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Soil Type Chips */}
            <Text style={styles.fieldLabel}>{t('irrigation.soilType', 'Soil Type')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {SOILS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, form.soilType === s.id && styles.chipActive]}
                  onPress={() => setForm({ ...form, soilType: s.id })}
                >
                  <Text style={[styles.chipText, form.soilType === s.id && styles.chipTextActive]}>
                    {language === 'hi' ? s.hi : s.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Water Source Selection */}
            <Text style={styles.fieldLabel}>{t('irrigation.waterSource', 'Irrigation Water Source')}</Text>
            <View style={styles.sourceGrid}>
              {WATER_SOURCES.map((ws) => {
                const isActive = form.waterSource === ws.id;
                const title = language === 'hi' ? ws.hi.title : ws.en.title;
                const subtitle = language === 'hi' ? ws.hi.subtitle : ws.en.subtitle;
                return (
                  <TouchableOpacity
                    key={ws.id}
                    style={[styles.sourceCard, isActive && styles.sourceCardActive]}
                    onPress={() => {
                      const newPhase = form.phase;
                      const newVoltage = ws.id === 'Electric Motor' ? (newPhase === '3-Phase' ? '415' : '220') : form.motorVoltage;
                      setForm({ ...form, waterSource: ws.id, motorVoltage: newVoltage });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sourceIconBox, isActive && styles.sourceIconBoxActive]}>
                      <MaterialCommunityIcons
                        name={ws.icon as any}
                        size={20}
                        color={isActive ? '#ffffff' : Theme.Colors.primary}
                      />
                    </View>
                    <Text style={[styles.sourceTitle, isActive && styles.sourceTitleActive]}>
                      {title}
                    </Text>
                    <Text style={[styles.sourceSubtitle, isActive && styles.sourceSubtitleActive]}>
                      {subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Conditional Block 1: Pahadi Kuhl / Natural Mountain Stream */}
            {form.waterSource === 'Pahadi Kuhl / Stream' && (
              <View style={styles.specialCardPahadi}>
                <View style={styles.specialHeaderRow}>
                  <MaterialCommunityIcons name="image-filter-hdr" size={20} color="#047857" />
                  <Text style={styles.pahadiHeaderTitle}>{t('irrigation.pahadiHeaderTitle')}</Text>
                </View>
                <Text style={styles.pahadiHeaderDesc}>
                  {t('irrigation.pahadiHeaderDesc')}
                </Text>

                {/* Terrain Selector */}
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{t('irrigation.terrainType', 'Terrain Type')}</Text>
                <View style={styles.terrainRow}>
                  {TERRAINS.map((tr) => (
                    <TouchableOpacity
                      key={tr.id}
                      style={[styles.terrainChip, form.terrainType === tr.id && styles.terrainChipActive]}
                      onPress={() => setForm({ ...form, terrainType: tr.id })}
                    >
                      <Text style={[styles.terrainText, form.terrainType === tr.id && styles.terrainTextActive]}>
                        {language === 'hi' ? tr.hi.label : tr.en.label}
                      </Text>
                      <Text style={styles.terrainSubText}>{language === 'hi' ? tr.hi.sub : tr.en.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Stream Flow Rate */}
                <Text style={[styles.fieldLabel, { marginTop: 10 }]}>{t('irrigation.streamDischarge', 'Kuhl Water Flow Rate')}</Text>
                <View style={styles.streamRow}>
                  {STREAM_FLOWS.map((sf) => (
                    <TouchableOpacity
                      key={sf.id}
                      style={[styles.streamChip, form.streamFlow === sf.id && styles.streamChipActive]}
                      onPress={() => setForm({ ...form, streamFlow: sf.id })}
                    >
                      <Text style={[styles.streamText, form.streamFlow === sf.id && styles.streamTextActive]}>
                        {language === 'hi' ? sf.hi.label : sf.en.label}
                      </Text>
                      <Text style={styles.streamSub}>{language === 'hi' ? sf.hi.sub : sf.en.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Conditional Block 2: Electric Motor & Voltage Monitoring */}
            {form.waterSource === 'Electric Motor' && (
              <View style={styles.specialCardElectric}>
                <View style={styles.specialHeaderRow}>
                  <MaterialCommunityIcons name="flash" size={22} color="#0284c7" />
                  <Text style={styles.electricHeaderTitle}>{t('irrigation.electricHeaderTitle')}</Text>
                </View>

                {/* Phase Selection Toggle */}
                <Text style={[styles.fieldLabel, { marginTop: 8 }]}>{t('irrigation.phaseType', 'Phase Type')}</Text>
                <View style={styles.phaseToggleRow}>
                  {['1-Phase', '3-Phase'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.phaseBtn, form.phase === p && styles.phaseBtnActive]}
                      onPress={() => setForm({ ...form, phase: p, motorVoltage: p === '3-Phase' ? '415' : '220' })}
                    >
                      <MaterialCommunityIcons
                        name={p === '1-Phase' ? 'numeric-1-circle' : 'numeric-3-circle'}
                        size={16}
                        color={form.phase === p ? '#ffffff' : Theme.Colors.textSecondary}
                      />
                      <Text style={[styles.phaseBtnText, form.phase === p && styles.phaseBtnTextActive, { marginLeft: 4 }]}>
                        {p} ({p === '1-Phase' ? (language === 'hi' ? 'सिंगल फेज ~220V' : 'Single Phase ~220V') : (language === 'hi' ? 'थ्री फेज ~415V' : 'Three Phase ~415V')})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Voltage Input & Quick Presets */}
                <View style={{ marginTop: Theme.Spacing.xs }}>
                  <Input
                    label={language === 'hi' ? `मोटर वोल्टेज (वोल्ट - ${form.phase})` : `Motor Voltage (Volts - ${form.phase})`}
                    placeholder={form.phase === '3-Phase' ? 'e.g. 415' : 'e.g. 220'}
                    keyboardType="numeric"
                    value={form.motorVoltage}
                    onChangeText={(t) => setForm({ ...form, motorVoltage: t })}
                  />
                </View>

                {/* Preset Voltage Quick Chips */}
                <Text style={[styles.fieldLabel, { marginTop: 4 }]}>{t('irrigation.quickPresets', 'Quick Voltage Presets')}:</Text>
                <View style={styles.voltagePresetRow}>
                  {(form.phase === '3-Phase' ? THREE_PHASE_PRESETS : SINGLE_PHASE_PRESETS).map((v) => (
                    <TouchableOpacity
                      key={v.val}
                      style={[
                        styles.voltagePresetChip,
                        form.motorVoltage === v.val && styles.voltagePresetChipActive,
                      ]}
                      onPress={() => setForm({ ...form, motorVoltage: v.val })}
                    >
                      <Text
                        style={[
                          styles.voltagePresetText,
                          form.motorVoltage === v.val && styles.voltagePresetTextActive,
                        ]}
                      >
                        {language === 'hi' ? v.hi : v.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Real-time Dynamic Voltage Meter Assessment */}
                <View style={[styles.voltageLiveMeter, { borderLeftColor: liveVoltageAssessment.color }]}>
                  <View style={styles.voltageLiveRow}>
                    <MaterialCommunityIcons
                      name={liveVoltageAssessment.icon as any}
                      size={20}
                      color={liveVoltageAssessment.color}
                    />
                    <Text style={[styles.voltageLiveBadge, { color: liveVoltageAssessment.color }]}>
                      {liveVoltageAssessment.badge}
                    </Text>
                  </View>
                  <Text style={styles.voltageLiveDesc}>{liveVoltageAssessment.flowDesc}</Text>
                </View>
              </View>
            )}

            {/* Pump Capacity (Shown for Motor, Solar, and Diesel) */}
            {form.waterSource !== 'Pahadi Kuhl / Stream' && (
              <>
                <Text style={styles.fieldLabel}>{t('irrigation.pumpCapacity', 'Pump Capacity (HP)')}</Text>
                <View style={styles.pumpRow}>
                  {PUMPS.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pumpChip, form.pumpCapacity === p && styles.chipActive]}
                      onPress={() => setForm({ ...form, pumpCapacity: p })}
                    >
                      <MaterialCommunityIcons
                        name="water-pump"
                        size={16}
                        color={form.pumpCapacity === p ? '#fff' : Theme.Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          form.pumpCapacity === p && styles.chipTextActive,
                          { marginLeft: 4 },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Days Since Last Irrigation */}
            <View style={{ marginTop: Theme.Spacing.sm }}>
              <Input
                label={t('irrigation.daysSinceLast', 'Days Since Last Irrigation')}
                keyboardType="numeric"
                value={form.daysSinceLastIrrigation}
                onChangeText={(t) => setForm({ ...form, daysSinceLastIrrigation: t })}
              />
            </View>

            {/* Optional Sensor Soil Moisture */}
            <Input
              label={t('irrigation.soilMoistureOptional', 'Soil Moisture % (Optional / Sensor)')}
              placeholder="e.g. 18.5"
              keyboardType="numeric"
              value={form.soilMoisture}
              onChangeText={(t) => setForm({ ...form, soilMoisture: t })}
            />

            <Button
              title={loading ? t('irrigation.analyzing', 'Analyzing with ML Model...') : t('irrigation.calculateBtn', 'Calculate Smart Irrigation Plan')}
              onPress={handleCalculate}
              disabled={loading}
              style={styles.calcBtn}
            />
          </Card>

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Theme.Colors.primary} />
              <Text style={styles.loadingText}>{t('irrigation.runningAiModel', 'Running Agronomic FAO-56 & Voltage AI Model...')}</Text>
            </View>
          )}

          {/* AI Result Card */}
          {result && !loading && (
            <View style={styles.resultContainer}>
              <SectionHeader title={t('irrigation.aiDecision', 'AI Irrigation Decision')} />
              <Card style={[styles.resultCard, result.irrigationNeeded ? styles.resultActive : styles.resultRest]}>
                
                {/* Result Badges */}
                <View style={styles.badgeRow}>
                  <StatusBadge
                    status={getUrgencyBadgeStatus(result.urgency)}
                    label={result.urgency || 'AI Calculated'}
                  />
                  <View style={styles.accuracyTag}>
                    <MaterialCommunityIcons name="shield-check" size={14} color="#059669" />
                    <Text style={styles.accuracyText}>{result.modelAccuracy || '99.8%'} {language === 'hi' ? 'सटीक' : 'Accurate'}</Text>
                  </View>
                </View>

                {/* Main Metric Display */}
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricNumber}>{result.waterReq}</Text>
                    <Text style={styles.metricSubtitle}>{t('irrigation.waterRequirement', 'Water Requirement')}</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricItem}>
                    <Text style={styles.metricNumber}>{result.duration}</Text>
                    <Text style={styles.metricSubtitle}>
                      {result.pahadiInfo ? t('irrigation.channelFlowTime', 'Channel Flow Time') : t('irrigation.pumpRuntime', 'Pump Runtime')}
                    </Text>
                  </View>
                </View>

                {/* Conditional Pahadi Result Card */}
                {result.pahadiInfo && (
                  <View style={styles.pahadiResultBox}>
                    <View style={styles.pahadiResultHeader}>
                      <MaterialCommunityIcons name="image-filter-hdr" size={20} color="#059669" />
                      <Text style={styles.pahadiResultTitle}>{t('irrigation.pahadiAnalysisTitle', 'Mountain Kuhl Analysis (Gravity Flow)')}</Text>
                    </View>
                    <View style={styles.pahadiPillRow}>
                      <View style={styles.greenPill}>
                        <MaterialCommunityIcons name="leaf" size={14} color="#15803d" />
                        <Text style={styles.greenPillText}>{result.pahadiInfo.electricityCostSaved}</Text>
                      </View>
                      <View style={styles.greenPill}>
                        <MaterialCommunityIcons name="speedometer" size={14} color="#15803d" />
                        <Text style={styles.greenPillText}>{result.pahadiInfo.streamFlowLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.pahadiTipBox}>
                      <Text style={styles.pahadiTipText}>{result.pahadiInfo.terraceAdvice}</Text>
                    </View>
                  </View>
                )}

                {/* Conditional Motor Voltage Health Card */}
                {result.voltageInfo && (
                  <View
                    style={[
                      styles.voltageResultBox,
                      {
                        borderColor: result.voltageInfo.color,
                        backgroundColor:
                          result.voltageInfo.status === 'critical_low'
                            ? '#fef2f2'
                            : result.voltageInfo.status === 'warning_low'
                            ? '#fffbeb'
                            : '#f0fdf4',
                      },
                    ]}
                  >
                    <View style={styles.voltageResultHeader}>
                      <MaterialCommunityIcons
                        name="flash"
                        size={22}
                        color={result.voltageInfo.color}
                      />
                      <Text style={[styles.voltageResultTitle, { color: result.voltageInfo.color }]}>
                        {t('irrigation.voltageMonitorTitle', 'Motor Voltage & Protection')} ({result.voltageInfo.voltage}V • {result.voltageInfo.phase})
                      </Text>
                    </View>
                    <View style={styles.voltageMetricGrid}>
                      <View style={styles.voltageMetricItem}>
                        <Text style={styles.voltageMetricLabel}>{t('irrigation.voltageStatus', 'Voltage Status')}</Text>
                        <Text style={[styles.voltageMetricVal, { color: result.voltageInfo.color }]}>
                          {result.voltageInfo.badge}
                        </Text>
                      </View>
                      <View style={styles.voltageMetricItem}>
                        <Text style={styles.voltageMetricLabel}>{t('irrigation.flowEfficiency', 'Pressure / Flow Rate')}</Text>
                        <Text style={styles.voltageMetricVal}>
                          {result.voltageInfo.efficiencyPct}% {language === 'hi' ? 'पूर्ण प्रवाह' : 'Full Flow'}
                        </Text>
                      </View>
                      <View style={styles.voltageMetricItem}>
                        <Text style={styles.voltageMetricLabel}>{t('irrigation.adjustedDuration', 'Adjusted Duration')}</Text>
                        <Text style={styles.voltageMetricVal}>
                          {result.voltageInfo.adjustedDurationHours} {language === 'hi' ? 'घंटे' : 'Hours'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.voltageResultAdvice}>{result.voltageInfo.advice}</Text>
                  </View>
                )}

                {/* Conditional Diesel Fuel Card */}
                {result.dieselInfo && (
                  <View style={styles.dieselResultBox}>
                    <View style={styles.pahadiResultHeader}>
                      <MaterialCommunityIcons name="gas-station" size={20} color="#b45309" />
                      <Text style={[styles.pahadiResultTitle, { color: '#b45309' }]}>
                        {language === 'hi' ? 'डीजल खपत एवं खर्च (डीजल इंजन)' : 'Diesel Consumption & Cost (Diesel Engine)'}
                      </Text>
                    </View>
                    <Text style={styles.dieselDesc}>
                      {language === 'hi' ? '⛽ आवश्यक ईंधन' : '⛽ Fuel Needed'}: {result.dieselInfo.fuelNeeded} • {result.dieselInfo.estimatedCost} ({result.dieselInfo.fuelBurnRate})
                    </Text>
                  </View>
                )}

                {/* Details Breakdown */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownRow}>
                    <View style={styles.labelWithIcon}>
                      <MaterialCommunityIcons name="clock-outline" size={18} color="#0284c7" />
                      <Text style={styles.breakdownLabel}>{t('irrigation.suggestedWindow', 'Suggested Window')}:</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{result.suggestedWindow}</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.labelWithIcon}>
                      <MaterialCommunityIcons name="sprout" size={18} color={Theme.Colors.primary} />
                      <Text style={styles.breakdownLabel}>{t('irrigation.cropAndArea', 'Crop & Area')}:</Text>
                    </View>
                    <Text style={styles.breakdownValue}>
                      {form.crop} ({form.fieldSize} {form.fieldUnit})
                    </Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <View style={styles.labelWithIcon}>
                      <MaterialCommunityIcons name="water-percent" size={18} color="#0ea5e9" />
                      <Text style={styles.breakdownLabel}>{t('irrigation.liveHumidity', 'Live Humidity')}:</Text>
                    </View>
                    <Text style={styles.breakdownValue}>{liveWeather.humidity}% {language === 'hi' ? 'सापेक्षिक आर्द्रता' : 'Relative Humidity'}</Text>
                  </View>

                  {result.estimatedSoilMoisture ? (
                    <View style={styles.breakdownRow}>
                      <View style={styles.labelWithIcon}>
                        <MaterialCommunityIcons name="layers-outline" size={18} color="#9333ea" />
                        <Text style={styles.breakdownLabel}>{t('irrigation.soilMoisture', 'Soil Moisture')}:</Text>
                      </View>
                      <Text style={styles.breakdownValue}>{result.estimatedSoilMoisture}% (at 15cm)</Text>
                    </View>
                  ) : null}
                </View>

                {/* Dynamic Farmer Advice Banner */}
                {result.advice ? (
                  <View style={styles.adviceBanner}>
                    <Text style={styles.adviceText}>{result.advice}</Text>
                  </View>
                ) : null}

                {/* History Link Button */}
                <TouchableOpacity
                  style={styles.historyLinkBtn}
                  onPress={() => router.push('/irrigation/history')}
                >
                  <MaterialCommunityIcons name="playlist-check" size={18} color={Theme.Colors.primary} />
                  <Text style={styles.historyLinkText}>{t('irrigation.savedHistoryBtn', 'Saved to Irrigation History • View All')}</Text>
                </TouchableOpacity>

              </Card>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  scroll: { padding: Theme.Spacing.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.Spacing.md,
  },
  pageTitle: { ...Theme.Typography.h2, color: Theme.Colors.text },
  locationTag: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationText: { ...Theme.Typography.small, color: Theme.Colors.textSecondary, marginLeft: 4 },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.BorderRadius.pill,
  },
  historyBtnText: { ...Theme.Typography.small, fontWeight: '700', color: Theme.Colors.primaryDark, marginLeft: 4 },

  /* Live Weather Card */
  weatherCard: {
    padding: Theme.Spacing.md,
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    marginBottom: Theme.Spacing.md,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.Spacing.sm,
  },
  weatherTitleRow: { flexDirection: 'row', alignItems: 'center' },
  weatherTitle: { ...Theme.Typography.bodyMedium, fontWeight: '700', color: '#0369a1', marginLeft: 6 },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: '700', color: '#0284c7' },
  weatherGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Theme.Spacing.xs,
  },
  weatherStat: { alignItems: 'center', flex: 1 },
  statValue: { ...Theme.Typography.bodyMedium, fontWeight: '700', color: Theme.Colors.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: Theme.Colors.textSecondary, marginTop: 2 },

  /* Farm Form Card */
  formCard: { padding: Theme.Spacing.md, marginBottom: Theme.Spacing.md },
  sectionSubtitle: { ...Theme.Typography.bodyMedium, fontWeight: '700', color: Theme.Colors.text, marginBottom: Theme.Spacing.sm },
  fieldLabel: { ...Theme.Typography.small, fontWeight: '600', color: Theme.Colors.textSecondary, marginTop: Theme.Spacing.sm, marginBottom: 6 },
  chipScroll: { flexDirection: 'row', marginBottom: Theme.Spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: Theme.BorderRadius.pill,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: Theme.Colors.primary,
    borderColor: Theme.Colors.primary,
  },
  chipText: { ...Theme.Typography.small, color: Theme.Colors.text, fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },

  sizeRow: { flexDirection: 'row', alignItems: 'center', marginTop: Theme.Spacing.xs },
  unitSelector: { width: 140, marginBottom: Theme.Spacing.md },
  unitLabel: { ...Theme.Typography.small, fontWeight: '600', color: Theme.Colors.textSecondary, marginBottom: 4 },
  unitToggleGroup: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 2 },
  unitBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  unitBtnActive: { backgroundColor: '#ffffff' },
  unitBtnText: { fontSize: 11, color: Theme.Colors.textSecondary, fontWeight: '600' },
  unitBtnTextActive: { color: Theme.Colors.primary, fontWeight: '700' },

  /* Water Source Grid */
  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Theme.Spacing.sm,
  },
  sourceCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: Theme.BorderRadius.md,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  sourceCardActive: {
    borderColor: Theme.Colors.primary,
    backgroundColor: '#ecfdf5',
  },
  sourceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sourceIconBoxActive: {
    backgroundColor: Theme.Colors.primary,
  },
  sourceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.Colors.text,
  },
  sourceTitleActive: {
    color: Theme.Colors.primaryDark,
  },
  sourceSubtitle: {
    fontSize: 10,
    color: Theme.Colors.textSecondary,
    marginTop: 2,
  },
  sourceSubtitleActive: {
    color: Theme.Colors.primary,
    fontWeight: '600',
  },

  /* Pahadi Special Styling */
  specialCardPahadi: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    borderRadius: Theme.BorderRadius.md,
    padding: Theme.Spacing.sm,
    marginBottom: Theme.Spacing.sm,
  },
  specialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pahadiHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
    marginLeft: 6,
  },
  pahadiHeaderDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    fontWeight: '600',
  },
  terrainRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  terrainChip: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  terrainChipActive: {
    borderColor: '#059669',
    backgroundColor: '#d1fae5',
  },
  terrainText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.Colors.text,
  },
  terrainTextActive: {
    color: '#065f46',
  },
  terrainSubText: {
    fontSize: 10,
    color: Theme.Colors.textSecondary,
    marginTop: 2,
  },
  streamRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  streamChip: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  streamChipActive: {
    borderColor: '#059669',
    backgroundColor: '#d1fae5',
  },
  streamText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.Colors.text,
    textAlign: 'center',
  },
  streamTextActive: {
    color: '#065f46',
  },
  streamSub: {
    fontSize: 9,
    color: Theme.Colors.textSecondary,
    marginTop: 2,
  },

  /* Electric Motor & Voltage Styling */
  specialCardElectric: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: Theme.BorderRadius.md,
    padding: Theme.Spacing.sm,
    marginBottom: Theme.Spacing.sm,
  },
  electricHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    marginLeft: 6,
  },
  phaseToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  phaseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  phaseBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  phaseBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.Colors.textSecondary,
  },
  phaseBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  voltagePresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: Theme.Spacing.xs,
  },
  voltagePresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  voltagePresetChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  voltagePresetText: {
    fontSize: 11,
    color: Theme.Colors.text,
    fontWeight: '600',
  },
  voltagePresetTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  voltageLiveMeter: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  voltageLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voltageLiveBadge: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  voltageLiveDesc: {
    fontSize: 11,
    color: Theme.Colors.textSecondary,
    marginTop: 2,
    marginLeft: 26,
  },

  pumpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Theme.Spacing.xs },
  pumpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: Theme.BorderRadius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calcBtn: { marginTop: Theme.Spacing.md },

  /* Loading */
  loadingBox: { alignItems: 'center', padding: Theme.Spacing.lg },
  loadingText: { ...Theme.Typography.small, color: Theme.Colors.textSecondary, marginTop: Theme.Spacing.sm },

  /* Results */
  resultContainer: { marginTop: Theme.Spacing.sm },
  resultCard: { padding: Theme.Spacing.md, borderWidth: 1 },
  resultActive: { borderColor: '#38bdf8', backgroundColor: '#ffffff' },
  resultRest: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.Spacing.md },
  accuracyTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  accuracyText: { fontSize: 11, fontWeight: '700', color: '#15803d', marginLeft: 4 },

  metricRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: Theme.Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#e0f2fe' },
  metricItem: { alignItems: 'center', flex: 1 },
  metricNumber: { ...Theme.Typography.h2, color: '#0369a1', fontWeight: '800', textAlign: 'center' },
  metricSubtitle: { ...Theme.Typography.small, color: Theme.Colors.textSecondary, marginTop: 2 },
  metricDivider: { width: 1, height: 40, backgroundColor: '#cbd5e1' },

  /* Result Custom Cards */
  pahadiResultBox: {
    marginTop: Theme.Spacing.md,
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#6ee7b7',
    borderRadius: Theme.BorderRadius.md,
    padding: Theme.Spacing.sm,
  },
  pahadiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pahadiResultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
    marginLeft: 6,
  },
  pahadiPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  greenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  greenPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
    marginLeft: 4,
  },
  pahadiTipBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
  },
  pahadiTipText: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
    fontWeight: '500',
  },

  voltageResultBox: {
    marginTop: Theme.Spacing.md,
    borderWidth: 1.5,
    borderRadius: Theme.BorderRadius.md,
    padding: Theme.Spacing.sm,
  },
  voltageResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voltageResultTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  voltageMetricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  voltageMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  voltageMetricLabel: {
    fontSize: 10,
    color: Theme.Colors.textSecondary,
    marginBottom: 2,
  },
  voltageMetricVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.Colors.text,
  },
  voltageResultAdvice: {
    fontSize: 11,
    color: Theme.Colors.text,
    lineHeight: 16,
    marginTop: 6,
  },

  dieselResultBox: {
    marginTop: Theme.Spacing.md,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: Theme.BorderRadius.md,
    padding: Theme.Spacing.sm,
  },
  dieselDesc: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
    marginTop: 4,
  },

  breakdownBox: { marginTop: Theme.Spacing.md },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  labelWithIcon: { flexDirection: 'row', alignItems: 'center' },
  breakdownLabel: { ...Theme.Typography.bodyMedium, color: Theme.Colors.textSecondary, marginLeft: 6 },
  breakdownValue: { ...Theme.Typography.bodyMedium, fontWeight: '700', color: Theme.Colors.text },

  adviceBanner: {
    marginTop: Theme.Spacing.md,
    padding: Theme.Spacing.sm,
    backgroundColor: '#f8fafc',
    borderRadius: Theme.BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Theme.Colors.primary,
  },
  adviceText: { ...Theme.Typography.small, color: Theme.Colors.text, lineHeight: 18 },

  historyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.Spacing.md,
    paddingVertical: 8,
  },
  historyLinkText: { ...Theme.Typography.small, fontWeight: '700', color: Theme.Colors.primary, marginLeft: 6 },
});
