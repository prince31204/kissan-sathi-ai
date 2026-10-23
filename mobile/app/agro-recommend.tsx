import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { agroAPI, FarmProfile, CropRecommendation, WeatherData } from '../services/agroAI';
import { useLanguage } from '../context/LanguageContext';

const C = Theme.Colors;

// ── Date picker helpers ───────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ── Score badge ───────────────────────────────────────────────────
function ScoreBadge({ score, category }: { score: number; category: string }) {
  const color = score >= 80 ? C.success : score >= 60 ? C.primary : score >= 40 ? C.warning : C.error;
  const bg = score >= 80 ? C.successLight : score >= 60 ? C.primaryLight : score >= 40 ? C.warningLight : C.errorLight;
  return (
    <View style={[sBadge.wrap, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[sBadge.score, { color }]}>{score}</Text>
      <Text style={[sBadge.label, { color }]}>/100</Text>
    </View>
  );
}
const sBadge = StyleSheet.create({
  wrap: { borderRadius: 10, padding: 8, alignItems: 'center', borderWidth: 1.5, minWidth: 52 },
  score: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '600', marginTop: -2 },
});

// ── Recommendation card ───────────────────────────────────────────
function CropCard({ crop, isHi, onPlan }: { crop: CropRecommendation; isHi: boolean; onPlan: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isHighlySuitable = crop.suitabilityCategory === 'Highly Suitable';
  const borderColor = isHighlySuitable ? C.success : crop.score >= 60 ? C.primary : C.warning;

  return (
    <View style={[cCard.container, { borderLeftColor: borderColor }]}>
      <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.85}>
        <View style={cCard.header}>
          <View style={cCard.nameBox}>
            <Text style={cCard.nameEn}>{crop.nameEn}</Text>
            <Text style={cCard.nameHi}>{crop.nameHi} · {crop.localName}</Text>
            <Text style={cCard.category}>{crop.suitabilityCategory}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <ScoreBadge score={crop.score} category={crop.suitabilityCategory} />
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18} color={C.textSecondary}
            />
          </View>
        </View>

        {/* Quick facts */}
        <View style={cCard.quickRow}>
          <View style={cCard.quickChip}>
            <MaterialCommunityIcons name="calendar-clock" size={12} color={C.textSecondary} />
            <Text style={cCard.quickText}>{crop.sowingWindow}</Text>
          </View>
          <View style={cCard.quickChip}>
            <MaterialCommunityIcons name="sprout" size={12} color={C.primary} />
            <Text style={cCard.quickText}>{crop.primarySeason || (crop.season && crop.season.join('/')) || 'Crop'}</Text>
          </View>
          <View style={cCard.quickChip}>
            <MaterialCommunityIcons name="water-outline" size={12} color={C.weatherBlue} />
            <Text style={cCard.quickText}>{crop.waterDemandCategory} water</Text>
          </View>
          <View style={cCard.quickChip}>
            <MaterialCommunityIcons name="timer-sand" size={12} color={C.textSecondary} />
            <Text style={cCard.quickText}>{crop.cropDurationDays}d</Text>
          </View>
          {Boolean(crop.mlConfidence && crop.mlConfidence > 0) ? (
            <View style={[cCard.quickChip, { backgroundColor: '#ECFDF5', borderColor: '#86EFAC' }]}>
              <MaterialCommunityIcons name="robot" size={12} color="#059669" />
              <Text style={[cCard.quickText, { color: '#059669', fontWeight: '700' }]}>
                AI Match: {crop.mlConfidence?.toFixed(1)}%
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={cCard.expandedBody}>
          {/* Matching factors */}
          {crop.matchingFactors.length > 0 && (
            <View style={cCard.section}>
              <Text style={cCard.sectionTitle}>✅ {isHi ? 'अनुकूल कारण' : 'Matching Factors'}</Text>
              {crop.matchingFactors.map((f, i) => (
                <View key={i} style={cCard.bulletRow}>
                  <Text style={cCard.bulletGreen}>•</Text>
                  <Text style={cCard.bulletText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Risks */}
          {crop.risks.length > 0 && (
            <View style={cCard.section}>
              <Text style={cCard.sectionTitle}>⚠️ {isHi ? 'जोखिम' : 'Risks'}</Text>
              {crop.risks.map((r, i) => (
                <View key={i} style={cCard.bulletRow}>
                  <Text style={cCard.bulletAmber}>•</Text>
                  <Text style={cCard.bulletText}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Missing info */}
          {crop.missingInfo.length > 0 && (
            <View style={cCard.section}>
              <Text style={cCard.sectionTitle}>ℹ️ {isHi ? 'अधूरी जानकारी' : 'Missing Information'}</Text>
              {crop.missingInfo.map((m, i) => (
                <View key={i} style={cCard.bulletRow}>
                  <Text style={cCard.bulletBlue}>•</Text>
                  <Text style={cCard.bulletText}>{m}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Source */}
          <Text style={cCard.source}>
            Source: {crop.source} · Confidence: {crop.confidence}
          </Text>

          {/* Plan button */}
          <Button
            title={isHi ? `${crop.nameEn} के लिए 90-दिन योजना बनाएं →` : `Plan 90 days with ${crop.nameEn} →`}
            onPress={onPlan}
            style={cCard.planBtn}
          />
        </View>
      )}
    </View>
  );
}
const cCard = StyleSheet.create({
  container: {
    backgroundColor: C.surface, borderRadius: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 4, overflow: 'hidden',
    padding: 14,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameBox: { flex: 1, marginRight: 10 },
  nameEn: { fontSize: 16, fontWeight: '700', color: C.text },
  nameHi: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  category: { fontSize: 11, color: C.textMuted, marginTop: 3 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F8FAF8', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  quickText: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },
  expandedBody: { marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bulletGreen: { color: C.success, fontSize: 14, marginRight: 6, lineHeight: 18 },
  bulletAmber: { color: C.warning, fontSize: 14, marginRight: 6, lineHeight: 18 },
  bulletBlue: { color: C.accent, fontSize: 14, marginRight: 6, lineHeight: 18 },
  bulletText: { fontSize: 12, color: C.text, flex: 1, lineHeight: 17 },
  source: { fontSize: 10, color: C.textMuted, marginBottom: 10, fontStyle: 'italic' },
  planBtn: { height: 44, borderRadius: 10 },
});

// ── Unsuitable crop item ──────────────────────────────────────────
function UnsuitableCropItem({ crop, isHi }: { crop: any; isHi: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity style={uStyle.row} onPress={() => setExpanded(e => !e)}>
      <MaterialCommunityIcons name="close-circle-outline" size={18} color={C.error} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={uStyle.name}>{crop.nameEn} ({crop.nameHi})</Text>
        {expanded && crop.reasons.map((r: string, i: number) => (
          <Text key={i} style={uStyle.reason}>• {r}</Text>
        ))}
      </View>
      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
    </TouchableOpacity>
  );
}
const uStyle = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  name: { fontSize: 13, fontWeight: '600', color: C.error },
  reason: { fontSize: 11, color: C.textSecondary, marginTop: 4, lineHeight: 16 },
});

// ── Main Component ────────────────────────────────────────────────
export default function AgroRecommend() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);

  // Form state
  const [sowingDate, setSowingDate] = useState(addDays(today(), 7));
  const [farmProfile, setFarmProfile] = useState<FarmProfile | null>(null);

  // Results
  const [seasonView, setSeasonView] = useState<'all' | 'kharif' | 'rabi'>('all');
  const [results, setResults] = useState<{
    recommendations: CropRecommendation[];
    unsuitable: any[];
    kharifCrops?: CropRecommendation[];
    rabiCrops?: CropRecommendation[];
    regionalModelInfo?: any;
    regionalMlActive?: boolean;
    season: string;
    elevationZone: string;
    weatherSummary: any;
    dataNote: string;
    disclaimer: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const fp = await agroAPI.getFarmProfile();
        setFarmProfile(fp.farmProfile);
      } catch (e) {
        console.warn('Farm profile load:', e);
      } finally {
        setFormLoading(false);
      }
    })();
  }, []);

  const handleGetRecommendations = async () => {
    if (!sowingDate) {
      Alert.alert(isHi ? 'तारीख चुनें' : 'Date Required', isHi ? 'बुआई की तारीख डालें।' : 'Please enter a sowing date.');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const res = await agroAPI.getRecommendations({
        district: farmProfile?.district || '',
        elevation: farmProfile?.elevationM || null,
        soilType: farmProfile?.soilType || 'Unknown',
        sowingDate,
        irrigationMethod: farmProfile?.irrigationMethod || 'Unknown',
        waterAvailability: farmProfile?.waterAvailability || 'Unknown',
        farmAreaValue: farmProfile?.farmAreaValue || undefined,
        farmAreaUnit: farmProfile?.farmAreaUnit || 'Bigha',
        latitude: farmProfile?.latitude || undefined,
        longitude: farmProfile?.longitude || undefined,
        previousCrop: farmProfile?.previousCrop || undefined,
      });
      setResults(res);
    } catch (e: any) {
      Alert.alert(isHi ? 'त्रुटि' : 'Error', e.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanCrop = (cropKey: string) => {
    router.push(`/agro-planner?cropKey=${cropKey}&sowingDate=${sowingDate}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/agro-ai'))}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isHi ? 'फसल सुझाव (AI)' : 'AI Crop Recommendation'}
          </Text>
          <Text style={styles.headerSub}>
            {isHi ? 'Workflow A — उपयुक्त फसलों की सूची' : 'Workflow A — Ranked crop suitability'}
          </Text>
        </View>
        <MaterialCommunityIcons name="sprout" size={26} color={C.primary} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Farm Profile Summary Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={C.primary} />
            <Text style={styles.profileText}>
              {[farmProfile?.district, farmProfile?.state].filter(Boolean).join(', ') || (isHi ? 'स्थान नहीं चुना' : 'Location not set')}
              {farmProfile?.elevationM ? ` · ${Math.round(farmProfile.elevationM)}m` : ''}
            </Text>
          </View>
          <View style={styles.profileRow}>
            <MaterialCommunityIcons name="terrain" size={16} color={C.soilGreen} />
            <Text style={styles.profileText}>
              {isHi ? 'मिट्टी:' : 'Soil:'} {farmProfile?.soilType || 'Unknown'}
              {' · '}
              {isHi ? 'सिंचाई:' : 'Irrigation:'} {farmProfile?.irrigationMethod || 'Unknown'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/agro-farm-setup' as any)}>
            <Text style={styles.profileEditLink}>
              {isHi ? '✏️ खेत की जानकारी बदलें' : '✏️ Edit farm profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sowing Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isHi ? 'बुआई की योजनाबद्ध तारीख' : 'Planned Sowing Date'}
          </Text>
          <Text style={styles.cardHint}>
            {isHi
              ? 'बुआई किस तारीख के आसपास करना चाहते हैं? (YYYY-MM-DD फॉर्मेट में)'
              : 'When do you plan to sow? (YYYY-MM-DD format, e.g. 2026-11-15)'}
          </Text>
          <Input
            value={sowingDate}
            onChangeText={setSowingDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />

          {/* Quick date presets */}
          <View style={styles.presetRow}>
            {[0, 7, 14, 21, 30].map((n) => {
              const d = addDays(today(), n);
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.presetChip, sowingDate === d && styles.presetChipActive]}
                  onPress={() => setSowingDate(d)}
                >
                  <Text style={[styles.presetText, sowingDate === d && styles.presetTextActive]}>
                    {n === 0 ? (isHi ? 'आज' : 'Today') : `+${n}d`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Get Recommendations Button */}
        <Button
          title={loading
            ? (isHi ? 'फसल विश्लेषण हो रहा है...' : 'Analyzing crops...')
            : (isHi ? 'फसल सुझाव पाएं' : 'Get Crop Recommendations')}
          onPress={handleGetRecommendations}
          loading={loading}
          style={styles.analyzeBtn}
        />

        {/* Results */}
        {results && (
          <>
            {/* Regional ML Model Banner */}
            <View style={styles.mlModelCard}>
              <View style={styles.mlModelHeader}>
                <MaterialCommunityIcons name="robot" size={20} color="#059669" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.mlModelTitle}>
                    {isHi ? 'क्षेत्रीय AI फसल मॉडल सक्रिय' : 'Indian Crop-Region AI Model Active'}
                  </Text>
                  <Text style={styles.mlModelSub}>
                    {isHi
                      ? '5,373 रिकॉर्ड्स व 30 राज्यों के डेटासेट पर प्रशिक्षित'
                      : 'Trained on 5,373 records across 30 States for Kharif & Rabi'}
                  </Text>
                </View>
                <View style={styles.mlModelPill}>
                  <Text style={styles.mlModelPillText}>RandomForest</Text>
                </View>
              </View>

              <View style={styles.mlModelMetrics}>
                <View style={styles.mlMetricChip}>
                  <Text style={styles.mlMetricLabel}>{isHi ? 'शीर्ष-3 सटीकता' : 'Top-3 Acc'}:</Text>
                  <Text style={styles.mlMetricVal}>78.9%</Text>
                </View>
                <View style={styles.mlMetricChip}>
                  <Text style={styles.mlMetricLabel}>{isHi ? 'राज्य' : 'State'}:</Text>
                  <Text style={styles.mlMetricVal}>{farmProfile?.state || 'Uttarakhand'}</Text>
                </View>
                <View style={styles.mlMetricChip}>
                  <Text style={styles.mlMetricLabel}>{isHi ? 'मौसम' : 'Season'}:</Text>
                  <Text style={styles.mlMetricVal}>{results.season}</Text>
                </View>
              </View>
            </View>

            {/* Context card */}
            <View style={styles.contextCard}>
              <View style={styles.contextRow}>
                <MaterialCommunityIcons name="information-outline" size={16} color={C.accent} />
                <Text style={styles.contextText}>
                  {isHi ? 'मौसम:' : 'Season:'} <Text style={{ fontWeight: '700' }}>{results.season}</Text>
                  {' · '}
                  {isHi ? 'ऊंचाई क्षेत्र:' : 'Zone:'} <Text style={{ fontWeight: '700' }}>{results.elevationZone}</Text>
                </Text>
              </View>
              <View style={styles.contextRow}>
                <MaterialCommunityIcons
                  name={results.weatherSummary?.isLive ? 'weather-partly-cloudy' : 'cloud-question'}
                  size={14}
                  color={results.weatherSummary?.isLive ? C.weatherBlue : C.warning}
                />
                <Text style={[styles.contextText, { fontSize: 11 }]}>
                  {results.weatherSummary?.isLive ? 'Live weather' : '⚠️ Climate estimate'}: {results.weatherSummary?.temperature}°C
                </Text>
              </View>
              <Text style={styles.disclaimerText}>{results.disclaimer}</Text>
              {Boolean(results.dataNote) && (
                <Text style={[styles.disclaimerText, { marginTop: 4 }]}>{results.dataNote}</Text>
              )}
            </View>

            {/* Season switcher tabs */}
            <View style={styles.seasonTabsRow}>
              <TouchableOpacity
                style={[styles.seasonTabBtn, seasonView === 'all' && styles.seasonTabBtnActive]}
                onPress={() => setSeasonView('all')}
              >
                <Text style={[styles.seasonTabBtnText, seasonView === 'all' && styles.seasonTabBtnTextActive]}>
                  {isHi ? 'योजनाबद्ध तारीख' : 'Planned Date'} ({results.recommendations.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.seasonTabBtn, seasonView === 'kharif' && styles.seasonTabBtnActiveKharif]}
                onPress={() => setSeasonView('kharif')}
              >
                <Text style={[styles.seasonTabBtnText, seasonView === 'kharif' && styles.seasonTabBtnTextActive]}>
                  🌾 {isHi ? 'खरीफ फसलें' : 'Kharif'} ({results.kharifCrops?.length || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.seasonTabBtn, seasonView === 'rabi' && styles.seasonTabBtnActiveRabi]}
                onPress={() => setSeasonView('rabi')}
              >
                <Text style={[styles.seasonTabBtnText, seasonView === 'rabi' && styles.seasonTabBtnTextActive]}>
                  ❄️ {isHi ? 'रबी फसलें' : 'Rabi'} ({results.rabiCrops?.length || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Crops list */}
            {(() => {
              const activeCrops = seasonView === 'kharif'
                ? (results.kharifCrops || [])
                : seasonView === 'rabi'
                ? (results.rabiCrops || [])
                : results.recommendations;

              const titleLabel = seasonView === 'kharif'
                ? (isHi ? `🌾 खरीफ उपयुक्त फसलें (${activeCrops.length})` : `🌾 Kharif Recommended Crops (${activeCrops.length})`)
                : seasonView === 'rabi'
                ? (isHi ? `❄️ रबी उपयुक्त फसलें (${activeCrops.length})` : `❄️ Rabi Recommended Crops (${activeCrops.length})`)
                : (isHi ? `✅ उपयुक्त फसलें (${activeCrops.length})` : `✅ Suitable Crops (${activeCrops.length})`);

              return (
                <>
                  <Text style={styles.sectionTitle}>{titleLabel}</Text>
                  {activeCrops.map((crop) => (
                    <CropCard
                      key={crop.cropKey}
                      crop={crop}
                      isHi={isHi}
                      onPlan={() => handlePlanCrop(crop.cropKey)}
                    />
                  ))}
                </>
              );
            })()}

            {/* Unsuitable crops (only in planned view) */}
            {seasonView === 'all' && results.unsuitable.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: C.error, marginTop: 8 }]}>
                  {isHi ? `❌ अनुपयुक्त फसलें (${results.unsuitable.length})` : `❌ Not Suitable (${results.unsuitable.length})`}
                </Text>
                <Text style={styles.unsuitableHint}>
                  {isHi ? 'ये फसलें आपके खेत/मौसम के लिए उपयुक्त नहीं हैं। कारण देखने के लिए टैप करें।' : 'These crops are not suitable for your farm/season. Tap to see why.'}
                </Text>
                {results.unsuitable.map((crop) => (
                  <UnsuitableCropItem key={crop.cropKey} crop={crop} isHi={isHi} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
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
    backgroundColor: C.primaryLight, marginRight: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 11, color: C.textSecondary },
  scroll: { padding: 16, paddingBottom: 60 },

  profileCard: {
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0',
    padding: 12, marginBottom: 14,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  profileText: { fontSize: 12, color: C.text, flex: 1 },
  profileEditLink: { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 4 },

  card: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardHint: { fontSize: 12, color: C.textSecondary, marginBottom: 10, lineHeight: 16 },

  presetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  presetChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  presetChipActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  presetText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  presetTextActive: { color: C.primary, fontWeight: '700' },

  analyzeBtn: { height: 52, borderRadius: 14, marginBottom: 16 },

  contextCard: {
    backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE',
    padding: 12, marginBottom: 14,
  },
  contextRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  contextText: { fontSize: 13, color: C.text, flex: 1 },
  disclaimerText: { fontSize: 10, color: C.textMuted, lineHeight: 14, fontStyle: 'italic' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
  unsuitableHint: { fontSize: 12, color: C.textSecondary, marginBottom: 8 },

  mlModelCard: {
    backgroundColor: '#ECFDF5', borderRadius: 14, borderWidth: 1.5, borderColor: '#86EFAC',
    padding: 14, marginBottom: 14,
  },
  mlModelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  mlModelTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  mlModelSub: { fontSize: 11, color: '#047857', marginTop: 1 },
  mlModelPill: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  mlModelPillText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  mlModelMetrics: {
    flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap',
  },
  mlMetricChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0',
  },
  mlMetricLabel: { fontSize: 10, color: C.textSecondary, fontWeight: '500' },
  mlMetricVal: { fontSize: 10, color: '#065F46', fontWeight: '700' },

  seasonTabsRow: {
    flexDirection: 'row', gap: 6, marginBottom: 14,
  },
  seasonTabBtn: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  seasonTabBtnActive: {
    backgroundColor: C.primary, borderColor: C.primary,
  },
  seasonTabBtnActiveKharif: {
    backgroundColor: '#059669', borderColor: '#059669',
  },
  seasonTabBtnActiveRabi: {
    backgroundColor: '#2563EB', borderColor: '#2563EB',
  },
  seasonTabBtnText: { fontSize: 11, fontWeight: '600', color: C.textSecondary, textAlign: 'center' },
  seasonTabBtnTextActive: { color: '#FFF', fontWeight: '700' },
});
