import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme/colors';
import { MifLogo } from '@/components/MifLogo';
import { useAuth } from '@/hooks/useAuth';

const { height } = Dimensions.get('window');

let introShown = false;

export default function SplashScreen() {
  const [checking, setChecking] = useState(true);
  const { user, loading: authLoading, role } = useAuth();

  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.5)).current;
  const pulseScale   = useRef(new Animated.Value(1)).current;
  const titleAnim    = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const btnsAnim     = useRef(new Animated.Value(0)).current;
  const ring1Anim    = useRef(new Animated.Value(0)).current;
  const ring2Anim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!introShown) {
      introShown = true;
      setTimeout(() => router.replace('/intro'), 0);
      return;
    }
    AsyncStorage.getItem('onboarding_done').then((val) => {
      if (!val) router.replace('/onboarding');
      else setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!checking && !authLoading && user) {
      router.replace(role === 'restaurant' ? '/(restaurant)/dashboard' : '/(client)');
    }
  }, [checking, authLoading, user, role]);

  useEffect(() => {
    if (checking || authLoading) return;

    // Entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(subtitleAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
      Animated.timing(btnsAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    // Continuous gentle pulse on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.07, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1,    duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Expanding ring effect
    const runRings = () => {
      ring1Anim.setValue(0);
      ring2Anim.setValue(0);
      Animated.parallel([
        Animated.timing(ring1Anim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(ring2Anim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        ]),
      ]).start(() => setTimeout(runRings, 300));
    };
    runRings();
  }, [checking, authLoading]);

  if (checking || authLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080912" />

      {/* Ambient background orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <View style={styles.orb3} />

      {/* Center hero */}
      <View style={styles.top}>
        {/* Expanding rings */}
        <Animated.View style={[styles.ring, {
          opacity: ring1Anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.3, 0] }),
          transform: [{ scale: ring1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
        }]} />
        <Animated.View style={[styles.ring, {
          opacity: ring2Anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.2, 0] }),
          transform: [{ scale: ring2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] }) }],
        }]} />

        {/* Logo — nested so entrance-scale and pulse-scale don't conflict */}
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
            <MifLogo size="large" light />
          </Animated.View>
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[styles.appName, {
          opacity: titleAnim,
          transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
        }]}>
          Make It Find
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.subtitle, {
          opacity: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
          transform: [{ translateY: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }]}>
          Encontrá, seguí y reservá{'\n'}los mejores restaurantes
        </Animated.Text>

        {/* Decorative dots row */}
        <Animated.View style={[styles.dotsRow, {
          opacity: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
        }]}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotMid]} />
          <View style={styles.dot} />
        </Animated.View>
      </View>

      {/* Buttons */}
      <Animated.View style={[styles.bottom, {
        opacity: btnsAnim,
        transform: [{ translateY: btnsAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
      }]}>
        <TouchableOpacity style={styles.btnLogin} activeOpacity={0.82} onPress={() => router.push('/auth/login')}>
          <Text style={styles.btnLoginText}>Iniciar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnRegister} activeOpacity={0.7} onPress={() => router.push('/auth/register')}>
          <Text style={styles.btnRegisterText}>Crear cuenta</Text>
        </TouchableOpacity>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: '#080912', alignItems: 'center', justifyContent: 'center' },
  safe: {
    flex: 1,
    backgroundColor: '#080912',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 36,
    overflow: 'hidden',
  },

  // Ambient blobs
  orb1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.primary,
    opacity: 0.09,
    top: -100,
    right: -100,
  },
  orb2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#5B8DEF',
    opacity: 0.06,
    top: height * 0.35,
    left: -80,
  },
  orb3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.07,
    bottom: 80,
    right: -50,
  },

  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },

  appName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 26,
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 24,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
  },
  dotMid: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Buttons
  bottom: { gap: 12 },
  btnLogin: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  btnLoginText: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.4 },
  btnRegister: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnRegisterText: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 17, letterSpacing: 0.4 },

  demoSection: { marginTop: 6, gap: 8 },
  demoTitle: { color: 'rgba(255,255,255,0.16)', textAlign: 'center', fontSize: 11, letterSpacing: 2 },
  demoRow: { flexDirection: 'row', gap: 10 },
  demoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  demoBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
});
