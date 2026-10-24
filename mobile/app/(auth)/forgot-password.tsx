import React, { useState, useEffect } from 'react';
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
import { BACKEND_URL } from '@/config/api';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP & New Pass, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Resend timer
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: any;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const BASE_URL = BACKEND_URL;

  // Step 1: Send OTP to Email
  const handleSendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setDevOtpHint(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message || 'OTP has been sent to your email.');
        if (data.devOtp) {
          setDevOtpHint(data.devOtp);
        }
        setStep(2);
        setTimer(30);
        setCanResend(false);
      } else {
        setErrorMsg(data.detail || 'Could not send OTP. Please check your email.');
      }
    } catch (error) {
      setErrorMsg('Network error. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('A new OTP has been sent to your email.');
        if (data.devOtp) {
          setDevOtpHint(data.devOtp);
        }
        setTimer(30);
        setCanResend(false);
      } else {
        setErrorMsg(data.detail || 'Failed to resend OTP.');
      }
    } catch (error) {
      setErrorMsg('Network error while resending OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async () => {
    setErrorMsg('');

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      setErrorMsg('Please enter the verification OTP code.');
      return;
    }

    if (!newPassword) {
      setErrorMsg('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: trimmedOtp,
          newPassword: newPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep(3);
      } else {
        setErrorMsg(data.detail || 'Failed to reset password. Please verify your OTP.');
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
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Back Button */}
          {step !== 3 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (step === 2) {
                  setStep(1);
                  setErrorMsg('');
                } else {
                  router.back();
                }
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={Theme.Colors.text} />
              <Text style={styles.backText}>{step === 2 ? 'Change Email' : 'Back to Login'}</Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons
                name={step === 3 ? 'check-circle' : step === 2 ? 'shield-key' : 'lock-reset'}
                size={48}
                color={step === 3 ? Theme.Colors.success : Theme.Colors.primary}
              />
            </View>
            <Text style={styles.title}>
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Verify & Reset'}
              {step === 3 && 'Password Changed!'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 && 'Enter your registered email address and we will send you a 6-digit OTP code.'}
              {step === 2 && `Enter the 6-digit OTP code sent to\n${email}`}
              {step === 3 && 'Your password has been successfully reset. You can now log in with your new password.'}
            </Text>
          </View>

          {/* Error & Info Messages */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={Theme.Colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Development / Fallback OTP Hint */}
          {devOtpHint && step === 2 && (
            <View style={styles.devHintBox}>
              <MaterialCommunityIcons name="information-outline" size={20} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.devHintTitle}>Development Mode OTP:</Text>
                <Text style={styles.devHintCode}>{devOtpHint}</Text>
                <Text style={styles.devHintSub}>(Check server console or use code above)</Text>
              </View>
            </View>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <View style={styles.form}>
              <Input
                label="Registered Email Address"
                placeholder="farmer@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                icon={<MaterialCommunityIcons name="email-outline" size={20} color={Theme.Colors.textSecondary} />}
              />

              <Button
                title={loading ? 'Sending OTP...' : 'Send OTP to Email'}
                onPress={handleSendOtp}
                loading={loading}
                style={styles.submitBtn}
              />

              <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
                <Text style={styles.cancelText}>Cancel & Go Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 2 && (
            <View style={styles.form}>
              <Input
                label="6-Digit OTP Code"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                icon={<MaterialCommunityIcons name="numeric" size={20} color={Theme.Colors.textSecondary} />}
              />

              <Input
                label="New Password"
                placeholder="Enter new password (min. 6 characters)"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                icon={<MaterialCommunityIcons name="lock-outline" size={20} color={Theme.Colors.textSecondary} />}
              />

              <Input
                label="Confirm New Password"
                placeholder="Re-enter new password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                icon={<MaterialCommunityIcons name="lock-check-outline" size={20} color={Theme.Colors.textSecondary} />}
              />

              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                    <Text style={styles.resendLink}>Didn't receive code? Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.timerText}>
                    Resend OTP in <Text style={{ fontWeight: 'bold' }}>{timer}s</Text>
                  </Text>
                )}
              </View>

              <Button
                title={loading ? 'Updating Password...' : 'Reset Password'}
                onPress={handleResetPassword}
                loading={loading}
                style={styles.submitBtn}
              />
            </View>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <View style={styles.successContainer}>
              <View style={styles.successCard}>
                <MaterialCommunityIcons name="shield-check" size={60} color={Theme.Colors.success} />
                <Text style={styles.successHeading}>All Set!</Text>
                <Text style={styles.successDescription}>
                  Your account password has been updated securely. You can now use your new password to log in.
                </Text>
                <Button
                  title="Login Now"
                  onPress={() => router.replace('/(auth)/login')}
                  style={styles.submitBtn}
                />
              </View>
            </View>
          )}
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
    padding: Theme.Spacing.lg,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.Spacing.lg,
    alignSelf: 'flex-start',
  },
  backText: {
    ...Theme.Typography.bodyMedium,
    color: Theme.Colors.text,
    marginLeft: Theme.Spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.Spacing.md,
  },
  title: {
    ...Theme.Typography.h2,
    color: Theme.Colors.text,
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    ...Theme.Typography.body,
    color: Theme.Colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.Spacing.xs,
    paddingHorizontal: Theme.Spacing.sm,
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: Theme.Spacing.md,
    borderRadius: Theme.BorderRadius.md,
    marginBottom: Theme.Spacing.md,
  },
  errorText: {
    ...Theme.Typography.body,
    color: Theme.Colors.error,
    marginLeft: Theme.Spacing.sm,
    flex: 1,
    fontSize: 14,
  },
  devHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: Theme.Spacing.md,
    borderRadius: Theme.BorderRadius.md,
    marginBottom: Theme.Spacing.md,
  },
  devHintTitle: {
    ...Theme.Typography.small,
    color: '#92400E',
    fontWeight: '600',
  },
  devHintCode: {
    fontSize: 22,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 4,
    marginVertical: 2,
  },
  devHintSub: {
    fontSize: 11,
    color: '#B45309',
  },
  form: {
    marginBottom: Theme.Spacing.xl,
  },
  resendRow: {
    alignItems: 'center',
    marginVertical: Theme.Spacing.sm,
  },
  resendLink: {
    ...Theme.Typography.bodyMedium,
    color: Theme.Colors.primary,
    fontWeight: '600',
  },
  timerText: {
    ...Theme.Typography.body,
    color: Theme.Colors.textSecondary,
  },
  submitBtn: {
    marginTop: Theme.Spacing.md,
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: Theme.Spacing.md,
    padding: Theme.Spacing.xs,
  },
  cancelText: {
    ...Theme.Typography.bodyMedium,
    color: Theme.Colors.textSecondary,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: Theme.Colors.surface,
    padding: Theme.Spacing.xl,
    borderRadius: Theme.BorderRadius.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  successHeading: {
    ...Theme.Typography.h2,
    color: Theme.Colors.text,
    marginTop: Theme.Spacing.md,
  },
  successDescription: {
    ...Theme.Typography.body,
    color: Theme.Colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.Spacing.xs,
    marginBottom: Theme.Spacing.lg,
    lineHeight: 22,
  },
});
