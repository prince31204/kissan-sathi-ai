import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { Theme } from '../constants/Theme';

interface Props {
  style?: ViewStyle;
  variant?: 'light' | 'dark' | 'glass';
}

export const LanguageSwitchButton: React.FC<Props> = ({ style, variant = 'light' }) => {
  const { language, toggleLanguage } = useLanguage();

  const isHindi = language === 'hi';

  const isDark = variant === 'dark';
  const isGlass = variant === 'glass';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isDark && styles.containerDark,
        isGlass && styles.containerGlass,
        style,
      ]}
      onPress={toggleLanguage}
      activeOpacity={0.75}
      accessibilityLabel={`Switch language. Current: ${isHindi ? 'Hindi' : 'English'}`}
    >
      <View style={[styles.iconCircle, isHindi ? styles.iconCircleHi : styles.iconCircleEn]}>
        <MaterialCommunityIcons
          name="translate"
          size={16}
          color={isHindi ? '#047857' : '#0369a1'}
        />
      </View>

      <Text style={[styles.langText, isDark ? styles.langTextDark : styles.langTextLight]}>
        {isHindi ? 'हिन्दी' : 'ENG'}
      </Text>

      <View style={[styles.switchIndicator, isHindi ? styles.switchHi : styles.switchEn]}>
        <Text style={styles.switchSmallText}>{isHindi ? 'A' : 'अ'}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.BorderRadius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  containerGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: '#cbd5e1',
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  iconCircleHi: {
    backgroundColor: '#d1fae5',
  },
  iconCircleEn: {
    backgroundColor: '#e0f2fe',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  langTextLight: {
    color: Theme.Colors.text,
  },
  langTextDark: {
    color: '#ffffff',
  },
  switchIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  switchHi: {
    backgroundColor: '#fef3c7',
  },
  switchEn: {
    backgroundColor: '#dcfce7',
  },
  switchSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
});
