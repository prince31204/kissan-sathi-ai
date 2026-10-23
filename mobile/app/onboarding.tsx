import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Theme } from '../constants/Theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../components/Button';

const { width } = Dimensions.get('window');
const kisanImage = require('../assets/images/kisan.png');

const ONBOARDING_STEPS = [
  {
    title: 'Smart Farming\nfor a Better Tomorrow',
    tagline: '“किसान का साथी\nहर कदम पर”',
    description: 'AI-powered crop guidance, live mandi rates & smart irrigation in your language.',
    icon: 'sprout',
  },
  {
    title: 'Smart Irrigation &\nWeather Forecast',
    tagline: '“पानी की बचत,\nबेहतर फसल”',
    description: 'Pinpoint precision irrigation schedules tailored to your local soil moisture.',
    icon: 'water-percent',
  },
  {
    title: 'Fair Mandi Prices &\nEquipment Access',
    tagline: '“सटीक दाम,\nअधिक मुनाफा”',
    description: 'Compare live mandi rates and rent affordable tractors and machinery nearby.',
    icon: 'tractor',
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Skip Row */}
      <View style={styles.topSkipRow}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Brand Logo & Sprout badge matching Screen 1 */}
        <View style={styles.logoSection}>
          <View style={styles.sproutBadge}>
            <MaterialCommunityIcons name="sprout" size={44} color={Theme.Colors.primary} />
            <View style={styles.sunDot} />
          </View>
          <Text style={styles.brandTitle}>
            Kisaan <Text style={{ color: Theme.Colors.primary }}>Saathi</Text>
          </Text>
        </View>

        {/* Step Title & Tagline matching Screen 1 */}
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.tagline}>{step.tagline}</Text>

        {/* Hero Image of Kisan Saathi in Field matching Mockup Screen 1 */}
        <View style={styles.imageCardContainer}>
          <Image
            source={kisanImage}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageGradientOverlay} />
        </View>

        {/* Description */}
        <Text style={styles.description}>{step.description}</Text>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentStep === index && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      {/* Bottom Button matching Screen 1: "Get Started →" */}
      <View style={styles.footer}>
        <Button
          title={currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started →' : 'Continue →'}
          onPress={handleNext}
          style={styles.mainBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.Colors.background,
  },
  topSkipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  sproutBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  sunDot: {
    position: 'absolute',
    top: 10,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    lineHeight: 26,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.Colors.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 20,
  },
  imageCardContainer: {
    width: width - 48,
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    shadowColor: '#136B36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginVertical: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'transparent',
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 16,
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    backgroundColor: Theme.Colors.primary,
    width: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  mainBtn: {
    height: 52,
    borderRadius: 14,
  },
});
