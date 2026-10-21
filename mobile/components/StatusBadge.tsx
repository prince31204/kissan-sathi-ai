import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../constants/Theme';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'default';
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getColors = () => {
    switch (status) {
      case 'success':
        return { bg: '#D1FAE5', text: Theme.Colors.success };
      case 'warning':
        return { bg: '#FEF3C7', text: Theme.Colors.warning };
      case 'error':
        return { bg: '#FEE2E2', text: Theme.Colors.error };
      case 'info':
        return { bg: '#DBEAFE', text: '#2563EB' };
      default:
        return { bg: '#F3F4F6', text: Theme.Colors.textSecondary };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Theme.Spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.BorderRadius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    ...Theme.Typography.small,
    fontWeight: '600',
  },
});
