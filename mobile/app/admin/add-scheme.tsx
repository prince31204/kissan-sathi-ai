import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AddSchemeScreen() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Central' | 'State'>('Central');
  const [subtitle, setSubtitle] = useState('');
  const [benefit, setBenefit] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddScheme = async () => {
    setErrorMsg('');
    if (!title.trim()) {
      setErrorMsg('Please enter a Scheme Title.');
      return;
    }

    setLoading(true);
    try {
      const BASE_URL = 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/schemes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          subtitle: subtitle.trim() || 'Government Farmer Welfare Initiative',
          benefit: benefit.trim() || 'Direct Financial Assistance & Subsidy',
          url: url.trim() || 'https://myscheme.gov.in',
          icon: category === 'State' ? 'sprout' : 'bank',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Government Scheme added successfully!', [
          {
            text: 'OK',
            onPress: () => router.replace('/admin/manage-schemes'),
          },
        ]);
      } else {
        setErrorMsg(data.error || 'Failed to add scheme.');
      }
    } catch (e: any) {
      setErrorMsg('Network error. Is the backend server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Add Government Scheme</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.formSubtitle}>
            Publish a new Central or State farmer welfare scheme for all users.
          </Text>

          {/* Category Toggle (Central vs State) */}
          <Text style={styles.label}>Scheme Category *</Text>
          <View style={styles.categoryToggleRow}>
            <TouchableOpacity
              style={[
                styles.categoryBtn,
                category === 'Central' && styles.categoryBtnActive,
              ]}
              onPress={() => setCategory('Central')}
            >
              <MaterialCommunityIcons
                name="bank"
                size={18}
                color={category === 'Central' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[
                  styles.categoryBtnText,
                  category === 'Central' && styles.categoryBtnTextActive,
                ]}
              >
                Central Scheme
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryBtn,
                category === 'State' && styles.categoryBtnActive,
              ]}
              onPress={() => setCategory('State')}
            >
              <MaterialCommunityIcons
                name="sprout"
                size={18}
                color={category === 'State' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[
                  styles.categoryBtnText,
                  category === 'State' && styles.categoryBtnTextActive,
                ]}
              >
                State Scheme
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scheme Form Inputs */}
          <Input
            label="Scheme Title *"
            placeholder="e.g. Kisan Drone Subsidy Scheme"
            value={title}
            onChangeText={setTitle}
            icon={<MaterialCommunityIcons name="format-title" size={20} color={Theme.Colors.primary} />}
          />

          <Input
            label="Subtitle / Summary *"
            placeholder="e.g. Up to 50% financial subsidy on agricultural drones"
            value={subtitle}
            onChangeText={setSubtitle}
            icon={<MaterialCommunityIcons name="text-short" size={20} color={Theme.Colors.primary} />}
          />

          <Input
            label="Benefit Details *"
            placeholder="e.g. Up to ₹5 Lakh grant for Farmer Producer Orgs"
            value={benefit}
            onChangeText={setBenefit}
            icon={<MaterialCommunityIcons name="currency-inr" size={20} color={Theme.Colors.primary} />}
          />

          <Input
            label="Official Portal / Website URL"
            placeholder="https://agriwelfare.gov.in"
            keyboardType="url"
            autoCapitalize="none"
            value={url}
            onChangeText={setUrl}
            icon={<MaterialCommunityIcons name="link-variant" size={20} color={Theme.Colors.primary} />}
          />

          {errorMsg ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Theme.Colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <Button
            title={loading ? 'Adding Scheme...' : 'Publish Scheme'}
            onPress={handleAddScheme}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
  },
  flex1: {
    flex: 1,
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  categoryToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  categoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  categoryBtnActive: {
    backgroundColor: Theme.Colors.primary,
  },
  categoryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: Theme.Colors.error,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  submitBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 14,
  },
});
