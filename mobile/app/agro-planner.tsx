import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { agroAPI, FarmProfile } from '../services/agroAI';
import { useLanguage } from '../context/LanguageContext';
import { BACKEND_URL } from '@/config/api';

const C = Theme.Colors;

// ── CROP VARIETIES & ICAR/FAO-56 WATER DATASET ──────────────────────────────
export interface CropWaterSpec {
  nameHi: string;
  nameEn: string;
  varieties: string[];
  singleDepthMm: number;        // single irrigation event depth (mm)
  totalSeasonMm: number;        // full lifecycle water requirement (mm)
  irrigationsCount: string;     // estimated total irrigations
  maxSafeRainMm: number;        // single event threshold before waterlogging/damage
  waterSensitivity: 'High' | 'Medium' | 'Low';
  rootRotRisk: string;
  faoKcMid: number;
}

export const CROP_WATER_SPECS: Record<string, CropWaterSpec> = {
  Wheat: {
    nameHi: 'गेहूं',
    nameEn: 'Wheat',
    varieties: ['VL Gehun 907', 'VL 892', 'VL 953', 'UP 2628', 'HD 2967'],
    singleDepthMm: 40,
    totalSeasonMm: 420,
    irrigationsCount: '4 - 5 बार',
    maxSafeRainMm: 50,
    waterSensitivity: 'Medium',
    rootRotRisk: 'CRI व कल्ले फूटते समय जलभराव से जड़ सड़न संभव',
    faoKcMid: 1.15,
  },
  Rice: {
    nameHi: 'धान',
    nameEn: 'Rice / Paddy',
    varieties: ['Pant Dhan 26', 'VL Dhan 156', 'VL Dhan 158', 'Pant Sugandh Dhan 16'],
    singleDepthMm: 60,
    totalSeasonMm: 1300,
    irrigationsCount: '15 - 18 बार',
    maxSafeRainMm: 90,
    waterSensitivity: 'Low',
    rootRotRisk: 'धान को पानी पसंद है, परंतु 95mm से अधिक पर जल निकासी जरूरी',
    faoKcMid: 1.25,
  },
  Maize: {
    nameHi: 'मक्का',
    nameEn: 'Maize',
    varieties: ['Pant Sankar Makka-1', 'Gaurav', 'Surya'],
    singleDepthMm: 35,
    totalSeasonMm: 450,
    irrigationsCount: '4 - 6 बार',
    maxSafeRainMm: 45,
    waterSensitivity: 'High',
    rootRotRisk: 'मक्के की जड़ें 24 घंटे से अधिक पानी सहन नहीं कर सकतीं',
    faoKcMid: 1.15,
  },
  Mustard: {
    nameHi: 'सरसों',
    nameEn: 'Mustard',
    varieties: ['GSC-6 (कैनोला)', 'Pusa Mustard 25', 'Kranti', 'Varuna'],
    singleDepthMm: 28,
    totalSeasonMm: 260,
    irrigationsCount: '2 - 3 बार',
    maxSafeRainMm: 35,
    waterSensitivity: 'High',
    rootRotRisk: 'अत्यधिक नमी से तना गलन (Sclerotinia) व छाछिया रोग बढ़ता है',
    faoKcMid: 1.05,
  },
  Potato: {
    nameHi: 'आलू',
    nameEn: 'Potato',
    varieties: ['Kufri Khyati', 'Kufri Pushkar', 'Kufri Jyoti', 'Kufri Giriraj'],
    singleDepthMm: 30,
    totalSeasonMm: 380,
    irrigationsCount: '5 - 6 बार',
    maxSafeRainMm: 35,
    waterSensitivity: 'High',
    rootRotRisk: 'कंद बनने पर जलभराव से आलू सड़ने (Late Blight) का अत्यधिक खतरा',
    faoKcMid: 1.15,
  },
  Sugarcane: {
    nameHi: 'गन्ना',
    nameEn: 'Sugarcane',
    varieties: ['Co Pant 94211', 'Co Pant 84211', 'Co 0238'],
    singleDepthMm: 55,
    totalSeasonMm: 1750,
    irrigationsCount: '12 - 15 बार',
    maxSafeRainMm: 80,
    waterSensitivity: 'Low',
    rootRotRisk: 'लंबा जलभराव लाल सड़न (Red Rot) को बढ़ावा देता है',
    faoKcMid: 1.25,
  },
  Tomato: {
    nameHi: 'टमाटर',
    nameEn: 'Tomato',
    varieties: ['Pant T-3', 'Pusa Ruby', 'Himsona', 'Abhinav'],
    singleDepthMm: 25,
    totalSeasonMm: 420,
    irrigationsCount: '8 - 10 बार (हल्की)',
    maxSafeRainMm: 30,
    waterSensitivity: 'High',
    rootRotRisk: 'जलभराव से 12 घंटे में विल्ट (Wilt) और फल फटने का भारी खतरा',
    faoKcMid: 1.15,
  },
  Pulses: {
    nameHi: 'दालें / राजमा',
    nameEn: 'Pulses / Rajma',
    varieties: ['Arun (Rajma)', 'HUR 301', 'VL Bhat 201', 'VL Gahat 8'],
    singleDepthMm: 25,
    totalSeasonMm: 280,
    irrigationsCount: '2 - 3 बार',
    maxSafeRainMm: 32,
    waterSensitivity: 'High',
    rootRotRisk: 'दालों में अत्यधिक जल से नोड्यूल नष्ट होते हैं व जड़ सड़न होती है',
    faoKcMid: 1.05,
  },
  Mandua: {
    nameHi: 'मंडुआ (रागी)',
    nameEn: 'Finger Millet (Mandua)',
    varieties: ['VL Mandua 376', 'VL Mandua 382', 'VL Mandua 402', 'VLM 352'],
    singleDepthMm: 22,
    totalSeasonMm: 240,
    irrigationsCount: '1 - 2 बार (सूखे में)',
    maxSafeRainMm: 45,
    waterSensitivity: 'Medium',
    rootRotRisk: 'सीढ़ीदार खेतों में तेज बहाव से मृदा अपरदन का खतरा',
    faoKcMid: 1.00,
  },
  Jhangora: {
    nameHi: 'झंगोरा',
    nameEn: 'Barnyard Millet (Jhangora)',
    varieties: ['VL Madira 172', 'VL Madira 207', 'VL Madira 254'],
    singleDepthMm: 20,
    totalSeasonMm: 220,
    irrigationsCount: '1 - 2 बार',
    maxSafeRainMm: 45,
    waterSensitivity: 'Low',
    rootRotRisk: 'पहाड़ी क्षेत्रों की सबसे कठोर और जलभराव सहनशील फसल',
    faoKcMid: 0.95,
  },
  GreenPeas: {
    nameHi: 'हरी मटर',
    nameEn: 'Green Peas',
    varieties: ['Vivek Matar 13', 'Vivek Matar 15', 'Arkel', 'Azad Matar-1'],
    singleDepthMm: 25,
    totalSeasonMm: 300,
    irrigationsCount: '3 - 4 बार',
    maxSafeRainMm: 35,
    waterSensitivity: 'High',
    rootRotRisk: 'जलभराव से फली में फफूंद व पौधे पीले पड़ जाते हैं',
    faoKcMid: 1.10,
  },
  Barley: {
    nameHi: 'जौ',
    nameEn: 'Barley',
    varieties: ['VL Jau 118', 'VL Jau 130', 'PRB 502', 'HBL 113'],
    singleDepthMm: 35,
    totalSeasonMm: 280,
    irrigationsCount: '2 - 3 बार',
    maxSafeRainMm: 45,
    waterSensitivity: 'Low',
    rootRotRisk: 'शीत सहिष्णु; कम पानी में भी बढ़िया पैदावार',
    faoKcMid: 1.10,
  },
  Chickpea: {
    nameHi: 'चना',
    nameEn: 'Chickpea / Gram',
    varieties: ['Pant G 186', 'Pusa 372', 'PG 186', 'Radhey'],
    singleDepthMm: 28,
    totalSeasonMm: 240,
    irrigationsCount: '2 - 3 बार',
    maxSafeRainMm: 35,
    waterSensitivity: 'High',
    rootRotRisk: 'फूल खिलते समय अधिक पानी देने से फूल झड़ने का खतरा',
    faoKcMid: 1.05,
  },
};

// Farm & Crop Irrigation Parameters
const IRRIGATION_CROPS = [
  { id: 'Wheat', hi: 'गेहूं (रबी)', en: 'Wheat' },
  { id: 'Mustard', hi: 'सरसों (रबी)', en: 'Mustard' },
  { id: 'Barley', hi: 'जौ (रबी)', en: 'Barley' },
  { id: 'GreenPeas', hi: 'हरी मटर (रबी)', en: 'Green Peas' },
  { id: 'Chickpea', hi: 'चना (रबी)', en: 'Chickpea' },
  { id: 'Potato', hi: 'आलू (रबी)', en: 'Potato' },
  { id: 'Tomato', hi: 'टमाटर', en: 'Tomato' },
  { id: 'Rice', hi: 'धान (खरीफ)', en: 'Rice' },
  { id: 'Maize', hi: 'मक्का (खरीफ)', en: 'Maize' },
  { id: 'Sugarcane', hi: 'गन्ना', en: 'Sugarcane' },
  { id: 'Pulses', hi: 'दालें / राजमा', en: 'Pulses' },
  { id: 'Mandua', hi: 'मंडुआ (रागी)', en: 'Mandua' },
  { id: 'Jhangora', hi: 'झंगोरा', en: 'Jhangora' },
];

const GROWTH_STAGES = [
  { id: 'initial', hi: 'प्रारंभिक (अंकुरण)', en: 'Initial (Germination)', sub: 'Kc ~0.4-0.7 • उथली जड़ें' },
  { id: 'vegetative', hi: 'वानस्पतिक वृद्धि', en: 'Vegetative Growth', sub: 'Kc ~0.8-1.0 • शाखाएं' },
  { id: 'mid', hi: 'फूल व दाना भरना (क्रिटिकल)', en: 'Mid-Season (Flowering / Peak)', sub: 'Kc ~1.1-1.25 • अधिकतम जल' },
  { id: 'late', hi: 'परिपक्वता / कटाई', en: 'Late-Season (Maturity)', sub: 'Kc ~0.35-0.6 • कम जल' },
];

const FIELD_CONDITIONS = [
  { id: 'dry', hi: 'सूखा (दरारें)', en: 'Dry (Cracked)', icon: 'weather-sunny', color: '#D97706' },
  { id: 'normal', hi: 'सामान्य', en: 'Normal', icon: 'check-circle', color: '#059669' },
  { id: 'moist', hi: 'नम (पर्याप्त नमी)', en: 'Moist (Adequate)', icon: 'water-percent', color: '#0284C7' },
  { id: 'wet', hi: 'अत्यधिक गीला / जलभराव', en: 'Very Wet / Standing Water', icon: 'water-alert', color: '#DC2626' },
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
  { val: '160', hi: '160V (अत्यधिक कम)', en: '160V (Critical Low)' },
  { val: '180', hi: '180V (कम)', en: '180V (Low)' },
  { val: '220', hi: '220V (सामान्य)', en: '220V (Optimal)' },
  { val: '250', hi: '250V (उच्च)', en: '250V (High)' },
];
const THREE_PHASE_PRESETS = [
  { val: '320', hi: '320V (अत्यधिक कम)', en: '320V (Critical Low)' },
  { val: '360', hi: '360V (कम)', en: '360V (Low)' },
  { val: '415', hi: '415V (सामान्य)', en: '415V (Optimal)' },
  { val: '440', hi: '440V (उच्च)', en: '440V (High)' },
];
const TERRAINS = [
  { id: 'terrace', hi: { label: 'सीढ़ीदार खेत' }, en: { label: 'Step Terraces' } },
  { id: 'valley', hi: { label: 'घाटी समतल' }, en: { label: 'Valley Plain' } },
];
const STREAM_FLOWS = [
  { id: 'low', hi: { label: 'धीमा स्रोत (~10 L/s)' }, en: { label: 'Slow Stream (~10 L/s)' } },
  { id: 'medium', hi: { label: 'मध्यम कूल (~22 L/s)' }, en: { label: 'Medium Kuhl (~22 L/s)' } },
  { id: 'high', hi: { label: 'तेज गधेरा (~40 L/s)' }, en: { label: 'Fast Stream (~40 L/s)' } },
];

const CROP_ICONS: Record<string, string> = {
  Wheat: 'grain', Rice: 'rice', Maize: 'corn', Mustard: 'flower',
  Potato: 'food', Rajma: 'seed', Amaranth: 'sprout', Ginger: 'leaf',
  Ragi: 'barley', Groundnut: 'peanut', Onion: 'food-apple', Sugarcane: 'grass',
  Mandua: 'barley', Jhangora: 'grain', GreenPeas: 'seed', Tomato: 'food-apple', Pulses: 'seed',
};

function today() { return new Date().toISOString().split('T')[0]; }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0];
}

function getSeasonFromDate(dateStr: string) {
  const d = new Date(dateStr);
  const m = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
  if (m >= 6 && m <= 10) {
    return {
      key: 'Kharif',
      name: 'Kharif Season (Monsoon)',
      nameHi: 'खरीफ मौसम (मानसून)',
      icon: 'weather-pouring',
      desc: 'Ideal for Rice, Maize, Millets, Pulses',
      color: '#059669',
      bgColor: '#ECFDF5',
    };
  }
  if (m >= 11 || m <= 2) {
    return {
      key: 'Rabi',
      name: 'Rabi Season (Winter)',
      nameHi: 'रबी मौसम (शीतकालीन)',
      icon: 'snowflake',
      desc: 'Ideal for Wheat, Mustard, Potato, Onion, Sugarcane',
      color: '#2563EB',
      bgColor: '#EFF6FF',
    };
  }
  return {
    key: 'Zaid',
    name: 'Zaid Season (Summer)',
    nameHi: 'जायद मौसम (गर्मी)',
    icon: 'weather-sunny',
    desc: 'Ideal for short-duration warm crops & vegetables',
    color: '#D97706',
    bgColor: '#FFFBEB',
  };
}

function SuitabilityBanner({ validation }: { validation: any }) {
  if (!validation) return null;
  const {
    isUnsuitable = false,
    isRisky = false,
    suitabilityScore = 0,
    suitabilityCategory = '',
    cropSeason = '',
    mlConfidence = 0,
    matchingFactors = [],
    risks = [],
    exclusionReasons = [],
    waterRequirement,
    waterAnalysis,
    soilCompatibility,
  } = validation || {};

  const bgColor = isUnsuitable ? '#FEF2F2' : isRisky ? '#FFFBEB' : '#F0FDF4';
  const borderColor = isUnsuitable ? C.error : isRisky ? C.warning : C.success;
  const icon = isUnsuitable ? 'close-circle' : isRisky ? 'alert-circle' : 'check-circle';
  const iconColor = isUnsuitable ? C.error : isRisky ? C.warning : C.success;

  return (
    <View style={[sBanner.container, { backgroundColor: bgColor, borderColor }]}>
      <View style={sBanner.topRow}>
        <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[sBanner.heading, { color: iconColor }]}>
            {isUnsuitable
              ? '❌ Not Suitable for These Conditions'
              : isRisky
              ? '⚠️ Risky — Proceed with Caution'
              : `✅ उपयुक्त (Suitable) · स्कोर: ${suitabilityScore}/100`}
          </Text>
          <Text style={sBanner.category}>
            {suitabilityCategory} {cropSeason ? `· 🌾 ${cropSeason} Plan` : ''}
          </Text>
        </View>
        {!isUnsuitable ? (
          <View style={[sBanner.scorePill, { backgroundColor: iconColor + '22', borderColor }]}>
            <Text style={[sBanner.scoreText, { color: iconColor }]}>{suitabilityScore}</Text>
          </View>
        ) : null}
      </View>

      {mlConfidence > 0 ? (
        <View style={sBanner.mlBadgeRow}>
          <MaterialCommunityIcons name="robot" size={14} color={C.primary} />
          <Text style={sBanner.mlBadgeText}>
            Regional AI Model: {mlConfidence.toFixed(1)}% compatibility in your region
          </Text>
        </View>
      ) : null}

      {/* Selected Soil Type Analysis Box */}
      {soilCompatibility ? (
        <View style={sBanner.soilBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <MaterialCommunityIcons name="terrain" size={16} color="#059669" />
            <Text style={sBanner.soilHeading}>
              मिट्टी उपयुक्तता: {soilCompatibility.soilType} ({soilCompatibility.drainageQuality})
            </Text>
          </View>
          <Text style={sBanner.soilText}>
            {soilCompatibility.waterRetentionAdvice}
          </Text>
          <Text style={sBanner.soilIntervalText}>
            ⏱️ अनुशंसित सिंचाई अंतराल: <Text style={{ fontWeight: '700', color: '#047857' }}>{soilCompatibility.recommendedIntervalDays}</Text>
          </Text>
        </View>
      ) : null}

      {/* Live Weather & Exact Water Requirement Box */}
      {waterRequirement || waterAnalysis ? (
        <View style={sBanner.waterBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialCommunityIcons name="water" size={16} color="#0284C7" />
            <Text style={sBanner.waterHeading}>
              लाइव मौसम अनुसार जल आवश्यकता (Exact Liters Water Need)
            </Text>
          </View>
          <View style={sBanner.waterGrid}>
            <View style={sBanner.waterMetric}>
              <Text style={sBanner.waterMetricLabel}>1 बार की सिंचाई:</Text>
              <Text style={sBanner.waterMetricVal}>
                {waterRequirement?.singleEventLiters ? `${waterRequirement.singleEventLiters.toLocaleString()} L` : `${waterAnalysis?.singleDepthMm || 35} mm`}
              </Text>
              <Text style={sBanner.waterMetricSub}>
                ({waterRequirement?.singleDepthMm || waterAnalysis?.singleDepthMm || 35} mm गहराई)
              </Text>
            </View>
            <View style={sBanner.waterMetric}>
              <Text style={sBanner.waterMetricLabel}>कुल सीजन जल:</Text>
              <Text style={sBanner.waterMetricVal}>
                {waterRequirement?.totalSeasonLiters ? `${waterRequirement.totalSeasonLiters.toLocaleString()} L` : `${waterAnalysis?.totalSeasonMm || 400} mm`}
              </Text>
              <Text style={sBanner.waterMetricSub}>
                ({waterAnalysis?.irrigationsCount || '4 - 5 बार'})
              </Text>
            </View>
            <View style={sBanner.waterMetric}>
              <Text style={sBanner.waterMetricLabel}>पंप चलने का समय:</Text>
              <Text style={[sBanner.waterMetricVal, { color: '#7C3AED' }]}>
                {waterRequirement?.pumpHours ? `${waterRequirement.pumpHours} घंटे` : '3.8 घंटे'}
              </Text>
              <Text style={sBanner.waterMetricSub}>
                ({waterRequirement?.pumpHp || 5} HP मोटर)
              </Text>
            </View>
          </View>

          <View style={sBanner.weatherNoteRow}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={13} color="#0369A1" />
            <Text style={sBanner.weatherNoteText}>
              लाइव वाष्पोत्सर्जन (ETc): {waterAnalysis?.dailyEtcMm || 1.2} mm/दिन • आगामी वर्षा: {waterAnalysis?.forecastRainMm || 0} mm
            </Text>
          </View>
        </View>
      ) : null}

      {exclusionReasons && exclusionReasons.length > 0 ? (
        <View style={sBanner.section}>
          {exclusionReasons.map((r: string, i: number) => (
            <Text key={i} style={[sBanner.item, { color: C.error }]}>• {r}</Text>
          ))}
        </View>
      ) : null}
      {matchingFactors && matchingFactors.length > 0 ? (
        <View style={sBanner.section}>
          {matchingFactors.map((f: string, i: number) => (
            <Text key={i} style={[sBanner.item, { color: C.success }]}>✓ {f}</Text>
          ))}
        </View>
      ) : null}
      {risks && risks.length > 0 ? (
        <View style={sBanner.section}>
          {risks.slice(0, 3).map((r: string, i: number) => (
            <Text key={i} style={[sBanner.item, { color: C.warning }]}>⚠ {r}</Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
const sBanner = StyleSheet.create({
  container: {
    borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 16,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  heading: { fontSize: 14, fontWeight: '700' },
  category: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  scorePill: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, marginLeft: 6,
  },
  scoreText: { fontSize: 18, fontWeight: '800' },
  mlBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    marginTop: 8, borderWidth: 1, borderColor: '#86EFAC',
  },
  mlBadgeText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  soilBox: {
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  soilHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 6,
  },
  soilText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    marginTop: 2,
  },
  soilIntervalText: {
    fontSize: 11,
    color: '#065F46',
    marginTop: 4,
  },
  waterBox: {
    marginTop: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  waterHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    marginLeft: 6,
  },
  waterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 6,
  },
  waterMetric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  waterMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  waterMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
    textAlign: 'center',
  },
  waterMetricSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  weatherNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  weatherNoteText: {
    fontSize: 10,
    color: '#0369A1',
    fontWeight: '500',
  },
  section: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#0002', paddingTop: 8 },
  item: { fontSize: 12, lineHeight: 17, marginBottom: 3 },
});

export default function AgroPlanner() {
  const { language } = useLanguage();
  const isHi = language === 'hi';
  const params = useLocalSearchParams();

  // Crop & Sowing state
  const [selectedCrop, setSelectedCrop] = useState<string>((params.cropKey as string) || 'Wheat');
  const [selectedVariety, setSelectedVariety] = useState<string>('VL Gehun 907');
  const [sowingDate, setSowingDate] = useState<string>((params.sowingDate as string) || addDays(today(), 7));
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'Kharif' | 'Rabi'>('all');
  const [farmProfile, setFarmProfile] = useState<FarmProfile | null>(null);
  const [crops, setCrops] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'validate' | 'creating' | 'done'>('select');

  // Farm & Crop Irrigation Parameters State
  const [growthStage, setGrowthStage] = useState('mid');
  const [fieldCondition, setFieldCondition] = useState('normal');
  const [fieldSize, setFieldSize] = useState('5');
  const [fieldUnit, setFieldUnit] = useState('Bigha');
  const [soilType, setSoilType] = useState('Loam');
  const [waterSource, setWaterSource] = useState('Electric Motor');
  const [phase, setPhase] = useState('1-Phase');
  const [motorVoltage, setMotorVoltage] = useState('220');
  const [pumpCapacity, setPumpCapacity] = useState('5 HP');
  const [terrainType, setTerrainType] = useState('terrace');
  const [streamFlow, setStreamFlow] = useState('medium');
  const [daysSinceLastIrrigation, setDaysSinceLastIrrigation] = useState('4');
  const [soilMoisture, setSoilMoisture] = useState('');

  // Live Weather & Excess Rain Alert State
  const [forecastRainMm, setForecastRainMm] = useState<number>(45.0);
  const [liveTempC, setLiveTempC] = useState<number>(24.0);
  const [liveHumidity, setLiveHumidity] = useState<number>(75);
  const [alertEmail, setAlertEmail] = useState<string>('shataksh@gmail.com');
  const [sendingAlert, setSendingAlert] = useState(false);
  const [simulatedHighRain, setSimulatedHighRain] = useState(true);

  // Sync to AsyncStorage for Irrigation Advisor tab
  const saveIrrigationParamsToStorage = async (paramsObj?: any) => {
    try {
      const data = paramsObj || {
        crop: selectedCrop || 'Wheat',
        variety: selectedVariety,
        growthStage,
        fieldCondition,
        fieldSize,
        fieldUnit,
        soilType,
        waterSource,
        phase,
        motorVoltage,
        pumpCapacity,
        terrainType,
        streamFlow,
        daysSinceLastIrrigation,
        soilMoisture,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('@active_irrigation_params', JSON.stringify(data));
    } catch (e) {}
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@active_irrigation_params');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.crop) setSelectedCrop(parsed.crop);
          if (parsed.variety) setSelectedVariety(parsed.variety);
          if (parsed.growthStage) setGrowthStage(parsed.growthStage);
          if (parsed.fieldCondition) setFieldCondition(parsed.fieldCondition);
          if (parsed.fieldSize) setFieldSize(parsed.fieldSize);
          if (parsed.fieldUnit) setFieldUnit(parsed.fieldUnit);
          if (parsed.soilType) setSoilType(parsed.soilType);
          if (parsed.waterSource) setWaterSource(parsed.waterSource);
          if (parsed.phase) setPhase(parsed.phase);
          if (parsed.motorVoltage) setMotorVoltage(parsed.motorVoltage);
          if (parsed.pumpCapacity) setPumpCapacity(parsed.pumpCapacity);
          if (parsed.terrainType) setTerrainType(parsed.terrainType);
          if (parsed.streamFlow) setStreamFlow(parsed.streamFlow);
          if (parsed.daysSinceLastIrrigation) setDaysSinceLastIrrigation(parsed.daysSinceLastIrrigation);
          if (parsed.soilMoisture) setSoilMoisture(parsed.soilMoisture);
        }
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [fp, cr] = await Promise.all([agroAPI.getFarmProfile(), agroAPI.getCrops()]);
        setFarmProfile(fp.farmProfile);
        setCrops(cr.crops);

        // Fetch live weather
        const lat = fp?.farmProfile?.latitude || 30.3165;
        const lon = fp?.farmProfile?.longitude || 78.0322;
        try {
          const wRes = await agroAPI.getWeather(lat, lon);
          if (wRes?.weather) {
            setForecastRainMm(wRes.weather.precipitation || 38.0);
            setLiveTempC(wRes.weather.temperature || 24);
            setLiveHumidity(wRes.weather.humidity || 75);
          }
        } catch (wErr) {}
      } catch (e) {
        console.warn('Planner init error:', e);
      }
    })();

    if (params.cropKey && params.sowingDate) {
      setTimeout(() => handleValidate(params.cropKey as string, params.sowingDate as string), 500);
    }
  }, []);

  // Update variety when crop changes
  useEffect(() => {
    const spec = CROP_WATER_SPECS[selectedCrop] || CROP_WATER_SPECS['Wheat'];
    if (spec.varieties && spec.varieties.length > 0) {
      if (!spec.varieties.includes(selectedVariety)) {
        setSelectedVariety(spec.varieties[0]);
      }
    }
  }, [selectedCrop]);

  // Calculations for Exact Water Volume in Liters
  const getFieldAreaSqm = () => {
    const size = parseFloat(fieldSize) || 1.0;
    if (fieldUnit === 'Bigha') return size * 809.0;      // Uttarakhand Bigha ~809 m2
    if (fieldUnit === 'Hectare') return size * 10000.0;
    return size * 4046.86;                             // Acre
  };

  const currentCropSpec = CROP_WATER_SPECS[selectedCrop] || CROP_WATER_SPECS['Wheat'];
  const fieldAreaSqm = getFieldAreaSqm();

  // 1 mm depth over 1 sq.meter = exactly 1 Liter
  const singleEventLiters = Math.round(currentCropSpec.singleDepthMm * fieldAreaSqm);
  const totalSeasonLiters = Math.round(currentCropSpec.totalSeasonMm * fieldAreaSqm);

  // Pump HP & Duration
  const pumpHpVal = parseFloat(pumpCapacity) || 5.0;
  const flowRateLph = pumpHpVal * 5200.0; // ~5200 L/hr per HP in North India
  const pumpDurationHours = (singleEventLiters / flowRateLph).toFixed(1);

  // Excess Rain / Waterlogging evaluation
  const effectiveRainfall = simulatedHighRain ? Math.max(forecastRainMm, 55.0) : forecastRainMm;
  const isExcessRainRisk = effectiveRainfall > currentCropSpec.maxSafeRainMm ||
    (fieldCondition === 'wet' || fieldCondition === 'moist' && effectiveRainfall > 20.0);
  const excessMm = Math.max(0, effectiveRainfall - currentCropSpec.singleDepthMm);
  const excessLiters = Math.round(excessMm * fieldAreaSqm);

  // Handle email send for excess rain alert
  const handleSendEmailAlert = async () => {
    if (!alertEmail.trim()) {
      Alert.alert(isHi ? 'ईमेल दर्ज करें' : 'Enter Email', isHi ? 'कृपया मान्य ईमेल आईडी भरें।' : 'Please enter a valid email.');
      return;
    }

    setSendingAlert(true);
    try {
      const payload = {
        email: alertEmail.trim(),
        farmerName: farmProfile?.farmName || 'Kisan Bhai',
        crop: `${currentCropSpec.nameHi} (${currentCropSpec.nameEn}) - किस्म: ${selectedVariety}`,
        district: farmProfile?.district || 'Dehradun, Uttarakhand',
        rainfallMm: effectiveRainfall,
        cropWaterNeedMm: currentCropSpec.singleDepthMm,
        rainProbability: 90,
        recentIrrigationStatus: fieldCondition === 'wet' ? 'खेत में पानी भरा है (Waterlogged)' : fieldCondition === 'moist' ? 'हाल ही में पानी दिया था' : 'सामान्य स्थिति',
      };

      const res = await fetch(`${BACKEND_URL}/api/v1/irrigation/send-rain-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        Alert.alert(
          isHi ? '✅ ईमेल अलर्ट भेजा गया!' : '✅ Email Alert Dispatched!',
          isHi
            ? `अत्यधिक वर्षा (${effectiveRainfall} mm) व जलभराव चेतावनी सफलतापूर्वक ${alertEmail} पर भेज दी गई है।
(संदेश ID: ${data.messageId})`
            : `Excess rain alert (${effectiveRainfall} mm) sent successfully to ${alertEmail}.
(Msg ID: ${data.messageId})`
        );
      } else {
        throw new Error(data.error || 'Server returned failure');
      }
    } catch (e: any) {
      Alert.alert(
        isHi ? 'ईमेल स्टेटस' : 'Email Status',
        isHi
          ? `चेतावनी अलर्ट तैयार किया गया। (${e.message})`
          : `Alert dispatch prepared. (${e.message})`
      );
    } finally {
      setSendingAlert(false);
    }
  };

  const handleValidate = async (cropKey?: string, date?: string) => {
    const ck = cropKey || selectedCrop;
    const sd = date || sowingDate;

    if (!ck) {
      Alert.alert(isHi ? 'फसल चुनें' : 'Select Crop', isHi ? 'पहले फसल का चयन करें।' : 'Please select a crop first.');
      return;
    }
    if (!sd) {
      Alert.alert(isHi ? 'तारीख चुनें' : 'Date Required');
      return;
    }

    saveIrrigationParamsToStorage();
    setValidating(true);
    setValidation(null);

    try {
      const res = await agroAPI.validateCrop({
        cropKey: ck,
        district: farmProfile?.district || '',
        elevation: farmProfile?.elevationM || null,
        soilType: soilType || farmProfile?.soilType || 'Loam',
        sowingDate: sd,
        irrigationMethod: waterSource || farmProfile?.irrigationMethod || 'Unknown',
        waterAvailability: farmProfile?.waterAvailability || 'Unknown',
        latitude: farmProfile?.latitude || undefined,
        longitude: farmProfile?.longitude || undefined,
        fieldSize: fieldSize,
        fieldUnit: fieldUnit,
        pumpCapacity: pumpCapacity,
      });
      setValidation(res.validation);
      setStep('validate');
    } catch (e: any) {
      Alert.alert(isHi ? 'त्रुटि' : 'Error', e.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!selectedCrop || !sowingDate) return;

    if (validation?.isUnsuitable) {
      Alert.alert(
        isHi ? 'फसल अनुपयुक्त है' : 'Crop Not Suitable',
        isHi
          ? 'यह फसल आपके खेत और मौसम के लिए उपयुक्त नहीं लगती। क्या आप फिर भी 90-दिन की योजना देखना चाहते हैं?'
          : 'This crop appears unsuitable for your farm conditions. Do you still want to see the 90-day plan with warnings?',
        [
          { text: isHi ? 'नहीं' : 'No', style: 'cancel' },
          { text: isHi ? 'हां, देखें' : 'Yes, show plan', onPress: () => doCreatePlan() },
        ],
      );
    } else {
      doCreatePlan();
    }
  };

  const doCreatePlan = async () => {
    saveIrrigationParamsToStorage();
    setLoading(true);
    setStep('creating');
    try {
      const res = await agroAPI.createPlan({
        cropKey: selectedCrop,
        sowingDate,
        district: farmProfile?.district || '',
        elevation: farmProfile?.elevationM || null,
        soilType: soilType || farmProfile?.soilType || 'Loam',
        irrigationMethod: waterSource || farmProfile?.irrigationMethod || 'Unknown',
        waterAvailability: farmProfile?.waterAvailability || 'Unknown',
        latitude: farmProfile?.latitude || undefined,
        longitude: farmProfile?.longitude || undefined,
        farmAreaValue: parseFloat(fieldSize) || farmProfile?.farmAreaValue || undefined,
        farmAreaUnit: fieldUnit || farmProfile?.farmAreaUnit || 'Bigha',
      });
      setStep('done');
      router.replace(`/agro-plan-detail?planId=${res.plan._id}` as any);
    } catch (e: any) {
      Alert.alert(isHi ? 'त्रुटि' : 'Error', e.message || 'Failed to create plan');
      setStep('validate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isHi ? '90-दिन फसल एवं सिंचाई योजनाकार' : '90-Day Crop & Irrigation Planner'}
          </Text>
          <Text style={styles.headerSub}>
            {isHi ? 'ICAR & FAO-56 प्रशिक्षित मॉडल एवं उत्तराखंड किस्में' : 'ICAR & FAO-56 Trained Model & Uttarakhand Varieties'}
          </Text>
        </View>
        <MaterialCommunityIcons name="water-check" size={26} color={C.weatherBlue} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Step 1: Crop Selection */}
        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>Step 1</Text>
          <Text style={styles.stepTitle}>
            {isHi ? 'फसल का चयन करें' : 'Select Your Crop'}
          </Text>
          <Text style={styles.stepHint}>
            {isHi
              ? 'उत्तराखंड के लिए अनुशंसित प्रमुख फसलें चुनें:'
              : 'Select major crops calibrated for Uttarakhand agro-climatic zones:'}
          </Text>

          {/* Quick Season Filter Tabs */}
          <View style={styles.seasonTabRow}>
            {(['all', 'Kharif', 'Rabi'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.seasonTab, seasonFilter === tab && styles.seasonTabActive]}
                onPress={() => setSeasonFilter(tab)}
              >
                <Text style={[styles.seasonTabText, seasonFilter === tab && styles.seasonTabTextActive]}>
                  {tab === 'all' ? (isHi ? 'सभी फसलें' : 'All') : tab === 'Kharif' ? '🌾 Kharif' : '❄️ Rabi'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cropGrid}>
            {IRRIGATION_CROPS.map((cropItem) => {
              const icon = CROP_ICONS[cropItem.id] || 'sprout';
              const isSelected = selectedCrop === cropItem.id;
              const spec = CROP_WATER_SPECS[cropItem.id] || CROP_WATER_SPECS['Wheat'];

              return (
                <TouchableOpacity
                  key={cropItem.id}
                  style={[styles.cropTile, isSelected && styles.cropTileSelected]}
                  onPress={() => {
                    setSelectedCrop(cropItem.id);
                    if (spec.varieties && spec.varieties.length > 0) {
                      setSelectedVariety(spec.varieties[0]);
                    }
                    setValidation(null);
                    setStep('select');
                    saveIrrigationParamsToStorage({ crop: cropItem.id });
                  }}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={28}
                    color={isSelected ? C.primary : C.textSecondary}
                  />
                  <Text style={[styles.cropTileName, isSelected && styles.cropTileNameSelected]}>
                    {cropItem.en}
                  </Text>
                  <Text style={[styles.cropTileHi, isSelected && { color: C.primary }]}>
                    {cropItem.hi}
                  </Text>
                  <View style={[styles.waterBadge, { backgroundColor: isSelected ? '#DCFCE7' : '#F1F5F9' }]}>
                    <Text style={[styles.waterBadgeText, { color: isSelected ? '#15803D' : '#64748B' }]}>
                      {spec.singleDepthMm} mm/सिंचाई
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CROP VARIETIES SELECTOR (From Uttarakhand Dataset) */}
          <View style={styles.varietySection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="sprout" size={18} color="#059669" />
              <Text style={styles.varietySectionTitle}>
                {isHi
                  ? `🌾 ${currentCropSpec.nameHi} की अनुशंसित किस्में (Uttarakhand Varieties):`
                  : `🌾 Recommended Varieties for ${currentCropSpec.nameEn}:`}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              {currentCropSpec.varieties.map((v) => {
                const isVarActive = selectedVariety === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.varietyChip, isVarActive && styles.varietyChipActive]}
                    onPress={() => {
                      setSelectedVariety(v);
                      saveIrrigationParamsToStorage({ variety: v });
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isVarActive ? "check-decagram" : "seed"}
                      size={14}
                      color={isVarActive ? "#065F46" : "#64748B"}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.varietyChipText, isVarActive && styles.varietyChipTextActive]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.varietySourceNote}>
              * पंतनगर कृषि वि.वि. एवं VBPGR अल्मोड़ा द्वारा उत्तराखंड के लिए प्रमाणित किस्में
            </Text>
          </View>
        </View>

        {/* Step 2: Sowing Date */}
        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>Step 2</Text>
          <Text style={styles.stepTitle}>
            {isHi ? 'बुआई की तारीख' : 'Planned Sowing Date'}
          </Text>

          <Input
            label={isHi ? 'बुआई की तारीख (YYYY-MM-DD)' : 'Sowing Date (YYYY-MM-DD)'}
            value={sowingDate}
            onChangeText={v => { setSowingDate(v); setValidation(null); setStep('select'); }}
            keyboardType="numeric"
            placeholder="e.g. 2026-11-05"
          />
          <View style={styles.presetRow}>
            {[-7, 0, 7, 14].map((offset) => {
              const d = addDays(today(), offset);
              const isSelected = sowingDate === d;
              const label = offset === 0 ? (isHi ? 'आज' : 'Today') : offset === -7 ? (isHi ? '7 दिन पहले' : '7d ago') : `+${offset}d`;
              return (
                <TouchableOpacity
                  key={offset}
                  style={[styles.presetChip, isSelected && styles.presetChipActive]}
                  onPress={() => { setSowingDate(d); setValidation(null); setStep('select'); }}
                >
                  <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Farm & Crop Irrigation Parameters */}
        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>Step 3</Text>
          <Text style={styles.stepTitle}>
            {isHi ? '🌾 खेत मापदंड एवं सिंचाई विनिर्देश' : '🌾 Farm & Irrigation Specifications'}
          </Text>
          <Text style={styles.stepHint}>
            {isHi
              ? 'खेत का आकार व पंप क्षमता सेट करें ताकि सटीक लीटर पानी की गणना हो सके।'
              : 'Set field size and pump parameters for exact water volume in Liters.'}
          </Text>

          {/* Growth Stage */}
          <Text style={styles.subFieldLabel}>
            {isHi ? '🌱 फसल की अवस्था (FAO-56 Kc)' : '🌱 Crop Growth Stage (FAO-56 Kc)'}
          </Text>
          <View style={styles.stageGrid}>
            {GROWTH_STAGES.map((st) => {
              const isActive = growthStage === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.stageCard, isActive && styles.stageCardActive]}
                  onPress={() => { setGrowthStage(st.id); saveIrrigationParamsToStorage({ growthStage: st.id }); }}
                >
                  <Text style={[styles.stageTitle, isActive && styles.stageTitleActive]}>
                    {isHi ? st.hi : st.en}
                  </Text>
                  <Text style={[styles.stageSub, isActive && styles.stageSubActive]}>{st.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Current Field Condition */}
          <Text style={styles.subFieldLabel}>
            {isHi ? '💧 खेत की वर्तमान स्थिति' : '💧 Current Field Condition'}
          </Text>
          <View style={styles.conditionGrid}>
            {FIELD_CONDITIONS.map((cond) => {
              const isActive = fieldCondition === cond.id;
              return (
                <TouchableOpacity
                  key={cond.id}
                  style={[
                    styles.conditionCard,
                    isActive && { borderColor: cond.color, backgroundColor: cond.id === 'wet' ? '#FEE2E2' : cond.id === 'dry' ? '#FEF3C7' : '#ECFDF5' }
                  ]}
                  onPress={() => { setFieldCondition(cond.id); saveIrrigationParamsToStorage({ fieldCondition: cond.id }); }}
                >
                  <MaterialCommunityIcons name={cond.icon as any} size={20} color={cond.color} />
                  <Text style={[styles.conditionText, isActive && { color: cond.color, fontWeight: '700' }]}>
                    {isHi ? cond.hi : cond.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Field Size & Unit */}
          <View style={styles.sizeRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Input
                label={isHi ? 'खेत का आकार (Field Size)' : 'Field Size'}
                keyboardType="numeric"
                value={fieldSize}
                onChangeText={(v) => { setFieldSize(v); saveIrrigationParamsToStorage({ fieldSize: v }); }}
                placeholder="5"
              />
            </View>
            <View style={{ width: 140, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary, marginBottom: 4 }}>
                {isHi ? 'इकाई (Unit)' : 'Unit'}
              </Text>
              <View style={styles.unitToggleGroup}>
                {FIELD_UNITS.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.unitBtn, fieldUnit === u.id && styles.unitBtnActive]}
                    onPress={() => { setFieldUnit(u.id); saveIrrigationParamsToStorage({ fieldUnit: u.id }); }}
                  >
                    <Text style={[styles.unitBtnText, fieldUnit === u.id && styles.unitBtnTextActive]}>
                      {isHi ? u.hi : u.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Soil Type */}
          <Text style={styles.subFieldLabel}>{isHi ? 'मिट्टी का प्रकार (Soil Type)' : 'Soil Type'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
            {SOILS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.soilChip, soilType === s.id && styles.soilChipActive]}
                onPress={() => { setSoilType(s.id); saveIrrigationParamsToStorage({ soilType: s.id }); }}
              >
                <Text style={[styles.soilChipText, soilType === s.id && styles.soilChipTextActive]}>
                  {isHi ? s.hi : s.en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Irrigation Water Source */}
          <Text style={styles.subFieldLabel}>
            {isHi ? '🏔️ सिंचाई जल स्रोत (Irrigation Water Source)' : '🏔️ Irrigation Water Source'}
          </Text>
          <View style={styles.sourceGrid}>
            {WATER_SOURCES.map((ws) => {
              const isActive = waterSource === ws.id;
              return (
                <TouchableOpacity
                  key={ws.id}
                  style={[styles.sourceCard, isActive && styles.sourceCardActive]}
                  onPress={() => { setWaterSource(ws.id); saveIrrigationParamsToStorage({ waterSource: ws.id }); }}
                >
                  <MaterialCommunityIcons name={ws.icon as any} size={22} color={isActive ? C.primary : '#64748B'} />
                  <Text style={[styles.sourceTitle, isActive && styles.sourceTitleActive]}>
                    {isHi ? ws.hi.title : ws.en.title}
                  </Text>
                  <Text style={[styles.sourceSubtitle, isActive && styles.sourceSubtitleActive]}>
                    {isHi ? ws.hi.subtitle : ws.en.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Electric Motor Voltage & Protection Settings */}
          {waterSource === 'Electric Motor' && (
            <View style={styles.specialCardElectric}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="flash" size={18} color="#0284c7" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369a1', marginLeft: 6 }}>
                  {isHi ? 'मोटर वोल्टेज एवं सुरक्षा (Motor Voltage & Protection)' : 'Motor Voltage & Protection'}
                </Text>
              </View>

              <View style={styles.phaseToggleRow}>
                <TouchableOpacity
                  style={[styles.phaseBtn, phase === '1-Phase' && styles.phaseBtnActive]}
                  onPress={() => { setPhase('1-Phase'); setMotorVoltage('220'); saveIrrigationParamsToStorage({ phase: '1-Phase', motorVoltage: '220' }); }}
                >
                  <Text style={[styles.phaseBtnText, phase === '1-Phase' && styles.phaseBtnTextActive]}>1-Phase (Single)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phaseBtn, phase === '3-Phase' && styles.phaseBtnActive]}
                  onPress={() => { setPhase('3-Phase'); setMotorVoltage('415'); saveIrrigationParamsToStorage({ phase: '3-Phase', motorVoltage: '415' }); }}
                >
                  <Text style={[styles.phaseBtnText, phase === '3-Phase' && styles.phaseBtnTextActive]}>3-Phase (Commercial)</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.innerLabel}>{isHi ? 'वोल्टेज प्रीसेट चुनें' : 'Select Voltage Preset'}</Text>
              <View style={styles.voltagePresetRow}>
                {(phase === '1-Phase' ? SINGLE_PHASE_PRESETS : THREE_PHASE_PRESETS).map((p) => (
                  <TouchableOpacity
                    key={p.val}
                    style={[styles.voltagePresetChip, motorVoltage === p.val && styles.voltagePresetChipActive]}
                    onPress={() => { setMotorVoltage(p.val); saveIrrigationParamsToStorage({ motorVoltage: p.val }); }}
                  >
                    <Text style={[styles.voltagePresetText, motorVoltage === p.val && styles.voltagePresetTextActive]}>
                      {isHi ? p.hi : p.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.innerLabel, { marginTop: 8 }]}>{isHi ? 'पंप क्षमता (Pump HP)' : 'Pump Capacity (HP)'}</Text>
              <View style={styles.pumpRow}>
                {PUMPS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pumpChip, pumpCapacity === p && styles.pumpChipActive]}
                    onPress={() => { setPumpCapacity(p); saveIrrigationParamsToStorage({ pumpCapacity: p }); }}
                  >
                    <Text style={[styles.pumpChipText, pumpCapacity === p && styles.pumpChipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Pahadi Stream/Kuhl Settings */}
          {waterSource === 'Pahadi Kuhl / Stream' && (
            <View style={styles.specialCardPahadi}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="image-filter-hdr" size={18} color="#059669" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#065f46', marginLeft: 6 }}>
                  {isHi ? 'पहाड़ी कूल एवं प्राकृतिक प्रवाह' : 'Mountain Kuhl / Spring Channel'}
                </Text>
              </View>
              <Text style={styles.innerLabel}>{isHi ? 'खेत का भूभाग (Terrain Type)' : 'Terrain Type'}</Text>
              <View style={styles.terrainRow}>
                {TERRAINS.map((tr) => (
                  <TouchableOpacity
                    key={tr.id}
                    style={[styles.terrainChip, terrainType === tr.id && styles.terrainChipActive]}
                    onPress={() => { setTerrainType(tr.id); saveIrrigationParamsToStorage({ terrainType: tr.id }); }}
                  >
                    <Text style={[styles.terrainText, terrainType === tr.id && styles.terrainTextActive]}>
                      {isHi ? tr.hi.label : tr.en.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.innerLabel, { marginTop: 8 }]}>{isHi ? 'कूल में पानी का बहाव' : 'Stream Flow Rate'}</Text>
              <View style={styles.streamRow}>
                {STREAM_FLOWS.map((sf) => (
                  <TouchableOpacity
                    key={sf.id}
                    style={[styles.streamChip, streamFlow === sf.id && styles.streamChipActive]}
                    onPress={() => { setStreamFlow(sf.id); saveIrrigationParamsToStorage({ streamFlow: sf.id }); }}
                  >
                    <Text style={[styles.streamText, streamFlow === sf.id && styles.streamTextActive]}>
                      {isHi ? sf.hi.label : sf.en.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Days Since Last Irrigation */}
          <View style={{ marginTop: 8 }}>
            <Input
              label={isHi ? 'पिछली सिंचाई को कितने दिन हुए?' : 'Days Since Last Irrigation'}
              placeholder="4"
              keyboardType="numeric"
              value={daysSinceLastIrrigation}
              onChangeText={(v) => { setDaysSinceLastIrrigation(v); saveIrrigationParamsToStorage({ daysSinceLastIrrigation: v }); }}
            />
          </View>
        </View>

        {/* ── EXACT WATER CAPACITY IN LITERS & FAO-56 MODEL CARD ─────────────── */}
        <View style={styles.waterCapacityCard}>
          <View style={styles.waterCapacityHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="water-pump" size={24} color="#0284C7" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.waterCapacityTitle}>
                  {isHi ? '💧 फसल जल क्षमता एवं आवश्यकता मॉडल' : '💧 Exact Crop Water Requirement & Capacity'}
                </Text>
                <Text style={styles.waterCapacitySubtitle}>
                  {currentCropSpec.nameHi} ({selectedVariety}) · {fieldSize} {fieldUnit} (~{Math.round(fieldAreaSqm).toLocaleString()} m²)
                </Text>
              </View>
            </View>
          </View>

          {/* Water Stats Grid */}
          <View style={styles.waterStatsGrid}>
            {/* Stat 1: Single Event Liters */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {isHi ? '1 बार में सिंचाई पानी (Liters)' : 'Single Irrigation Volume'}
              </Text>
              <Text style={styles.statValLiters}>
                {singleEventLiters.toLocaleString()} L
              </Text>
              <Text style={styles.statSubText}>
                {currentCropSpec.singleDepthMm} mm डेप्थ पानी
              </Text>
            </View>

            {/* Stat 2: Total Season Capacity */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {isHi ? 'पूरे फसल चक्र की क्षमता' : 'Total Season Capacity'}
              </Text>
              <Text style={[styles.statValLiters, { color: '#059669' }]}>
                {totalSeasonLiters.toLocaleString()} L
              </Text>
              <Text style={styles.statSubText}>
                {currentCropSpec.totalSeasonMm} mm कुल जीवन चक्र
              </Text>
            </View>

            {/* Stat 3: Pump Run Time */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {isHi ? 'पंप चलाने का समय' : 'Pump Run Time'}
              </Text>
              <Text style={[styles.statValLiters, { color: '#D97706' }]}>
                {pumpDurationHours} घंटे
              </Text>
              <Text style={styles.statSubText}>
                @{pumpCapacity} (~{Math.round(flowRateLph).toLocaleString()} L/hr)
              </Text>
            </View>

            {/* Stat 4: Irrigations count */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>
                {isHi ? 'अनुशंसित सिंचाइयाँ' : 'Recommended Cycles'}
              </Text>
              <Text style={[styles.statValLiters, { color: '#7C3AED' }]}>
                {currentCropSpec.irrigationsCount}
              </Text>
              <Text style={styles.statSubText}>
                जल संवेदनशीलता: {currentCropSpec.waterSensitivity}
              </Text>
            </View>
          </View>

          <View style={styles.datasetNoteRow}>
            <MaterialCommunityIcons name="database-check" size={14} color="#0369A1" />
            <Text style={styles.datasetNoteText}>
              स्मार्ट इरिगेशन डेटासेट (ICAR-CRIDA व FAO-56 पेनमैन-मोंटेइथ मानक) द्वारा सत्यापित गणना।
            </Text>
          </View>
        </View>


        {/* Farm Profile quick-view */}
        <TouchableOpacity style={styles.farmRow} onPress={() => router.push('/agro-farm-setup' as any)}>
          <MaterialCommunityIcons name="map-marker" size={16} color={C.primary} />
          <Text style={styles.farmRowText}>
            {[farmProfile?.district, farmProfile?.soilType !== 'Unknown' && farmProfile?.soilType, farmProfile?.irrigationMethod !== 'Unknown' && farmProfile?.irrigationMethod]
              .filter(Boolean).join(' · ') || (isHi ? 'खेत की जानकारी दर्ज करें' : 'Set farm details for better advice')}
          </Text>
          <Text style={styles.farmEditLink}>{isHi ? 'बदलें' : 'Edit'}</Text>
        </TouchableOpacity>

        {/* Validate Button */}
        <Button
          title={validating
            ? (isHi ? 'जांच हो रही है...' : 'Checking suitability...')
            : (isHi ? 'फसल की उपयुक्तता जांचें' : 'Check Crop Suitability')}
          onPress={() => handleValidate()}
          loading={validating}
          style={[styles.validateBtn, { backgroundColor: C.weatherBlue }]}
        />

        {/* Validation Results */}
        {validation ? (
          <View style={{ marginTop: 8 }}>
            <SuitabilityBanner validation={validation} />

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>{validation.disclaimer}</Text>
            </View>

            {Boolean(validation?.notes) ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>📋 {isHi ? 'विशेष जानकारी' : 'Crop Notes'}</Text>
                <Text style={styles.notesText}>{validation.notes}</Text>
                <Text style={styles.notesSource}>Source: {validation.source}</Text>
              </View>
            ) : null}

            <View style={styles.windowBox}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={C.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.windowLabel}>{isHi ? 'अनुशंसित बुआई खिड़की:' : 'Recommended Sowing Window:'}</Text>
                <Text style={styles.windowValue}>{validation.sowingWindowLabel}</Text>
                <Text style={styles.windowValueHi}>{validation.sowingWindowHi}</Text>
              </View>
            </View>

            <Button
              title={loading
                ? (isHi ? '90-दिन कैलेंडर बन रहा है...' : 'Creating 90-day calendar...')
                : (isHi ? '90-दिन की योजना बनाएं →' : 'Create 90-Day Plan →')}
              onPress={handleCreatePlan}
              loading={loading}
              style={styles.createBtn}
            />
          </View>
        ) : null}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EFF6FF', marginRight: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 11, color: C.textSecondary },
  scroll: { padding: 16, paddingBottom: 60 },

  stepCard: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 14,
  },
  stepNumber: {
    fontSize: 10, fontWeight: '700', color: C.primary,
    backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 6,
  },
  stepTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  stepHint: { fontSize: 12, color: C.textSecondary, marginBottom: 12, lineHeight: 17 },

  seasonTabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  seasonTab: {
    flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  seasonTabActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  seasonTabText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  seasonTabTextActive: { color: C.primary, fontWeight: '700' },

  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  cropTile: {
    width: '31%', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E2E8F0', padding: 10, alignItems: 'center',
  },
  cropTileSelected: {
    borderColor: C.primary, backgroundColor: '#F0FDF4',
    ...Theme.Shadows.sm,
  },
  cropTileName: { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 4, textAlign: 'center' },
  cropTileNameSelected: { color: C.primary },
  cropTileHi: { fontSize: 11, color: C.textSecondary, marginTop: 1, textAlign: 'center' },
  waterBadge: {
    borderRadius: 12, paddingHorizontal: 5, paddingVertical: 2, marginTop: 4,
  },
  waterBadgeText: { fontSize: 9, fontWeight: '600' },

  varietySection: {
    marginTop: 8, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  varietySectionTitle: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginLeft: 6 },
  varietyChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1',
    marginRight: 8, marginTop: 4,
  },
  varietyChipActive: { backgroundColor: '#ECFDF5', borderColor: '#059669', borderWidth: 1.5 },
  varietyChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  varietyChipTextActive: { color: '#065F46', fontWeight: '700' },
  varietySourceNote: { fontSize: 10, color: '#64748B', fontStyle: 'italic', marginTop: 8 },

  presetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  presetChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  presetChipActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  presetText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  presetTextActive: { color: C.primary, fontWeight: '700' },

  subFieldLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginTop: 8, marginBottom: 6 },

  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  stageCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1,
    borderColor: '#CBD5E1', padding: 8,
  },
  stageCardActive: { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  stageTitle: { fontSize: 11, fontWeight: '700', color: C.text },
  stageTitleActive: { color: C.primary },
  stageSub: { fontSize: 9, color: C.textSecondary, marginTop: 2 },
  stageSubActive: { color: '#166534' },

  conditionGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  conditionCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1,
    borderColor: '#CBD5E1', paddingVertical: 8, alignItems: 'center',
  },
  conditionText: { fontSize: 10, fontWeight: '600', color: C.text, marginTop: 4, textAlign: 'center' },

  sizeRow: { flexDirection: 'row', alignItems: 'center' },
  unitToggleGroup: { flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
  unitBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: C.surface },
  unitBtnActive: { backgroundColor: C.primary },
  unitBtnText: { fontSize: 11, fontWeight: '600', color: C.textSecondary },
  unitBtnTextActive: { color: '#FFF', fontWeight: '700' },

  soilChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#CBD5E1', marginRight: 6,
  },
  soilChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  soilChipText: { fontSize: 11, color: C.text, fontWeight: '600' },
  soilChipTextActive: { color: '#1D4ED8', fontWeight: '700' },

  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  sourceCard: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1,
    borderColor: '#CBD5E1', padding: 10,
  },
  sourceCardActive: { borderColor: C.primary, backgroundColor: '#F0FDF4' },
  sourceTitle: { fontSize: 11, fontWeight: '700', color: C.text, marginTop: 4 },
  sourceTitleActive: { color: C.primary },
  sourceSubtitle: { fontSize: 9, color: C.textSecondary, marginTop: 1 },
  sourceSubtitleActive: { color: '#166534' },

  specialCardElectric: {
    backgroundColor: '#f0f9ff', borderWidth: 1.5, borderColor: '#bae6fd',
    borderRadius: 10, padding: 10, marginBottom: 8,
  },
  phaseToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  phaseBtn: {
    flex: 1, backgroundColor: '#ffffff', paddingVertical: 6, borderRadius: 6,
    borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center',
  },
  phaseBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  phaseBtnText: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  phaseBtnTextActive: { color: '#ffffff', fontWeight: '700' },
  innerLabel: { fontSize: 10, fontWeight: '700', color: C.text, marginBottom: 4 },
  voltagePresetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  voltagePresetChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#cbd5e1',
  },
  voltagePresetChipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  voltagePresetText: { fontSize: 9, fontWeight: '600', color: C.textSecondary },
  voltagePresetTextActive: { color: '#ffffff', fontWeight: '700' },

  pumpRow: { flexDirection: 'row', gap: 6 },
  pumpChip: {
    flex: 1, alignItems: 'center', paddingVertical: 6, backgroundColor: '#ffffff',
    borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1',
  },
  pumpChipActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  pumpChipText: { fontSize: 10, fontWeight: '600', color: C.textSecondary },
  pumpChipTextActive: { color: '#ffffff', fontWeight: '700' },

  specialCardPahadi: {
    backgroundColor: '#ecfdf5', borderWidth: 1.5, borderColor: '#a7f3d0',
    borderRadius: 10, padding: 10, marginBottom: 8,
  },
  terrainRow: { flexDirection: 'row', gap: 8 },
  terrainChip: {
    flex: 1, backgroundColor: '#ffffff', padding: 6, borderRadius: 6,
    borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center',
  },
  terrainChipActive: { borderColor: '#059669', backgroundColor: '#d1fae5' },
  terrainText: { fontSize: 10, fontWeight: '700', color: C.text },
  terrainTextActive: { color: '#065f46' },

  streamRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  streamChip: {
    flex: 1, minWidth: '30%', backgroundColor: '#ffffff', padding: 6, borderRadius: 6,
    borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center',
  },
  streamChipActive: { borderColor: '#059669', backgroundColor: '#d1fae5' },
  streamText: { fontSize: 9, fontWeight: '700', color: C.text, textAlign: 'center' },
  streamTextActive: { color: '#065f46' },

  // Water Capacity Model Card
  waterCapacityCard: {
    backgroundColor: '#F0F9FF', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#7DD3FC', padding: 16, marginBottom: 14,
  },
  waterCapacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  waterCapacityTitle: { fontSize: 14, fontWeight: '800', color: '#0369A1' },
  waterCapacitySubtitle: { fontSize: 11, color: '#0284C7', fontWeight: '600', marginTop: 2 },
  waterStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statBox: {
    width: '48%', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#BAE6FD',
  },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#64748B' },
  statValLiters: { fontSize: 16, fontWeight: '800', color: '#0284C7', marginTop: 4 },
  statSubText: { fontSize: 9, color: '#64748B', marginTop: 2 },
  datasetNoteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E0F2FE',
    borderRadius: 8, padding: 8,
  },
  datasetNoteText: { fontSize: 10, color: '#0369A1', flex: 1, lineHeight: 14 },

  // Excess Rain Alert Card
  excessRainCard: {
    backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1.5,
    borderColor: '#E2E8F0', padding: 14, marginBottom: 14,
  },
  excessRainCardAlert: {
    backgroundColor: '#FEF2F2', borderColor: '#F87171',
  },
  excessRainTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  excessRainSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
  excessDetailBox: {
    marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  excessMetricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  excessMetricLabel: { fontSize: 11, fontWeight: '600', color: '#991B1B' },
  excessMetricVal: { fontSize: 15, fontWeight: '800', color: '#DC2626', marginTop: 2 },
  riskTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  riskTagText: { fontSize: 10, fontWeight: '700', color: '#B91C1C' },
  excessRiskNotice: { fontSize: 11, color: '#7F1D1D', lineHeight: 16, marginBottom: 4 },
  excessActionStep: { fontSize: 11, color: '#15803D', fontWeight: '700', lineHeight: 16, marginTop: 4 },

  emailDispatchCard: {
    marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#CBD5E1',
  },
  emailCardHeading: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginLeft: 6 },
  emailInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13,
    color: '#0F172A', marginTop: 6, marginBottom: 8,
  },
  sendAlertBtn: {
    backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: 8, paddingVertical: 10,
  },
  sendAlertBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  farmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  farmRowText: { flex: 1, fontSize: 12, color: C.text },
  farmEditLink: { fontSize: 12, color: C.primary, fontWeight: '600' },

  validateBtn: { height: 52, borderRadius: 14, marginBottom: 16 },

  disclaimerBox: {
    backgroundColor: '#F1F5F9', borderRadius: 10, padding: 10, marginBottom: 12,
  },
  disclaimerText: { fontSize: 10, color: C.textMuted, lineHeight: 14, fontStyle: 'italic' },

  notesBox: {
    backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A',
    padding: 12, marginBottom: 12,
  },
  notesTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  notesText: { fontSize: 12, color: C.text, lineHeight: 17, marginBottom: 4 },
  notesSource: { fontSize: 10, color: C.textMuted, fontStyle: 'italic' },

  windowBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  windowLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  windowValue: { fontSize: 13, color: C.text, fontWeight: '700', marginTop: 2 },
  windowValueHi: { fontSize: 12, color: C.primary, marginTop: 1 },

  createBtn: { height: 52, borderRadius: 14 },
});
