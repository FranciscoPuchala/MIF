import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Switch, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const Colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const styles = makeStyles(Colors);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.groupLabel}>Apariencia</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? '#3A3A5A' : '#E8E8F0' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#A0A0FF' : '#FF9800'} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Modo oscuro</Text>
                <Text style={styles.rowSub}>{isDark ? 'Activado' : 'Desactivado'}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
              thumbColor={isDark ? Colors.primary : Colors.textLight}
            />
          </View>
        </View>

        <Text style={styles.groupLabel}>Cuenta</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(restaurant)/edit-profile')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: Colors.tag }]}>
                <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
              </View>
              <Text style={styles.rowLabel}>Editar perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.row} onPress={() => router.push('/(restaurant)/my-profile')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: Colors.tag }]}>
                <Ionicons name="storefront-outline" size={20} color={Colors.textSecondary} />
              </View>
              <Text style={styles.rowLabel}>Ver mi perfil público</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.groupLabel}>Plano del local</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(restaurant)/tables')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: Colors.tag }]}>
                <Ionicons name="map-outline" size={20} color={Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Gestionar mesas</Text>
                <Text style={styles.rowSub}>Configurar posición y capacidad</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="headset-outline" size={20} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.rowLabel}>Contactar operador</Text>
                <Text style={styles.rowSub}>Para un plano profesional</Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.tag }]}>
              <Text style={[styles.badgeText, { color: Colors.textSecondary }]}>Próximamente</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(C: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.dark },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.dark,
    },
    headerTitle: { color: C.white === '#FFFFFF' ? '#FFFFFF' : C.text, fontWeight: '700', fontSize: 16 },
    scroll: { backgroundColor: C.background, flex: 1 },
    groupLabel: {
      fontSize: 12, fontWeight: '700', color: C.textSecondary,
      marginHorizontal: 16, marginTop: 24, marginBottom: 8,
      textTransform: 'uppercase', letterSpacing: 0.8,
    },
    card: {
      backgroundColor: C.white, marginHorizontal: 16, borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15, fontWeight: '500', color: C.text },
    rowSub: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    rowDivider: { height: 1, backgroundColor: C.border, marginLeft: 64 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: '600' },
  });
}
