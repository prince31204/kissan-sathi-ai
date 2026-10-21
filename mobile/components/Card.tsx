import React from 'react';
import { View, StyleSheet, ViewProps, TouchableOpacity } from 'react-native';
import { Theme } from '../constants/Theme';

interface CardProps extends ViewProps {
  onPress?: () => void;
  children: React.ReactNode;
  elevation?: 'sm' | 'md';
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  elevation = 'sm',
  noPadding = false,
  ...props
}) => {
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[
          styles.card,
          Theme.Shadows[elevation],
          noPadding ? styles.noPadding : styles.padding,
          style,
        ]}
        {...(props as any)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.card,
        Theme.Shadows[elevation],
        noPadding ? styles.noPadding : styles.padding,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.Colors.surface,
    borderRadius: Theme.BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.Colors.border,
  },
  padding: {
    padding: Theme.Spacing.md,
  },
  noPadding: {
    padding: 0,
  },
});
