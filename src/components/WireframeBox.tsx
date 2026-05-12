import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/theme/colors';

interface Props {
  width?: number | string;
  height?: number;
  label?: string;
  style?: ViewStyle;
  rounded?: boolean;
  circle?: boolean;
}

export function WireframeBox({ width = '100%', height = 120, label, style, rounded, circle }: Props) {
  const size = circle ? height : undefined;
  return (
    <View
      style={[
        styles.box,
        {
          width: circle ? size : (width as any),
          height,
          borderRadius: circle ? (height / 2) : rounded ? 12 : 6,
        },
        style,
      ]}
    >
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.placeholder,
    borderWidth: 1.5,
    borderColor: '#BBBBBB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    color: Colors.placeholderText,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
