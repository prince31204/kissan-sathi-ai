import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';

import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitchButton } from '../../components/LanguageSwitchButton';

export default function IrrigationHistoryScreen() {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('@irrigation_history');
      if (stored !== null) {
        setHistory(JSON.parse(stored));
      } else {
        const initialized = await AsyncStorage.getItem('@irrigation_history_initialized');
        if (!initialized) {
          await AsyncStorage.setItem('@irrigation_history_initialized', 'true');
          const initial = [
            {
              id: '1',
              field: language === 'hi' ? 'गेहूं का खेत (5 बीघा)' : 'Wheat Field (5 Bigha)',
              crop: 'Wheat',
              date: language === 'hi' ? 'आज' : 'Today',
              time: language === 'hi' ? 'प्रातः' : 'Morning',
              duration: language === 'hi' ? '2.5 घंटे' : '2.5 Hours',
              water: language === 'hi' ? '1,44,700 लीटर' : '1,44,700 Liters',
              urgency: language === 'hi' ? 'योजनाबद्ध' : 'Scheduled',
              window: language === 'hi' ? 'कल सुबह, 5:30 - 8:30 बजे' : 'Tomorrow, 5:30 AM - 8:30 AM',
              location: 'Uttarakhand, India',
            },
          ];
          await AsyncStorage.setItem('@irrigation_history', JSON.stringify(initial));
          setHistory(initial);
        } else {
          setHistory([]);
        }
      }
    } catch (e) {
      console.warn('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    const doClear = async () => {
      await AsyncStorage.setItem('@irrigation_history', JSON.stringify([]));
      await AsyncStorage.setItem('@irrigation_history_initialized', 'true');
      setHistory([]);
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm
        ? window.confirm(
            language === 'hi'
              ? 'क्या आप सभी सिंचाई इतिहास रिकॉर्ड हटाना चाहते हैं?'
              : 'Are you sure you want to clear your irrigation history records?'
          )
        : true;
      if (confirmed) await doClear();
      return;
    }

    Alert.alert(
      language === 'hi' ? 'इतिहास हटाएं' : 'Clear History',
      language === 'hi'
        ? 'क्या आप सभी सिंचाई इतिहास रिकॉर्ड हटाना चाहते हैं?'
        : 'Are you sure you want to clear your irrigation history records?',
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: language === 'hi' ? 'सभी हटाएं' : 'Clear All',
          style: 'destructive',
          onPress: doClear,
        },
      ]
    );
  };

  const handleDeleteItem = async (id: string) => {
    const doDelete = async () => {
      const updated = history.filter((item, idx) => (item.id || idx.toString()) !== id);
      setHistory(updated);
      await AsyncStorage.setItem('@irrigation_history', JSON.stringify(updated));
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' && window.confirm
        ? window.confirm(
            language === 'hi' ? 'क्या आप इस सिंचाई रिकॉर्ड को हटाना चाहते हैं?' : 'Delete this irrigation record?'
          )
        : true;
      if (confirmed) await doDelete();
      return;
    }

    Alert.alert(
      language === 'hi' ? 'रिकॉर्ड हटाएं' : 'Delete Record',
      language === 'hi' ? 'क्या आप इस सिंचाई रिकॉर्ड को हटाना चाहते हैं?' : 'Delete this irrigation record?',
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: language === 'hi' ? 'हटाएं' : 'Delete', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/irrigation'))} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'hi' ? 'सिंचाई इतिहास' : 'Irrigation History'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LanguageSwitchButton />
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={Theme.Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="water-off" size={48} color={Theme.Colors.disabled} />
            <Text style={styles.emptyTitle}>No Irrigation History Yet</Text>
            <Text style={styles.emptySubtitle}>
              Use the Smart Irrigation calculator to generate and save dynamic watering plans for your crops.
            </Text>
          </View>
        ) : (
          history.map((item, idx) => (
            <Card key={item.id || idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.fieldTitle}>{item.field}</Text>
                  <Text style={styles.date}>
                    {item.date} {item.time ? `• ${item.time}` : ''}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.urgency ? (
                    <StatusBadge
                      status={
                        item.urgency.toLowerCase().includes('critical') || item.urgency.toLowerCase().includes('high')
                          ? 'error'
                          : item.urgency.toLowerCase().includes('postpone')
                          ? 'warning'
                          : 'info'
                      }
                      label={item.urgency}
                    />
                  ) : null}
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id || idx.toString())}
                    style={{ padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={17} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>{language === 'hi' ? 'आवश्यक पानी:' : 'Water Req:'}</Text>
                  <Text style={[styles.value, { color: '#0369a1', fontWeight: '700' }]}>{item.water}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>
                    {item.pahadiInfo 
                      ? (language === 'hi' ? 'कूल प्रवाह समय:' : 'Channel Flow:') 
                      : (language === 'hi' ? 'पंप चलाने का समय:' : 'Pump Duration:')
                    }
                  </Text>
                  <Text style={styles.value}>{item.duration}</Text>
                </View>
              </View>

              {item.waterSource ? (
                <View style={styles.sourceTagRow}>
                  <View style={[styles.sourceBadge, item.pahadiInfo ? styles.sourceBadgePahadi : styles.sourceBadgeNormal]}>
                    <MaterialCommunityIcons
                      name={item.pahadiInfo ? 'image-filter-hdr' : item.waterSource.includes('Electric') ? 'flash' : 'water'}
                      size={14}
                      color={item.pahadiInfo ? '#065f46' : '#0369a1'}
                    />
                    <Text style={[styles.sourceBadgeText, item.pahadiInfo ? styles.sourceBadgeTextPahadi : styles.sourceBadgeTextNormal]}>
                      {item.waterSource}
                    </Text>
                  </View>
                  {item.voltageInfo ? (
                    <View style={[styles.sourceBadge, { backgroundColor: item.voltageInfo.status === 'optimal' ? '#dcfce7' : '#fef3c7' }]}>
                      <Text style={[styles.sourceBadgeText, { color: item.voltageInfo.status === 'optimal' ? '#15803d' : '#b45309' }]}>
                        ⚡ {item.voltageInfo.voltage}V ({item.voltageInfo.phase})
                      </Text>
                    </View>
                  ) : null}
                  {item.pahadiInfo ? (
                    <View style={[styles.sourceBadge, { backgroundColor: '#d1fae5' }]}>
                      <Text style={[styles.sourceBadgeText, { color: '#065f46' }]}>
                        {language === 'hi' ? '🌿 100% मुफ़्त प्राकृतिक प्रवाह' : '🌿 100% Free Gravity'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {item.window ? (
                <View style={styles.windowRow}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={Theme.Colors.textSecondary} />
                  <Text style={styles.windowText}>
                    {language === 'hi' ? 'समय:' : 'Suggested:'} {item.window}
                  </Text>
                </View>
              ) : null}

              {item.location ? (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={Theme.Colors.textSecondary} />
                  <Text style={styles.locationText}>{item.location}</Text>
                </View>
              ) : null}
            </Card>
          ))
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: Theme.Colors.border,
    backgroundColor: '#ffffff',
  },
  backBtn: { padding: Theme.Spacing.xs },
  headerTitle: { ...Theme.Typography.h3, color: Theme.Colors.text },
  clearBtn: { padding: Theme.Spacing.xs },
  scroll: { padding: Theme.Spacing.md },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { ...Theme.Typography.h3, color: Theme.Colors.textSecondary, marginTop: 16 },
  emptySubtitle: { ...Theme.Typography.caption, textAlign: 'center', marginTop: 8 },

  card: { marginBottom: Theme.Spacing.md, padding: Theme.Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  fieldTitle: { ...Theme.Typography.bodyMedium, fontWeight: '700', color: Theme.Colors.primaryDark },
  date: { ...Theme.Typography.small, color: Theme.Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: Theme.Spacing.sm },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  col: { flex: 1 },
  label: { ...Theme.Typography.small, color: Theme.Colors.textSecondary },
  value: { ...Theme.Typography.bodyMedium, marginTop: 2 },

  windowRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: '#f8fafc', padding: 6, borderRadius: 6 },
  windowText: { ...Theme.Typography.small, color: Theme.Colors.textSecondary, marginLeft: 6 },

  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  locationText: { fontSize: 11, color: Theme.Colors.textSecondary, marginLeft: 4 },

  sourceTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceBadgePahadi: {
    backgroundColor: '#d1fae5',
  },
  sourceBadgeNormal: {
    backgroundColor: '#e0f2fe',
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  sourceBadgeTextPahadi: {
    color: '#065f46',
  },
  sourceBadgeTextNormal: {
    color: '#0369a1',
  },
});
