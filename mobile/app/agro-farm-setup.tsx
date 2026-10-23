import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { agroAPI, FarmProfile } from '../services/agroAI';
import { useLanguage } from '../context/LanguageContext';

const C = Theme.Colors;

const SOIL_TYPES = ['Sandy', 'Loamy', 'Clay', 'Sandy Loam', 'Clay Loam', 'Unknown'];
const IRRIGATION_METHODS = [
  'Rainfed', 'Mountain water channel', 'Spring water',
  'Drip irrigation', 'Pump/Tubewell', 'Solar Pump', 'Diesel Pump', 'Unknown',
];
const WATER_AVAILABILITY = ['Sufficient', 'Limited', 'Unknown'];
const AREA_UNITS = ['Bigha', 'Acre', 'Hectare'];
const UK_DISTRICTS = [
  'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun',
  'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag',
  'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi',
];

function PickerRow({ label, options, value, onSelect, isHi }: any) {
  return (
    <View style={pStyles.pickerWrap}>
      <Text style={pStyles.pickerLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pStyles.chips}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[pStyles.chip, value === opt && pStyles.chipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[pStyles.chipText, value === opt && pStyles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const pStyles = StyleSheet.create({
  pickerWrap: { marginBottom: 14 },
  pickerLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: C.primary, fontWeight: '700' },
});

export default function AgroFarmSetup() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [saving, setSaving] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FarmProfile>({
    farmName: 'My Farm',
    state: 'Uttarakhand',
    district: '',
    village: '',
    latitude: null,
    longitude: null,
    elevationM: null,
    farmAreaValue: null,
    farmAreaUnit: 'Bigha',
    soilType: 'Unknown',
    irrigationMethod: 'Unknown',
    waterAvailability: 'Unknown',
    previousCrop: '',
    locationSource: 'unknown',
  });

  useEffect(() => {
    (async () => {
      try {
        // Pre-fill from userProfile
        const profileStr = await AsyncStorage.getItem('userProfile');
        if (profileStr) {
          const p = JSON.parse(profileStr);
          setForm(prev => ({
            ...prev,
            village: prev.village || p.village || '',
            district: prev.district || p.district || '',
            state: prev.state || p.state || 'Uttarakhand',
          }));
        }
        // Load saved farm profile
        const fp = await agroAPI.getFarmProfile();
        if (fp.farmProfile && !fp.farmProfile._prefilled) {
          setForm({
            farmName: fp.farmProfile.farmName || 'My Farm',
            state: fp.farmProfile.state || 'Uttarakhand',
            district: fp.farmProfile.district || '',
            village: fp.farmProfile.village || '',
            latitude: fp.farmProfile.latitude || null,
            longitude: fp.farmProfile.longitude || null,
            elevationM: fp.farmProfile.elevationM || null,
            farmAreaValue: fp.farmProfile.farmAreaValue || null,
            farmAreaUnit: fp.farmProfile.farmAreaUnit || 'Bigha',
            soilType: fp.farmProfile.soilType || 'Unknown',
            irrigationMethod: fp.farmProfile.irrigationMethod || 'Unknown',
            waterAvailability: fp.farmProfile.waterAvailability || 'Unknown',
            previousCrop: fp.farmProfile.previousCrop || '',
            locationSource: fp.farmProfile.locationSource || 'unknown',
          });
        }
      } catch (e) {
        console.warn('Farm profile load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGetGPS = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isHi ? 'स्थान अनुमति नहीं' : 'Location Denied',
          isHi
            ? 'GPS की अनुमति नहीं मिली। आप मैन्युअल रूप से अक्षांश/देशांतर दर्ज करें।'
            : 'Location permission was denied. Please enter coordinates manually or set in phone settings.',
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setForm(prev => ({
        ...prev,
        latitude: parseFloat(loc.coords.latitude.toFixed(6)),
        longitude: parseFloat(loc.coords.longitude.toFixed(6)),
        locationSource: 'gps',
      }));
      Alert.alert(
        isHi ? 'स्थान मिला ✓' : 'Location Captured ✓',
        `${loc.coords.latitude.toFixed(4)}°N, ${loc.coords.longitude.toFixed(4)}°E`,
      );
    } catch (e) {
      Alert.alert(isHi ? 'GPS त्रुटि' : 'GPS Error', String(e));
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!form.district) {
      Alert.alert(isHi ? 'जानकारी अधूरी' : 'Missing Info', isHi ? 'कृपया जिला चुनें।' : 'Please select a district.');
      return;
    }
    setSaving(true);
    try {
      await agroAPI.saveFarmProfile(form);
      Alert.alert(
        isHi ? 'सहेजा गया ✓' : 'Saved ✓',
        isHi ? 'खेत की जानकारी सहेज ली गई है।' : 'Farm profile saved successfully.',
        [{ text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/agro-ai')) }],
      );
    } catch (e: any) {
      Alert.alert(isHi ? 'त्रुटि' : 'Error', e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => (router.canGoBack() ? router.back() : router.replace('/agro-ai'))}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isHi ? 'खेत की जानकारी' : 'Farm Details'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.helperText}>
            {isHi
              ? 'यह जानकारी फसल सुझाव और 90-दिन योजना को बेहतर बनाती है। जो जानकारी नहीं पता, उसे खाली छोड़ें।'
              : 'This information improves crop recommendations and your 90-day plan. Leave unknown fields blank.'}
          </Text>

          {/* Farm Name */}
          <Input
            label={isHi ? 'खेत का नाम' : 'Farm Name'}
            value={form.farmName || ''}
            onChangeText={v => setForm(prev => ({ ...prev, farmName: v }))}
            placeholder={isHi ? 'जैसे: उत्तरी खेत' : 'e.g. North Field'}
          />

          {/* District */}
          <Text style={styles.fieldLabel}>
            {isHi ? 'जिला (जरूरी) *' : 'District (required) *'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
            <View style={styles.districtRow}>
              {UK_DISTRICTS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.districtChip, form.district === d && styles.districtChipActive]}
                  onPress={() => setForm(prev => ({ ...prev, district: d }))}
                >
                  <Text style={[styles.districtChipText, form.district === d && styles.districtChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Village & State */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label={isHi ? 'गांव/मोहल्ला' : 'Village'}
                value={form.village || ''}
                onChangeText={v => setForm(prev => ({ ...prev, village: v }))}
                placeholder="e.g. Rampur"
              />
            </View>
            <View style={styles.half}>
              <Input
                label={isHi ? 'राज्य' : 'State'}
                value={form.state || 'Uttarakhand'}
                onChangeText={v => setForm(prev => ({ ...prev, state: v }))}
                placeholder="Uttarakhand"
              />
            </View>
          </View>

          {/* GPS Location */}
          <View style={styles.gpsCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>
                {isHi ? 'खेत का GPS स्थान' : 'Farm GPS Location'}
              </Text>
              {form.latitude && form.longitude ? (
                <Text style={styles.gpsValue}>
                  {form.latitude.toFixed(4)}°N, {form.longitude.toFixed(4)}°E
                  {form.locationSource === 'gps' ? ' (GPS)' : ' (Manual)'}
                </Text>
              ) : (
                <Text style={styles.gpsHint}>
                  {isHi
                    ? 'GPS की अनुमति दें या नीचे मैन्युअल दर्ज करें'
                    : 'Grant GPS permission or enter manually below'}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={handleGetGPS}
              disabled={fetchingLocation}
            >
              {fetchingLocation
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FFFFFF" />
              }
            </TouchableOpacity>
          </View>

          {/* Manual lat/lon */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label={isHi ? 'अक्षांश (Lat)' : 'Latitude'}
                value={form.latitude ? String(form.latitude) : ''}
                onChangeText={v => setForm(prev => ({ ...prev, latitude: parseFloat(v) || null, locationSource: 'manual' }))}
                keyboardType="numeric"
                placeholder="e.g. 30.316"
              />
            </View>
            <View style={styles.half}>
              <Input
                label={isHi ? 'देशांतर (Lon)' : 'Longitude'}
                value={form.longitude ? String(form.longitude) : ''}
                onChangeText={v => setForm(prev => ({ ...prev, longitude: parseFloat(v) || null, locationSource: 'manual' }))}
                keyboardType="numeric"
                placeholder="e.g. 78.032"
              />
            </View>
          </View>

          {/* Elevation */}
          <Input
            label={isHi ? 'ऊंचाई (मीटर में, वैकल्पिक)' : 'Elevation (metres, optional)'}
            value={form.elevationM ? String(form.elevationM) : ''}
            onChangeText={v => setForm(prev => ({ ...prev, elevationM: parseFloat(v) || null }))}
            keyboardType="numeric"
            placeholder={isHi ? 'जैसे: 1200' : 'e.g. 1200'}
          />
          <Text style={{ fontSize: 11, color: '#64748B', marginTop: -8, marginBottom: 12 }}>
            {isHi ? 'यह डेटा उच्च-ऊंचाई फसलों की पहचान में सहायक है' : 'Helps identify high-altitude crop suitability'}
          </Text>

          {/* Farm Area */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label={isHi ? 'खेत का क्षेत्रफल' : 'Farm Area'}
                value={form.farmAreaValue ? String(form.farmAreaValue) : ''}
                onChangeText={v => setForm(prev => ({ ...prev, farmAreaValue: parseFloat(v) || null }))}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
            <View style={styles.half}>
              <PickerRow
                label={isHi ? 'इकाई' : 'Unit'}
                options={AREA_UNITS}
                value={form.farmAreaUnit}
                onSelect={(v: string) => setForm(prev => ({ ...prev, farmAreaUnit: v as any }))}
                isHi={isHi}
              />
            </View>
          </View>

          {/* Soil Type */}
          <PickerRow
            label={isHi ? 'मिट्टी का प्रकार' : 'Soil Type'}
            options={SOIL_TYPES}
            value={form.soilType}
            onSelect={(v: string) => setForm(prev => ({ ...prev, soilType: v }))}
            isHi={isHi}
          />
          <Text style={styles.hint}>
            {isHi
              ? 'बलुई = रेतीली, दोमट = उपजाऊ मिश्रित, चिकनी = भारी मिट्टी'
              : 'Sandy = loose, Loamy = fertile mix, Clay = heavy and water-retaining'}
          </Text>

          {/* Irrigation Method */}
          <PickerRow
            label={isHi ? 'सिंचाई का तरीका' : 'Irrigation Method'}
            options={IRRIGATION_METHODS}
            value={form.irrigationMethod}
            onSelect={(v: string) => setForm(prev => ({ ...prev, irrigationMethod: v }))}
            isHi={isHi}
          />

          {/* Water Availability */}
          <PickerRow
            label={isHi ? 'पानी की उपलब्धता' : 'Water Availability'}
            options={WATER_AVAILABILITY}
            value={form.waterAvailability}
            onSelect={(v: string) => setForm(prev => ({ ...prev, waterAvailability: v }))}
            isHi={isHi}
          />

          {/* Previous Crop */}
          <Input
            label={isHi ? 'पिछली फसल (वैकल्पिक)' : 'Previous Crop (optional)'}
            value={form.previousCrop || ''}
            onChangeText={v => setForm(prev => ({ ...prev, previousCrop: v }))}
            placeholder={isHi ? 'जैसे: गेहूं' : 'e.g. Wheat'}
          />

          <Button
            title={saving ? (isHi ? 'सहेज रहे हैं...' : 'Saving...') : (isHi ? 'खेत की जानकारी सहेजें' : 'Save Farm Profile')}
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primaryLight,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  scroll: { padding: 16, paddingBottom: 40 },

  helperText: {
    fontSize: 13, color: C.textSecondary, marginBottom: 16, lineHeight: 18,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },
  districtScroll: { marginBottom: 14 },
  districtRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, paddingRight: 16 },
  districtChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
  },
  districtChipActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  districtChipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  districtChipTextActive: { color: C.primary, fontWeight: '700' },

  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  half: { flex: 1 },

  gpsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0',
    padding: 14, marginBottom: 14,
  },
  gpsValue: { fontSize: 13, fontWeight: '600', color: C.primary, marginTop: 2 },
  gpsHint: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  gpsBtn: {
    backgroundColor: C.primary, borderRadius: 10, width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },

  hint: {
    fontSize: 11, color: C.textMuted, marginTop: -8, marginBottom: 12,
    paddingHorizontal: 4, lineHeight: 15,
  },

  saveBtn: { marginTop: 20, height: 52, borderRadius: 14 },
});
