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
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../../constants/Theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email/mobile and password.');
      return;
    }

    setLoading(true);
    try {
      const BASE_URL = 'http://localhost:8000';
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.name) {
          await AsyncStorage.setItem('userName', data.name);
        }
        if (data.role === 'admin') {
          await AsyncStorage.setItem('userRole', 'admin');
          router.replace('/admin');
        } else {
          await AsyncStorage.setItem('userRole', 'user');
          router.replace('/(tabs)');
        }
      } else {
        setErrorMsg(data.detail || 'Login failed. Please check credentials.');
      }
    } catch (error) {
      setErrorMsg('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    await AsyncStorage.setItem('userName', 'Ramesh Singh');
    await AsyncStorage.setItem('userRole', 'user');
    router.replace('/(tabs)');
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
          {/* Top Bar with back arrow */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : null}
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color={Theme.Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <View style={styles.sproutBadge}>
                <MaterialCommunityIcons name="sprout" size={42} color={Theme.Colors.primary} />
                <View style={styles.sunDot} />
              </View>
              <Text style={styles.brandTitle}>
                Kisaan <Text style={styles.brandTitleGreen}>Saathi</Text>
              </Text>
            </View>

            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Login to continue</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Mobile Number / Email"
              placeholder="+91 98765 43210 or email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={20}
                  color={Theme.Colors.primary}
                />
              }
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              icon={
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={Theme.Colors.primary}
                />
              }
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              }
            />

            {errorMsg ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Theme.Colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Login Button */}
            <Button
              title={loading ? 'Logging in...' : 'Login'}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Login with OTP Button */}
            <Button
              title="Login with OTP"
              variant="outline"
              icon={
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={20}
                  color={Theme.Colors.primary}
                />
              }
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.otpBtn}
            />

            {/* Demo User Fast Track */}
            <TouchableOpacity style={styles.demoLink} onPress={handleDemoLogin}>
              <Text style={styles.demoText}>⚡ Quick Demo Login (Skip)</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New Farmer? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.registerLink}>Register Now</Text>
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
    paddingBottom: 28,
    justifyContent: 'center',
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sproutBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  sunDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  brandTitleGreen: {
    color: Theme.Colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  form: {
    marginBottom: 20,
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
  loginBtn: {
    marginTop: 6,
    height: 52,
    borderRadius: 14,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 14,
    color: Theme.Colors.primary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  otpBtn: {
    height: 50,
    borderRadius: 14,
    borderColor: Theme.Colors.primary,
  },
  demoLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  demoText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
  registerLink: {
    fontSize: 14,
    color: Theme.Colors.primary,
    fontWeight: '700',
  },
});
