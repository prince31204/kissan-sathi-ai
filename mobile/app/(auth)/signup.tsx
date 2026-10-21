import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SignupScreen() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    village: '',
    district: '',
    state: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async () => {
    setErrorMsg('');
    if (!form.fullName || !form.email || !form.password) {
      setErrorMsg('Please fill in all mandatory fields.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const BASE_URL = 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Account created successfully! Please login.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      } else {
        setErrorMsg(data.detail || 'Registration failed.');
      }
    } catch (error) {
      setErrorMsg('Network error. Is the server running?');
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={Theme.Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="account-plus" size={36} color={Theme.Colors.primary} />
            </View>
            <Text style={styles.title}>Register as Farmer</Text>
            <Text style={styles.subtitle}>Create your free account on KisanSaathi</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full Name *"
              placeholder="e.g. Ramesh Singh"
              value={form.fullName}
              onChangeText={(t) => setForm({ ...form, fullName: t })}
              icon={<MaterialCommunityIcons name="account-outline" size={20} color={Theme.Colors.primary} />}
            />
            <Input
              label="Email Address *"
              placeholder="farmer@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
              icon={<MaterialCommunityIcons name="email-outline" size={20} color={Theme.Colors.primary} />}
            />
            <Input
              label="Village / Town"
              placeholder="Enter your village"
              value={form.village}
              onChangeText={(t) => setForm({ ...form, village: t })}
              icon={<MaterialCommunityIcons name="home-outline" size={20} color={Theme.Colors.primary} />}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Input
                  label="District"
                  placeholder="District"
                  value={form.district}
                  onChangeText={(t) => setForm({ ...form, district: t })}
                  icon={<MaterialCommunityIcons name="map-marker-outline" size={18} color={Theme.Colors.primary} />}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="State"
                  placeholder="State"
                  value={form.state}
                  onChangeText={(t) => setForm({ ...form, state: t })}
                  icon={<MaterialCommunityIcons name="city-variant-outline" size={18} color={Theme.Colors.primary} />}
                />
              </View>
            </View>

            <Input
              label="Password *"
              placeholder="Create strong password"
              secureTextEntry
              value={form.password}
              onChangeText={(t) => setForm({ ...form, password: t })}
              icon={<MaterialCommunityIcons name="lock-outline" size={20} color={Theme.Colors.primary} />}
            />
            <Input
              label="Confirm Password *"
              placeholder="Re-enter password"
              secureTextEntry
              value={form.confirmPassword}
              onChangeText={(t) => setForm({ ...form, confirmPassword: t })}
              icon={<MaterialCommunityIcons name="lock-check-outline" size={20} color={Theme.Colors.primary} />}
            />

            {errorMsg ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Theme.Colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Button
              title={loading ? 'Creating Account...' : 'Complete Registration'}
              onPress={handleSignup}
              loading={loading}
              style={styles.signupBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.linkText}>Login</Text>
            </TouchableOpacity>
          </View>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  topBar: {
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  form: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
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
  signupBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  linkText: {
    fontSize: 14,
    color: Theme.Colors.primary,
    fontWeight: '700',
  },
});
