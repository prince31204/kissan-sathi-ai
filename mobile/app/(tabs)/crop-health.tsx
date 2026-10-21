import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Card } from '../../components/Card';
import { SectionHeader } from '../../components/SectionHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { MockFields, MockDiseaseAnalysis } from '../../services/mockData';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitchButton } from '../../components/LanguageSwitchButton';

export default function CropHealthDashboard() {
  const { t, language } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.Spacing.md }}>
          <Text style={styles.pageTitle}>{t('cropHealth.pageTitle', 'Crop Health')}</Text>
          <LanguageSwitchButton />
        </View>

        <SectionHeader title={t('cropHealth.myCrops', 'My Crops')} />
        {MockFields.map(field => (
          <Card key={field.id} style={styles.cropCard}>
            <View style={styles.cropHeader}>
              <View>
                <Text style={styles.cropName}>{field.crop}</Text>
                <Text style={styles.cropDetails}>{field.area} • {field.name}</Text>
              </View>
              <StatusBadge status={field.healthStatus === 'Good' ? 'success' : 'warning'} label={field.healthStatus === 'Good' ? (language === 'hi' ? 'अच्छा' : 'Good') : (language === 'hi' ? 'ध्यान दें' : 'Warning')} />
            </View>
            <View style={styles.cropFooter}>
              <Text style={styles.lastChecked}>{t('cropHealth.lastChecked', 'Last checked')}: {field.lastChecked}</Text>
              <Text style={styles.healthPercent}>{field.healthPercent}%</Text>
            </View>
          </Card>
        ))}

        <TouchableOpacity 
          style={styles.addCropBtn} 
          activeOpacity={0.8}
          onPress={() => router.push('/crop-health/analysis')}
        >
          <MaterialCommunityIcons name="camera-plus" size={24} color={Theme.Colors.primary} />
          <Text style={styles.addCropText}>{t('cropHealth.addNew', 'Add New Crop Analysis')}</Text>
        </TouchableOpacity>

        <SectionHeader title={t('cropHealth.recentAnalyses', 'Recent Analyses')} />
        <Card style={styles.analysisCard} onPress={() => router.push('/crop-health/disease-result')}>
          <View style={styles.analysisIcon}>
            <MaterialCommunityIcons name="leaf" size={24} color={Theme.Colors.success} />
          </View>
          <View style={styles.analysisInfo}>
            <Text style={styles.analysisTitle}>{MockDiseaseAnalysis.crop} {language === 'hi' ? 'जांच' : 'Check'}</Text>
            <Text style={styles.analysisDate}>{t('cropHealth.yesterdayAi', 'Yesterday • AI Disease Analysis')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Theme.Colors.textSecondary} />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  scroll: { padding: Theme.Spacing.lg },
  pageTitle: { ...Theme.Typography.h1, color: Theme.Colors.primary, marginBottom: Theme.Spacing.md },
  
  cropCard: { marginBottom: Theme.Spacing.md },
  cropHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Theme.Spacing.md },
  cropName: { ...Theme.Typography.h3 },
  cropDetails: { ...Theme.Typography.body, color: Theme.Colors.textSecondary, marginTop: 4 },
  cropFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Theme.Colors.border, paddingTop: Theme.Spacing.sm },
  lastChecked: { ...Theme.Typography.small, color: Theme.Colors.textSecondary },
  healthPercent: { ...Theme.Typography.bodyMedium, color: Theme.Colors.primary },

  addCropBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5E9', padding: Theme.Spacing.lg, borderRadius: Theme.BorderRadius.lg, borderStyle: 'dashed', borderWidth: 1, borderColor: Theme.Colors.primary, marginVertical: Theme.Spacing.lg },
  addCropText: { ...Theme.Typography.bodyMedium, color: Theme.Colors.primary, marginLeft: Theme.Spacing.sm },

  analysisCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: Theme.Spacing.md },
  analysisIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginRight: Theme.Spacing.md },
  analysisInfo: { flex: 1 },
  analysisTitle: { ...Theme.Typography.bodyMedium },
  analysisDate: { ...Theme.Typography.small, color: Theme.Colors.textSecondary, marginTop: 4 },
});
