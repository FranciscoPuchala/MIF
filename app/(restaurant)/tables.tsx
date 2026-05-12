import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Table } from '@/types';
import {
  getTables,
  addTable as addTableService,
  deleteTable as deleteTableService,
  updateTable as updateTableService,
  getRestaurantByOwner,
} from '@/services/restaurants';
import { useAuth } from '@/hooks/useAuth';

const CAPS: (2 | 4 | 6 | 8)[] = [2, 4, 6, 8];
const CELL = 80;

function tableSize(cap: number): { w: number; h: number; round: boolean } {
  if (cap <= 2) return { w: 50, h: 50, round: true };
  if (cap <= 4) return { w: 62, h: 48, round: false };
  if (cap <= 6) return { w: 72, h: 52, round: false };
  return { w: 78, h: 58, round: false };
}

function colorByCap(cap: number): string {
  if (cap <= 2) return '#43A047';
  if (cap <= 4) return Colors.primary;
  if (cap <= 6) return '#8E24AA';
  return '#E64A19';
}

export default function TablesScreen() {
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Table | null>(null);
  const [capModal, setCapModal] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(1);

  useEffect(() => {
    if (!user?.uid) return;
    getRestaurantByOwner(user.uid).then((r) => { if (r) setRestaurantId(r.id); });
  }, [user?.uid]);

  const load = async (rid: string) => {
    setLoading(true);
    try { setTables(await getTables(rid)); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (restaurantId) load(restaurantId); }, [restaurantId]);

  const floors = Array.from(new Set(tables.map((t) => t.floor ?? 1))).sort();
  const hasMultiFloor = floors.length > 1;
  const floorTables = tables.filter((t) => (t.floor ?? 1) === selectedFloor);

  const maxX = floorTables.reduce((m, t) => Math.max(m, t.x), 3);
  const maxY = floorTables.reduce((m, t) => Math.max(m, t.y), 3);
  const CANVAS_COLS = editMode ? Math.max(maxX + 2, 4) : Math.max(maxX + 1, 4);
  const CANVAS_ROWS = editMode ? Math.max(maxY + 2, 4) : Math.max(maxY + 1, 4);

  const handleAdd = async (atX?: number, atY?: number) => {
    if (!restaurantId) return;
    let slot: { x: number; y: number } | null = null;
    if (atX !== undefined && atY !== undefined) {
      slot = { x: atX, y: atY };
    } else {
      outer: for (let y = 0; y < CANVAS_ROWS; y++) {
        for (let x = 0; x < CANVAS_COLS; x++) {
          if (!floorTables.find((t) => t.x === x && t.y === y)) { slot = { x, y }; break outer; }
        }
      }
    }
    if (!slot) { Alert.alert('Sin espacio', 'El plano está lleno.'); return; }
    setSaving(true);
    try {
      const usedNumbers = new Set(tables.map((t) => t.number));
      let nextNumber = 1;
      while (usedNumbers.has(nextNumber)) nextNumber++;
      await addTableService(restaurantId, {
        restaurantId,
        number: nextNumber,
        capacity: 2,
        x: slot.x,
        y: slot.y,
        floor: selectedFloor,
        isAvailable: true,
      });
      await load(restaurantId);
    } catch {
      Alert.alert('Error', 'No se pudo agregar la mesa.');
    } finally { setSaving(false); }
  };

  const handleDelete = (table: Table) => {
    Alert.alert('Eliminar mesa', `¿Eliminar Mesa ${table.number}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setSaving(true);
          setCapModal(false);
          try {
            await deleteTableService(restaurantId, table.id);
            setSelected(null);
            await load(restaurantId);
          } catch { Alert.alert('Error', 'No se pudo eliminar la mesa.'); }
          finally { setSaving(false); }
        },
      },
    ]);
  };

  const handleCapChange = async (cap: 2 | 4 | 6 | 8) => {
    if (!selected || !restaurantId) return;
    setCapModal(false);
    setSaving(true);
    try {
      await updateTableService(restaurantId, selected.id, { capacity: cap });
      await load(restaurantId);
      setSelected(null);
    } catch { Alert.alert('Error', 'No se pudo actualizar la capacidad.'); }
    finally { setSaving(false); }
  };

  const totalCap = tables.reduce((s, t) => s + t.capacity, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar mesas</Text>
        {saving ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <TouchableOpacity onPress={() => { setEditMode(!editMode); setSelected(null); }}>
            <Text style={[styles.editBtn, editMode && { color: Colors.primary }]}>
              {editMode ? 'Listo' : 'Editar'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNum}>{tables.length}</Text>
              <Text style={styles.statLbl}>Mesas</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statNum}>{totalCap}</Text>
              <Text style={styles.statLbl}>Capacidad</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statNum}>{floors.length}</Text>
              <Text style={styles.statLbl}>Pisos</Text>
            </View>
          </View>

          {/* Floor plan section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Plano del restaurante</Text>
              {editMode && (
                <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd()}>
                  <Ionicons name="add" size={18} color={Colors.white} />
                  <Text style={styles.addBtnText}>Agregar mesa</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Floor tabs */}
            {hasMultiFloor && (
              <View style={styles.floorTabs}>
                {floors.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.floorTab, selectedFloor === f && styles.floorTabActive]}
                    onPress={() => { setSelectedFloor(f); setSelected(null); }}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={13}
                      color={selectedFloor === f ? Colors.white : Colors.textSecondary}
                    />
                    <Text style={[styles.floorTabText, selectedFloor === f && { color: Colors.white }]}>
                      Piso {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Onboarding: no tables yet */}
            {tables.length === 0 && !editMode ? (
              <View style={styles.onboarding}>
                <View style={styles.onboardingIconWrap}>
                  <Ionicons name="map-outline" size={44} color={Colors.primary} />
                </View>
                <Text style={styles.onboardingTitle}>Configurá el plano de tu local</Text>
                <Text style={styles.onboardingText}>
                  Para una experiencia profesional, contactá a un operador de Make It Find.
                  Ellos recibirán el mapa de tu restaurante y posicionarán las mesas con sus
                  ubicaciones y tamaños reales.
                </Text>
                <TouchableOpacity style={styles.onboardingBtn}>
                  <Ionicons name="headset-outline" size={18} color={Colors.white} />
                  <Text style={styles.onboardingBtnText}>Contactar operador</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.onboardingSecondary} onPress={() => setEditMode(true)}>
                  <Text style={styles.onboardingSecondaryText}>Configurar manualmente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Entrance label */}
                <View style={styles.entranceBar}>
                  <View style={styles.entranceLine} />
                  <Text style={styles.entranceText}>ENTRADA</Text>
                  <View style={styles.entranceLine} />
                </View>

                {/* Canvas */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.canvas, { width: CANVAS_COLS * CELL, height: CANVAS_ROWS * CELL }]}>

                    {/* Grid dots */}
                    {Array.from({ length: CANVAS_ROWS + 1 }).map((_, row) =>
                      Array.from({ length: CANVAS_COLS + 1 }).map((_, col) => (
                        <View
                          key={`d-${row}-${col}`}
                          style={[styles.gridDot, { left: col * CELL - 2, top: row * CELL - 2 }]}
                        />
                      ))
                    )}

                    {/* Empty cell slots (edit mode only) */}
                    {editMode && Array.from({ length: CANVAS_ROWS }).map((_, row) =>
                      Array.from({ length: CANVAS_COLS }).map((_, col) => {
                        const occupied = floorTables.find((t) => t.x === col && t.y === row);
                        if (occupied) return null;
                        return (
                          <TouchableOpacity
                            key={`slot-${row}-${col}`}
                            style={{
                              position: 'absolute',
                              left: col * CELL,
                              top: row * CELL,
                              width: CELL,
                              height: CELL,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onPress={() => handleAdd(col, row)}
                            activeOpacity={0.5}
                          >
                            <View style={styles.emptySlot}>
                              <Ionicons name="add" size={18} color={Colors.border} />
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}

                    {/* Tables */}
                    {floorTables.map((table) => {
                      const { w, h, round } = tableSize(table.capacity);
                      const isSelected = selected?.id === table.id;
                      const color = colorByCap(table.capacity);
                      return (
                        <TouchableOpacity
                          key={table.id}
                          style={[
                            styles.tableShape,
                            {
                              width: w,
                              height: h,
                              left: table.x * CELL + (CELL - w) / 2,
                              top: table.y * CELL + (CELL - h) / 2,
                              borderRadius: round ? w / 2 : 10,
                              backgroundColor: isSelected ? color : Colors.white,
                              borderColor: color,
                            },
                          ]}
                          onPress={() => {
                            if (editMode) { setSelected(table); setCapModal(true); }
                            else { setSelected(isSelected ? null : table); }
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.tableNum, { color: isSelected ? Colors.white : color }]}>
                            {table.number}
                          </Text>
                          <Text style={[styles.tableCap, { color: isSelected ? 'rgba(255,255,255,0.75)' : color }]}>
                            {table.capacity}p
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Selected info panel */}
                {selected && !editMode && (
                  <View style={styles.selectedPanel}>
                    <View style={[styles.selectedDot, { backgroundColor: colorByCap(selected.capacity) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedTitle}>Mesa {selected.number}</Text>
                      <Text style={styles.selectedSub}>
                        {selected.capacity} personas · {selected.isAvailable ? 'Disponible' : 'Ocupada'}
                        {hasMultiFloor ? ` · Piso ${selected.floor ?? 1}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.availPill, { backgroundColor: selected.isAvailable ? '#E8F5E9' : '#FFEBEE' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: selected.isAvailable ? Colors.success : Colors.primary }}>
                        {selected.isAvailable ? 'Libre' : 'Ocupada'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Legend */}
                <View style={styles.legend}>
                  {CAPS.map((cap) => (
                    <View key={cap} style={styles.legendItem}>
                      <View style={[
                        styles.legendShape,
                        { backgroundColor: colorByCap(cap), borderRadius: cap === 2 ? 8 : 3 },
                      ]} />
                      <Text style={styles.legendText}>{cap} personas</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Table list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lista de mesas</Text>
            {tables.length === 0 && (
              <Text style={{ color: Colors.textSecondary, fontSize: 13, paddingVertical: 10 }}>
                No hay mesas configuradas aún.
              </Text>
            )}
            {tables.map((t) => (
              <View key={t.id} style={styles.tableListRow}>
                <View style={[styles.tableListDot, { backgroundColor: colorByCap(t.capacity) }]} />
                <Text style={styles.tableListName}>Mesa {t.number}</Text>
                {hasMultiFloor && (
                  <Text style={styles.tableListFloor}>P{t.floor ?? 1}</Text>
                )}
                <Text style={styles.tableListCap}>{t.capacity}p</Text>
                <View style={[styles.availBadge, { backgroundColor: t.isAvailable ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: t.isAvailable ? Colors.success : Colors.primary }}>
                    {t.isAvailable ? 'Libre' : 'Ocupada'}
                  </Text>
                </View>
                {editMode && (
                  <TouchableOpacity onPress={() => handleDelete(t)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Capacity / action modal */}
      <Modal visible={capModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mesa {selected?.number}</Text>
            <Text style={styles.modalSubtitle}>Capacidad</Text>
            {CAPS.map((cap) => (
              <TouchableOpacity
                key={cap}
                style={[styles.capOption, selected?.capacity === cap && styles.capOptionActive]}
                onPress={() => handleCapChange(cap)}
              >
                <Ionicons
                  name={cap <= 2 ? 'person-outline' : 'people-outline'}
                  size={20}
                  color={selected?.capacity === cap ? Colors.white : Colors.text}
                />
                <Text style={[styles.capOptionText, selected?.capacity === cap && { color: Colors.white }]}>
                  {cap} personas
                </Text>
                {selected?.capacity === cap && <Ionicons name="checkmark" size={18} color={Colors.white} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalDelete}
              onPress={() => { if (selected) handleDelete(selected); }}
            >
              <Ionicons name="trash-outline" size={17} color={Colors.primary} />
              <Text style={[styles.modalActionText, { color: Colors.primary }]}>Eliminar mesa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setCapModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.dark,
  },
  headerTitle: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  editBtn: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  scroll: { backgroundColor: Colors.background },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, gap: 10 },
  statChip: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 12,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  section: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, gap: 4,
  },
  addBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  floorTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  floorTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  floorTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  floorTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  onboarding: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 8, gap: 12 },
  onboardingIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.tag, alignItems: 'center', justifyContent: 'center',
  },
  onboardingTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  onboardingText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  onboardingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 4,
  },
  onboardingBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  onboardingSecondary: { paddingVertical: 8 },
  onboardingSecondaryText: { color: Colors.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
  entranceBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
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
  emptySlot: {
    width: 52, height: 44, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
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
  tableCap: { fontSize: 10, fontWeight: '600', opacity: 0.8 },
  selectedPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 12, padding: 12,
    backgroundColor: Colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  selectedDot: { width: 12, height: 12, borderRadius: 6 },
  selectedTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  selectedSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  availPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendShape: { width: 16, height: 11 },
  legendText: { fontSize: 11, color: Colors.textSecondary },
  tableListRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8,
  },
  tableListDot: { width: 10, height: 10, borderRadius: 5 },
  tableListName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  tableListFloor: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  tableListCap: { fontSize: 13, color: Colors.textSecondary },
  availBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  capOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  capOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  capOptionText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  modalDelete: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 4, paddingVertical: 14, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  modalActionText: { fontSize: 15, fontWeight: '600' },
  modalCancel: {
    paddingVertical: 14, alignItems: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  modalCancelText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
});
