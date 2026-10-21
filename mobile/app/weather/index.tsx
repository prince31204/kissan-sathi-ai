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

export default function WeatherScreen() {
  const { t } = useLanguage();
  const [weather, setWeather] = useState(MockWeather);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('Uttarakhand');
  const [highTemp, setHighTemp] = useState(22);
  const [lowTemp, setLowTemp] = useState(12);

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

  const fetchWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 30.3165;
      let lon = 78.0322;

      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
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

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();

        const getWeatherCondition = (code: number) => {
          if (code === 0) return 'Clear Sky';
          if ([1, 2, 3].includes(code)) return 'Partly Cloudy';
          if ([45, 48].includes(code)) return 'Foggy';
          if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'Rainy';
          if ([71, 73, 75, 85, 86].includes(code)) return 'Snowy';
          if ([95, 96, 99].includes(code)) return 'Storm';
          return 'Partly Cloudy';
        };

        const dailyForecasts = (data.daily?.time || []).slice(0, 5).map((timeStr: string, index: number) => {
          const date = new Date(timeStr);
          const day = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
          const max = Math.round(data.daily.temperature_2m_max[index] ?? 20);
          const min = Math.round(data.daily.temperature_2m_min[index] ?? 12);
          const code = data.daily.weather_code[index] ?? 1;
          return {
            day,
            max,
            min,
            condition: getWeatherCondition(code),
          };
        });

        const currentTemp = Math.round(data.current?.temperature_2m ?? 18);
        const currentWind = Math.round(data.current?.wind_speed_10m ?? 12);
        const rainProb = data.daily?.precipitation_probability_max?.[0] ?? 20;
        const currentConditionStr = getWeatherCondition(data.current?.weather_code ?? 1);

        setHighTemp(Math.round(data.daily?.temperature_2m_max?.[0] ?? currentTemp + 4));
        setLowTemp(Math.round(data.daily?.temperature_2m_min?.[0] ?? currentTemp - 6));

        setWeather({
          current: {
            temp: currentTemp,
            condition: currentConditionStr,
            humidity: data.current?.relative_humidity_2m ?? 68,
            wind: `${currentWind} km/h`,
            rainProb: rainProb,
          },
          alerts: [],
          forecast: dailyForecasts,
        });
      }
    } catch (error) {
      console.warn('Weather fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (cond: string) => {
    if (cond === 'Clear Sky' || cond === 'Sunny') return 'weather-sunny';
    if (cond.includes('Rain')) return 'weather-rainy';
    if (cond.includes('Cloud')) return 'weather-partly-cloudy';
    if (cond.includes('Fog')) return 'weather-fog';
    return 'weather-partly-cloudy';
  };

  const getWeatherIconColor = (cond: string) => {
    if (cond === 'Clear Sky' || cond === 'Sunny') return '#F59E0B';
    if (cond.includes('Rain')) return '#3B82F6';
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
            <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
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
    paddingBottom: 30,
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
});
