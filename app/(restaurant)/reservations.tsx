import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { useRestaurantReservations } from '@/hooks/useReservations';
import { updateReservationStatus } from '@/services/reservations';
import { getRestaurantByOwner } from '@/services/restaurants';
import { useAuth } from '@/hooks/useAuth';
import { Reservation, ReservationStatus } from '@/types';

const TABS: { key: ReservationStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todas' },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmadas' },
  { key: 'done',      label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
];

const STATUS_CONFIG: Record<ReservationStatus, { color: string; bg: string; label: string; icon: string }> = {
  pending:   { color: Colors.warning,       bg: '#FFF8E1', label: 'Pendiente',   icon: 'time-outline' },
  confirmed: { color: Colors.success,       bg: '#E8F5E9', label: 'Confirmada',  icon: 'checkmark-circle-outline' },
  cancelled: { color: Colors.primary,       bg: '#FFEBEE', label: 'Cancelada',   icon: 'close-circle-outline' },
  done:      { color: Colors.textSecondary, bg: Colors.tag, label: 'Completada', icon: 'checkmark-done-outline' },
};

export default function ReservationsScreen() {
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getRestaurantByOwner(user.uid).then((r) => { if (r) setRestaurantId(r.id); });
  }, [user?.uid]);

  const { reservations, loading } = useRestaurantReservations(restaurantId);
  const [activeTab, setActiveTab] = useState<ReservationStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = activeTab === 'all'
    ? reservations
    : reservations.filter((r) => r.status === activeTab);

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;

  const handleStatus = async (id: string, status: ReservationStatus) => {
    await updateReservationStatus(id, status);
    setExpanded(null);
  };

  const formatDate = (r: Reservation) => {
    try {
      const ts = (r.date as any)?.seconds;
      const d = ts ? new Date(ts * 1000) : r.date instanceof Date ? r.date : new Date(r.date as any);
      return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    } catch { return '—'; }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Reservas</Text>
          {pendingCount > 0 && (
            <Text style={styles.headerSub}>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</Text>
          )}
        </View>
        <Ionicons name="options-outline" size={22} color={Colors.white} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {TABS.map((tab) => {
          const count = tab.key === 'all' ? reservations.length : reservations.filter((r) => r.status === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.key && { color: Colors.white }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No hay reservas en esta categoría</Text>
            </View>
          ) : (
            filtered.map((r) => {
              const cfg = STATUS_CONFIG[r.status];
              const isExpanded = expanded === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.card}
                  onPress={() => setExpanded(isExpanded ? null : r.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.timeBox}>
                      <Text style={styles.timeDate}>{formatDate(r)}</Text>
                      <Text style={styles.timeHour}>{r.timeSlot}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{r.userName}</Text>
                      <View style={styles.cardMeta}>
                        <Ionicons name="people-outline" size={13} color={Colors.textLight} />
                        <Text style={styles.cardMetaText}>{r.guests} personas</Text>
                        <Text style={styles.dot}>·</Text>
                        <Ionicons name="grid-outline" size={13} color={Colors.textLight} />
                        <Text style={styles.cardMetaText}>Mesa {r.tableNumber}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.detail}>
                      {r.userPhone ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="call-outline" size={15} color={Colors.textSecondary} />
                          <Text style={styles.detailText}>{r.userPhone}</Text>
                        </View>
                      ) : null}
                      {r.userEmail ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="mail-outline" size={15} color={Colors.textSecondary} />
                          <Text style={styles.detailText}>{r.userEmail}</Text>
                        </View>
                      ) : null}
                      {r.comments ? (
                        <View style={styles.commentBox}>
                          <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
                          <Text style={styles.commentText}>{r.comments}</Text>
                        </View>
                      ) : null}

                      {r.status === 'pending' && (
                        <View style={styles.actionRow}>
                          <TouchableOpacity style={styles.btnConfirm} onPress={() => handleStatus(r.id, 'confirmed')}>
                            <Ionicons name="checkmark" size={16} color={Colors.white} />
                            <Text style={styles.btnConfirmText}>Confirmar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnCancel} onPress={() => handleStatus(r.id, 'cancelled')}>
                            <Ionicons name="close" size={16} color={Colors.primary} />
                            <Text style={styles.btnCancelText}>Rechazar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {r.status === 'confirmed' && (
                        <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: Colors.textSecondary }]} onPress={() => handleStatus(r.id, 'done')}>
                          <Ionicons name="checkmark-done" size={16} color={Colors.white} />
                          <Text style={styles.btnConfirmText}>Marcar completada</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <View style={styles.expandHint}>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textLight} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  headerSub: { color: Colors.primary, fontSize: 12, marginTop: 1 },
  tabsScroll: { backgroundColor: Colors.dark, maxHeight: 52 },
  tabsContent: { paddingHorizontal: 12, paddingBottom: 10, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  tabTextActive: { color: Colors.white, fontWeight: '700' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  scroll: { flex: 1, backgroundColor: Colors.background, paddingTop: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
  card: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  timeBox: { backgroundColor: Colors.dark, borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 56 },
  timeDate: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  timeHour: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: Colors.textSecondary },
  dot: { color: Colors.textLight, fontSize: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detail: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 14, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Colors.text },
  commentBox: { flexDirection: 'row', gap: 8, backgroundColor: Colors.background, borderRadius: 8, padding: 10 },
  commentText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnConfirm: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.success, paddingVertical: 10, borderRadius: 10,
  },
  btnConfirmText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  btnCancel: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: Colors.primary, paddingVertical: 10, borderRadius: 10,
  },
  btnCancelText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  expandHint: { alignItems: 'center', paddingBottom: 8 },
});
