import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';

interface Props {
  size?: 'small' | 'medium' | 'large';
  light?: boolean;
}

const logoImg = require('../../assets/WhatsApp Image 2026-05-03 at 22.35.07.png');

export function MifLogo({ size = 'medium', light = false }: Props) {
  const dim = size === 'large' ? 100 : size === 'medium' ? 64 : 40;
  return (
    <View style={styles.container}>
      <Image source={logoImg} style={{ width: dim, height: dim }} resizeMode="contain" />
      <Text style={[styles.tagline, { color: light ? 'rgba(255,255,255,0.7)' : Colors.textLight }]}>
        make it find
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  tagline: {
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 6,
    textTransform: 'lowercase',
  },
});
