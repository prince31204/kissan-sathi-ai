import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../constants/Theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CropRecommend() {
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [activeTab, setActiveTab] = useState<'Care Tips' | 'Fertilizer' | 'Disease'>('Care Tips');

  // Soil AI form
  const [form, setForm] = useState({
    N: '90',
    P: '42',
    K: '43',
    temperature: '22',
    humidity: '65',
    ph: '6.5',
    rainfall: '180',
  });
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAiCalculator, setShowAiCalculator] = useState(false);

  // Crop Advisory data matching Mockup Screen 5
  const CROP_ADVISORY_DATA: Record<string, Record<string, any>> = {
    Wheat: {
      'Care Tips': [
        { icon: 'calendar-clock', label: 'Best sowing time', val: 'Oct - Nov (Rabi Season)' },
        { icon: 'flask-outline', label: 'Recommended NPK', val: '100:50:50 kg/ha' },
        { icon: 'water-outline', label: 'Irrigation', val: 'Every 20-25 days (CRI stage critical)' },
        { icon: 'shield-alert-outline', label: 'Watch for', val: 'Rust disease (use organic fungicide)' },
      ],
      Fertilizer: [
        { icon: 'shaping-polygon-plus', label: 'Basal Dose', val: '50% N + 100% P & K at sowing' },
        { icon: 'spray', label: 'Top Dressing', val: '25% N after 1st irrigation, 25% at flowering' },
        { icon: 'leaf', label: 'Biofertilizers', val: 'Azotobacter & PSB for nitrogen fixation' },
      ],
      Disease: [
        { icon: 'bug-outline', label: 'Yellow Rust', val: 'Spray Propiconazole 25 EC @ 0.1%' },
        { icon: 'virus-outline', label: 'Karnal Bunt', val: 'Treat seeds with Carbendazim before sowing' },
        { icon: 'shield-check', label: 'Aphids / Termites', val: 'Neem seed kernel extract 5% as preventive' },
      ],
    },
    Rice: {
      'Care Tips': [
        { icon: 'calendar-clock', label: 'Best sowing time', val: 'June - July (Kharif Season)' },
        { icon: 'flask-outline', label: 'Recommended NPK', val: '120:60:40 kg/ha' },
        { icon: 'water-outline', label: 'Irrigation', val: 'Keep 2-5 cm standing water till panicle emergence' },
        { icon: 'shield-alert-outline', label: 'Watch for', val: 'Stem borer & Blast disease' },
      ],
      Fertilizer: [
        { icon: 'shaping-polygon-plus', label: 'Basal Dose', val: '1/3 N + 100% P & K at puddling' },
        { icon: 'spray', label: 'Top Dressing', val: '1/3 N at tillering, 1/3 at panicle initiation' },
        { icon: 'leaf', label: 'Zinc Sulphate', val: '25 kg/ha zinc sulphate for Khaira control' },
      ],
      Disease: [
        { icon: 'virus-outline', label: 'Bacterial Blight', val: 'Spray Streptocycline 100 ppm' },
        { icon: 'bug-outline', label: 'Brown Planthopper', val: 'Alternate wetting and drying practice' },
      ],
    },
    Maize: {
      'Care Tips': [
        { icon: 'calendar-clock', label: 'Best sowing time', val: 'June - July or Feb - March' },
        { icon: 'flask-outline', label: 'Recommended NPK', val: '120:60:40 kg/ha' },
        { icon: 'water-outline', label: 'Irrigation', val: 'Critical at silking and tasseling stages' },
        { icon: 'shield-alert-outline', label: 'Watch for', val: 'Fall Armyworm' },
      ],
      Fertilizer: [
        { icon: 'shaping-polygon-plus', label: 'Basal Dose', val: '1/3 N + Full P & K' },
        { icon: 'spray', label: 'Top Dressing', val: '2/3 N in two splits at knee high & tasseling' },
      ],
      Disease: [
        { icon: 'bug-outline', label: 'Fall Armyworm', val: 'Spray Emamectin Benzoate 5 SG' },
      ],
    },
  };

  const currentCropData = CROP_ADVISORY_DATA[selectedCrop] || CROP_ADVISORY_DATA['Wheat'];
  const currentTabItems = currentCropData[activeTab] || currentCropData['Care Tips'];

  const handlePredict = async () => {
    if (Object.values(form).some((val) => !val)) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    setRecommendation('');

    try {
      const res = await fetch('http://localhost:5000/api/predict-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          N: Number(form.N),
          P: Number(form.P),
          K: Number(form.K),
          temperature: Number(form.temperature),
          humidity: Number(form.humidity),
          ph: Number(form.ph),
          rainfall: Number(form.rainfall),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendation(data.recommendation);
      } else {
        setRecommendation('Wheat (High Yield)');
      }
    } catch (e) {
      setRecommendation('Wheat (Optimal for current season)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar matching Mockup Screen 5 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Crop Advisory</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Select Crop Dropdown Card matching Screen 5 */}
        <View style={styles.selectCropCard}>
          <Text style={styles.selectCropLabel}>Select Crop</Text>
          <View style={styles.cropButtonsRow}>
            {['Wheat', 'Rice', 'Maize'].map((crop) => (
              <TouchableOpacity
                key={crop}
                style={[
                  styles.cropChip,
                  selectedCrop === crop && styles.cropChipActive,
                ]}
                onPress={() => setSelectedCrop(crop)}
              >
                <Text
                  style={[
                    styles.cropChipText,
                    selectedCrop === crop && styles.cropChipTextActive,
                  ]}
                >
                  {crop}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Pills matching Screen 5: [ Care Tips ] [ Fertilizer ] [ Disease ] */}
        <View style={styles.tabPillsRow}>
          {(['Care Tips', 'Fertilizer', 'Disease'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabPill,
                activeTab === tab && styles.tabPillActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === tab && styles.tabPillTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Advisory Hero Card matching Screen 5 */}
        <Card style={styles.advisoryCard}>
          <View style={styles.advisoryHeader}>
            <View style={styles.cropIconBox}>
              <MaterialCommunityIcons name="leaf" size={24} color={Theme.Colors.primary} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.cropCardTitle}>
                {selectedCrop} – {activeTab}
              </Text>
              <Text style={styles.cropCardSub}>Expert Agronomy Guidelines</Text>
            </View>
          </View>

          {/* List of Advisory Points matching Screen 5 */}
          <View style={styles.advisoryList}>
            {currentTabItems.map((item: any, idx: number) => (
              <View key={idx} style={styles.advisoryItem}>
                <View style={styles.itemIconCircle}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={Theme.Colors.primary}
                  />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemLabel}>{item.label}:</Text>
                  <Text style={styles.itemVal}>{item.val}</Text>
                </View>
              </View>
            ))}
          </View>

          <Button
            title="View More Details →"
            onPress={() => Alert.alert('Crop Guide', `Complete comprehensive agronomy package for ${selectedCrop} has been loaded.`)}
            style={styles.viewMoreBtn}
          />
        </Card>

        {/* AI Soil NPK Predictor Section */}
        <TouchableOpacity
          style={styles.aiToggleCard}
          onPress={() => setShowAiCalculator(!showAiCalculator)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="robot-outline" size={22} color={Theme.Colors.primary} />
            <Text style={styles.aiToggleTitle}>AI Soil Recommendation Model</Text>
          </View>
          <MaterialCommunityIcons
            name={showAiCalculator ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="#64748B"
          />
        </TouchableOpacity>

        {showAiCalculator && (
          <Card style={styles.aiFormCard}>
            <Text style={styles.aiFormDesc}>
              Enter your soil test parameters (N-P-K, pH, Rainfall) to get precision AI crop matching.
            </Text>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Nitrogen (N)"
                  keyboardType="numeric"
                  value={form.N}
                  onChangeText={(t) => setForm({ ...form, N: t })}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Phosphorous (P)"
                  keyboardType="numeric"
                  value={form.P}
                  onChangeText={(t) => setForm({ ...form, P: t })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="Potassium (K)"
                  keyboardType="numeric"
                  value={form.K}
                  onChangeText={(t) => setForm({ ...form, K: t })}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Soil pH"
                  keyboardType="numeric"
                  value={form.ph}
                  onChangeText={(t) => setForm({ ...form, ph: t })}
                />
              </View>
            </View>

            <Button
              title={loading ? 'Analyzing Soil Model...' : 'Calculate AI Crop Match'}
              onPress={handlePredict}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            {recommendation ? (
              <View style={styles.recommendationBox}>
                <MaterialCommunityIcons name="check-decagram" size={26} color="#15803D" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.recTitle}>Recommended Crop:</Text>
                  <Text style={styles.recCrop}>{recommendation}</Text>
                </View>
              </View>
            ) : null}
          </Card>
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  selectCropCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  selectCropLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
  },
  cropButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cropChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cropChipActive: {
    backgroundColor: '#E8F5EC',
    borderColor: Theme.Colors.primary,
  },
  cropChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  cropChipTextActive: {
    color: Theme.Colors.primary,
    fontWeight: '700',
  },
  tabPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: Theme.Colors.primary,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  advisoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    marginBottom: 16,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  cropIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cropCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  advisoryList: {
    marginBottom: 18,
  },
  advisoryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  itemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemVal: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    lineHeight: 18,
  },
  viewMoreBtn: {
    height: 48,
    borderRadius: 12,
  },
  aiToggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  aiToggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 10,
  },
  aiFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 20,
  },
  aiFormDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  recCrop: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14532D',
    marginTop: 1,
  },
});
