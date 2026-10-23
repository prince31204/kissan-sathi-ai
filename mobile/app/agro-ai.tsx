import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { agroAPI, WeatherData, FarmProfile } from '../services/agroAI';
import { useLanguage } from '../context/LanguageContext';

const C = Theme.Colors;

function WeatherBadge({ weather }: { weather: WeatherData | null }) {
  if (!weather) return null;
  const isEstimate = !weather.isLive;

  return (
    <View style={[styles.weatherBadge, isEstimate && styles.weatherBadgeEstimate]}>
      <MaterialCommunityIcons
        name={isEstimate ? 'cloud-question' : 'weather-partly-cloudy'}
        size={16}
        color={isEstimate ? C.warning : C.weatherBlue}
      />
      <Text style={[styles.weatherBadgeText, isEstimate && { color: C.warning }]}>
        {isEstimate
          ? `Estimate: ${Math.round(weather.temperature)}°C`
          : `Live: ${Math.round(weather.temperature)}°C, ${weather.condition}`}
      </Text>
      {isEstimate && (
        <MaterialCommunityIcons name="information-outline" size={13} color={C.warning} style={{ marginLeft: 3 }} />
      )}
    </View>
  );
}

function SuitabilityPill({ score, category }: { score: number; category: string }) {
  const color =
    score >= 80 ? C.success :
    score >= 60 ? C.primary :
    score >= 40 ? C.warning :
    C.error;

  const bg =
    score >= 80 ? C.successLight :
    score >= 60 ? C.primaryLight :
    score >= 40 ? C.warningLight :
    C.errorLight;

  return (
    <View style={[styles.suitPill, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.suitPillScore, { color }]}>{score}/100</Text>
      <Text style={[styles.suitPillLabel, { color }]}>{category}</Text>
    </View>
  );
}

export default function AgroAIHub() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [farmProfile, setFarmProfile] = useState<FarmProfile | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'denied' | 'unknown'>('loading');

  const loadAll = useCallback(async () => {
    try {
      // 1. Get location
      let lat = 30.3165, lon = 78.0322;
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationStatus(status === 'granted' ? 'granted' : 'denied');

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }

      // 2. Load farm profile
      try {
        const fp = await agroAPI.getFarmProfile();
        setFarmProfile(fp.farmProfile);
        if (fp.farmProfile?.latitude) lat = fp.farmProfile.latitude;
        if (fp.farmProfile?.longitude) lon = fp.farmProfile.longitude;
      } catch (e) {
        console.warn('[AgroAI Hub] Farm profile load failed:', e);
      }

      // 3. Fetch weather
      try {
        const w = await agroAPI.getWeather(lat, lon);
        setWeather(w.weather);
      } catch (e) {
        console.warn('[AgroAI Hub] Weather fetch failed:', e);
      }

      // 4. Load plans
      try {
        const p = await agroAPI.getPlans();
        setPlans(p.plans || []);
      } catch (e) {
        console.warn('[AgroAI Hub] Plans load failed:', e);
      }
    } catch (err) {
      console.error('[AgroAI Hub] loadAll error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll();
    }, [loadAll])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const activePlans = plans.filter(p => p.status === 'active');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>
            {isHi ? 'कृषि AI लोड हो रहा है...' : 'Loading Agro AI...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isHi ? 'कृषि AI सलाहकार' : 'Agro AI Advisor'}
          </Text>
          <Text style={styles.headerSub}>
            {isHi ? 'फसल सुझाव + 90-दिन योजना' : 'Crop Recommendation + 90-Day Planner'}
          </Text>
        </View>
        <MaterialCommunityIcons name="leaf" size={28} color={C.primary} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />}
      >
        {/* Live Weather Banner */}
        {weather && (
          <View style={[styles.weatherCard, !weather.isLive && styles.weatherCardEstimate]}>
            <View style={styles.weatherRow}>
              <MaterialCommunityIcons
                name={weather.isLive ? 'weather-partly-cloudy' : 'cloud-question'}
                size={28}
                color={weather.isLive ? C.weatherBlue : C.warning}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.weatherTemp}>
                  {Math.round(weather.temperature)}°C
                  {weather.tempMax ? ` / ${Math.round(weather.tempMax)}°C max` : ''}
                </Text>
                <Text style={styles.weatherCondition}>{weather.condition}</Text>
                {weather.rainProbability > 20 && (
                  <Text style={styles.weatherRain}>
                    🌧 {weather.rainProbability}% rain chance · {weather.rainSumForecast.toFixed(1)} mm forecast
                  </Text>
                )}
              </View>
              <View>
                <Text style={styles.weatherDataType}>{weather.dataType}</Text>
                <Text style={styles.weatherSource} numberOfLines={1}>{weather.source?.split('(')[0]}</Text>
              </View>
            </View>
            {!weather.isLive && (
              <View style={styles.weatherWarningRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={C.warning} />
                <Text style={styles.weatherWarningText}>
                  {isHi
                    ? 'लाइव डेटा उपलब्ध नहीं — ऐतिहासिक जलवायु अनुमान दिखाया जा रहा है'
                    : 'Live data unavailable — showing historical climate estimate'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Farm Profile Quick-view */}
        <TouchableOpacity
          style={styles.farmCard}
          onPress={() => router.push('/agro-farm-setup' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.farmCardLeft}>
            <MaterialCommunityIcons name="map-marker" size={20} color={C.primary} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.farmCardTitle}>
                {farmProfile?.farmName || (isHi ? 'मेरा खेत' : 'My Farm')}
              </Text>
              <Text style={styles.farmCardSub}>
                {[farmProfile?.village, farmProfile?.district, farmProfile?.state]
                  .filter(Boolean).join(', ') || (isHi ? 'स्थान सेट नहीं' : 'Location not set')}
                {farmProfile?.elevationM ? ` · ${Math.round(farmProfile.elevationM)}m` : ''}
              </Text>
              <Text style={styles.farmCardDetail}>
                {[
                  farmProfile?.soilType !== 'Unknown' && (farmProfile?.soilType || ''),
                  farmProfile?.irrigationMethod !== 'Unknown' && (farmProfile?.irrigationMethod || ''),
                ].filter(Boolean).join(' · ') || (isHi ? 'मिट्टी/सिंचाई जानकारी दर्ज करें' : 'Add soil & irrigation info')}
              </Text>
            </View>
          </View>
          <View style={styles.farmCardEdit}>
            <Text style={styles.farmCardEditText}>{isHi ? 'संपादित करें' : 'Edit'}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={C.primary} />
          </View>
        </TouchableOpacity>

        {/* Two Main Workflows */}
        <Text style={styles.sectionTitle}>
          {isHi ? 'क्या करना है?' : 'What do you want to do?'}
        </Text>

        {/* Workflow A — Crop Recommendation */}
        <TouchableOpacity
          style={styles.workflowCard}
          onPress={() => router.push('/agro-recommend' as any)}
          activeOpacity={0.88}
        >
          <View style={[styles.workflowIconBox, { backgroundColor: '#E8F5EC' }]}>
            <MaterialCommunityIcons name="sprout" size={28} color={C.primary} />
          </View>
          <View style={styles.workflowText}>
            <Text style={styles.workflowTitle}>
              {isHi ? 'A. फसल सुझाव लें' : 'A. Get Crop Recommendation'}
            </Text>
            <Text style={styles.workflowDesc}>
              {isHi
                ? 'मौसम, मिट्टी और स्थान के आधार पर आपके खेत के लिए सबसे उपयुक्त फसलों की सूची पाएं'
                : 'Get a ranked list of crops best suited for your farm based on weather, soil, location & sowing time'}
            </Text>
            <View style={styles.workflowTag}>
              <Text style={styles.workflowTagText}>
                {isHi ? '6 फसलें उपलब्ध • उत्तराखंड केंद्रित' : '6 Crops · Uttarakhand-focused'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={C.primary} />
        </TouchableOpacity>

        {/* Workflow B — Farmer-Selected Crop Planner */}
        <TouchableOpacity
          style={[styles.workflowCard, styles.workflowCardB]}
          onPress={() => router.push('/agro-planner' as any)}
          activeOpacity={0.88}
        >
          <View style={[styles.workflowIconBox, { backgroundColor: '#EFF6FF' }]}>
            <MaterialCommunityIcons name="calendar-check" size={28} color={C.weatherBlue} />
          </View>
          <View style={styles.workflowText}>
            <Text style={[styles.workflowTitle, { color: C.weatherBlue }]}>
              {isHi ? 'B. 90-दिन फसल योजना' : 'B. 90-Day Crop Planner'}
            </Text>
            <Text style={styles.workflowDesc}>
              {isHi
                ? 'अपनी पसंद की फसल और बुआई की तारीख चुनें — रोजाना के कृषि कार्य, मौसम चेतावनी और विकास चरण कैलेंडर पाएं'
                : 'Choose your preferred crop & sowing date — get daily farming tasks, weather alerts & growth-stage calendar'}
            </Text>
            <View style={[styles.workflowTag, { backgroundColor: '#EFF6FF', borderColor: C.weatherBlue }]}>
              <Text style={[styles.workflowTagText, { color: C.weatherBlue }]}>
                {isHi ? 'मौसम के अनुसार अपडेट होता है' : 'Updates with live weather'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={C.weatherBlue} />
        </TouchableOpacity>

        {/* Active Plans Section */}
        {activePlans.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {isHi ? 'चल रही फसल योजनाएं' : 'Active Crop Plans'}
            </Text>
            {activePlans.slice(0, 3).map((plan) => {
              const sowDate = new Date(plan.sowingDate);
              const today = new Date();
              const daysSinceSowing = Math.floor((today.getTime() - sowDate.getTime()) / (1000 * 60 * 60 * 24));
              const dayProgress = Math.max(0, Math.min(90, daysSinceSowing + 1));
              const progress = Math.round((dayProgress / 90) * 100);

              return (
                <TouchableOpacity
                  key={plan._id}
                  style={styles.planCard}
                  onPress={() => router.push(`/agro-plan-detail?planId=${plan._id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.planCardHeader}>
                    <View style={styles.planCropIcon}>
                      <MaterialCommunityIcons name="sprout" size={20} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.planCropName}>
                        {plan.nameEn} · {plan.nameHi}
                      </Text>
                      <Text style={styles.planDates}>
                        {isHi ? 'बुआई:' : 'Sown:'} {new Date(plan.sowingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        · Day {dayProgress}/90
                      </Text>
                    </View>
                    {plan.isUnsuitable ? (
                      <View style={styles.warningPill}>
                        <MaterialCommunityIcons name="alert" size={14} color={C.error} />
                        <Text style={styles.warningPillText}>{isHi ? 'अनुपयुक्त' : 'Risky'}</Text>
                      </View>
                    ) : (
                      <SuitabilityPill score={plan.suitabilityScore} category="" />
                    )}
                  </View>
                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
                  </View>
                  <Text style={styles.progressLabel}>{progress}% {isHi ? 'पूर्ण' : 'complete'}</Text>
                </TouchableOpacity>
              );
            })}
            {activePlans.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.push('/agro-plans-list' as any)}
              >
                <Text style={styles.viewAllText}>
                  {isHi ? `सभी ${activePlans.length} योजनाएं देखें →` : `View all ${activePlans.length} plans →`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Info Footer */}
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color={C.textSecondary} />
          <Text style={styles.infoText}>
            {isHi
              ? 'सुझाव उत्तराखंड कृषि विभाग, ICAR और FAO के दस्तावेजों पर आधारित हैं। यह हार्वेस्ट की गारंटी नहीं है।'
              : 'Recommendations are based on UK Agriculture Dept, ICAR & FAO documents. Not a harvest guarantee.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: C.textSecondary, fontSize: 14 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryLight, marginRight: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.textSecondary, marginTop: 1 },

  scroll: { padding: 16, paddingBottom: 90 },

  weatherCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    marginBottom: 14,
  },
  weatherCardEstimate: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  weatherRow: { flexDirection: 'row', alignItems: 'center' },
  weatherTemp: { fontSize: 17, fontWeight: '700', color: C.text },
  weatherCondition: { fontSize: 13, color: C.textSecondary, marginTop: 1 },
  weatherRain: { fontSize: 12, color: '#2563EB', marginTop: 3 },
  weatherDataType: { fontSize: 10, color: C.textSecondary, textAlign: 'right', fontWeight: '600' },
  weatherSource: { fontSize: 9, color: C.textMuted, textAlign: 'right', maxWidth: 90 },
  weatherWarningRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#FDE68A',
  },
  weatherWarningText: { fontSize: 11, color: C.warning, marginLeft: 4, flex: 1 },
  weatherBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  weatherBadgeEstimate: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  weatherBadgeText: { fontSize: 12, color: C.weatherBlue, marginLeft: 4, fontWeight: '600' },

  farmCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
  },
  farmCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  farmCardTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  farmCardSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  farmCardDetail: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  farmCardEdit: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  farmCardEditText: { fontSize: 12, color: C.primary, fontWeight: '600' },

  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10, marginTop: 4,
  },

  workflowCard: {
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: '#D1FAE5',
    padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    ...Theme.Shadows.sm,
  },
  workflowCardB: { borderColor: '#BFDBFE' },
  workflowIconBox: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  workflowText: { flex: 1, marginRight: 6 },
  workflowTitle: { fontSize: 15, fontWeight: '700', color: C.primary, marginBottom: 4 },
  workflowDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 17, marginBottom: 8 },
  workflowTag: {
    alignSelf: 'flex-start', backgroundColor: '#E8F5EC', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#A7F3D0',
  },
  workflowTagText: { fontSize: 10, color: C.primary, fontWeight: '600' },

  planCard: {
    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 10,
  },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  planCropIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  planCropName: { fontSize: 14, fontWeight: '700', color: C.text },
  planDates: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3, backgroundColor: C.primary },
  progressLabel: { fontSize: 11, color: C.textMuted, marginTop: 4 },

  suitPill: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    alignItems: 'center', borderWidth: 1,
  },
  suitPillScore: { fontSize: 13, fontWeight: '800' },
  suitPillLabel: { fontSize: 9, fontWeight: '600', marginTop: 1 },

  warningPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.errorLight, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4,
    borderWidth: 1, borderColor: C.error,
  },
  warningPillText: { fontSize: 10, color: C.error, fontWeight: '700', marginLeft: 3 },

  viewAllBtn: {
    alignItems: 'center', paddingVertical: 10, marginBottom: 4,
  },
  viewAllText: { fontSize: 13, color: C.primary, fontWeight: '700' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#F8FAF8', borderRadius: 10, padding: 12, marginTop: 16,
    borderWidth: 1, borderColor: C.border,
  },
  infoText: {
    fontSize: 11, color: C.textSecondary, marginLeft: 6, flex: 1, lineHeight: 16,
  },
});
