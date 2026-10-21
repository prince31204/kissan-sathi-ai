import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Theme } from '../../constants/Theme';
import { Card } from '../../components/Card';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { MockUser, MockWeather, MockFields, MockIrrigationPlans } from '../../services/mockData';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitchButton } from '../../components/LanguageSwitchButton';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 40 - 24) / 3; // 3 columns with padding & gap

export default function HomeDashboard() {
  const { t, language } = useLanguage();
  const [userName, setUserName] = useState(MockUser.name);
  const [userLocation, setUserLocation] = useState(`${MockUser.village}, ${MockUser.district}`);
  const [mandiPrices, setMandiPrices] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [liveWeather, setLiveWeather] = useState({
    temp: MockWeather.current.temp,
    condition: MockWeather.current.condition,
    humidity: MockWeather.current.humidity,
    isLive: false,
  });
  const [latestIrrigation, setLatestIrrigation] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) setUserName(storedName);

        const storedHistory = await AsyncStorage.getItem('@irrigation_history');
        if (storedHistory) {
          const list = JSON.parse(storedHistory);
          if (list && list.length > 0) {
            setLatestIrrigation(list[0]);
          }
        }
      } catch (e) {
        console.error('Failed to load user name or irrigation history', e);
      }
    };
    loadData();

    // Fetch Live Dynamic Weather
    const fetchLiveWeather = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = 30.3165;
        let lon = 78.0322;
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;

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
                geoData.address?.county;
              const state = geoData.address?.state;
              if (city) setUserLocation(`${city}, ${state || 'Uttarakhand'}`);
            }
          } catch (e) {}
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const code = data.current?.weather_code ?? 0;
          let cond = 'Clear Sky';
          if ([1, 2, 3].includes(code)) cond = 'Partly Cloudy';
          else if ([45, 48].includes(code)) cond = 'Foggy';
          else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) cond = 'Rainy';
          else if ([95, 96, 99].includes(code)) cond = 'Thunderstorm';

          setLiveWeather({
            temp: Math.round(data.current?.temperature_2m ?? 24),
            humidity: Math.round(data.current?.relative_humidity_2m ?? 65),
            condition: cond,
            isLive: true,
          });
        }
      } catch (err) {
        console.warn('Live weather fetch error on dashboard:', err);
      }
    };
    fetchLiveWeather();

    // Fetch real mandi prices
    const fetchMandiPrices = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/mandi-prices?commodity=wheat');
        if (res.ok) {
          const data = await res.json();
          const formatted = data.slice(0, 5).map((item: any, index: number) => ({
            id: index.toString(),
            crop: item.Commodity,
            price: `₹${item.Modal_Price}`,
            unit: 'per quintal',
            trend: '+1.5%',
            market: item.Market_Name || item['Market Name'] || 'Dehradun',
            state: item.STATE || 'Uttarakhand',
          }));
          setMandiPrices(formatted);
        } else {
          // Fallback mock prices matching the mockup
          setMandiPrices([
            { id: '1', crop: 'Wheat', price: '₹ 2,150', unit: '/ quintal', trend: '+2.5%', market: 'Dehradun' },
            { id: '2', crop: 'Rice', price: '₹ 2,800', unit: '/ quintal', trend: '+1.2%', market: 'Haridwar' },
            { id: '3', crop: 'Maize', price: '₹ 1,850', unit: '/ quintal', trend: '+0.8%', market: 'Rishikesh' },
            { id: '4', crop: 'Mustard', price: '₹ 5,200', unit: '/ quintal', trend: '+1.5%', market: 'Kashipur' },
          ]);
        }
      } catch (e) {
        setMandiPrices([
          { id: '1', crop: 'Wheat', price: '₹ 2,150', unit: '/ quintal', trend: '+2.5%', market: 'Dehradun' },
          { id: '2', crop: 'Rice', price: '₹ 2,800', unit: '/ quintal', trend: '+1.2%', market: 'Haridwar' },
          { id: '3', crop: 'Maize', price: '₹ 1,850', unit: '/ quintal', trend: '+0.8%', market: 'Rishikesh' },
          { id: '4', crop: 'Mustard', price: '₹ 5,200', unit: '/ quintal', trend: '+1.5%', market: 'Kashipur' },
        ]);
      } finally {
        setLoadingPrices(false);
      }
    };
    fetchMandiPrices();
  }, []);

  // Quick Action Grid matching Mockup Screen 3
  const QUICK_ACTIONS = [
    {
      id: 'weather',
      title: 'Weather\nUpdate',
      icon: 'weather-partly-cloudy',
      color: '#2563EB',
      bgColor: '#EFF6FF',
      route: '/weather',
    },
    {
      id: 'soil',
      title: 'Soil\nHealth',
      icon: 'sprout',
      color: '#16A34A',
      bgColor: '#F0FDF4',
      route: '/crop-health',
    },
    {
      id: 'advisory',
      title: 'Crop\nAdvisory',
      icon: 'leaf',
      color: '#15803D',
      bgColor: '#DCFCE7',
      route: '/crop-recommend',
    },
    {
      id: 'market',
      title: 'Market\nPrices',
      icon: 'currency-inr',
      color: '#D97706',
      bgColor: '#FEF3C7',
      route: '/mandi-prices',
    },
    {
      id: 'irrigation',
      title: 'Irrigation\nGuide',
      icon: 'water-outline',
      color: '#0284C7',
      bgColor: '#E0F2FE',
      route: '/(tabs)/irrigation',
    },
    {
      id: 'schemes',
      title: 'Government\nSchemes',
      icon: 'bank-outline',
      color: '#0F766E',
      bgColor: '#CCFBF1',
      route: '/(tabs)/equipment',
    },
  ];

  const primaryField = MockFields[0];
  const nextIrrigation = MockIrrigationPlans[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top Header Bar matching Mockup Screen 3 */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.userText}>
              <Text style={styles.userName}>Hello, {userName}</Text>
              <Text style={styles.userSub}>Welcome to Kisan Saathi</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.voiceHeaderBtn}
              onPress={() => router.push('/voice-assistant')}
              accessibilityLabel="Voice Assistant"
            >
              <MaterialCommunityIcons name="microphone" size={22} color="#16A34A" />
            </TouchableOpacity>
            <LanguageSwitchButton variant="glass" />
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => router.push('/notifications')}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color="#111827" />
              <View style={styles.badge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Signature Deep Green Banner Card (Your Farm + Weather) */}
        <TouchableOpacity
          style={styles.bannerCard}
          activeOpacity={0.9}
          onPress={() => router.push('/weather')}
        >
          {/* Left Farm Info */}
          <View style={styles.bannerLeft}>
            <View style={styles.bannerIconCircle}>
              <MaterialCommunityIcons name="tractor" size={22} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.bannerLabel}>Your Farm</Text>
              <Text style={styles.bannerValue}>2.5 Acres</Text>
              <Text style={styles.bannerSubLocation}>{userLocation.split(',')[0] || 'Uttarakhand'}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.bannerDivider} />

          {/* Right Weather Info */}
          <View style={styles.bannerRight}>
            <MaterialCommunityIcons
              name={
                liveWeather.condition === 'Rainy'
                  ? 'weather-rainy'
                  : liveWeather.condition === 'Clear Sky'
                  ? 'weather-sunny'
                  : 'weather-partly-cloudy'
              }
              size={36}
              color="#FDE047"
            />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.bannerTemp}>{liveWeather.temp}°C</Text>
              <Text style={styles.bannerCondition}>{liveWeather.condition}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* AI Assistants: Voice Assistant (बोलकर पूछें) + AI Chatbot */}
        <View style={styles.aiAssistantsSection}>
          <TouchableOpacity
            style={styles.voiceCard}
            activeOpacity={0.88}
            onPress={() => router.push('/voice-assistant')}
          >
            <View style={styles.voiceCardIcon}>
              <MaterialCommunityIcons name="microphone" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.aiTitle}>बोलकर पूछें</Text>
                <View style={styles.voiceBadge}>
                  <Text style={styles.voiceBadgeText}>Voice AI</Text>
                </View>
              </View>
              <Text style={styles.aiSubtitle}>खेती के सवाल बोलकर पूछें</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#15803D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatCard}
            activeOpacity={0.88}
            onPress={() => router.push('/chat')}
          >
            <View style={styles.chatCardIcon}>
              <MaterialCommunityIcons name="robot" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.aiTitle}>किसान साथी चैट</Text>
              <Text style={styles.aiSubtitle}>Google Gemini AI चैटबॉट</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#0284C7" />
          </TouchableOpacity>
        </View>

        {/* 6-Grid Quick Actions matching Mockup Screen 3 */}
        <View style={styles.gridSection}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.gridCard, { width: GRID_ITEM_WIDTH }]}
              activeOpacity={0.8}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.gridIconCircle, { backgroundColor: action.bgColor }]}>
                <MaterialCommunityIcons
                  name={action.icon as any}
                  size={26}
                  color={action.color}
                />
              </View>
              <Text style={styles.gridCardTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Promo / Advisory Banner: "Healthy Soil Better Yield" */}
        <TouchableOpacity
          style={styles.promoBanner}
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/crop-health')}
        >
          <View style={styles.promoLeft}>
            <Text style={styles.promoTitle}>Healthy Soil</Text>
            <Text style={styles.promoSubTitle}>Better Yield</Text>
            <Text style={styles.promoDesc}>
              Get soil health reports and expert advice.
            </Text>
            <View style={styles.promoPill}>
              <Text style={styles.promoPillText}>View Details →</Text>
            </View>
          </View>
          <View style={styles.promoRight}>
            <View style={styles.sproutBadgeLarge}>
              <MaterialCommunityIcons name="sprout" size={44} color="#15803D" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Market Prices Live Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Market Prices</Text>
          <TouchableOpacity onPress={() => router.push('/mandi-prices')}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mandiScroll}
        >
          {mandiPrices.map((mandi) => (
            <Card key={mandi.id} style={styles.mandiCard}>
              <View style={styles.mandiHeader}>
                <Text style={styles.mandiCrop}>{mandi.crop}</Text>
                <View style={styles.trendPill}>
                  <Text style={styles.trendPillText}>↑ {mandi.trend}</Text>
                </View>
              </View>
              <Text style={styles.mandiPrice}>{mandi.price}</Text>
              <Text style={styles.mandiUnit}>{mandi.unit}</Text>
              <View style={styles.mandiLocationRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={13} color="#64748B" />
                <Text style={styles.mandiLocationText}>{mandi.market}</Text>
              </View>
            </Card>
          ))}
        </ScrollView>

        {/* Smart Irrigation Planner Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Irrigation Guide</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/irrigation')}>
            <Text style={styles.seeAllText}>Planner →</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.summaryCard}>
          <View style={styles.irrigationRow}>
            <View style={styles.irrigationIconCircle}>
              <MaterialCommunityIcons name="water" size={24} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.summaryTitle}>
                {latestIrrigation ? latestIrrigation.field : `${nextIrrigation.crop} Field`}
              </Text>
              <Text style={styles.summarySub}>
                Next Window: <Text style={styles.highlight}>{latestIrrigation ? latestIrrigation.window : nextIrrigation.recommendedDate}</Text>
              </Text>
            </View>
            <StatusBadge
              status="success"
              label={latestIrrigation ? latestIrrigation.urgency || 'Optimal' : 'Optimal'}
            />
          </View>
          <View style={styles.irrigationMetrics}>
            <Text style={styles.metricText}>
              Water: <Text style={{ fontWeight: '700', color: '#0369A1' }}>{latestIrrigation ? latestIrrigation.water : '12,500 L/acre'}</Text>
            </Text>
            <Text style={styles.metricText}>
              Duration: <Text style={{ fontWeight: '700', color: '#0369A1' }}>{latestIrrigation ? latestIrrigation.duration : '45 mins'}</Text>
            </Text>
          </View>
        </Card>

        {/* AI & Sustainability Shortcuts */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Smart AI Farm Tools</Text>
        </View>

        <View style={styles.dualActionsRow}>
          <TouchableOpacity
            style={styles.dualActionCard}
            activeOpacity={0.85}
            onPress={() => router.push('/carbon-emission')}
          >
            <View style={[styles.dualIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MaterialCommunityIcons name="molecule-co2" size={24} color="#059669" />
            </View>
            <Text style={styles.dualTitle}>Carbon Footprint</Text>
            <Text style={styles.dualDesc}>Track diesel & eco savings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dualActionCard}
            activeOpacity={0.85}
            onPress={() => router.push('/waste-management')}
          >
            <View style={[styles.dualIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="recycle" size={24} color="#D97706" />
            </View>
            <Text style={styles.dualTitle}>Waste to Wealth</Text>
            <Text style={styles.dualDesc}>Earn from crop residue</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Floating Action Button for Voice Assistant */}
      <TouchableOpacity
        style={styles.floatingVoiceBtn}
        onPress={() => router.push('/voice-assistant')}
        activeOpacity={0.88}
        accessibilityLabel="Voice Assistant"
      >
        <View style={styles.floatingVoiceInner}>
          <MaterialCommunityIcons name="microphone" size={24} color="#FFFFFF" />
          <Text style={styles.floatingVoiceText}>बोलकर पूछें</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userText: {
    marginLeft: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#15803D',
  },
  // AI Assistants Section
  aiAssistantsSection: {
    gap: 10,
    marginBottom: 20,
  },
  voiceCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chatCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chatCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  voiceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  voiceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  // Floating Action Button
  floatingVoiceBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 24 : 16,
    right: 18,
    zIndex: 9999,
  },
  floatingVoiceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  floatingVoiceText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  // Deep Green Banner Card
  bannerCard: {
    backgroundColor: Theme.Colors.primary,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#136B36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  bannerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 1,
  },
  bannerSubLocation: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  bannerDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginHorizontal: 12,
  },
  bannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTemp: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerCondition: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },

  // 6-Grid Section
  gridSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  gridIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Promo Banner
  promoBanner: {
    backgroundColor: '#0D4E26',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    shadowColor: '#0D4E26',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  promoLeft: {
    flex: 1,
    paddingRight: 10,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  promoSubTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#86EFAC',
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
    marginBottom: 12,
  },
  promoPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  promoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D4E26',
  },
  promoRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sproutBadgeLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 13,
    color: Theme.Colors.primary,
    fontWeight: '600',
  },

  // Mandi Scroll
  mandiScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginBottom: 22,
  },
  mandiCard: {
    width: 154,
    marginRight: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mandiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mandiCrop: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  trendPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  mandiPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  mandiUnit: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  mandiLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  mandiLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 3,
  },

  // Summary Card
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 22,
  },
  irrigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  irrigationIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  summarySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  highlight: {
    color: Theme.Colors.primary,
    fontWeight: '600',
  },
  irrigationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 12,
    paddingTop: 10,
  },
  metricText: {
    fontSize: 13,
    color: '#64748B',
  },

  // Dual Action Cards
  dualActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  dualActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dualIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dualTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  dualDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
