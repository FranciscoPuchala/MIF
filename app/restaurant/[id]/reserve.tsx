import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, SafeAreaView, StatusBar,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { WireframeBox } from '@/components/WireframeBox';
import { createReservation, getOccupiedTables } from '@/services/reservations';
import { getTables, getRestaurant } from '@/services/restaurants';
import { getUserProfile } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { Restaurant, Table } from '@/types';


const CELL = 100;

const TIME_SLOTS = ['12:00','13:00','14:00','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'];

function buildDateOptions(): { date: Date; label: string; dayLabel: string }[] {
  const opts = [];
  const DAY = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MON = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    opts.push({
      date: d,
      label: `${d.getDate()} ${MON[d.getMonth()]}`,
      dayLabel: i === 0 ? 'Hoy' : DAY[d.getDay()],
    });
  }
  return opts;
}

const DATE_OPTIONS = buildDateOptions();

const MARGIN = 14;
const CHAIR_PAD = 20;
const CHAIR_W = 14;
const CHAIR_H = 9;
const CHAIR_GAP = 3;

function tableDims(cap: number): { wCells: number; hCells: number; round: boolean } {
  if (cap <= 2) return { wCells: 1, hCells: 1, round: true };
  if (cap <= 4) return { wCells: 2, hCells: 1, round: false };
  if (cap <= 6) return { wCells: 2, hCells: 1, round: false };
  return { wCells: 2, hCells: 2, round: false };
}

function tableColor(cap: number): string {
  if (cap <= 2) return '#43A047';
  if (cap <= 4) return '#E53935';
  if (cap <= 6) return '#8E24AA';
  return '#E64A19';
}

type ChairRect = { x: number; y: number; w: number; h: number };

function getChairPositions(cap: number, tx: number, ty: number, tw: number, th: number): ChairRect[] {
  const cw = CHAIR_W, ch = CHAIR_H, gap = CHAIR_GAP;
  if (cap <= 2) return [
    { x: tx + tw / 2 - cw / 2, y: ty - ch - gap, w: cw, h: ch },
    { x: tx + tw / 2 - cw / 2, y: ty + th + gap, w: cw, h: ch },
  ];
  if (cap <= 4) return [
    { x: tx + tw * 0.28 - cw / 2, y: ty - ch - gap, w: cw, h: ch },
    { x: tx + tw * 0.72 - cw / 2, y: ty - ch - gap, w: cw, h: ch },
    { x: tx + tw * 0.28 - cw / 2, y: ty + th + gap, w: cw, h: ch },
    { x: tx + tw * 0.72 - cw / 2, y: ty + th + gap, w: cw, h: ch },
  ];
  if (cap <= 6) return [
    { x: tx + tw * 0.28 - cw / 2, y: ty - ch - gap, w: cw, h: ch },
    { x: tx + tw * 0.72 - cw / 2, y: ty - ch - gap, w: cw, h: ch },
    { x: tx + tw * 0.28 - cw / 2, y: ty + th + gap, w: cw, h: ch },
    { x: tx + tw * 0.72 - cw / 2, y: ty + th + gap, w: cw, h: ch },
    { x: tx - ch - gap, y: ty + th / 2 - cw / 2, w: ch, h: cw },
    { x: tx + tw + gap, y: ty + th / 2 - cw / 2, w: ch, h: cw },
  ];
  return [
    { x: tx + tw * 0.28 - cw / 2, y: ty - ch - gap, w: cw, h: ch },
    { x: tx + tw * 0.72 - cw / 2, y: ty - ch - gap, w: cw, h: ch },
    { x: tx + tw * 0.28 - cw / 2, y: ty + th + gap, w: cw, h: ch },
    { x: tx + tw * 0.72 - cw / 2, y: ty + th + gap, w: cw, h: ch },
    { x: tx - ch - gap, y: ty + th * 0.28 - cw / 2, w: ch, h: cw },
    { x: tx - ch - gap, y: ty + th * 0.72 - cw / 2, w: ch, h: cw },
    { x: tx + tw + gap, y: ty + th * 0.28 - cw / 2, w: ch, h: cw },
    { x: tx + tw + gap, y: ty + th * 0.72 - cw / 2, w: ch, h: cw },
  ];
}

export default function ReserveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [filterByGuests, setFilterByGuests] = useState(true);
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [occupiedIds, setOccupiedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedTime, setSelectedTime] = useState('20:00');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [form, setForm] = useState({
    name: user?.displayName ?? '',
    phone: '',
    email: user?.email ?? '',
    guests: '2',
    comments: '',
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([getTables(id), getRestaurant(id)]).then(([tbls, rest]) => {
      setTables(tbls);
      setRestaurant(rest);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getOccupiedTables(id, DATE_OPTIONS[selectedDateIdx].date, selectedTime).then(setOccupiedIds);
  }, [id, selectedDateIdx, selectedTime]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then((profile) => {
      setForm((f) => ({
        ...f,
        name: f.name || user.displayName || profile?.name || '',
        email: f.email || user.email || profile?.email || '',
        phone: profile?.phone || '',
      }));
    });
  }, [user]);

  const floors = Array.from(new Set(tables.map((t) => t.floor ?? 1))).sort();
  const hasMultiFloor = floors.length > 1;
  const floorTables = tables.filter((t) => (t.floor ?? 1) === selectedFloor);
  const guestCount = parseInt(form.guests) || 1;
  const visibleTables = filterByGuests
    ? floorTables.filter((t) => t.capacity >= guestCount)
    : floorTables;

  const maxExtX = floorTables.reduce((m, t) => Math.max(m, t.x + tableDims(t.capacity).wCells), 4);
  const maxExtY = floorTables.reduce((m, t) => Math.max(m, t.y + tableDims(t.capacity).hCells), 4);
  const canvasW = maxExtX * CELL + CHAIR_PAD * 2;
  const canvasH = maxExtY * CELL + CHAIR_PAD * 2;

  const handleConfirm = async () => {
    if (!selectedTable) { Alert.alert('Seleccioná una mesa'); return; }
    if (!form.name || !form.email) { Alert.alert('Completá nombre y email'); return; }
    const table = tables.find((t) => t.id === selectedTable);
    if (!table) return;
    setSaving(true);
    const chosenDate = DATE_OPTIONS[selectedDateIdx].date;
    const dateLabel = `${DATE_OPTIONS[selectedDateIdx].dayLabel} ${DATE_OPTIONS[selectedDateIdx].label} · ${selectedTime}`;
    try {
      await createReservation({
        restaurantId: id ?? '',
        restaurantName: restaurant?.name ?? id ?? '',
        restaurantLogoUrl: restaurant?.logoUrl ?? '',
        userId: user?.uid ?? 'guest',
        userName: form.name,
        userEmail: form.email,
        userPhone: form.phone,
        tableId: selectedTable,
        tableNumber: table.number ?? null,
        tableLabel: table.label ?? null,
        guests: parseInt(form.guests),
        date: chosenDate,
        timeSlot: selectedTime,
        comments: form.comments,
      });
      router.replace({
        pathname: `/restaurant/${id}/confirm`,
        params: {
          table: table.label ?? table.number ?? '',
          guests: form.guests,
          name: form.name,
          date: dateLabel,
          email: form.email,
          restaurantName: restaurant?.name ?? '',
        },
      });
    } catch (err: any) {
      console.error('Error al guardar reserva:', err?.code, err?.message, err);
      Alert.alert('Error', `No se pudo guardar la reserva.\n${err?.code ?? err?.message ?? 'Intentá de nuevo.'}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedTableObj = tables.find((t) => t.id === selectedTable);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {restaurant?.logoUrl
            ? <Image source={{ uri: restaurant.logoUrl }} style={styles.headerLogo} />
            : <WireframeBox width={34} height={34} circle />
          }
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>{restaurant?.name ?? '...'}</Text>
            <Text style={styles.headerSub}>Reservar mesa</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Mesa selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seleccioná tu mesa</Text>

          {/* Legend */}
          <View style={styles.legend}>
            {([2, 4, 6, 8] as const).map((cap) => (
              <View key={cap} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: tableColor(cap), borderRadius: cap <= 2 ? 7 : 3 }]} />
                <Text style={styles.legendText}>{cap}p</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#BDBDBD', borderRadius: 3 }]} />
              <Text style={styles.legendText}>Ocupada</Text>
            </View>
          </View>

          {/* Floor tabs */}
          {hasMultiFloor && (
            <View style={styles.floorTabs}>
              {floors.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.floorTab, selectedFloor === f && styles.floorTabActive]}
                  onPress={() => { setSelectedFloor(f); setSelectedTable(null); }}
                >
                  <Ionicons name="layers-outline" size={13} color={selectedFloor === f ? Colors.white : Colors.textSecondary} />
                  <Text style={[styles.floorTabText, selectedFloor === f && { color: Colors.white }]}>
                    Piso {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Guest filter toggle */}
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => {
              const next = !filterByGuests;
              setFilterByGuests(next);
              if (next && selectedTable) {
                const t = tables.find((t) => t.id === selectedTable);
                if (t && t.capacity < guestCount) setSelectedTable(null);
              }
            }}
          >
            <Ionicons
              name={filterByGuests ? 'filter' : 'filter-outline'}
              size={14}
              color={filterByGuests ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.filterToggleText, filterByGuests && { color: Colors.primary }]}>
              {filterByGuests ? `Solo para ${form.guests}+ personas` : 'Ver todas las mesas'}
            </Text>
          </TouchableOpacity>

          {/* Entrance label */}
          <View style={styles.entranceBar}>
            <View style={styles.entranceLine} />
            <Text style={styles.entranceText}>ENTRADA</Text>
            <View style={styles.entranceLine} />
          </View>

          {/* Floor plan canvas */}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 30 }} />
          ) : floorTables.length === 0 ? (
            <View style={styles.noTables}>
              <Ionicons name="map-outline" size={36} color={Colors.border} />
              <Text style={styles.noTablesText}>El plano de este restaurante no está disponible todavía.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.canvas, { width: canvasW, height: canvasH }]}>
                {visibleTables.map((table) => {
                  const { wCells, hCells, round } = tableDims(table.capacity);
                  const isOccupied = occupiedIds.includes(table.id);
                  const isSelected = selectedTable === table.id;
                  const color = tableColor(table.capacity);
                  const tw = wCells * CELL - MARGIN * 2;
                  const th = hCells * CELL - MARGIN * 2;
                  const tx = table.x * CELL + MARGIN + CHAIR_PAD;
                  const ty = table.y * CELL + MARGIN + CHAIR_PAD;
                  const chairs = getChairPositions(table.capacity, tx, ty, tw, th);
                  return (
                    <React.Fragment key={table.id}>
                      {chairs.map((c, i) => (
                        <View
                          key={i}
                          style={{
                            position: 'absolute',
                            left: c.x, top: c.y, width: c.w, height: c.h,
                            borderRadius: Math.min(c.w, c.h) / 2,
                            backgroundColor: isOccupied ? '#BDBDBD' : color,
                            opacity: 0.5,
                          }}
                        />
                      ))}
                      <TouchableOpacity
                        style={{
                          position: 'absolute',
                          left: tx, top: ty, width: tw, height: th,
                          borderRadius: round ? tw / 2 : 8,
                          backgroundColor: isOccupied ? '#D5D5D5' : color,
                          alignItems: 'center', justifyContent: 'center',
                          shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
                          borderWidth: isSelected ? 3 : 0, borderColor: '#FFFFFF',
                          opacity: isOccupied ? 0.55 : 1,
                        }}
                        onPress={() => !isOccupied && setSelectedTable(isSelected ? null : table.id)}
                        disabled={isOccupied}
                        activeOpacity={0.85}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: round ? 11 : 12, fontWeight: '800' }}>
                          {table.label ?? table.number ?? `${table.capacity}p`}
                        </Text>
                        {!round && (
                          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' }}>
                            {table.capacity}p
                          </Text>
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Selected banner */}
          {selectedTableObj && (
            <View style={styles.selectedBanner}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.selectedText}>
                Mesa {selectedTableObj.label ?? selectedTableObj.number ?? ''} · {selectedTableObj.capacity} personas
              </Text>
            </View>
          )}
        </View>

        {/* Date and time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fecha y horario</Text>

          <Text style={styles.inputLabel}>Fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={styles.dateScrollContent}>
            {DATE_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.dateBtn, selectedDateIdx === idx && styles.dateBtnActive]}
                onPress={() => setSelectedDateIdx(idx)}
              >
                <Text style={[styles.dateDayLabel, selectedDateIdx === idx && { color: Colors.white }]}>{opt.dayLabel}</Text>
                <Text style={[styles.dateDateLabel, selectedDateIdx === idx && { color: 'rgba(255,255,255,0.8)' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Horario</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeBtn, selectedTime === t && styles.timeBtnActive]}
                onPress={() => setSelectedTime(t)}
              >
                <Text style={[styles.timeBtnText, selectedTime === t && { color: Colors.white }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus datos</Text>

          <Text style={styles.inputLabel}>Nombre completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Juan García"
            placeholderTextColor={Colors.placeholderText}
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />

          <Text style={styles.inputLabel}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="+54 11 1234-5678"
            placeholderTextColor={Colors.placeholderText}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
          />

          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="juan@email.com"
            placeholderTextColor={Colors.placeholderText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
          />

          <Text style={styles.inputLabel}>Número de personas</Text>
          <View style={styles.guestRow}>
            {['1', '2', '3', '4', '5', '6+'].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.guestBtn, form.guests === n && styles.guestBtnActive]}
                onPress={() => setForm({ ...form, guests: n })}
              >
                <Text style={[styles.guestBtnText, form.guests === n && { color: Colors.white }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Comentarios (alergias, ocasión especial...)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Sin mariscos, es un cumpleaños..."
            placeholderTextColor={Colors.placeholderText}
            multiline
            numberOfLines={3}
            value={form.comments}
            onChangeText={(v) => setForm({ ...form, comments: v })}
          />
        </View>

        {/* Confirm */}
        <View style={styles.confirmSection}>
          <TouchableOpacity
            style={[styles.btnConfirm, saving && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} style={{ marginRight: 8 }} />
              : <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
            }
            <Text style={styles.btnConfirmText}>{saving ? 'Guardando...' : 'Confirmar reserva'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { marginRight: 12 },
  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 34, height: 34, borderRadius: 17 },
  headerTitle: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  scroll: { flex: 1 },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 12, color: Colors.textSecondary },
  floorTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  floorTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  floorTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  floorTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background, marginBottom: 12,
  },
  filterToggleText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  entranceBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  entranceLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  entranceText: { fontSize: 10, color: Colors.textLight, fontWeight: '700', letterSpacing: 1.5 },
  canvas: {
    position: 'relative',
    backgroundColor: '#F7F3EC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'visible',
  },
  gridDot: {
    position: 'absolute',
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  tableShape: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  tableNum: { fontSize: 13, fontWeight: '800' },
  tableCap: { fontSize: 10, fontWeight: '600' },
  noTables: {
    alignItems: 'center', paddingVertical: 30, gap: 10,
  },
  noTablesText: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },
  selectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10,
  },
  selectedText: { color: Colors.success, fontWeight: '600', fontSize: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.text, backgroundColor: Colors.background,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  guestRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  guestBtn: {
    width: 46, height: 40, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background,
  },
  guestBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  guestBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dateScroll: { marginTop: 4 },
  dateScrollContent: { gap: 8, paddingVertical: 4 },
  dateBtn: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background, minWidth: 64,
  },
  dateBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateDayLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase' },
  dateDateLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 2 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  timeBtn: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  timeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  confirmSection: { marginHorizontal: 16, marginTop: 20 },
  btnConfirm: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12,
  },
  btnConfirmText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});
