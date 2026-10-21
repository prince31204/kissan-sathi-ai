import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MockFields } from '../../services/mockData';
import { StatusBadge } from '../../components/StatusBadge';

export default function FieldMonitoringScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Fields</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {MockFields.map(field => (
          <Card key={field.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.fieldTitle}>{field.name}</Text>
              <StatusBadge status={field.healthStatus === 'Good' ? 'success' : 'warning'} label={field.healthStatus} />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Crop:</Text>
              <Text style={styles.value}>{field.crop}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Area:</Text>
              <Text style={styles.value}>{field.area}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Planted:</Text>
              <Text style={styles.value}>{field.plantingDate}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <Button title="View Timeline" variant="outline" />
          </Card>
        ))}

        <Button title="Add Field" icon={<MaterialCommunityIcons name="plus" size={20} color={Theme.Colors.surface} />} />
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
  
  card: { marginBottom: Theme.Spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.Spacing.sm },
  fieldTitle: { ...Theme.Typography.h2, color: Theme.Colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { ...Theme.Typography.body, color: Theme.Colors.textSecondary },
  value: { ...Theme.Typography.bodyMedium },
  
  divider: { height: 1, backgroundColor: Theme.Colors.border, marginVertical: Theme.Spacing.md },
});
