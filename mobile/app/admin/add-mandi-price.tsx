import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddMandiPriceScreen() {
  const [category, setCategory] = useState<'Crops' | 'Fruits' | 'Vegetables'>('Crops');
  const [commodity, setCommodity] = useState('');
  const [price, setPrice] = useState('');
  const [market, setMarket] = useState('Dehradun Mandi');
  const [state, setState] = useState('Uttarakhand');
  const [change, setChange] = useState('+1.5%');
  const [isUp, setIsUp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddPrice = async () => {
    setErrorMsg('');
    if (!commodity.trim() || !price.trim() || !market.trim()) {
      setErrorMsg('Please fill in Commodity Name, Price, and Market Name.');
      return;
    }

    if (isNaN(Number(price))) {
      setErrorMsg('Please enter a valid numeric price.');
      return;
    }

    setLoading(true);
    try {
      const BASE_URL = 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/mandi-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commodity: commodity.trim(),
          category,
          price: Number(price),
          unit: '/ quintal',
          market: market.trim(),
          state: state.trim() || 'Uttarakhand',
          change: (isUp ? '+' : '-') + Math.abs(parseFloat(change.replace(/[^0-9.]/g, '')) || 1.5) + '%',
          isUp,
          icon: category === 'Fruits' ? 'fruit-cherries' : category === 'Vegetables' ? 'fruit-grapes' : 'barley',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', `Mandi price for "${commodity}" published successfully!`, [
          {
            text: 'OK',
            onPress: () => router.replace('/admin/manage-mandi-prices'),
          },
        ]);
      } else {
        setErrorMsg(data.error || 'Failed to add mandi price.');
      }
    } catch (e) {
      setErrorMsg('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Add Mandi Rate</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.formSubtitle}>
            Publish daily wholesale mandi prices for Crops, Fruits, and Vegetables.
          </Text>

          {/* Category Selector [ Crops ] [ Fruits ] [ Vegetables ] */}
          <Text style={styles.label}>Commodity Category *</Text>
          <View style={styles.categoryPillsRow}>
            {(['Crops', 'Fruits', 'Vegetables'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  category === cat && styles.categoryPillActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <MaterialCommunityIcons
                  name={
                    cat === 'Crops'
                      ? 'barley'
                      : cat === 'Fruits'
                      ? 'fruit-cherries'
                      : 'fruit-grapes'
                  }
                  size={18}
                  color={category === cat ? '#FFFFFF' : '#475569'}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    category === cat && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Commodity Name Input */}
          <Input
            label="Commodity Name *"
            placeholder={
              category === 'Crops'
                ? 'e.g. Basmati Rice, Mustard, Wheat'
                : category === 'Fruits'
                ? 'e.g. Shimla Apple, Mango, Papaya'
                : 'e.g. Red Onion, Potato, Tomato'
            }
            value={commodity}
            onChangeText={setCommodity}
            icon={
              <MaterialCommunityIcons
                name="storefront-outline"
                size={20}
                color={Theme.Colors.primary}
              />
            }
          />

          {/* Price & Unit */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Wholesale Price (₹) *"
                placeholder="e.g. 2150"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                icon={
                  <MaterialCommunityIcons
                    name="currency-inr"
                    size={20}
                    color={Theme.Colors.primary}
                  />
                }
              />
            </View>
          </View>

          {/* Market / Mandi Name */}
          <Input
            label="Mandi / Market Name *"
            placeholder="e.g. Dehradun Mandi, Haridwar Mandi"
            value={market}
            onChangeText={setMarket}
            icon={
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={20}
                color={Theme.Colors.primary}
              />
            }
          />

          {/* State */}
          <Input
            label="State / Region"
            placeholder="e.g. Uttarakhand, Uttar Pradesh"
            value={state}
            onChangeText={setState}
            icon={
              <MaterialCommunityIcons
                name="city-variant-outline"
                size={20}
                color={Theme.Colors.primary}
              />
            }
          />

          {/* Daily Price Trend (Up / Down) */}
          <Text style={styles.label}>Daily Price Trend</Text>
          <View style={styles.trendToggleRow}>
            <TouchableOpacity
              style={[styles.trendBtn, isUp && styles.trendBtnUpActive]}
              onPress={() => setIsUp(true)}
            >
              <MaterialCommunityIcons
                name="arrow-up-bold"
                size={18}
                color={isUp ? '#FFFFFF' : '#15803D'}
              />
              <Text style={[styles.trendBtnText, isUp && styles.trendBtnTextActive]}>
                Price Rising (Up)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.trendBtn, !isUp && styles.trendBtnDownActive]}
              onPress={() => setIsUp(false)}
            >
              <MaterialCommunityIcons
                name="arrow-down-bold"
                size={18}
                color={!isUp ? '#FFFFFF' : '#DC2626'}
              />
              <Text style={[styles.trendBtnText, !isUp && styles.trendBtnTextActive]}>
                Price Dropping (Down)
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Trend Percentage (% Change)"
            placeholder="e.g. 1.5% or 2.0%"
            value={change}
            onChangeText={setChange}
            icon={
              <MaterialCommunityIcons
                name="chart-line"
                size={20}
                color={Theme.Colors.primary}
              />
            }
          />

          {errorMsg ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Theme.Colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Button
            title={loading ? 'Publishing...' : 'Publish Mandi Price'}
            onPress={handleAddPrice}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
  },
  flex1: {
    flex: 1,
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    gap: 6,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  trendToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  trendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  trendBtnUpActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  trendBtnDownActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  trendBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  trendBtnTextActive: {
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: Theme.Colors.error,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  submitBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 14,
  },
});
