import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddEquipment() {
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    location: '',
    price: '',
    imageUrl: ''
  });

  const handleAdd = async () => {
    try {
      const BASE_URL = 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        Alert.alert('Success', 'Equipment added successfully');
        router.back();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to add equipment');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.primary} onPress={() => router.back()} />
        <Text style={styles.pageTitle}>Add Equipment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Input label="Equipment Name" placeholder="e.g. Tractor" value={form.name} onChangeText={t => setForm({...form, name: t})} />
        <Input label="Owner Name" placeholder="Owner Name" value={form.ownerName} onChangeText={t => setForm({...form, ownerName: t})} />
        <Input label="Phone" placeholder="Phone Number" keyboardType="phone-pad" value={form.phone} onChangeText={t => setForm({...form, phone: t})} />
        <Input label="Location" placeholder="Location" value={form.location} onChangeText={t => setForm({...form, location: t})} />
        <Input label="Price per day" placeholder="e.g. 500" keyboardType="numeric" value={form.price} onChangeText={t => setForm({...form, price: t})} />
        <Input label="Image URL (optional)" placeholder="https://..." value={form.imageUrl} onChangeText={t => setForm({...form, imageUrl: t})} />

        <Button title="Add Equipment" onPress={handleAdd} style={{ marginTop: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Theme.Spacing.lg },
  pageTitle: { ...Theme.Typography.h2, color: Theme.Colors.primary, marginLeft: Theme.Spacing.md },
  scroll: { padding: Theme.Spacing.lg },
});
