export const LightColors = {
  primary: '#E53935',
  primaryDark: '#B71C1C',
  dark: '#1A1A2E',
  white: '#FFFFFF',
  background: '#F8F8F8',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  placeholder: '#D0D0D0',
  placeholderText: '#AAAAAA',
  text: '#1A1A2E',
  textSecondary: '#666666',
  textLight: '#999999',
  tag: '#F0F0F0',
  tagText: '#444444',
  success: '#4CAF50',
  warning: '#FF9800',
};

export const DarkColors = {
  primary: '#E53935',
  primaryDark: '#B71C1C',
  dark: '#0A0A12',
  white: '#1E1E2E',
  background: '#121218',
  surface: '#1E1E2E',
  border: '#2C2C3E',
  placeholder: '#2A2A3A',
  placeholderText: '#555566',
  text: '#ECECF4',
  textSecondary: '#9898A8',
  textLight: '#5A5A6A',
  tag: '#252535',
  tagText: '#9898A8',
  success: '#66BB6A',
  warning: '#FFA726',
};

// Default export kept for backward compatibility (will equal active theme via context)
export const Colors = LightColors;

export type AppColors = typeof LightColors;
