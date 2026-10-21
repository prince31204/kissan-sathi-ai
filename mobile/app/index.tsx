import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="leaf" size={80} color={Theme.Colors.primary} />
      <Text style={styles.title}>KisanSaathi AI</Text>
      <Text style={styles.subtitle}>Smart Farming. Better Decisions.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Theme.Typography.h1,
    color: Theme.Colors.primary,
    marginTop: Theme.Spacing.md,
  },
  subtitle: {
    ...Theme.Typography.bodyMedium,
    color: Theme.Colors.textSecondary,
    marginTop: Theme.Spacing.sm,
  },
});
