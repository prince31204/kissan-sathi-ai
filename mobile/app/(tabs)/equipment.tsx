import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../../constants/Theme';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitchButton } from '../../components/LanguageSwitchButton';
import { BACKEND_URL } from '@/config/api';

const INITIAL_SCHEMES = [
  {
    _id: 'default_1',
    title: 'PM-KISAN Samman Nidhi',
    category: 'Central',
    subtitle: 'Income support to farmers',
    benefit: '₹6,000 / year in 3 installments',
    icon: 'bank',
    iconColor: '#0F766E',
    iconBg: '#CCFBF1',
    url: 'https://pmkisan.gov.in/',
  },
  {
    _id: 'default_2',
    title: 'Pradhan Mantri Fasal Bima Yojana',
    category: 'Central',
    subtitle: 'Crop insurance scheme',
    benefit: 'Comprehensive crop loss coverage at minimal premium',
    icon: 'shield-check',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
    url: 'https://pmfby.gov.in/',
  },
  {
    _id: 'default_3',
    title: 'Kisan Credit Card (KCC)',
    category: 'Central',
    subtitle: 'Easy credit for farmers',
    benefit: 'Low-interest loans up to ₹3 Lakh at 4% effective interest',
    icon: 'credit-card-outline',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
    url: 'https://myscheme.gov.in/schemes/kcc',
  },
  {
    _id: 'default_4',
    title: 'PM Krishi Sinchayee Yojana (PMKSY)',
    category: 'Central',
    subtitle: 'Har Khet Ko Pani & Per Drop More Crop',
    benefit: 'Up to 55% subsidy for modern drip & sprinkler irrigation systems',
    icon: 'water-pump',
    iconColor: '#0284C7',
    iconBg: '#E0F2FE',
    url: 'https://pmksy.gov.in/',
  },
];

export default function SchemesAndEquipment() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'schemes' | 'equipment'>('schemes');
  const [schemeFilter, setSchemeFilter] = useState<'All' | 'Central' | 'State'>('All');
  const [search, setSearch] = useState('');
  const [schemes, setSchemes] = useState<any[]>(INITIAL_SCHEMES);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const BASE_URL = BACKEND_URL;

  useEffect(() => {
    checkAdmin();
    loadAllData();
  }, []);

  const checkAdmin = async () => {
    const role = await AsyncStorage.getItem('userRole');
    if (role === 'admin') setIsAdmin(true);
  };

  const loadAllData = async () => {
    await Promise.all([fetchSchemes(), fetchEquipment()]);
    setLoading(false);
  };

  const fetchSchemes = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/schemes`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setSchemes(data);
        }
      }
    } catch (e) {
      console.warn('Could not load live schemes from backend, using defaults.');
    }
  };

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/equipment`);
      if (res.ok) {
        const data = await res.json();
        setEquipmentList(data);
      }
    } catch (e) {
      console.warn('Could not load equipment from backend.');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  const filteredSchemes = schemes.filter((scheme) => {
    if (schemeFilter === 'All') return true;
    return scheme.category === schemeFilter;
  });

  const filteredEquipment = equipmentList.filter((item: any) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>
            {activeTab === 'schemes' ? 'Government Schemes' : 'Rent Equipment'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {activeTab === 'schemes'
              ? 'Subsidies, Insurance & Financial Support'
              : 'Affordable Farm Machinery on Rent'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <LanguageSwitchButton />
          {isAdmin && (
            <TouchableOpacity
              onPress={() =>
                activeTab === 'schemes'
                  ? router.push('/admin/add-scheme')
                  : router.push('/admin/add-equipment')
              }
              style={styles.addBtn}
            >
              <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented Top Toggle (Schemes vs Rent Equipment) */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'schemes' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('schemes')}
        >
          <MaterialCommunityIcons
            name="bank-outline"
            size={18}
            color={activeTab === 'schemes' ? '#FFFFFF' : '#64748B'}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'schemes' && styles.segmentTextActive,
            ]}
          >
            Schemes ({schemes.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'equipment' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('equipment')}
        >
          <MaterialCommunityIcons
            name="tractor"
            size={18}
            color={activeTab === 'equipment' ? '#FFFFFF' : '#64748B'}
          />
          <Text
            style={[
              styles.segmentText,
              activeTab === 'equipment' && styles.segmentTextActive,
            ]}
          >
            Rent Equipment ({equipmentList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* SCHEMES TAB CONTENT */}
      {activeTab === 'schemes' && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Theme.Colors.primary]}
            />
          }
        >
          {/* Filter Pills [ All ] [ Central ] [ State ] */}
          <View style={styles.filterPillsRow}>
            {(['All', 'Central', 'State'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  schemeFilter === filter && styles.filterPillActive,
                ]}
                onPress={() => setSchemeFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    schemeFilter === filter && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scheme Cards */}
          {loading ? (
            <ActivityIndicator size="large" color={Theme.Colors.primary} style={{ marginTop: 40 }} />
          ) : filteredSchemes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="bank-outline" size={54} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Schemes Found</Text>
              <Text style={styles.emptyDesc}>No schemes listed under {schemeFilter}.</Text>
            </View>
          ) : (
            filteredSchemes.map((scheme) => (
              <Card key={scheme._id} style={styles.schemeCard}>
                <View style={styles.schemeHeader}>
                  <View
                    style={[
                      styles.schemeIconBox,
                      { backgroundColor: scheme.iconBg || '#CCFBF1' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={(scheme.icon as any) || 'bank'}
                      size={28}
                      color={scheme.iconColor || '#0F766E'}
                    />
                  </View>
                  <View style={styles.schemeTextContainer}>
                    <View style={styles.schemeTitleRow}>
                      <Text style={styles.schemeTitle}>{scheme.title}</Text>
                      <View
                        style={[
                          styles.catBadge,
                          scheme.category === 'State' ? styles.catState : styles.catCentral,
                        ]}
                      >
                        <Text
                          style={[
                            styles.catBadgeText,
                            scheme.category === 'State' ? styles.catTextState : styles.catTextCentral,
                          ]}
                        >
                          {scheme.category || 'Central'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.schemeSubtitle}>{scheme.subtitle}</Text>
                    <Text style={styles.schemeBenefit}>💰 {scheme.benefit}</Text>
                    <TouchableOpacity
                      style={styles.viewDetailsRow}
                      onPress={() =>
                        Linking.openURL(scheme.url || 'https://myscheme.gov.in')
                      }
                    >
                      <Text style={styles.viewDetailsText}>View Details →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* RENT EQUIPMENT TAB CONTENT */}
      {activeTab === 'equipment' && (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Theme.Colors.primary]}
            />
          }
        >
          <View style={styles.searchContainer}>
            <Input
              placeholder={t('equipment.searchPlaceholder', 'Search tractors, rotavators...')}
              value={search}
              onChangeText={setSearch}
              icon={<MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Theme.Colors.primary} style={{ marginTop: 40 }} />
          ) : filteredEquipment.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="tractor" size={60} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Equipment Found</Text>
              <Text style={styles.emptyDesc}>Try searching for tractors, harvesters or sprayers.</Text>
            </View>
          ) : (
            filteredEquipment.map((item: any) => (
              <Card key={item._id} style={styles.equipmentCard} noPadding>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.equipImage} />
                ) : (
                  <View style={styles.equipImagePlaceholder}>
                    <MaterialCommunityIcons name="tractor" size={48} color={Theme.Colors.primary} />
                  </View>
                )}
                <View style={styles.equipDetails}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.equipName}>{item.name}</Text>
                    <Text style={styles.equipPrice}>₹{item.price}/day</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-outline" size={16} color="#64748B" />
                    <Text style={styles.infoText}>
                      {item.ownerName} ({item.phone})
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color="#64748B" />
                    <Text style={styles.infoText}>{item.location}</Text>
                  </View>
                </View>
              </Card>
            ))
          )}
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Segmented Toggle
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: Theme.Colors.primary,
    shadowColor: '#136B36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 95,
    width: '100%',
  },

  // Filter Pills
  filterPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: Theme.Colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // Scheme Cards
  schemeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  schemeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  schemeIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schemeTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  schemeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schemeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    paddingRight: 6,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catCentral: {
    backgroundColor: '#CCFBF1',
  },
  catState: {
    backgroundColor: '#FEF3C7',
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catTextCentral: {
    color: '#0F766E',
  },
  catTextState: {
    color: '#D97706',
  },
  schemeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  schemeBenefit: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 6,
  },
  viewDetailsRow: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.Colors.primary,
  },

  // Equipment List
  searchContainer: {
    marginBottom: 12,
  },
  equipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  equipImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  equipImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipDetails: {
    padding: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  equipName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  equipPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.Colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});
