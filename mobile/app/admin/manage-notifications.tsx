import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { BACKEND_URL } from '@/config/api';

export default function ManageNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const BASE_URL = BACKEND_URL;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/notifications`);
      const data = await res.json();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await fetch(`${BASE_URL}/api/v1/notifications/${id}`, { method: 'DELETE' });
            Alert.alert('Deleted', 'Notification has been deleted');
            fetchNotifications();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete');
          }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.primary} onPress={() => router.back()} />
        <Text style={styles.pageTitle}>Manage Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <ActivityIndicator size="large" color={Theme.Colors.primary} /> : 
          notifications.map((item: any) => (
            <Card key={item._id} style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.message}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}>
                  <MaterialCommunityIcons name="delete" size={24} color={Theme.Colors.error} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Theme.Spacing.lg },
  pageTitle: { ...Theme.Typography.h2, color: Theme.Colors.primary, marginLeft: Theme.Spacing.md },
  scroll: { padding: Theme.Spacing.lg },
  card: { padding: Theme.Spacing.md, marginBottom: Theme.Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...Theme.Typography.h3 },
  subtitle: { ...Theme.Typography.bodyMedium, color: Theme.Colors.textSecondary },
  iconBtn: { padding: Theme.Spacing.sm },
});
