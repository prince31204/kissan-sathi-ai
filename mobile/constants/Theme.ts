export const Colors = {
  // Primary Agricultural Forest Green (from reference design)
  primary: '#136B36', // Rich Forest Green (Kisaan Saathi brand)
  primaryDark: '#0D4E26', // Deep Forest Green for dark contrast
  primaryLight: '#E8F5EC', // Soft Mint Green background for badges & active states
  primaryMuted: '#2E7D32',
  
  // Secondary Harvest Warmth
  secondary: '#F59E0B', // Saffron / Warm Amber
  secondaryLight: '#FEF3C7',
  
  // Quick Action / Category Pastel Accents (matching 6-grid mockup)
  weatherBlue: '#2563EB',
  weatherLight: '#EFF6FF',
  soilGreen: '#16A34A',
  soilLight: '#F0FDF4',
  advisoryGreen: '#15803D',
  advisoryLight: '#DCFCE7',
  marketAmber: '#D97706',
  marketLight: '#FEF3C7',
  irrigationCyan: '#0284C7',
  irrigationLight: '#E0F2FE',
  schemesTeal: '#0F766E',
  schemesLight: '#CCFBF1',
  
  // General Accents
  accent: '#0284C7',
  accentLight: '#E0F2FE',
  
  // Backgrounds & Surfaces
  background: '#F6F9F6', // Clean, crisp natural light canvas
  surface: '#FFFFFF', // Pure White Cards
  surfaceSubtle: '#F8FAF8',
  
  // Typography Colors
  text: '#111827', // High contrast slate / charcoal
  textSecondary: '#64748B', // Medium Slate
  textMuted: '#94A3B8',
  textLight: '#FFFFFF',
  
  // Borders & Dividers
  border: '#E3ECE5', // Subtle natural card border
  borderLight: '#EDF3EE',
  
  // Status Colors
  success: '#15803D',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  disabled: '#CBD5E1',
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.text, lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500' as const, color: Colors.text, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  caption: { fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary },
  captionMedium: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary },
  small: { fontSize: 12, fontWeight: '400' as const, color: Colors.textSecondary },
  smallBold: { fontSize: 12, fontWeight: '600' as const, color: Colors.text },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 36,
};

export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#136B36',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#136B36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const Theme = {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
};

export default Theme;
