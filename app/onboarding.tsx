import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Dimensions, FlatList, Animated, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'search-outline' as const,
    iconBg: '#FFEBEE',
    iconColor: Colors.primary,
    title: 'Descubrí restaurantes',
    subtitle: 'Explorá los mejores lugares cerca tuyo. Filtrá por tipo de cocina, precio y mucho más.',
  },
  {
    id: '2',
    icon: 'calendar-outline' as const,
    iconBg: '#E8F5E9',
    iconColor: Colors.success,
    title: 'Reservá en segundos',
    subtitle: 'Elegí tu mesa, fecha y hora favorita. Confirmación instantánea sin llamadas ni esperas.',
  },
  {
    id: '3',
    icon: 'heart-outline' as const,
    iconBg: '#EDE7F6',
    iconColor: '#7C4DFF',
    title: 'Seguí tus favoritos',
    subtitle: 'Recibí las últimas novedades, menús especiales y promociones de los restaurantes que amás.',
  },
];

export default function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: current + 1, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Omitir</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        scrollEnabled={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) => {
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={64} color={item.iconColor} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: Colors.primary }]}
            />
          );
        })}
      </View>

      {/* Botón */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={goNext}>
          <Text style={styles.btnText}>
            {current === SLIDES.length - 1 ? 'Empezar' : 'Siguiente'}
          </Text>
          <Ionicons
            name={current === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color={Colors.white}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  skip: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  skipText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 40,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 32 },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 28, paddingBottom: 20 },
  btn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: 16,
    gap: 8,
  },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});
