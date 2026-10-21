import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';

export default function ManageSchemesScreen() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/schemes`);
      if (res.ok) {
        const data = await res.json();
        setSchemes(data);
      }
    } catch (e) {
      console.error('Failed to fetch schemes', e);
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string, schemeTitle: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/schemes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (Platform.OS === 'web') {
          window.alert(`Scheme "${schemeTitle}" deleted successfully.`);
        } else {
          Alert.alert('Deleted', `Scheme "${schemeTitle}" deleted successfully.`);
        }
        fetchSchemes();
      } else {
        if (Platform.OS === 'web') {
          window.alert('Could not delete scheme.');
        } else {
          Alert.alert('Error', 'Could not delete scheme.');
        }
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Network error. Failed to delete.');
      } else {
        Alert.alert('Error', 'Network error. Failed to delete.');
      }
    }
  };

  const handleDelete = (id: string, schemeTitle: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${schemeTitle}"? It will be removed from the user portal immediately.`
      );
      if (confirmed) {
        executeDelete(id, schemeTitle);
      }
    } else {
      Alert.alert(
        'Delete Scheme',
        `Are you sure you want to delete "${schemeTitle}"? It will be removed from the user portal immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => executeDelete(id, schemeTitle),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Manage Schemes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/admin/add-scheme')}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subHeading}>
          Live Schemes in Database ({schemes.length})
        </Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Theme.Colors.primary} />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading Schemes...</Text>
          </View>
        ) : schemes.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="bank-outline" size={54} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Schemes in Database</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/admin/add-scheme')}
            >
              <Text style={styles.createBtnText}>+ Add First Scheme</Text>
            </TouchableOpacity>
          </View>
        ) : (
          schemes.map((scheme) => (
            <Card key={scheme._id} style={styles.schemeCard}>
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.categoryBadge,
                    scheme.category === 'State' ? styles.badgeState : styles.badgeCentral,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryBadgeText,
                      scheme.category === 'State' ? styles.textState : styles.textCentral,
                    ]}
                  >
                    {scheme.category || 'Central'}
                  </Text>
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(scheme._id, scheme.title)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.schemeTitle}>{scheme.title}</Text>
              <Text style={styles.schemeSubtitle}>{scheme.subtitle}</Text>
              <Text style={styles.schemeBenefit}>💰 {scheme.benefit}</Text>

              {scheme.url ? (
                <Text style={styles.schemeUrl} numberOfLines={1}>
                  🔗 {scheme.url}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 14,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 10,
  },
  createBtn: {
    backgroundColor: Theme.Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  schemeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCentral: {
    backgroundColor: '#CCFBF1',
  },
  badgeState: {
    backgroundColor: '#FEF3C7',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textCentral: {
    color: '#0F766E',
  },
  textState: {
    color: '#D97706',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  schemeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  schemeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  schemeBenefit: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
    marginTop: 6,
  },
  schemeUrl: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
});
