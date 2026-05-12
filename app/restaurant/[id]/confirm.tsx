import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Animated, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';

export default function ConfirmScreen() {
  const { table, guests, name, date, email, restaurantName } = useLocalSearchParams<{
    table: string; guests: string; name: string; date: string;
    email: string; restaurantName: string;
  }>();

  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const sendEmail = () => {
    const subject = encodeURIComponent(`Confirmación de reserva — ${restaurantName || 'Restaurante'}`);
    const body = encodeURIComponent(
      `Hola ${name || ''},\n\n` +
      `Tu reserva fue confirmada con éxito.\n\n` +
      `📍 Restaurante: ${restaurantName || '—'}\n` +
      `🪑 Mesa: Mesa ${table || '—'}\n` +
      `👥 Personas: ${guests || '—'}\n` +
      `📅 Fecha: ${date || '—'}\n\n` +
      `¡Te esperamos!`
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={52} color={Colors.white} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity, width: '100%' }}>
          <Text style={styles.title}>¡Reserva confirmada!</Text>
          <Text style={styles.subtitle}>Te esperamos, {name || 'viajero'}.</Text>

          <View style={styles.card}>
            <Row icon="storefront-outline"  label="Restaurante" value={restaurantName || '—'} />
            <Row icon="grid-outline"        label="Mesa"        value={`Mesa ${table || '—'}`} />
            <Row icon="people-outline"      label="Personas"    value={guests ? `${guests} personas` : '—'} />
            <Row icon="calendar-outline"    label="Fecha"       value={date || 'Por confirmar'} last />
          </View>

          {email ? (
            <TouchableOpacity style={styles.emailBtn} onPress={sendEmail}>
              <Ionicons name="mail-outline" size={18} color={Colors.white} />
              <Text style={styles.emailBtnText}>Enviar confirmación por email</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>

      <Animated.View style={[styles.actions, { opacity }]}>
        <TouchableOpacity style={styles.btnHome} onPress={() => router.replace('/(client)')}>
          <Text style={styles.btnHomeText}>Volver al inicio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnProfile} onPress={() => router.replace('/(client)/profile')}>
          <Text style={styles.btnProfileText}>Ver mis reservas</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  iconWrapper: { marginBottom: 28 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.success, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowIcon: { marginRight: 10 },
  rowLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  emailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 13, borderRadius: 12, marginBottom: 8,
  },
  emailBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  actions: { padding: 24, gap: 10 },
  btnHome: { backgroundColor: Colors.primary, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  btnHomeText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  btnProfile: {
    borderWidth: 1.5, borderColor: Colors.border, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  btnProfileText: { color: Colors.text, fontWeight: '600', fontSize: 15 },
});
