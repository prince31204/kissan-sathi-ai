import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { SectionHeader } from '../../components/SectionHeader';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsScreen() {
  const { language, toggleLanguage, t } = useLanguage();
  const [notifEnabled, setNotifEnabled] = React.useState(true);
  const [locEnabled, setLocEnabled] = React.useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.settings', 'Settings')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader title={t('profile.preferences', 'Preferences')} />
        <Card style={styles.card}>
          <TouchableOpacity style={[styles.row, styles.borderBottom]} onPress={toggleLanguage} activeOpacity={0.7}>
            <View style={styles.labelWithIcon}>
              <MaterialCommunityIcons name="translate" size={20} color={Theme.Colors.primary} />
              <Text style={[styles.label, { marginLeft: 8 }]}>{t('profile.language', 'Language')}</Text>
            </View>
            <View style={styles.valueRow}>
              <View style={[styles.langPill, { backgroundColor: language === 'hi' ? '#fef3c7' : '#e0f2fe' }]}>
                <Text style={[styles.langPillText, { color: language === 'hi' ? '#b45309' : '#0369a1' }]}>
                  {language === 'hi' ? '🇮🇳 हिन्दी' : '🌐 English'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>{t('profile.pushNotifications', 'Push Notifications')}</Text>
            <Switch value={notifEnabled} onValueChange={setNotifEnabled} trackColor={{ true: Theme.Colors.primary }} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('profile.locationServices', 'Location Services')}</Text>
            <Switch value={locEnabled} onValueChange={setLocEnabled} trackColor={{ true: Theme.Colors.primary }} />
          </View>
        </Card>

        <SectionHeader title={t('profile.legalAbout', 'Legal & About')} />
        <Card style={styles.card}>
          <TouchableOpacity style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>{t('profile.privacyPolicy', 'Privacy Policy')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.borderBottom]}>
            <Text style={styles.label}>{t('profile.termsOfService', 'Terms of Service')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Theme.Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.label}>{t('profile.about', 'About KisanSaathi AI')}</Text>
            <Text style={styles.value}>v1.0.0</Text>
          </TouchableOpacity>
        </Card>
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
  card: { padding: 0, marginBottom: Theme.Spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.Spacing.md,
  },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Theme.Colors.border },
  labelWithIcon: { flexDirection: 'row', alignItems: 'center' },
  label: { ...Theme.Typography.bodyMedium, color: Theme.Colors.text },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  value: { ...Theme.Typography.bodyMedium, color: Theme.Colors.textSecondary, marginRight: Theme.Spacing.xs },
  langPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
