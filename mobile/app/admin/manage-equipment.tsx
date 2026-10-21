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
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';

export default function ManageEquipment() {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const BASE_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/equipment`);
      if (res.ok) {
        const data = await res.json();
        setEquipmentList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/equipment/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (Platform.OS === 'web') {
          window.alert(`"${name}" has been deleted successfully.`);
        } else {
          Alert.alert('Deleted', `"${name}" has been deleted successfully.`);
        }
        await fetchEquipment();
      } else {
        const data = await res.json().catch(() => ({}));
        const err = data.error || 'Failed to delete equipment.';
        if (Platform.OS === 'web') {
          window.alert(err);
        } else {
          Alert.alert('Error', err);
        }
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert('Network error. Failed to delete.');
      } else {
        Alert.alert('Error', 'Network error. Failed to delete.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${name}"? It will be removed from the rental marketplace immediately.`
      );
      if (confirmed) {
        executeDelete(id, name);
      }
    } else {
      Alert.alert(
        'Delete Equipment',
        `Are you sure you want to delete "${name}"? It will be removed from the rental marketplace immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => executeDelete(id, name),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Manage Equipment</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/admin/add-equipment')}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.subHeading}>
          Listed Equipment in Marketplace ({equipmentList.length})
        </Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Theme.Colors.primary} />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading Equipment...</Text>
          </View>
        ) : equipmentList.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="tractor" size={54} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Equipment Listed</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/admin/add-equipment')}
            >
              <Text style={styles.createBtnText}>+ Add Equipment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          equipmentList.map((item: any) => (
            <Card key={item._id} style={styles.card}>
              <View style={styles.row}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <MaterialCommunityIcons name="tractor" size={26} color={Theme.Colors.primary} />
                  </View>
                )}

                <View style={styles.infoCol}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.ownerText}>
                    👤 {item.ownerName} ({item.phone})
                  </Text>
                  <Text style={styles.locationText}>📍 {item.location}</Text>
                  <Text style={styles.priceText}>₹{item.price} / day</Text>
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                  onPress={() => handleDelete(item._id, item.name)}
                  style={styles.deleteBtn}
                  disabled={deletingId === item._id}
                >
                  {deletingId === item._id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#DC2626" />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  ownerText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.Colors.primary,
    marginTop: 3,
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 2,
    minWidth: 50,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
});
