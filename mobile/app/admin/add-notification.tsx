import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddNotification() {
  const [form, setForm] = useState({
    title: '',
    message: '',
  });

  const handleSend = async () => {
    if (!form.title || !form.message) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    try {
      const BASE_URL = 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        Alert.alert('Success', 'Notification saved and sent to all users!');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to send notification');
      }
    } catch (e) {
      Alert.alert('Error', 'Network Error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.primary} onPress={() => router.back()} />
        <Text style={styles.pageTitle}>Send Notification</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.infoText}>This notification will be sent to all registered farmers.</Text>
        <Input label="Notification Title" placeholder="e.g. Weather Alert" value={form.title} onChangeText={t => setForm({...form, title: t})} />
        <Input label="Message" placeholder="Type your message here..." value={form.message} onChangeText={t => setForm({...form, message: t})} />

        <Button title="Send Notification" onPress={handleSend} style={{ marginTop: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Theme.Spacing.lg },
  pageTitle: { ...Theme.Typography.h2, color: Theme.Colors.primary, marginLeft: Theme.Spacing.md },
  scroll: { padding: Theme.Spacing.lg },
  infoText: { ...Theme.Typography.bodyMedium, color: Theme.Colors.textSecondary, marginBottom: Theme.Spacing.lg },
});
