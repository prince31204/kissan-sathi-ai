import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { MockCalendarEvents } from '../../services/mockData';
import { Button } from '../../components/Button';

export default function CalendarScreen() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'fertilizer': return { name: 'sack', color: Theme.Colors.success };
      case 'weather': return { name: 'weather-pouring', color: Theme.Colors.accent };
      case 'harvest': return { name: 'scythe', color: Theme.Colors.secondary };
      default: return { name: 'calendar-check', color: Theme.Colors.primary };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthText}>Upcoming Tasks</Text>
          <MaterialCommunityIcons name="calendar-month" size={24} color={Theme.Colors.primary} />
        </View>

        {MockCalendarEvents.map((event) => {
          const icon = getIcon(event.type);
          return (
            <Card key={event.id} style={styles.eventCard}>
              <View style={styles.dateBox}>
                <Text style={styles.dateText}>{event.date}</Text>
              </View>
              
              <View style={styles.eventContent}>
                <View style={styles.eventHeaderRow}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <MaterialCommunityIcons name={icon.name as any} size={20} color={icon.color} />
                </View>
                <Text style={styles.eventField}>{event.field}</Text>
                <Text style={styles.eventDesc}>{event.description}</Text>
              </View>
            </Card>
          );
        })}

        <Button title="Add Custom Task" variant="outline" style={styles.addBtn} icon={<MaterialCommunityIcons name="plus" size={20} color={Theme.Colors.primary} />} />
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

  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.Spacing.lg },
  monthText: { ...Theme.Typography.h2, color: Theme.Colors.primary },

  eventCard: { flexDirection: 'row', padding: 0, overflow: 'hidden', marginBottom: Theme.Spacing.md },
  dateBox: { width: 80, backgroundColor: Theme.Colors.primaryLight, justifyContent: 'center', alignItems: 'center', padding: Theme.Spacing.sm },
  dateText: { ...Theme.Typography.bodyMedium, color: Theme.Colors.primaryDark, textAlign: 'center', fontWeight: '700' },
  
  eventContent: { flex: 1, padding: Theme.Spacing.md },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  eventTitle: { ...Theme.Typography.bodyMedium, fontWeight: '700', flex: 1, marginRight: 8 },
  eventField: { ...Theme.Typography.small, color: Theme.Colors.primaryDark, marginBottom: 8 },
  eventDesc: { ...Theme.Typography.body, color: Theme.Colors.textSecondary },
  
  addBtn: { marginTop: Theme.Spacing.lg },
});
