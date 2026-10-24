import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { BACKEND_URL } from '@/config/api';

export default function ManageMandiPricesScreen() {
  const [prices, setPrices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Crops' | 'Fruits' | 'Vegetables'>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const BASE_URL = BACKEND_URL;

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/mandi-prices`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (e) {
      console.error('Failed to fetch mandi prices', e);
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string, commodity: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${BASE_URL}/api/mandi-prices/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (Platform.OS === 'web') {
          window.alert(`"${commodity}" rate removed successfully.`);
        } else {
          Alert.alert('Deleted', `"${commodity}" rate removed successfully.`);
        }
        await fetchPrices();
      } else {
        const data = await res.json().catch(() => ({}));
        const err = data.error || 'Failed to delete mandi price.';
        if (Platform.OS === 'web') {
          window.alert(err);
        } else {
          Alert.alert('Error', err);
        }
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Network error. Failed to delete.');
      } else {
        Alert.alert('Error', 'Network error. Failed to delete.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: string, commodity: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${commodity}"? It will be removed from the market price portal immediately.`
      );
      if (confirmed) {
        executeDelete(id, commodity);
      }
    } else {
      Alert.alert(
        'Delete Mandi Price',
        `Are you sure you want to delete "${commodity}"? It will be removed from the market price portal immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => executeDelete(id, commodity),
          },
        ]
      );
    }
  };

  const filteredPrices = prices.filter((item) => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch =
      !search ||
      item.commodity?.toLowerCase().includes(search.toLowerCase()) ||
      item.market?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Manage Mandi Rates</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/admin/add-mandi-price')}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subHeading}>
          Live Mandi Commodities in Database ({prices.length})
        </Text>

        {/* Filter Pills [ All ] [ Crops ] [ Fruits ] [ Vegetables ] */}
        <View style={styles.categoryPillsRow}>
          {(['All', 'Crops', 'Fruits', 'Vegetables'] as const).map((cat) => (
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

        {/* Search */}
        <Input
          placeholder="Filter by commodity or mandi name..."
          value={search}
          onChangeText={setSearch}
          icon={<MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />}
          style={{ height: 46 }}
        />

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Theme.Colors.primary} />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading Mandi Rates...</Text>
          </View>
        ) : filteredPrices.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="storefront-outline" size={54} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Mandi Rates Found</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/admin/add-mandi-price')}
            >
              <Text style={styles.createBtnText}>+ Add First Rate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPrices.map((item) => (
            <Card key={item._id} style={styles.card}>
              <View style={styles.row}>
                {/* Left Icon */}
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name={
                      item.category === 'Fruits'
                        ? 'fruit-cherries'
                        : item.category === 'Vegetables'
                        ? 'fruit-grapes'
                        : 'barley'
                    }
                    size={24}
                    color={Theme.Colors.primary}
                  />
                </View>

                {/* Middle Info */}
                <View style={styles.infoCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.commodityName}>{item.commodity}</Text>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{item.category || 'Crops'}</Text>
                    </View>
                  </View>
                  <Text style={styles.priceText}>
                    ₹{item.price} <Text style={styles.unitText}>{item.unit || '/ quintal'}</Text>
                  </Text>
                  <Text style={styles.marketText}>
                    📍 {item.market} ({item.state || 'Uttarakhand'})
                  </Text>
                </View>

                {/* Right Delete Button */}
                <TouchableOpacity
                  style={[styles.deleteBtn, deletingId === item._id && { opacity: 0.6 }]}
                  onPress={() => handleDelete(item._id, item.commodity)}
                  disabled={deletingId === item._id}
                >
                  {deletingId === item._id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#DC2626" />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Card>
          ))
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
    paddingBottom: 30,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  categoryPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: Theme.Colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  commodityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  catBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  marketText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 2,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
