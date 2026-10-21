import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';
import { Theme } from '../constants/Theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  icon,
  style,
  disabled,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return Theme.Colors.disabled;
    if (variant === 'secondary') return Theme.Colors.primaryLight;
    if (variant === 'outline') return '#FFFFFF';
    if (variant === 'ghost') return 'transparent';
    return Theme.Colors.primary;
  };

  const getTextColor = () => {
    if (disabled) return '#FFFFFF';
    if (variant === 'outline') return Theme.Colors.primary;
    if (variant === 'secondary') return Theme.Colors.primary;
    if (variant === 'ghost') return Theme.Colors.primary;
    return '#FFFFFF';
  };

  const getBorderColor = () => {
    if (variant === 'outline') return disabled ? Theme.Colors.disabled : Theme.Colors.primary;
    return 'transparent';
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          width: fullWidth ? '100%' : 'auto',
        },
        variant === 'primary' && !disabled ? styles.primaryShadow : null,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.85}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: Theme.BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.Spacing.lg,
  },
  primaryShadow: {
    shadowColor: '#136B36',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...Theme.Typography.bodyBold,
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    marginRight: Theme.Spacing.sm,
  },
});
