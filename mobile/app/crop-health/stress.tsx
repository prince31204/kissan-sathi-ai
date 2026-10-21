import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export default function CropStressScreen() {
  const stressLevel: string = 'Mild Stress';

  const getMeterColor = () => {
    switch(stressLevel) {
      case 'Healthy': return Theme.Colors.success;
      case 'Mild Stress': return Theme.Colors.warning;
      case 'Moderate Stress': return '#F97316';
      case 'Severe Stress': return Theme.Colors.error;
      default: return Theme.Colors.success;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crop Stress Analysis</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.meterCard}>
          <Text style={styles.cardTitle}>Current Stress Level (Demo)</Text>
          <View style={styles.meterContainer}>
            <MaterialCommunityIcons name="speedometer" size={80} color={getMeterColor()} />
            <Text style={[styles.stressLevelText, { color: getMeterColor() }]}>{stressLevel}</Text>
          </View>
        </Card>

        <Button 
          title="Upload Crop Image" 
          onPress={() => router.push('/crop-health/analysis')} 
          style={styles.uploadBtn}
          icon={<MaterialCommunityIcons name="camera" size={20} color={Theme.Colors.surface} />}
        />

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Visual Stress Indicators</Text>
          <Text style={styles.bodyText}>• Slight yellowing of lower leaves</Text>
          <Text style={styles.bodyText}>• Reduced growth rate detected over 5 days</Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>Last Analysis</Text>
          <Text style={styles.bodyText}>Date: Yesterday</Text>
          <Text style={styles.bodyText}>Result: Healthy</Text>
        </Card>
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
  
  meterCard: { alignItems: 'center', paddingVertical: Theme.Spacing.xl, marginBottom: Theme.Spacing.lg },
  cardTitle: { ...Theme.Typography.h3, marginBottom: Theme.Spacing.md },
  meterContainer: { alignItems: 'center' },
  stressLevelText: { ...Theme.Typography.h2, marginTop: Theme.Spacing.sm },
  
  uploadBtn: { marginBottom: Theme.Spacing.lg },
  
  infoCard: { marginBottom: Theme.Spacing.md },
  bodyText: { ...Theme.Typography.body, marginBottom: Theme.Spacing.xs },
});
