import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '@/config/api';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [schemesCount, setSchemesCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [mandiCount, setMandiCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const BASE_URL = BACKEND_URL;
    try {
      // 1. Fetch Users
      const resUsers = await fetch(`${BASE_URL}/api/v1/auth/all`);
      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsers(data);
      }

      // 2. Fetch Schemes
      const resSchemes = await fetch(`${BASE_URL}/api/v1/schemes`);
      if (resSchemes.ok) {
        const schemes = await resSchemes.json();
        setSchemesCount(schemes.length);
      }

      // 3. Fetch Equipment
      const resEquip = await fetch(`${BASE_URL}/api/v1/equipment`);
      if (resEquip.ok) {
        const equip = await resEquip.json();
        setEquipmentCount(equip.length);
      }

      // 4. Fetch Mandi Prices
      const resMandi = await fetch(`${BASE_URL}/api/mandi-prices`);
      if (resMandi.ok) {
        const mandi = await resMandi.json();
        setMandiCount(mandi.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Super Admin</Text>
          <Text style={styles.pageSubtitle}>KisanSaathi Central Control</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialCommunityIcons name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#E8F5EC' }]}>
            <Text style={[styles.statNumber, { color: Theme.Colors.primary }]}>
              {schemesCount}
            </Text>
            <Text style={styles.statLabel}>Schemes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.statNumber, { color: '#2563EB' }]}>
              {equipmentCount}
            </Text>
            <Text style={styles.statLabel}>Equipment</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>
              {mandiCount}
            </Text>
            <Text style={styles.statLabel}>Mandi Rates</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.statNumber, { color: '#7C3AED' }]}>
              {users.length}
            </Text>
            <Text style={styles.statLabel}>Farmers</Text>
          </View>
        </View>

        {/* SECTION 1: Government Schemes Management */}
        <Text style={styles.sectionHeading}>Government Schemes Management</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#CCFBF1' }]}
            onPress={() => router.push('/admin/add-scheme')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#CCFBF1' }]}>
              <MaterialCommunityIcons name="bank-plus" size={26} color="#0F766E" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Add Government Scheme</Text>
              <Text style={styles.actionDesc}>Publish new central or state scheme</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#FEE2E2' }]}
            onPress={() => router.push('/admin/manage-schemes')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="bank-remove" size={26} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Manage & Delete Schemes</Text>
              <Text style={styles.actionDesc}>View live schemes or delete obsolete</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: Equipment Rental Marketplace Management */}
        <Text style={styles.sectionHeading}>Equipment Marketplace Management</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#E8F5EC' }]}
            onPress={() => router.push('/admin/add-equipment')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#E8F5EC' }]}>
              <MaterialCommunityIcons name="tractor" size={26} color={Theme.Colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Add Machinery / Equipment</Text>
              <Text style={styles.actionDesc}>List tractor, rotavator or pump for rent</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#FEE2E2' }]}
            onPress={() => router.push('/admin/manage-equipment')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="delete-outline" size={26} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Manage & Delete Equipment</Text>
              <Text style={styles.actionDesc}>Delete rentals or remove listings</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: Mandi Prices Management (Crops, Fruits, Vegetables) */}
        <Text style={styles.sectionHeading}>Mandi Prices Management (Crops / Fruits / Vegetables)</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#FEF3C7' }]}
            onPress={() => router.push('/admin/add-mandi-price')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="storefront-plus" size={26} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Add Mandi Wholesale Price</Text>
              <Text style={styles.actionDesc}>Add daily rate for crops, fruits or vegetables</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#FEE2E2' }]}
            onPress={() => router.push('/admin/manage-mandi-prices')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="storefront-remove" size={26} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Manage & Delete Mandi Rates</Text>
              <Text style={styles.actionDesc}>View all commodity prices or delete old rates</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: Farmer Notifications */}
        <Text style={styles.sectionHeading}>Farmer Notifications</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/admin/add-notification')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="bell-plus-outline" size={26} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Broadcast Notification</Text>
              <Text style={styles.actionDesc}>Send advisory alerts to all farmers</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/admin/manage-notifications')}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="bell-ring-outline" size={26} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Manage Notifications</Text>
              <Text style={styles.actionDesc}>Delete or view broadcast messages</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* SECTION 4: Registered Users */}
        <Text style={styles.sectionHeading}>Registered Farmers ({users.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Theme.Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          users.map((user: any) => (
            <Card key={user._id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <MaterialCommunityIcons name="account" size={22} color={Theme.Colors.primary} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color="#64748B" />
                  <Text style={styles.detailText}>
                    {user.village || 'N/A'}, {user.district || 'N/A'} ({user.state || 'India'})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={15} color="#64748B" />
                  <Text style={styles.detailText}>
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    marginTop: 6,
  },
  actionsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 10,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
  },
});
