import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Image, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/context/ThemeContext';
import { AppColors } from '@/theme/colors';
import { useRestaurantReservations } from '@/hooks/useReservations';
import { useAuth } from '@/hooks/useAuth';
import { getRestaurantByOwner, updateRestaurant } from '@/services/restaurants';
import { logout } from '@/services/auth';
import { Restaurant, Reservation } from '@/types';

const QUICK_ACTIONS = [
  { label: 'Nueva publicación', icon: 'add-circle-outline', href: '/(restaurant)/new-post' as const },
  { label: 'Gestionar mesas',   icon: 'grid-outline',        href: '/(restaurant)/tables' as const },
  { label: 'Ver reservas',      icon: 'list-outline',        href: '/(restaurant)/reservations' as const },
  { label: 'Mi perfil',         icon: 'storefront-outline',  href: '/(restaurant)/my-profile' as const },
];

export default function RestaurantDashboard() {
  const Colors = useColors();
  const styles = makeStyles(Colors);
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [toggling, setToggling] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getRestaurantByOwner(user.uid).then(setRestaurant);
  }, [user?.uid]);

  const handleToggleOpen = async () => {
    if (!restaurant) return;
    setToggling(true);
    try {
      await updateRestaurant(restaurant.id, { isOpen: !restaurant.isOpen });
      setRestaurant((r) => r ? { ...r, isOpen: !r.isOpen } : r);
    } finally {
      setToggling(false);
    }
  };

  const restaurantId = restaurant?.id ?? '';
  const { reservations, loading } = useRestaurantReservations(restaurantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayReservations = reservations.filter((r) => {
    if (!r.date) return false;
    const ts = (r.date as any)?.seconds;
    const d = ts ? new Date(ts * 1000) : r.date instanceof Date ? r.date : new Date(r.date as any);
    return !isNaN(d.getTime()) && d >= today;
  });

  const pending   = todayReservations.filter((r) => r.status === 'pending').length;
  const confirmed = todayReservations.filter((r) => r.status === 'confirmed').length;
  const upcoming  = todayReservations.slice(0, 3);

  const STATS = [
    { label: 'Reservas hoy',  value: String(todayReservations.length), icon: 'calendar',          color: Colors.primary },
    { label: 'Confirmadas',   value: String(confirmed),                icon: 'checkmark-circle',  color: Colors.success },
    { label: 'Pendientes',    value: String(pending),                  icon: 'time',              color: Colors.warning },
    { label: 'Total historial', value: String(reservations.length),   icon: 'people',            color: '#7C4DFF' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerGreet}>Panel de restaurante</Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {restaurant?.name ?? '...'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(restaurant)/reservations')}>
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
            {pending > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pending}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)}>
            {restaurant?.logoUrl
              ? <Image source={{ uri: restaurant.logoUrl }} style={styles.headerLogo} />
              : <View style={styles.headerLogoPlaceholder}>
                  <Ionicons name="storefront-outline" size={18} color="rgba(255,255,255,0.6)" />
                </View>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.statsGrid}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                  <Ionicons name={s.icon as any} size={20} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} href={a.href} asChild>
              <TouchableOpacity style={styles.actionCard}>
                <Ionicons name={a.icon as any} size={26} color={Colors.primary} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        {/* Próximas reservas */}
        <Text style={styles.sectionTitle}>Próximas reservas</Text>
        <View style={styles.reservationsCard}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} />
          ) : upcoming.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay reservas pendientes</Text>
            </View>
          ) : (
            upcoming.map((r, i) => {
              const date = r.date instanceof Date ? r.date : new Date((r.date as any)?.seconds * 1000);
              return (
                <View key={r.id} style={[styles.reservRow, i < upcoming.length - 1 && styles.reservBorder]}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeText}>{r.timeSlot}</Text>
                  </View>
                  <View style={styles.reservInfo}>
                    <Text style={styles.reservName}>{r.userName}</Text>
                    <Text style={styles.reservMeta}>Mesa {r.tableNumber} · {r.guests} personas</Text>
                  </View>
                  <StatusBadge status={r.status} />
                </View>
              );
            })
          )}
          {!loading && upcoming.length > 0 && (
            <Link href="/(restaurant)/reservations" asChild>
              <TouchableOpacity style={styles.verTodasBtn}>
                <Text style={styles.verTodasText}>Ver todas las reservas</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </Link>
          )}
        </View>

        {/* Estado */}
        <Text style={styles.sectionTitle}>Estado del local</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={restaurant?.isOpen ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={restaurant?.isOpen ? Colors.success : Colors.primary}
            />
            <Text style={styles.statusText}>
              {restaurant?.isOpen ? 'Restaurante abierto' : 'Restaurante cerrado'}
            </Text>
            <TouchableOpacity style={styles.statusToggle} onPress={handleToggleOpen} disabled={toggling}>
              {toggling
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.statusToggleText}>Cambiar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Profile menu modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard} onStartShouldSetResponder={() => true}>
            {/* Header info */}
            <View style={styles.menuHeader}>
              {restaurant?.logoUrl
                ? <Image source={{ uri: restaurant.logoUrl }} style={styles.menuAvatar} />
                : <View style={[styles.menuAvatar, styles.menuAvatarFallback]}>
                    <Ionicons name="storefront-outline" size={26} color={Colors.white} />
                  </View>
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.menuName} numberOfLines={1}>{restaurant?.name ?? '—'}</Text>
                <Text style={styles.menuEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
              </View>
            </View>

            <View style={styles.menuDivider} />

            {/* Menu options */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); router.push('/(restaurant)/my-profile'); }}
            >
              <Ionicons name="storefront-outline" size={20} color={Colors.text} />
              <Text style={styles.menuItemText}>Mi perfil</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); router.push('/(restaurant)/edit-profile'); }}
            >
              <Ionicons name="pencil-outline" size={20} color={Colors.text} />
              <Text style={styles.menuItemText}>Editar perfil</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); router.push('/(restaurant)/settings'); }}
            >
              <Ionicons name="settings-outline" size={20} color={Colors.text} />
              <Text style={styles.menuItemText}>Configuración</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Cerrar sesión', '¿Querés cerrar sesión?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.primary} />
              <Text style={[styles.menuItemText, { color: Colors.primary }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const Colors = useColors();
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: '#FFF8E1', color: Colors.warning,        label: 'Pendiente' },
    confirmed: { bg: '#E8F5E9', color: Colors.success,        label: 'Confirmada' },
    cancelled: { bg: '#FFEBEE', color: Colors.primary,        label: 'Cancelada' },
    done:      { bg: Colors.tag, color: Colors.textSecondary, label: 'Completada' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <View style={{ borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.color }}>{c.label}</Text>
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.dark },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.dark,
    },
    headerGreet: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    headerName: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerLogo: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
    headerLogoPlaceholder: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
    notifBtn: { position: 'relative' },
    badge: {
      position: 'absolute', top: -4, right: -4,
      backgroundColor: C.primary, borderRadius: 7,
      width: 14, height: 14, alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
    scroll: { backgroundColor: C.background },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
    statCard: {
      width: '47%', backgroundColor: C.white, borderRadius: 12, padding: 14,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statValue: { fontSize: 26, fontWeight: '800', color: C.text },
    statLabel: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    sectionTitle: {
      fontSize: 16, fontWeight: '700', color: C.text,
      marginHorizontal: 16, marginTop: 8, marginBottom: 10,
    },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 8 },
    actionCard: {
      width: '47%', backgroundColor: C.white, borderRadius: 12, padding: 16,
      alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    actionLabel: { fontSize: 13, color: C.text, fontWeight: '500', marginTop: 8, textAlign: 'center' },
    reservationsCard: {
      backgroundColor: C.white, marginHorizontal: 16, borderRadius: 12,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 8,
      overflow: 'hidden',
    },
    empty: { padding: 20, alignItems: 'center' },
    emptyText: { color: C.textSecondary, fontSize: 14 },
    reservRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    reservBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    timeBox: {
      backgroundColor: C.tag, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 6, marginRight: 12,
    },
    timeText: { fontSize: 13, fontWeight: '700', color: C.text },
    reservInfo: { flex: 1 },
    reservName: { fontSize: 14, fontWeight: '600', color: C.text },
    reservMeta: { fontSize: 12, color: C.textLight, marginTop: 2 },
    verTodasBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 4,
    },
    verTodasText: { fontSize: 13, color: C.primary, fontWeight: '600' },
    statusCard: {
      backgroundColor: C.white, marginHorizontal: 16, borderRadius: 12,
      padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 12,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusText: { flex: 1, fontSize: 14, color: C.text },
    statusToggle: { backgroundColor: C.tag, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusToggleText: { fontSize: 12, color: C.primary, fontWeight: '600' },
    menuOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'flex-end', justifyContent: 'flex-start',
      paddingTop: 80, paddingRight: 16,
    },
    menuCard: {
      backgroundColor: C.white, borderRadius: 16, minWidth: 240,
      shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
      overflow: 'hidden',
    },
    menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    menuAvatar: { width: 48, height: 48, borderRadius: 24 },
    menuAvatarFallback: { backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
    menuName: { fontSize: 15, fontWeight: '700', color: C.text },
    menuEmail: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    menuDivider: { height: 1, backgroundColor: C.border },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    menuItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: C.text },
  });
}
