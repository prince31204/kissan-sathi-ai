import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Theme } from '../constants/Theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useLanguage } from '../context/LanguageContext';
import {
  predictCropAndFertilizer,
  FertilizerPredictionResult,
} from '../services/fertilizerService';
import { getUnifiedWeather } from '../services/weatherService';
import { toast } from '../context/ToastContext';

export default function FertilizerAdvisorScreen() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  // Soil Input States
  const [nVal, setNVal] = useState<string>('70');
  const [pVal, setPVal] = useState<string>('45');
  const [kVal, setKVal] = useState<string>('42');
  const [phVal, setPhVal] = useState<string>('6.5');
  const [customRainfall, setCustomRainfall] = useState<string>('');
  const [useAutoWeather, setUseAutoWeather] = useState<boolean>(true);

  // Live Location & Weather
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: 30.3165,
    lon: 78.0322,
  });
  const [locationName, setLocationName] = useState<string>('Dehradun, Uttarakhand');
  const [liveWeather, setLiveWeather] = useState<{
    temp: number;
    humidity: number;
    rainfall: number;
    isLive: boolean;
  }>({
    temp: 24,
    humidity: 65,
    rainfall: 55,
    isLive: false,
  });
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  // Prediction State
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<FertilizerPredictionResult | null>(null);

  // Quick Soil Presets
  const SOIL_PRESETS = [
    { label: isHi ? 'सामान्य संतुलित' : 'Balanced Soil', n: '70', p: '45', k: '42', ph: '6.5' },
    { label: isHi ? 'तराई दोमट' : 'Terai Alluvial', n: '90', p: '52', k: '40', ph: '7.1' },
    { label: isHi ? 'पहाड़ी अम्लीय' : 'Hill Acidic', n: '45', p: '35', k: '60', ph: '5.4' },
    { label: isHi ? 'कम पोटाश मिट्टी' : 'Low Potash', n: '80', p: '60', k: '20', ph: '6.8' },
  ];

  // Fetch live weather on load
  useEffect(() => {
    fetchCurrentLocationAndWeather();
  }, []);

  const fetchCurrentLocationAndWeather = async () => {
    setLoadingWeather(true);
    try {
      let lat = 30.3165;
      let lon = 78.0322;

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
            const geo = await geoRes.json();
            const town = geo.address?.city || geo.address?.town || geo.address?.county || geo.address?.state_district;
            const state = geo.address?.state || '';
            if (town) setLocationName(`${town}${state ? `, ${state}` : ''}`);
          }
        } catch (_) {}
      }

      const w = await getUnifiedWeather(lat, lon);
      setLiveWeather({
        temp: Math.round(w.temperature),
        humidity: Math.round(w.humidity),
        rainfall: Math.round((w.precipitationMm || 0) * 10 + 50),
        isLive: w.isLive,
      });
    } catch (e) {
      console.warn('Weather fetch error:', e);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handlePredict = async () => {
    const n = parseFloat(nVal);
    const p = parseFloat(pVal);
    const k = parseFloat(kVal);
    const ph = parseFloat(phVal);

    if (isNaN(n) || isNaN(p) || isNaN(k) || isNaN(ph)) {
      toast.warning(
        isHi ? 'अमान्य इनपुट' : 'Invalid Input',
        isHi ? 'कृपया N, P, K और pH के सही संख्यात्मक मान दर्ज करें।' : 'Please enter valid numbers for N, P, K and pH.'
      );
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        N: n,
        P: p,
        K: k,
        ph: ph,
        lat: coords.lat,
        lon: coords.lon,
        temperature: liveWeather.temp,
        humidity: liveWeather.humidity,
        rainfall: (!useAutoWeather && customRainfall.trim()) ? parseFloat(customRainfall) : liveWeather.rainfall,
      };

      const res = await predictCropAndFertilizer(payload);
      setResult(res);
      toast.success(
        isHi ? 'फसल व खाद सिफारिश तैयार!' : 'Recommendation Generated!',
        isHi
          ? `${res.primaryRecommendation.hindi_name} (${res.primaryRecommendation.confidence}% मैच) की सिफारिश तैयार है।`
          : `Recommended ${res.primaryRecommendation.crop} with ${res.primaryRecommendation.confidence}% match.`
      );
    } catch (e: any) {
      console.error('Fertilizer prediction error:', e);
      toast.error(
        isHi ? 'पूर्वानुमान त्रुटि' : 'Prediction Error',
        e?.message || (isHi ? 'सिफारिश प्राप्त करने में विफल।' : 'Failed to get recommendation.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isHi ? 'खाद एवं फसल AI सलाहकार' : 'Fertilizer & Soil Crop AI'}
          </Text>
          <Text style={styles.headerSub}>
            {isHi ? 'मृदा NPK व लाइव मौसम आधारित सिफारिश (99.5% शुद्धता)' : 'Soil NPK & Live Weather Powered Model'}
          </Text>
        </View>
        <TouchableOpacity onPress={fetchCurrentLocationAndWeather} style={styles.reloadBtn}>
          <MaterialCommunityIcons
            name="weather-cloudy-clock"
            size={22}
            color={Theme.Colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Dynamic Weather & Rainfall Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <View style={styles.weatherLocation}>
              <MaterialCommunityIcons name="map-marker-radius" size={18} color="#16A34A" />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationName}
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>
                {liveWeather.isLive ? 'LIVE WEATHER' : 'STATION WEATHER'}
              </Text>
            </View>
          </View>

          <View style={styles.weatherMetricsRow}>
            <View style={styles.weatherMetric}>
              <MaterialCommunityIcons name="weather-rainy" size={22} color="#0284C7" />
              <Text style={styles.metricLabel}>{isHi ? 'अनुमानित वर्षा' : 'Rainfall (Auto)'}</Text>
              <Text style={styles.metricVal}>
                {result?.weatherSnapshot?.rainfall
                  ? `${result.weatherSnapshot.rainfall} mm`
                  : `${liveWeather.rainfall} mm`}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.weatherMetric}>
              <MaterialCommunityIcons name="thermometer" size={22} color="#EA580C" />
              <Text style={styles.metricLabel}>{isHi ? 'तापमान' : 'Temperature'}</Text>
              <Text style={styles.metricVal}>
                {result?.weatherSnapshot?.temperature
                  ? `${result.weatherSnapshot.temperature}°C`
                  : `${liveWeather.temp}°C`}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.weatherMetric}>
              <MaterialCommunityIcons name="water-percent" size={22} color="#0D9488" />
              <Text style={styles.metricLabel}>{isHi ? 'आर्द्रता' : 'Humidity'}</Text>
              <Text style={styles.metricVal}>
                {result?.weatherSnapshot?.humidity
                  ? `${result.weatherSnapshot.humidity}%`
                  : `${liveWeather.humidity}%`}
              </Text>
            </View>
          </View>

          <Text style={styles.weatherHint}>
            <MaterialCommunityIcons name="check-decagram" size={14} color="#16A34A" />{' '}
            {isHi
              ? 'AI मॉडल लाइव वर्षा और तापमान के अनुसार उपयुक्त फसल की भविष्यवाणी करता है।'
              : 'AI auto-integrates live local rainfall & climate into crop prediction.'}
          </Text>
        </View>

        {/* Quick Soil Presets */}
        <View style={styles.presetsWrap}>
          <Text style={styles.presetsTitle}>
            {isHi ? 'त्वरित मृदा नमूने (Presets):' : 'Quick Soil Samples:'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
            {SOIL_PRESETS.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.presetChip}
                onPress={() => {
                  setNVal(p.n);
                  setPVal(p.p);
                  setKVal(p.k);
                  setPhVal(p.ph);
                }}
              >
                <Text style={styles.presetChipText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Soil Inputs Form Card */}
        <Card style={styles.formCard}>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="flask-outline" size={22} color="#15803D" />
            <Text style={styles.cardHeaderTitle}>
              {isHi ? 'मिट्टी के पोषक तत्व दर्ज करें (Soil Health Card)' : 'Enter Soil Nutrients (NPK & pH)'}
            </Text>
          </View>

          {/* N, P, K Inputs */}
          <View style={styles.inputsGrid}>
            {/* Nitrogen */}
            <View style={styles.inputCol}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: '#16A34A' }]}>
                  {isHi ? 'नाइट्रोजन (N)' : 'Nitrogen (N)'}
                </Text>
                <Text style={styles.inputUnit}>kg/ha</Text>
              </View>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={nVal}
                onChangeText={setNVal}
                placeholder="0 - 140"
              />
            </View>

            {/* Phosphorus */}
            <View style={styles.inputCol}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: '#0284C7' }]}>
                  {isHi ? 'फास्फोरस (P)' : 'Phosphorus (P)'}
                </Text>
                <Text style={styles.inputUnit}>kg/ha</Text>
              </View>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={pVal}
                onChangeText={setPVal}
                placeholder="5 - 145"
              />
            </View>
          </View>

          <View style={styles.inputsGrid}>
            {/* Potassium */}
            <View style={styles.inputCol}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: '#D97706' }]}>
                  {isHi ? 'पोटाश (K)' : 'Potassium (K)'}
                </Text>
                <Text style={styles.inputUnit}>kg/ha</Text>
              </View>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={kVal}
                onChangeText={setKVal}
                placeholder="5 - 205"
              />
            </View>

            {/* Soil pH */}
            <View style={styles.inputCol}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.inputLabel, { color: '#9333EA' }]}>
                  {isHi ? 'मृदा pH मान' : 'Soil pH (4-9)'}
                </Text>
                <Text style={styles.inputUnit}>pH</Text>
              </View>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={phVal}
                onChangeText={setPhVal}
                placeholder="6.5"
              />
            </View>
          </View>

          {/* Auto vs Custom Rainfall Toggle */}
          <View style={styles.rainfallToggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, useAutoWeather && styles.toggleBtnActive]}
              onPress={() => setUseAutoWeather(true)}
            >
              <MaterialCommunityIcons
                name="cloud-check"
                size={18}
                color={useAutoWeather ? '#FFFFFF' : '#4B5563'}
              />
              <Text style={[styles.toggleBtnText, useAutoWeather && styles.toggleBtnTextActive]}>
                {isHi ? 'लाइव मौसम वर्षा (ऑटो)' : 'Auto Live Rainfall'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, !useAutoWeather && styles.toggleBtnActive]}
              onPress={() => setUseAutoWeather(false)}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={18}
                color={!useAutoWeather ? '#FFFFFF' : '#4B5563'}
              />
              <Text style={[styles.toggleBtnText, !useAutoWeather && styles.toggleBtnTextActive]}>
                {isHi ? 'मैन्युअल वर्षा (mm)' : 'Custom Rainfall'}
              </Text>
            </TouchableOpacity>
          </View>

          {!useAutoWeather && (
            <View style={styles.customRainWrap}>
              <Text style={styles.inputLabel}>{isHi ? 'वार्षिक/मौसमी वर्षा (मिमी)' : 'Rainfall in mm:'}</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={customRainfall}
                onChangeText={setCustomRainfall}
                placeholder="e.g. 150 mm"
              />
            </View>
          )}

          {/* Action Button */}
          <Button
            title={loading ? (isHi ? 'AI जांच जारी है...' : 'Analyzing with AI...') : (isHi ? 'फसल एवं खाद सिफारिश प्राप्त करें' : 'Recommend Best Crop & Fertilizer')}
            onPress={handlePredict}
            loading={loading}
            style={styles.predictBtn}
            icon={<MaterialCommunityIcons name="sprout" size={20} color="#FFFFFF" />}
          />
        </Card>

        {/* Prediction Results */}
        {result && result.primaryRecommendation && (
          <View style={styles.resultsContainer}>
            {/* Primary Crop Card */}
            <View style={styles.heroResultCard}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.matchBadge}>
                  <MaterialCommunityIcons name="star-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.matchBadgeText}>
                    {result.primaryRecommendation.confidence}% {isHi ? 'मैच' : 'MATCH'}
                  </Text>
                </View>
                <View style={styles.seasonBadge}>
                  <Text style={styles.seasonBadgeText}>{result.primaryRecommendation.season}</Text>
                </View>
              </View>

              <Text style={styles.heroCropTitle}>
                {isHi
                  ? result.primaryRecommendation.hindi_name
                  : result.primaryRecommendation.crop}
              </Text>
              <Text style={styles.heroCropSubtitle}>
                {result.primaryRecommendation.crop} • {result.primaryRecommendation.category}
              </Text>

              {/* Weather snapshot footer inside hero */}
              <View style={styles.heroWeatherPill}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={16} color="#15803D" />
                <Text style={styles.heroWeatherText}>
                  {isHi ? 'मौसम कारक:' : 'Weather Factored:'} {result.weatherSnapshot.temperature}°C, {result.weatherSnapshot.humidity}% RH, {result.weatherSnapshot.rainfall} mm {isHi ? 'वर्षा' : 'Rain'}
                </Text>
              </View>
            </View>

            {/* NPK Soil Status Breakdown */}
            <View style={styles.sectionHeaderWrap}>
              <MaterialCommunityIcons name="chart-box-outline" size={20} color="#15803D" />
              <Text style={styles.sectionTitle}>
                {isHi ? 'आपकी मिट्टी में पोषक तत्वों का संतुलन' : 'Soil Nutrient Balance Analysis'}
              </Text>
            </View>

            <View style={styles.npkStatusRow}>
              {/* Nitrogen */}
              <View style={styles.npkStatusCard}>
                <Text style={styles.npkCardTitle}>N (Nitrogen)</Text>
                <Text style={styles.npkCardVal}>{result.soilAnalysis.N.value} kg/ha</Text>
                <Text style={styles.npkCardIdeal}>
                  {isHi ? 'आदर्श:' : 'Ideal:'} {result.soilAnalysis.N.ideal}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: result.soilAnalysis.N.color + '20' },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: result.soilAnalysis.N.color }]}>
                    {isHi ? result.soilAnalysis.N.hindi : result.soilAnalysis.N.status}
                  </Text>
                </View>
              </View>

              {/* Phosphorus */}
              <View style={styles.npkStatusCard}>
                <Text style={styles.npkCardTitle}>P (Phosphorus)</Text>
                <Text style={styles.npkCardVal}>{result.soilAnalysis.P.value} kg/ha</Text>
                <Text style={styles.npkCardIdeal}>
                  {isHi ? 'आदर्श:' : 'Ideal:'} {result.soilAnalysis.P.ideal}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: result.soilAnalysis.P.color + '20' },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: result.soilAnalysis.P.color }]}>
                    {isHi ? result.soilAnalysis.P.hindi : result.soilAnalysis.P.status}
                  </Text>
                </View>
              </View>

              {/* Potassium */}
              <View style={styles.npkStatusCard}>
                <Text style={styles.npkCardTitle}>K (Potassium)</Text>
                <Text style={styles.npkCardVal}>{result.soilAnalysis.K.value} kg/ha</Text>
                <Text style={styles.npkCardIdeal}>
                  {isHi ? 'आदर्श:' : 'Ideal:'} {result.soilAnalysis.K.ideal}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: result.soilAnalysis.K.color + '20' },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: result.soilAnalysis.K.color }]}>
                    {isHi ? result.soilAnalysis.K.hindi : result.soilAnalysis.K.status}
                  </Text>
                </View>
              </View>
            </View>

            {/* pH Advisory */}
            <View style={styles.phCard}>
              <View style={styles.phHeader}>
                <MaterialCommunityIcons name="test-tube" size={20} color="#7C3AED" />
                <Text style={styles.phTitle}>
                  {isHi ? 'मृदा pH विश्लेषण:' : 'Soil pH Health:'} {result.soilAnalysis.ph.value} (
                  {result.soilAnalysis.ph.type})
                </Text>
              </View>
              <Text style={styles.phAdviceText}>{result.soilAnalysis.ph.advice}</Text>
            </View>

            {/* Custom Fertilizer Dosage Schedule */}
            <View style={styles.sectionHeaderWrap}>
              <MaterialCommunityIcons name="shape-polygon-plus" size={20} color="#15803D" />
              <Text style={styles.sectionTitle}>
                {isHi ? 'विशिष्ट खाद खुराक योजना (Fertilizer Plan)' : 'Custom Fertilizer Dosage Plan'}
              </Text>
            </View>

            <View style={styles.fertilizerList}>
              {result.customFertilizerPlan.map((f, i) => (
                <View key={i} style={styles.fertItemCard}>
                  <View style={styles.fertItemHeader}>
                    <Text style={styles.fertNutrientBadge}>{f.nutrient}</Text>
                    <Text style={styles.fertName}>{f.fertilizer}</Text>
                  </View>
                  <Text style={styles.fertDosage}>
                    <Text style={{ fontWeight: '700' }}>{isHi ? 'मात्रा:' : 'Dose:'} </Text>
                    {f.dosage}
                  </Text>
                  <Text style={styles.fertReason}>{f.reason}</Text>
                </View>
              ))}
            </View>

            {/* Organic & Irrigation Recommendation */}
            <Card style={styles.organicCard}>
              <View style={styles.organicRow}>
                <MaterialCommunityIcons name="leaf" size={22} color="#15803D" />
                <View style={styles.organicTextWrap}>
                  <Text style={styles.organicTitle}>
                    {isHi ? 'जैविक खाद एवं सूक्ष्मजीव' : 'Organic & Bio-fertilizer'}
                  </Text>
                  <Text style={styles.organicDesc}>
                    {result.primaryRecommendation.organic ||
                      'FYM 4-5 tonnes/acre + Azotobacter / PSB seed treatment.'}
                  </Text>
                </View>
              </View>

              {result.primaryRecommendation.irrigation_advisory ? (
                <View style={[styles.organicRow, { marginTop: 14 }]}>
                  <MaterialCommunityIcons name="water" size={22} color="#0284C7" />
                  <View style={styles.organicTextWrap}>
                    <Text style={styles.organicTitle}>
                      {isHi ? 'सिंचाई सलाह' : 'Irrigation Advice'}
                    </Text>
                    <Text style={styles.organicDesc}>
                      {result.primaryRecommendation.irrigation_advisory}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Card>

            {/* Top Alternative Crops */}
            {result.topRecommendations && result.topRecommendations.length > 1 && (
              <View style={styles.altSection}>
                <Text style={styles.altSectionTitle}>
                  {isHi ? 'अन्य उपयुक्त विकल्प (Alternative Crops):' : 'Other Suitable Crops:'}
                </Text>
                {result.topRecommendations.slice(1).map((alt, idx) => (
                  <View key={idx} style={styles.altCropCard}>
                    <View style={styles.altLeft}>
                      <Text style={styles.altCropName}>
                        {isHi ? alt.hindi_name : alt.crop} ({alt.crop})
                      </Text>
                      <Text style={styles.altCropMeta}>
                        {alt.category} • {alt.season}
                      </Text>
                    </View>
                    <View style={styles.altConfBadge}>
                      <Text style={styles.altConfText}>{alt.confidence}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  reloadBtn: {
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  scroll: {
    padding: 16,
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  weatherMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  weatherMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#CBD5E1',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  weatherHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 16,
  },
  presetsWrap: {
    marginBottom: 16,
  },
  presetsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputUnit: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rainfallToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: '#15803D',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  customRainWrap: {
    marginBottom: 14,
  },
  predictBtn: {
    marginTop: 8,
  },
  resultsContainer: {
    marginTop: 8,
  },
  heroResultCard: {
    backgroundColor: '#15803D',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#15803D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seasonBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroCropTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  heroCropSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
    marginTop: 2,
    marginBottom: 12,
  },
  heroWeatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  heroWeatherText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  npkStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  npkStatusCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  npkCardTitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  npkCardVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  npkCardIdeal: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  phCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 20,
  },
  phHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  phTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
  },
  phAdviceText: {
    fontSize: 12,
    color: '#581C87',
    lineHeight: 18,
  },
  fertilizerList: {
    gap: 10,
    marginBottom: 20,
  },
  fertItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fertItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  fertNutrientBadge: {
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fertName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  fertDosage: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  fertReason: {
    fontSize: 11,
    color: '#6B7280',
  },
  organicCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  organicRow: {
    flexDirection: 'row',
    gap: 12,
  },
  organicTextWrap: {
    flex: 1,
  },
  organicTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  organicDesc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  altSection: {
    marginBottom: 16,
  },
  altSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  altCropCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  altLeft: {
    flex: 1,
  },
  altCropName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  altCropMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  altConfBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  altConfText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
});
