import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { MockNotifications } from '../../services/mockData';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitchButton } from '../../components/LanguageSwitchButton';

export default function NotificationsScreen() {
  const { t } = useLanguage();

  const getIcon = (type: string) => {
    switch(type) {
      case 'ai': return { name: 'robot-outline', color: Theme.Colors.primary };
      case 'weather': return { name: 'weather-lightning-rainy', color: '#0ea5e9' };
      case 'equipment': return { name: 'tractor', color: Theme.Colors.accent };
      default: return { name: 'bell-outline', color: Theme.Colors.textSecondary };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('common.notifications', 'Notifications')}</Text>
        <LanguageSwitchButton />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {MockNotifications.map(notif => {
          const icon = getIcon(notif.type);
          return (
            <Card key={notif.id} style={[styles.card, !notif.read && styles.unreadCard]}>
              <View style={[styles.iconBox, { backgroundColor: icon.color + '20' }]}>
                <MaterialCommunityIcons name={icon.name as any} size={24} color={icon.color} />
              </View>
              <View style={styles.content}>
                <Text style={styles.title}>{notif.title}</Text>
                <Text style={styles.message}>{notif.message}</Text>
                <Text style={styles.time}>{notif.time}</Text>
              </View>
              {!notif.read && <View style={styles.unreadDot} />}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.Spacing.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Theme.Colors.border,
  },
  backBtn: { padding: Theme.Spacing.xs },
  headerTitle: { ...Theme.Typography.h3, color: Theme.Colors.text },
  scroll: { padding: Theme.Spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.Spacing.sm, padding: Theme.Spacing.md },
  unreadCard: { borderColor: Theme.Colors.primaryLight, backgroundColor: '#f0fdf4' },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Theme.Spacing.md },
  content: { flex: 1 },
  title: { ...Theme.Typography.bodyMedium, fontWeight: '700', color: Theme.Colors.text, marginBottom: 2 },
  message: { ...Theme.Typography.caption, color: Theme.Colors.textSecondary, marginBottom: 4 },
  time: { fontSize: 10, color: Theme.Colors.disabled },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.Colors.primary, marginLeft: Theme.Spacing.sm },
});
