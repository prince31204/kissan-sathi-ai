import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { MockWeather } from '../../services/mockData';
import * as Location from 'expo-location';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitchButton } from '../../components/LanguageSwitchButton';

import { getUnifiedWeather, UnifiedWeatherData } from '../../services/weatherService';
import {
  getSyntheticCropAdvisory,
  SyntheticCropRecommendation,
} from '../../services/syntheticCropService';

export default function WeatherScreen() {
  const { t } = useLanguage();
  const [weather, setWeather] = useState(MockWeather);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Uttarakhand');
  const [highTemp, setHighTemp] = useState(22);
  const [lowTemp, setLowTemp] = useState(12);
  const [weatherSource, setWeatherSource] = useState('OpenWeatherMap (Official API Key)');
  const [isLive, setIsLive] = useState(true);
  const [currentCoords, setCurrentCoords] = useState({ lat: 30.3165, lon: 78.0322 });

  // Synthetic Crop State
  const [syntheticCrops, setSyntheticCrops] = useState<SyntheticCropRecommendation[]>([]);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<'Rabi' | 'Kharif'>('Rabi');
  const [activeCropIndex, setActiveCropIndex] = useState(0);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const loadSyntheticCrops = async (
    lat: number,
    lon: number,
    temp?: number,
    rain?: number,
    season = selectedSeason
  ) => {
    setLoadingCrops(true);
    try {
      const res = await getSyntheticCropAdvisory(lat, lon, temp, rain, season);
      if (res && res.recommendations && res.recommendations.length > 0) {
        setSyntheticCrops(res.recommendations);
        setActiveCropIndex(0);
      }
    } catch (e) {
      console.warn('Failed to load synthetic crops:', e);
    } finally {
      setLoadingCrops(false);
    }
  };

  const handleSeasonChange = (season: 'Rabi' | 'Kharif') => {
    setSelectedSeason(season);
    loadSyntheticCrops(
      currentCoords.lat,
      currentCoords.lon,
      weather.current.temp,
      undefined,
      season
    );
  };

  const fetchWeather = async () => {
    try {
      let lat = 30.3165;
      let lon = 78.0322;

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = location.coords.latitude;
          lon = location.coords.longitude;

          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
              { headers: { 'User-Agent': 'KisanSaathi/1.0' } }
            );
            const geoData = await geoRes.json();
            const cityObj =
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.village ||
              geoData.address?.state;
            if (cityObj) setCity(cityObj);
          } catch (e) {}
        }
      } catch (locErr) {
        console.warn('Location permission / fetch warning:', locErr);
      }

      // Fetch live verified weather using OpenWeatherMap API Key
      const liveData = await getUnifiedWeather(lat, lon);

      if (liveData) {
        if (liveData.cityName && liveData.cityName !== 'Uttarakhand') {
          setCity(liveData.cityName);
        }
        setHighTemp(liveData.tempMax);
        setLowTemp(liveData.tempMin);
        setWeatherSource(liveData.source);
        setIsLive(liveData.isLive);

        setWeather({
          current: {
            temp: liveData.temperature,
            condition: liveData.condition,
            humidity: liveData.humidity,
            wind: liveData.windText,
            rainProb: liveData.rainProbability,
          },
          alerts: [],
          forecast: liveData.forecast.length ? liveData.forecast : MockWeather.forecast,
        });

        setCurrentCoords({ lat, lon });
        loadSyntheticCrops(lat, lon, liveData.temperature, liveData.precipitationMm, selectedSeason);
      }
    } catch (error) {
      console.warn('Weather fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (cond: string) => {
    if (cond === 'Clear Sky' || cond === 'Sunny') return 'weather-sunny';
    if (cond.includes('Rain') || cond.includes('Drizzle')) return 'weather-rainy';
    if (cond.includes('Cloud')) return 'weather-partly-cloudy';
    if (cond.includes('Fog') || cond.includes('Mist')) return 'weather-fog';
    if (cond.includes('Storm')) return 'weather-lightning';
    return 'weather-partly-cloudy';
  };

  const getWeatherIconColor = (cond: string) => {
    if (cond === 'Clear Sky' || cond === 'Sunny') return '#F59E0B';
    if (cond.includes('Rain') || cond.includes('Drizzle')) return '#3B82F6';
    if (cond.includes('Storm')) return '#8B5CF6';
    return '#F59E0B';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar matching Mockup Screen 4 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weather Update</Text>
        <LanguageSwitchButton />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Theme.Colors.primary} />
          <Text style={{ marginTop: 14, color: '#64748B' }}>Loading Live Weather...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Location Dropdown Card matching Screen 4 */}
          <View style={styles.locationCard}>
            <View style={styles.locationLeft}>
              <MaterialCommunityIcons name="map-marker" size={20} color={Theme.Colors.primary} />
              <Text style={styles.locationText}>{city}</Text>
            </View>
            <View style={styles.verifiedBadgeContainer}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedBadgeText}>
                {weatherSource.includes('OpenWeatherMap') ? 'OWM Verified' : 'Live Data'}
              </Text>
            </View>
          </View>

          {/* Big Hero Weather Card matching Screen 4 */}
          <Card style={styles.heroWeatherCard}>
            <View style={styles.heroWeatherIconCircle}>
              <MaterialCommunityIcons
                name={getWeatherIcon(weather.current.condition) as any}
                size={74}
                color={getWeatherIconColor(weather.current.condition)}
              />
            </View>
            <Text style={styles.heroTemp}>{weather.current.temp}°C</Text>
            <Text style={styles.heroCondition}>{weather.current.condition}</Text>
            <Text style={styles.heroHighLow}>
              H: {highTemp}°  L: {lowTemp}°
            </Text>
            <Text style={styles.heroSourceText}>Source: {weatherSource}</Text>
          </Card>

          {/* 3 Stat Pill Cards matching Screen 4 */}
          <View style={styles.statsRow}>
            {/* Humidity */}
            <View style={styles.statPillCard}>
              <MaterialCommunityIcons name="water-outline" size={24} color="#0284C7" />
              <Text style={styles.statLabel}>Humidity</Text>
              <Text style={styles.statValue}>{weather.current.humidity}%</Text>
            </View>

            {/* Wind Speed */}
            <View style={styles.statPillCard}>
              <MaterialCommunityIcons name="weather-windy" size={24} color="#0F766E" />
              <Text style={styles.statLabel}>Wind Speed</Text>
              <Text style={styles.statValue}>{weather.current.wind}</Text>
            </View>

            {/* Rain Chance */}
            <View style={styles.statPillCard}>
              <MaterialCommunityIcons name="umbrella-outline" size={24} color="#2563EB" />
              <Text style={styles.statLabel}>Rain Chance</Text>
              <Text style={styles.statValue}>{weather.current.rainProb}%</Text>
            </View>
          </View>

          {/* 5-Day Forecast Card matching Screen 4 */}
          <Card style={styles.forecastCard}>
            <Text style={styles.forecastTitle}>5 Day Forecast</Text>
            {weather.forecast.map((item: any, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.forecastRow,
                  idx === weather.forecast.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.forecastDay}>{item.day}</Text>
                <MaterialCommunityIcons
                  name={getWeatherIcon(item.condition) as any}
                  size={24}
                  color={getWeatherIconColor(item.condition)}
                />
                <Text style={styles.forecastTemps}>
                  {item.max || item.temp}° / {item.min || (item.temp - 6)}°
                </Text>
              </View>
            ))}
          </Card>

          {/* 🌾 Synthetic Crop & Variety Prediction Section */}
          <View style={styles.syntheticSection}>
            <View style={styles.syntheticSectionHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="sprout" size={22} color="#15803D" />
                  <Text style={styles.syntheticTitle}>Weather Synthetic Crop Advisory</Text>
                </View>
                <Text style={styles.syntheticSubtitle}>
                  Trained on synthetic_crop_varieties.csv based on {weather.current.temp}°C
                </Text>
              </View>
              <View style={styles.mlBadge}>
                <Text style={styles.mlBadgeText}>ML Model</Text>
              </View>
            </View>

            {/* Season Filter Selector */}
            <View style={styles.seasonRow}>
              {(['Rabi', 'Kharif'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.seasonChip, selectedSeason === s && styles.seasonChipActive]}
                  onPress={() => handleSeasonChange(s)}
                >
                  <MaterialCommunityIcons
                    name={s === 'Rabi' ? 'snowflake' : 'weather-rainy'}
                    size={15}
                    color={selectedSeason === s ? '#FFFFFF' : '#475569'}
                  />
                  <Text style={[styles.seasonChipText, selectedSeason === s && styles.seasonChipTextActive]}>
                    {s === 'Rabi' ? 'Rabi / Winter (सर्दियां)' : 'Kharif / Monsoon (मानसून)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Synthetic Crop Cards */}
            {loadingCrops ? (
              <View style={styles.cropsLoading}>
                <ActivityIndicator size="small" color="#15803D" />
                <Text style={styles.cropsLoadingText}>Predicting optimal crop & variety...</Text>
              </View>
            ) : syntheticCrops.length > 0 ? (
              <>
                {/* Primary Recommended Card */}
                {syntheticCrops[activeCropIndex] && (
                  <Card style={styles.heroCropCard}>
                    <View style={styles.heroCropHeader}>
                      <View style={[styles.cropIconBox, { backgroundColor: `${syntheticCrops[activeCropIndex].color}18` }]}>
                        <MaterialCommunityIcons
                          name={syntheticCrops[activeCropIndex].icon as any}
                          size={28}
                          color={syntheticCrops[activeCropIndex].color}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.heroCropName}>
                            {syntheticCrops[activeCropIndex].crop} ({syntheticCrops[activeCropIndex].hindi_name})
                          </Text>
                          <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceText}>
                              {syntheticCrops[activeCropIndex].confidence}% Match
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.heroCropSeason}>
                          {syntheticCrops[activeCropIndex].season} Season · {syntheticCrops[activeCropIndex].growth_stage.split('(')[0]}
                        </Text>
                      </View>
                    </View>

                    {/* Highlighted Variety Banner */}
                    <View style={styles.varietyBanner}>
                      <MaterialCommunityIcons name="star-circle" size={22} color="#D97706" />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.varietyLabel}>Predicted Optimal Variety (अनुशंसित किस्म):</Text>
                        <Text style={styles.varietyValue}>{syntheticCrops[activeCropIndex].variety}</Text>
                      </View>
                      <View style={styles.varietyBadge}>
                        <Text style={styles.varietyBadgeText}>Top Pick</Text>
                      </View>
                    </View>

                    {/* Weather Match Reason */}
                    <Text style={styles.cropReasonText}>
                      💡 {syntheticCrops[activeCropIndex].weather_reason}
                    </Text>

                    {/* Ideal Conditions Grid */}
                    <View style={styles.conditionsRow}>
                      <View style={styles.conditionItem}>
                        <Text style={styles.conditionItemLabel}>Ideal Temp</Text>
                        <Text style={styles.conditionItemVal}>
                          {syntheticCrops[activeCropIndex].temp_range[0]}° - {syntheticCrops[activeCropIndex].temp_range[1]}°C
                        </Text>
                      </View>
                      <View style={styles.conditionDivider} />
                      <View style={styles.conditionItem}>
                        <Text style={styles.conditionItemLabel}>Ideal Rain</Text>
                        <Text style={styles.conditionItemVal}>
                          {syntheticCrops[activeCropIndex].rainfall_range[0]} - {syntheticCrops[activeCropIndex].rainfall_range[1]} mm
                        </Text>
                      </View>
                      <View style={styles.conditionDivider} />
                      <View style={styles.conditionItem}>
                        <Text style={styles.conditionItemLabel}>Soil Moisture</Text>
                        <Text style={styles.conditionItemVal}>
                          {syntheticCrops[activeCropIndex].soil_moisture_range[0]}% - {syntheticCrops[activeCropIndex].soil_moisture_range[1]}%
                        </Text>
                      </View>
                    </View>

                    {/* Alternative Varieties */}
                    {syntheticCrops[activeCropIndex].alternative_varieties?.length > 0 && (
                      <View style={styles.altVarietiesSection}>
                        <Text style={styles.altVarietiesTitle}>Other Suitable Varieties (अन्य किस्में):</Text>
                        <View style={styles.altVarietiesChips}>
                          {syntheticCrops[activeCropIndex].alternative_varieties.map((v, idx) => (
                            <View key={idx} style={styles.altChip}>
                              <Text style={styles.altChipText}>{v}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </Card>
                )}

                {/* Horizontal Selector Cards for Other Synthetic Crops */}
                <Text style={styles.otherCropsTitle}>Other Compatible Crops for this Weather:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropSelectorScroll}>
                  {syntheticCrops.map((c, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.cropMiniCard, activeCropIndex === idx && styles.cropMiniCardActive]}
                      onPress={() => setActiveCropIndex(idx)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={c.icon as any}
                        size={24}
                        color={activeCropIndex === idx ? '#15803D' : c.color}
                      />
                      <Text style={[styles.cropMiniName, activeCropIndex === idx && styles.cropMiniNameActive]} numberOfLines={1}>
                        {c.crop}
                      </Text>
                      <Text style={styles.cropMiniVariety} numberOfLines={1}>{c.variety}</Text>
                      <View style={styles.miniMatchBadge}>
                        <Text style={styles.miniMatchText}>{c.confidence}% Match</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 85,
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  heroWeatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroWeatherIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTemp: {
    fontSize: 44,
    fontWeight: '800',
    color: '#111827',
  },
  heroCondition: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  heroHighLow: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statPillCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  forecastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  forecastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forecastDay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    width: 70,
  },
  forecastTemps: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    width: 75,
    textAlign: 'right',
  },
  verifiedBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  heroSourceText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '500',
  },
  // ── Synthetic Crop Styles ──────────────────────────────────────────
  syntheticSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  syntheticSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  syntheticTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  syntheticSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  mlBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  mlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  seasonChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seasonChipActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  seasonChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  seasonChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cropsLoading: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropsLoadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  heroCropCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 14,
  },
  heroCropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cropIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCropName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  heroCropSeason: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  varietyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  varietyLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  varietyValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78350F',
    marginTop: 1,
  },
  varietyBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  varietyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cropReasonText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
    marginBottom: 14,
    fontWeight: '500',
  },
  conditionsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  conditionItem: {
    flex: 1,
    alignItems: 'center',
  },
  conditionItemLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  conditionItemVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  conditionDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  altVarietiesSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  altVarietiesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  altVarietiesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  altChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  altChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  otherCropsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 4,
  },
  cropSelectorScroll: {
    marginBottom: 16,
  },
  cropMiniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 10,
    alignItems: 'center',
    width: 115,
  },
  cropMiniCardActive: {
    borderColor: '#15803D',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  cropMiniName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
    textAlign: 'center',
  },
  cropMiniNameActive: {
    color: '#15803D',
  },
  cropMiniVariety: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  miniMatchBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  miniMatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
});
