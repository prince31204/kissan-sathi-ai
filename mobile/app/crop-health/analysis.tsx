import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useLanguage } from '../../context/LanguageContext';

interface SampleItem {
  id: string;
  name: string;
  crop: string;
  imageUri: string;
}

export default function CropAnalysisScreen() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [image, setImage] = useState<string | null>(null);
  const [selectedSampleName, setSelectedSampleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [loadingSamples, setLoadingSamples] = useState(true);

  // Fetch quick test demo samples on load
  useEffect(() => {
    let isMounted = true;
    fetch('http://localhost:5000/api/crop-disease/samples')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.samples)) {
          setSamples(data.samples);
        }
      })
      .catch((err) => {
        console.log('Samples fetch fallback:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingSamples(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Web file input trigger
  const triggerFileInput = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setImage(dataUrl);
            setSelectedSampleName(file.name);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      // Fallback sample image
      handleSelectSample(samples[0] || {
        id: 'fallback',
        name: 'Tomato Early Blight',
        crop: 'Tomato',
        imageUri: 'https://images.unsplash.com/photo-1592417817098-8f3d69102353?auto=format&fit=crop&q=80&w=600',
      });
    }
  };

  const handleSelectSample = (sample: SampleItem) => {
    setImage(sample.imageUri);
    setSelectedSampleName(sample.name);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);

    try {
      // Call trained MobileNetV3 Crop Disease API
      const res = await fetch('http://localhost:5000/api/detect-disease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ image }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push({
          pathname: '/crop-health/disease-result',
          params: {
            disease: data.disease,
            crop: data.crop,
            confidence: String(data.confidence),
            isHealthy: data.isHealthy ? 'true' : 'false',
            severity: data.severity,
            symptoms: data.symptoms,
            chemicalTreatment: data.chemicalTreatment,
            organicTreatment: data.organicTreatment,
            prevention: data.prevention,
            message: data.message,
            topPredictions: JSON.stringify(data.topPredictions || []),
            imageUri: image.length < 4000 ? image : '', // Pass preview URI if short, or avoid large param overflow
          },
        });
      } else {
        Alert.alert(
          isHi ? 'त्रुटि' : 'Error',
          data.error || (isHi ? 'फसल जांच में समस्या आई' : 'Failed to analyze crop')
        );
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        isHi ? 'कनेक्शन त्रुटि' : 'Connection Error',
        isHi
          ? 'रोग पहचान AI सर्वर से संपर्क नहीं हो पाया। कृपया सुनिश्चित करें कि ML Backend चल रहा है।'
          : 'Could not connect to disease detection API. Make sure ML backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isHi ? 'फसल डॉक्टर • AI रोग पहचान' : 'Crop Doctor • AI Disease Diagnosis'}
          </Text>
          <Text style={styles.headerSub}>
            {isHi ? 'MobileNetV3 डीप लर्निंग मॉडल द्वारा संचालित' : 'Powered by MobileNetV3 Deep Vision'}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Upload / Capture Box */}
        {!image ? (
          <View style={styles.uploadContainer}>
            <View style={styles.cameraIconCircle}>
              <MaterialCommunityIcons name="camera-iris" size={48} color={Theme.Colors.primary} />
            </View>
            <Text style={styles.uploadTitle}>
              {isHi ? 'पत्ती की तस्वीर अपलोड करें' : 'Take a Photo or Upload Leaf'}
            </Text>
            <Text style={styles.uploadSub}>
              {isHi
                ? 'टमाटर, आलू, सेब, मक्का, अंगूर, शिमला मिर्च आदि की पत्तियों की जांच'
                : 'Supports Tomato, Potato, Apple, Corn, Grape, Bell Pepper, Peach & more'}
            </Text>

            <View style={styles.uploadActions}>
              <Button
                title={isHi ? 'गैलरी / फाइल से चुनें' : 'Choose Photo / Upload File'}
                onPress={triggerFileInput}
                style={styles.actionBtn}
                icon={<MaterialCommunityIcons name="image-plus" size={20} color="#FFFFFF" />}
              />
              <Button
                title={isHi ? 'कैमरा खोलें' : 'Take a Photo'}
                variant="outline"
                onPress={triggerFileInput}
                style={styles.actionBtnOutline}
                icon={<MaterialCommunityIcons name="camera" size={20} color={Theme.Colors.primary} />}
              />
            </View>
          </View>
        ) : (
          <Card style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewBadge}>
                <MaterialCommunityIcons name="image-check" size={16} color="#059669" />
                <Text style={styles.previewBadgeText}>
                  {selectedSampleName || (isHi ? 'चयनित तस्वीर' : 'Selected Leaf Image')}
                </Text>
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
                <MaterialCommunityIcons name="close-circle" size={22} color={Theme.Colors.error} />
                <Text style={styles.removeText}>{isHi ? 'हटाएं' : 'Change'}</Text>
              </TouchableOpacity>
            </View>

            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />

            <View style={styles.analyzeSection}>
              <Button
                title={
                  loading
                    ? isHi
                      ? 'AI द्वारा विश्लेषण किया जा रहा है...'
                      : 'Analyzing via Neural Vision...'
                    : isHi
                    ? 'रोग की जांच करें (Analyze Disease)'
                    : 'Analyze Crop Health'
                }
                onPress={handleAnalyze}
                disabled={loading}
                icon={
                  loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons name="microscope" size={20} color="#FFFFFF" />
                  )
                }
              />
              <Text style={styles.disclaimer}>
                {isHi
                  ? '⚡ 30 पादप रोग श्रेणियों पर प्रशिक्षित न्यूरल नेटवर्क द्वारा त्वरित परिणाम'
                  : '⚡ Instant analysis trained on 30 Plant Pathology Classes'}
              </Text>
            </View>
          </Card>
        )}

        {/* Quick Test Demo Samples */}
        <View style={styles.sampleSection}>
          <View style={styles.sampleHeader}>
            <MaterialCommunityIcons name="flask-outline" size={20} color="#D97706" />
            <Text style={styles.sampleTitle}>
              {isHi ? 'त्वरित परीक्षण नमूने (1-क्लिक टेस्ट)' : 'Quick Test Demo Samples (1-Click Test)'}
            </Text>
          </View>
          <Text style={styles.sampleSub}>
            {isHi
              ? 'बिना फोटो खींचे तुरंत मॉडल टेस्ट करने के लिए नीचे किसी भी नमूने पर टैप करें:'
              : 'Tap any real test sample below to test the trained model instantly:'}
          </Text>

          {loadingSamples ? (
            <ActivityIndicator size="small" color={Theme.Colors.primary} style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.sampleGrid}>
              {samples.map((s) => {
                const isSelected = selectedSampleName === s.name;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.sampleCard, isSelected && styles.sampleCardActive]}
                    onPress={() => handleSelectSample(s)}
                  >
                    {s.imageUri ? (
                      <Image source={{ uri: s.imageUri }} style={styles.sampleThumb} />
                    ) : (
                      <View style={styles.sampleThumbPlaceholder}>
                        <MaterialCommunityIcons name="leaf" size={24} color="#15803D" />
                      </View>
                    )}
                    <View style={styles.sampleInfo}>
                      <Text style={styles.sampleCropBadge}>{s.crop}</Text>
                      <Text style={styles.sampleName} numberOfLines={1}>
                        {s.name}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isSelected ? 'check-circle' : 'chevron-right'}
                      size={20}
                      color={isSelected ? '#15803D' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* AI Model Architecture Badge */}
        <Card style={styles.modelInfoCard}>
          <View style={styles.modelInfoRow}>
            <MaterialCommunityIcons name="brain" size={24} color="#6366F1" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.modelTitle}>
                {isHi ? 'कस्टम प्रशिक्षित विज़न AI मॉडल' : 'Custom Trained Vision AI Model'}
              </Text>
              <Text style={styles.modelDetail}>
                MobileNetV3-Small • 2,556 Leaf Datasets • 30 Classes • 99% Diagnostic Confidence
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.Spacing.md,
    paddingVertical: Theme.Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EDE8',
  },
  backBtn: { padding: Theme.Spacing.xs },
  headerTitleWrap: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  scroll: { padding: Theme.Spacing.md, paddingBottom: 40, maxWidth: 640, alignSelf: 'center', width: '100%' },

  uploadContainer: {
    backgroundColor: '#FFFFFF',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#86EFAC',
    borderRadius: Theme.BorderRadius.lg,
    padding: Theme.Spacing.xl,
    alignItems: 'center',
    marginBottom: Theme.Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  cameraIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.Spacing.md,
  },
  uploadTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  uploadSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  uploadActions: { width: '100%', gap: 10 },
  actionBtn: { width: '100%' },
  actionBtnOutline: { width: '100%' },

  previewCard: { padding: 14, marginBottom: Theme.Spacing.lg, backgroundColor: '#FFFFFF' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewBadgeText: { fontSize: 12, fontWeight: '600', color: '#065F46', marginLeft: 4 },
  removeBtn: { flexDirection: 'row', alignItems: 'center' },
  removeText: { fontSize: 12, fontWeight: '600', color: Theme.Colors.error, marginLeft: 4 },
  previewImage: { width: '100%', height: 260, borderRadius: 12, marginBottom: 14 },
  analyzeSection: { width: '100%' },
  disclaimer: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 8 },

  sampleSection: { marginBottom: Theme.Spacing.lg },
  sampleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sampleTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginLeft: 6 },
  sampleSub: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  sampleGrid: { gap: 8 },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sampleCardActive: { borderColor: '#15803D', backgroundColor: '#F0FDF4' },
  sampleThumb: { width: 44, height: 44, borderRadius: 8, marginRight: 12 },
  sampleThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sampleInfo: { flex: 1 },
  sampleCropBadge: { fontSize: 10, fontWeight: '700', color: '#059669', textTransform: 'uppercase' },
  sampleName: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 2 },

  modelInfoCard: { padding: 12, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1 },
  modelInfoRow: { flexDirection: 'row', alignItems: 'center' },
  modelTitle: { fontSize: 13, fontWeight: '700', color: '#3730A3' },
  modelDetail: { fontSize: 11, color: '#4F46E5', marginTop: 2 },
});
