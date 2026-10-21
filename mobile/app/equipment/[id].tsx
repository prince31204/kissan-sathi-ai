import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { MockEquipment } from '../../services/mockData';

export default function EquipmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const equipment = MockEquipment.find(e => e.id === id) || MockEquipment[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Equipment Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Image source={{ uri: equipment.image }} style={styles.heroImage} />
        
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{equipment.name}</Text>
          <Text style={styles.price}>₹{equipment.pricePerDay} / day</Text>

          <View style={styles.badgeRow}>
            <StatusBadge status={equipment.availability.includes('Available from') ? 'warning' : 'success'} label={equipment.availability} />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={24} color={Theme.Colors.textSecondary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Owner</Text>
              <Text style={styles.infoValue}>{equipment.owner}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={24} color={Theme.Colors.textSecondary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{equipment.location}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{equipment.description}</Text>

        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Contact Owner" variant="outline" style={styles.contactBtn} fullWidth={false} />
        <Button title="Request Rental" style={styles.rentBtn} fullWidth={false} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.Spacing.md, borderBottomWidth: 1, borderBottomColor: Theme.Colors.border },
  backBtn: { padding: Theme.Spacing.xs },
  headerTitle: { ...Theme.Typography.h3 },
  scroll: { paddingBottom: Theme.Spacing.xl },
  
  heroImage: { width: '100%', height: 250 },
  detailsContainer: { padding: Theme.Spacing.lg },
  title: { ...Theme.Typography.h1, marginBottom: Theme.Spacing.xs },
  price: { ...Theme.Typography.h2, color: Theme.Colors.primary, marginBottom: Theme.Spacing.md },
  badgeRow: { flexDirection: 'row', marginBottom: Theme.Spacing.lg },
  
  divider: { height: 1, backgroundColor: Theme.Colors.border, marginVertical: Theme.Spacing.lg },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.Spacing.md },
  infoTextContainer: { marginLeft: Theme.Spacing.md },
  infoLabel: { ...Theme.Typography.small, color: Theme.Colors.textSecondary },
  infoValue: { ...Theme.Typography.bodyMedium },
  
  sectionTitle: { ...Theme.Typography.h3, marginBottom: Theme.Spacing.sm },
  description: { ...Theme.Typography.body, color: Theme.Colors.textSecondary, lineHeight: 24 },

  footer: { flexDirection: 'row', padding: Theme.Spacing.lg, borderTopWidth: 1, borderTopColor: Theme.Colors.border, backgroundColor: Theme.Colors.surface },
  contactBtn: { flex: 1, marginRight: Theme.Spacing.sm },
  rentBtn: { flex: 2, marginLeft: Theme.Spacing.sm },
});
