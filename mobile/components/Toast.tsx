import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  id?: string;
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onPress?: () => void;
}

interface ToastProps {
  toast: ToastConfig | null;
  onDismiss: () => void;
}

const TYPE_CONFIG = {
  success: {
    icon: 'check-circle' as const,
    color: '#10B981',
    bgColor: '#FFFFFF',
    borderColor: '#A7F3D0',
    iconBg: '#ECFDF5',
    titleColor: '#065F46',
  },
  error: {
    icon: 'alert-circle' as const,
    color: '#EF4444',
    bgColor: '#FFFFFF',
    borderColor: '#FECACA',
    iconBg: '#FEF2F2',
    titleColor: '#991B1B',
  },
  warning: {
    icon: 'alert' as const,
    color: '#F59E0B',
    bgColor: '#FFFFFF',
    borderColor: '#FDE68A',
    iconBg: '#FFFBEB',
    titleColor: '#92400E',
  },
  info: {
    icon: 'information' as const,
    color: '#0284C7',
    bgColor: '#FFFFFF',
    borderColor: '#BAE6FD',
    iconBg: '#F0F9FF',
    titleColor: '#075985',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (toast) {
      // Reset animation values
      translateY.setValue(-120);
      opacity.setValue(0);
      progress.setValue(1);

      // Slide in animation with spring bounce
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = toast.duration ?? 3500;

      // Progress bar countdown animation
      Animated.timing(progress, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }).start();

      // Auto dismiss timer
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!toast) return null;

  const type = toast.type || 'info';
  const conf = TYPE_CONFIG[type];
  const maxToastWidth = Math.min(width - 32, 440);

  const topOffset = Math.max(insets.top, Platform.OS === 'web' ? 16 : 12) + 8;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          if (toast.onPress) toast.onPress();
          handleDismiss();
        }}
        style={[
          styles.container,
          {
            width: maxToastWidth,
            borderColor: conf.borderColor,
            backgroundColor: conf.bgColor,
          },
        ]}
      >
        {/* Left Glowing Accent Stripe */}
        <View style={[styles.accentStrip, { backgroundColor: conf.color }]} />

        {/* Circular Icon Container with Micro-Badge */}
        <View style={[styles.iconCircle, { backgroundColor: conf.iconBg }]}>
          <MaterialCommunityIcons name={conf.icon} size={24} color={conf.color} />
        </View>

        {/* Text Container */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: conf.titleColor }]} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
          ) : null}
        </View>

        {/* Close Button */}
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Animated Progress Bar at Bottom */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: conf.color,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    opacity: 0.8,
  },
});
