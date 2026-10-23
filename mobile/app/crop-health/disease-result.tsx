import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useLanguage } from '../../context/LanguageContext';

export default function DiseaseResultScreen() {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const params = useLocalSearchParams();
  const disease = (params.disease as string) || (isHi ? 'अज्ञात' : 'Unknown');
  const crop = (params.crop as string) || (isHi ? 'फसल' : 'Crop');
  const rawConfidence = parseFloat((params.confidence as string) || '0');
  const confidence = (rawConfidence * 100).toFixed(1);
  const isHealthy = params.isHealthy === 'true' || disease.toLowerCase().includes('healthy');
  const severity = (params.severity as string) || (isHealthy ? 'None' : 'Moderate');
  const symptoms = (params.symptoms as string) || (params.message as string) || '';
  const chemicalTreatment = (params.chemicalTreatment as string) || '';
  const organicTreatment = (params.organicTreatment as string) || '';
  const prevention = (params.prevention as string) || '';
  const imageUri = (params.imageUri as string) || '';

  let topPredictions: any[] = [];
  try {
    if (params.topPredictions) {
      topPredictions = JSON.parse(params.topPredictions as string);
    }
  } catch (e) {
    topPredictions = [];
  }

  // Severity color helper
  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
      case 'critical / emergency':
      case 'critical / severe':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', icon: 'alert-octagon' };
      case 'high':
      case 'high (viral)':
      case 'high (acarina pest)':
        return { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74', icon: 'alert-circle' };
      case 'moderate':
      case 'moderate to high':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', icon: 'alert' };
      default:
        return { bg: '#DCFCE7', text: '#166534', border: '#86EFAC', icon: 'check-decagram' };
    }
  };

  const sevStyle = getSeverityColor(severity);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/crop-health/analysis'))} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isHi ? 'AI फसल निदान रिपोर्ट' : 'AI Crop Diagnosis Report'}
        </Text>
        <TouchableOpacity onPress={() => router.push('/crop-health/analysis')}>
          <MaterialCommunityIcons name="camera-retake" size={24} color={Theme.Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Main Status Header Card */}
        <Card style={[styles.mainCard, { borderColor: sevStyle.border }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.leafPhoto} resizeMode="cover" />
          ) : null}

          <View style={styles.statusRow}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: isHealthy ? '#DCFCE7' : sevStyle.bg },
              ]}
            >
              <MaterialCommunityIcons
                name={isHealthy ? 'shield-check' : 'virus'}
                size={36}
                color={isHealthy ? '#15803D' : sevStyle.text}
              />
            </View>

            <View style={styles.statusInfo}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: sevStyle.bg, borderColor: sevStyle.border },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={sevStyle.icon as any}
                    size={14}
                    color={sevStyle.text}
                  />
                  <Text style={[styles.severityText, { color: sevStyle.text }]}>
                    {isHealthy
                      ? isHi
                        ? 'फसल पूरी तरह स्वस्थ'
                        : 'Safe & Healthy'
                      : `${isHi ? 'गंभीरता' : 'Severity'}: ${severity}`}
                  </Text>
                </View>
              </View>

              <Text style={styles.cropNameText}>{crop}</Text>
              <Text style={styles.diseaseTitle}>{disease}</Text>
            </View>
          </View>

          {/* AI Confidence Bar */}
          <View style={styles.confidenceSection}>
            <View style={styles.confidenceLabels}>
              <Text style={styles.confidenceTitle}>
                {isHi ? 'AI पहचान सटीकता (Confidence):' : 'AI Confidence Score:'}
              </Text>
              <Text style={styles.confidencePercent}>{confidence}%</Text>
            </View>
            <View style={styles.confidenceTrack}>
              <View
                style={[
                  styles.confidenceFill,
                  {
                    width: `${Math.min(parseFloat(confidence) || 10, 100)}%`,
                    backgroundColor: isHealthy ? '#10B981' : '#F59E0B',
                  },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Symptoms Card */}
        {symptoms ? (
          <Card style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="eye-check-outline" size={22} color="#2563EB" />
              <Text style={styles.cardHeading}>
                {isHi ? 'रोग के दृश्य लक्षण (Visual Symptoms)' : 'Visual Symptoms Identified'}
              </Text>
            </View>
            <Text style={styles.cardContentText}>{symptoms}</Text>
          </Card>
        ) : null}

        {/* Chemical Treatment Card */}
        {chemicalTreatment ? (
          <Card style={[styles.infoCard, styles.chemCard]}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="bottle-tonic-plus" size={22} color="#DC2626" />
              <Text style={[styles.cardHeading, { color: '#991B1B' }]}>
                {isHi ? 'वैज्ञानिक एवं रासायनिक उपचार (Chemical Treatment)' : 'Recommended Chemical Treatment'}
              </Text>
            </View>
            <Text style={styles.cardContentText}>{chemicalTreatment}</Text>
            <View style={styles.dosageTip}>
              <MaterialCommunityIcons name="information-outline" size={16} color="#DC2626" />
              <Text style={styles.dosageTipText}>
                {isHi
                  ? 'छिड़काव शांत मौसम में सुबह या शाम को करें। सुरक्षात्मक मास्क अवश्य पहनें।'
                  : 'Spray in early morning or evening. Always use protective gear.'}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Organic Treatment Card */}
        {organicTreatment ? (
          <Card style={[styles.infoCard, styles.organicCard]}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="leaf" size={22} color="#15803D" />
              <Text style={[styles.cardHeading, { color: '#166534' }]}>
                {isHi ? 'प्राकृतिक एवं जैविक उपचार (Organic Control)' : 'Organic & Natural Remedies'}
              </Text>
            </View>
            <Text style={styles.cardContentText}>{organicTreatment}</Text>
          </Card>
        ) : null}

        {/* Prevention Advice */}
        {prevention ? (
          <Card style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#0D9488" />
              <Text style={[styles.cardHeading, { color: '#0F766E' }]}>
                {isHi ? 'भविष्य में रोकथाम एवं सावधानियां (Prevention)' : 'Field Care & Prevention'}
              </Text>
            </View>
            <Text style={styles.cardContentText}>{prevention}</Text>
          </Card>
        ) : null}

        {/* Alternative AI Predictions (Top 3) */}
        {topPredictions && topPredictions.length > 1 ? (
          <Card style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="format-list-numbered" size={20} color="#6366F1" />
              <Text style={[styles.cardHeading, { color: '#4338CA' }]}>
                {isHi ? 'अन्य संभावित संभावनाएं (Top AI Predictions)' : 'Alternative AI Predictions'}
              </Text>
            </View>
            <View style={styles.topPredList}>
              {topPredictions.map((pred: any, idx: number) => {
                const pct = (pred.confidence * 100).toFixed(1);
                return (
                  <View key={idx} style={styles.predRow}>
                    <Text style={styles.predRank}>#{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.predName}>{pred.disease || pred.class_name}</Text>
                      <Text style={styles.predCrop}>{pred.crop}</Text>
                    </View>
                    <Text style={styles.predPct}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        {/* Kisan Call Center Helpline */}
        <TouchableOpacity
          style={styles.helplineBtn}
          onPress={() => Linking.openURL('tel:18001801551')}
        >
          <MaterialCommunityIcons name="phone-in-talk" size={24} color="#FFFFFF" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.helplineTitle}>
              {isHi ? 'किसान कॉल सेंटर से बात करें' : 'Kisan Call Center Helpline'}
            </Text>
            <Text style={styles.helplineSub}>
              {isHi ? 'निःशुल्क कृषि विशेषज्ञ सलाह (1800-180-1551)' : 'Toll-free Agronomist: 1800-180-1551'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Button */}
        <Button
          title={isHi ? 'दूसरी तस्वीर की जांच करें' : 'Analyze Another Image'}
          variant="outline"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/crop-health/analysis'))}
          style={styles.anotherBtn}
          icon={<MaterialCommunityIcons name="camera" size={20} color={Theme.Colors.primary} />}
        />
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
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  scroll: { padding: Theme.Spacing.md, paddingBottom: 50, maxWidth: 640, alignSelf: 'center', width: '100%' },

  mainCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: Theme.Spacing.md,
    elevation: 3,
  },
  leafPhoto: { width: '100%', height: 180, borderRadius: 10, marginBottom: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statusInfo: { flex: 1 },
  badgeRow: { flexDirection: 'row', marginBottom: 4 },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  severityText: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  cropNameText: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginTop: 2 },
  diseaseTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 2 },

  confidenceSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  confidenceLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confidenceTitle: { fontSize: 12, fontWeight: '600', color: '#475569' },
  confidencePercent: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  confidenceTrack: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 4 },

  infoCard: { padding: 14, marginBottom: Theme.Spacing.md, backgroundColor: '#FFFFFF', borderRadius: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardHeading: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginLeft: 8 },
  cardContentText: { fontSize: 13, color: '#334155', lineHeight: 20 },

  chemCard: { backgroundColor: '#FFF5F5', borderColor: '#FECACA', borderWidth: 1 },
  dosageTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  dosageTipText: { fontSize: 11, color: '#991B1B', marginLeft: 6, flex: 1 },

  organicCard: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 },

  topPredList: { gap: 6, marginTop: 4 },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  predRank: { width: 24, fontSize: 12, fontWeight: '700', color: '#64748B' },
  predName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  predCrop: { fontSize: 10, color: '#64748B', textTransform: 'uppercase' },
  predPct: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },

  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803D',
    padding: 14,
    borderRadius: 12,
    marginBottom: Theme.Spacing.md,
    shadowColor: '#15803D',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  helplineTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  helplineSub: { fontSize: 11, color: '#DCFCE7', marginTop: 1 },

  anotherBtn: { marginTop: 4, width: '100%' },
});
