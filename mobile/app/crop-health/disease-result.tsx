import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';

export default function DiseaseResultScreen() {
  const params = useLocalSearchParams();
  const disease = params.disease || 'Unknown';
  const confidence = params.confidence ? (parseFloat(params.confidence as string) * 100).toFixed(1) : '0';
  const message = params.message || 'No findings available.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Analysis Result</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.resultHeader}>
          {disease === 'Healthy' ? (
            <MaterialCommunityIcons name="check-circle" size={80} color={Theme.Colors.success} />
          ) : (
            <MaterialCommunityIcons name="alert-circle" size={80} color={Theme.Colors.error} />
          )}
          <Text style={styles.cropTitle}>{disease === 'Healthy' ? 'Healthy Crop' : disease}</Text>
          <StatusBadge status={disease === 'Healthy' ? 'success' : 'error'} label={disease === 'Healthy' ? 'Safe' : 'Disease Detected'} />
          <Text style={styles.confidence}>AI Confidence: {confidence}%</Text>
        </View>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What AI Found</Text>
          <Text style={styles.sectionText}>{message}</Text>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recommended Actions</Text>
          <View style={styles.bulletRow}>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.Colors.primary} />
            <Text style={styles.bulletText}>{disease === 'Healthy' ? 'Continue standard farming practices.' : 'Please isolate the affected area and consult a pesticide expert.'}</Text>
          </View>
        </Card>

        <Button 
          title="Analyze Another Image" 
          variant="outline" 
          onPress={() => router.back()} 
          style={styles.anotherBtn} 
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.Spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.Colors.border },
  backBtn: { padding: Theme.Spacing.xs },
  headerTitle: { ...Theme.Typography.h3 },
  scroll: { padding: Theme.Spacing.lg },
  
  demoWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: Theme.Spacing.sm, borderRadius: Theme.BorderRadius.sm, marginBottom: Theme.Spacing.lg, justifyContent: 'center' },
  demoText: { ...Theme.Typography.small, color: Theme.Colors.warning, marginLeft: Theme.Spacing.xs, fontWeight: '600' },
  
  resultHeader: { alignItems: 'center', marginBottom: Theme.Spacing.xl },
  cropTitle: { ...Theme.Typography.h2, marginTop: Theme.Spacing.sm, marginBottom: Theme.Spacing.xs },
  confidence: { ...Theme.Typography.bodyMedium, color: Theme.Colors.textSecondary, marginTop: Theme.Spacing.sm },
  
  sectionCard: { marginBottom: Theme.Spacing.md },
  sectionTitle: { ...Theme.Typography.h3, marginBottom: Theme.Spacing.sm },
  sectionText: { ...Theme.Typography.body },
  
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Theme.Spacing.xs },
  bulletText: { ...Theme.Typography.body, flex: 1, paddingLeft: Theme.Spacing.xs },
  
  anotherBtn: { marginTop: Theme.Spacing.lg },
});
