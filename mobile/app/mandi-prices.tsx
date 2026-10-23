import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../constants/Theme';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MandiPrices() {
  const [selectedCategory, setSelectedCategory] = useState<'Crops' | 'Fruits' | 'Vegetables'>('Crops');
  const [selectedLocation, setSelectedLocation] = useState('Uttarakhand');
  const [searchQuery, setSearchQuery] = useState('');
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    checkAdmin();
    fetchPrices();
  }, []);

  const checkAdmin = async () => {
    const role = await AsyncStorage.getItem('userRole');
    if (role === 'admin') setIsAdmin(true);
  };

  const fetchPrices = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/mandi-prices`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (e) {
      console.warn('Could not fetch live mandi prices, using fallback.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPrices();
    setRefreshing(false);
  }, []);

  // Filter list by selected Category & Search Query
  const currentList = prices
    .filter((item) => (item.category || 'Crops') === selectedCategory)
    .filter((item) =>
      !searchQuery ||
      item.commodity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.market?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar matching Mockup Screen 6 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Market Prices</Text>
        {isAdmin ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/admin/add-mandi-price')}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

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
        {/* Location Dropdown Card matching Screen 6 */}
        <TouchableOpacity style={styles.locationCard} activeOpacity={0.8}>
          <View style={styles.locationLeft}>
            <MaterialCommunityIcons name="map-marker" size={20} color={Theme.Colors.primary} />
            <Text style={styles.locationText}>{selectedLocation}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* Category Pills [ Crops ] [ Fruits ] [ Vegetables ] */}
        <View style={styles.categoryPillsRow}>
          {(['Crops', 'Fruits', 'Vegetables'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Search */}
        <Input
          placeholder={`Search ${selectedCategory.toLowerCase()} or mandi...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />}
          style={{ height: 46 }}
        />

        {/* Loading Indicator */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Theme.Colors.primary} />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Fetching Live Mandi Rates...</Text>
          </View>
        ) : currentList.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="storefront-outline" size={54} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No rates found for {selectedCategory}</Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => router.push('/admin/add-mandi-price')}
              >
                <Text style={styles.createBtnText}>+ Add {selectedCategory} Rate</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {currentList.map((item) => (
              <Card key={item._id || item.id} style={styles.priceRowCard}>
                <View style={styles.priceRowContent}>
                  {/* Left Thumbnail / Icon */}
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name={(item.icon as any) || (selectedCategory === 'Fruits' ? 'fruit-cherries' : selectedCategory === 'Vegetables' ? 'fruit-grapes' : 'barley')}
                      size={24}
                      color={Theme.Colors.primary}
                    />
                  </View>

                  {/* Middle Info */}
                  <View style={styles.itemInfo}>
                    <Text style={styles.cropName}>{item.commodity}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.cropPrice}>₹{item.price}</Text>
                      <Text style={styles.cropUnit}> {item.unit || '/ quintal'}</Text>
                    </View>
                    <Text style={styles.marketName}>{item.market} ({item.state || 'Uttarakhand'})</Text>
                  </View>

                  {/* Right Trend Indicator */}
                  <View
                    style={[
                      styles.trendBadge,
                      item.isUp ? styles.trendUp : styles.trendDown,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.isUp ? 'arrow-up' : 'arrow-down'}
                      size={13}
                      color={item.isUp ? '#15803D' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.trendText,
                        { color: item.isUp ? '#15803D' : '#DC2626' },
                      ]}
                    >
                      {item.change || '+1.5%'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
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
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 85,
    width: '100%',
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
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  categoryPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: Theme.Colors.primary,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 10,
  },
  createBtn: {
    backgroundColor: Theme.Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContainer: {
    marginTop: 8,
  },
  priceRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  priceRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  cropPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  cropUnit: {
    fontSize: 12,
    color: '#64748B',
  },
  marketName: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendUp: {
    backgroundColor: '#DCFCE7',
  },
  trendDown: {
    backgroundColor: '#FEE2E2',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
});
