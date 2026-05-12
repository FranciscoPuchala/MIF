import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator, TextInput, Modal, Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/context/ThemeContext';
import { AppColors } from '@/theme/colors';
import { useAuth } from '@/hooks/useAuth';
import { useUserReservations } from '@/hooks/useReservations';
import { logout, getUserProfile } from '@/services/auth';
import { uploadAvatar } from '@/services/storage';
import { updateReservationStatus } from '@/services/reservations';
import { updateDoc, doc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Reservation } from '@/types';

export default function ProfileScreen() {
  const Colors = useColors();
  const styles = makeStyles(Colors);

  const { user, loading: authLoading, refresh } = useAuth();
  const { reservations, loading: resLoading } = useUserReservations(user?.uid ?? '');

  const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    confirmed: { bg: '#E8F5E9', color: Colors.success,        label: 'Confirmada' },
    pending:   { bg: '#FFF8E1', color: Colors.warning,        label: 'Pendiente'  },
    done:      { bg: Colors.tag, color: Colors.textSecondary, label: 'Completada' },
    cancelled: { bg: '#FFEBEE', color: Colors.primary,        label: 'Cancelada'  },
  };

  const [followingCount, setFollowingCount] = useState(0);
  const [editModal, setEditModal]       = useState(false);
  const [newName, setNewName]           = useState(user?.displayName ?? '');
  const [saving, setSaving]             = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedRes, setSelectedRes]   = useState<Reservation | null>(null);
  const [cancelling, setCancelling]     = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then((profile) => {
      setFollowingCount(profile?.following?.length ?? 0);
    });
  }, [user?.uid]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notLoggedIn}>
          <Ionicons name="person-circle-outline" size={64} color={Colors.border} />
          <Text style={styles.notLoggedInText}>No estás logueado</Text>
          <TouchableOpacity style={styles.btnLoginNow} onPress={() => router.replace('/auth/login')}>
            <Text style={styles.btnLoginNowText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      const photoURL = await uploadAvatar(user!.uid, result.assets[0].uri);
      await updateProfile(auth.currentUser!, { photoURL });
      await updateDoc(doc(db, 'users', user!.uid), { photoUrl: photoURL });
      refresh();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(auth.currentUser!, { displayName: newName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { name: newName.trim() });
      refresh();
      setEditModal(false);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el nombre.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { await logout(); router.replace('/auth/login'); } },
    ]);
  };

  const handleCancelReservation = () => {
    if (!selectedRes) return;
    Alert.alert(
      'Cancelar reserva',
      `¿Seguro que querés cancelar la reserva en ${selectedRes.restaurantName}?`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Cancelar reserva', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await updateReservationStatus(selectedRes.id, 'cancelled');
              setSelectedRes(null);
            } catch {
              Alert.alert('Error', 'No se pudo cancelar la reserva.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (r: Reservation) => {
    try {
      const d = r.date instanceof Date ? r.date : new Date((r.date as any)?.seconds * 1000);
      return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch { return '—'; }
  };

  const formatDateShort = (r: Reservation) => {
    try {
      const d = r.date instanceof Date ? r.date : new Date((r.date as any)?.seconds * 1000);
      return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return '—'; }
  };

  const stats = [
    { label: 'Reservas', value: reservations.length },
    { label: 'Seguidos', value: followingCount },
  ];

  const canCancel = selectedRes && (selectedRes.status === 'pending' || selectedRes.status === 'confirmed');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handleChangeAvatar} disabled={uploadingAvatar}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color={Colors.border} />
              </View>
            )}
            <View style={styles.avatarCamera}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="camera" size={14} color="#FFFFFF" />
              }
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.displayName || 'Sin nombre'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => { setNewName(user.displayName ?? ''); setEditModal(true); }}>
            <Ionicons name="pencil-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Mis reservas</Text>
        {resLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        ) : reservations.length === 0 ? (
          <View style={styles.emptyReservations}>
            <Ionicons name="calendar-outline" size={40} color={Colors.border} />
            <Text style={styles.emptyText}>No tenés reservas todavía</Text>
            <TouchableOpacity style={styles.btnExplore} onPress={() => router.push('/(client)/search')}>
              <Text style={styles.btnExploreText}>Explorar restaurantes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reservations.map((r) => {
            const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
            return (
              <TouchableOpacity key={r.id} style={styles.reservCard} onPress={() => setSelectedRes(r)} activeOpacity={0.8}>
                <View style={styles.reservLeft}>
                  {r.restaurantLogoUrl
                    ? <Image source={{ uri: r.restaurantLogoUrl }} style={styles.reservLogo} />
                    : <View style={styles.reservLogoPlaceholder}>
                        <Ionicons name="storefront-outline" size={20} color={Colors.border} />
                      </View>
                  }
                  <View style={styles.reservInfo}>
                    <Text style={styles.reservName}>{r.restaurantName}</Text>
                    <Text style={styles.reservMeta}>
                      {formatDateShort(r)} · {r.timeSlot} · {r.guests} {r.guests === 1 ? 'persona' : 'personas'}
                    </Text>
                    {r.comments ? <Text style={styles.reservComment} numberOfLines={1}>{r.comments}</Text> : null}
                  </View>
                </View>
                <View style={styles.reservRight}>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.border} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Configuración</Text>
        <View style={styles.settingsCard}>
          {[
            { icon: 'notifications-outline', label: 'Notificaciones' },
            { icon: 'lock-closed-outline',   label: 'Privacidad' },
            { icon: 'help-circle-outline',   label: 'Ayuda' },
          ].map(({ icon, label }, i) => (
            <TouchableOpacity key={label} style={[styles.settingRow, i < 2 && styles.settingBorder]}>
              <Ionicons name={icon as any} size={20} color={Colors.textSecondary} />
              <Text style={styles.settingLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.border} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.settingRow, styles.settingBorder]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: Colors.primary }]}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Reservation detail modal */}
      <Modal visible={!!selectedRes} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.handle} />
            <View style={styles.detailRestaurant}>
              {selectedRes?.restaurantLogoUrl
                ? <Image source={{ uri: selectedRes.restaurantLogoUrl }} style={styles.detailLogo} />
                : <View style={[styles.detailLogo, styles.detailLogoPlaceholder]}>
                    <Ionicons name="storefront-outline" size={22} color={Colors.border} />
                  </View>
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.detailRestaurantName}>{selectedRes?.restaurantName}</Text>
                {selectedRes && (
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_STYLE[selectedRes.status]?.bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                    <Text style={[styles.statusText, { color: STATUS_STYLE[selectedRes.status]?.color }]}>
                      {STATUS_STYLE[selectedRes.status]?.label}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedRes(null)} style={styles.detailClose}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.detailDivider} />
            {selectedRes && (
              <View style={styles.detailRows}>
                <DetailRow Colors={Colors} icon="calendar-outline" label="Fecha"    value={formatDate(selectedRes)} />
                <DetailRow Colors={Colors} icon="time-outline"     label="Horario"  value={selectedRes.timeSlot} />
                <DetailRow Colors={Colors} icon="restaurant-outline" label="Mesa"   value={`Mesa ${selectedRes.tableNumber}`} />
                <DetailRow Colors={Colors} icon="people-outline"   label="Personas" value={`${selectedRes.guests} ${selectedRes.guests === 1 ? 'persona' : 'personas'}`} />
                <DetailRow Colors={Colors} icon="person-outline"   label="Nombre"   value={selectedRes.userName} />
                <DetailRow Colors={Colors} icon="mail-outline"     label="Email"    value={selectedRes.userEmail} />
                {selectedRes.userPhone ? <DetailRow Colors={Colors} icon="call-outline" label="Teléfono" value={selectedRes.userPhone} /> : null}
                {selectedRes.comments  ? <DetailRow Colors={Colors} icon="chatbubble-outline" label="Comentarios" value={selectedRes.comments} /> : null}
              </View>
            )}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.btnGoRestaurant}
                onPress={() => { setSelectedRes(null); router.push(`/restaurant/${selectedRes?.restaurantId}`); }}
              >
                <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
                <Text style={styles.btnGoRestaurantText}>Ver restaurante</Text>
              </TouchableOpacity>
              {canCancel && (
                <TouchableOpacity
                  style={[styles.btnCancel, cancelling && { opacity: 0.6 }]}
                  onPress={handleCancelReservation}
                  disabled={cancelling}
                >
                  {cancelling
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
                  }
                  <Text style={styles.btnCancelText}>{cancelling ? 'Cancelando...' : 'Cancelar reserva'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit name modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.modalTitle}>Editar nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Tu nombre"
              placeholderTextColor={Colors.placeholderText}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSave, saving && { opacity: 0.7 }]} onPress={handleSaveName} disabled={saving}>
                <Text style={styles.modalBtnSaveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ Colors, icon, label, value }: { Colors: AppColors; icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.tag, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: Colors.textLight, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    notLoggedIn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 120 },
    notLoggedInText: { fontSize: 16, color: C.textSecondary },
    btnLoginNow: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
    btnLoginNowText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.white, padding: 16, paddingTop: 20,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    avatarWrap: { position: 'relative', width: 80, height: 80 },
    avatarImg: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.border },
    avatarPlaceholder: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: C.background, borderWidth: 1.5, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarCamera: {
      position: 'absolute', bottom: 0, right: 0,
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: C.white,
    },
    userInfo: { flex: 1, marginLeft: 14 },
    userName: { fontSize: 18, fontWeight: '700', color: C.text },
    userEmail: { fontSize: 13, color: C.textSecondary, marginTop: 3 },
    editBtn: { padding: 8 },
    statsRow: {
      flexDirection: 'row', backgroundColor: C.white,
      paddingVertical: 16, marginBottom: 8,
    },
    stat: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: C.text },
    statLabel: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: C.border },
    sectionTitle: {
      fontSize: 16, fontWeight: '700', color: C.text,
      marginHorizontal: 16, marginTop: 16, marginBottom: 10,
    },
    emptyReservations: { alignItems: 'center', paddingVertical: 30, gap: 10 },
    emptyText: { color: C.textSecondary, fontSize: 14 },
    btnExplore: { backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    btnExploreText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    reservCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.white, marginHorizontal: 16, marginBottom: 10,
      borderRadius: 12, padding: 12,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    reservLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    reservLogo: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.border },
    reservLogoPlaceholder: {
      width: 44, height: 44, borderRadius: 10,
      backgroundColor: C.background, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    reservInfo: { marginLeft: 10, flex: 1 },
    reservName: { fontSize: 15, fontWeight: '600', color: C.text },
    reservMeta: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
    reservComment: { fontSize: 11, color: C.textLight, marginTop: 2, fontStyle: 'italic' },
    reservRight: { alignItems: 'flex-end', marginLeft: 8 },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '600' },
    settingsCard: {
      backgroundColor: C.white, marginHorizontal: 16, borderRadius: 12,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    settingBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    settingLabel: { flex: 1, fontSize: 15, color: C.text },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    detailCard: {
      backgroundColor: C.white,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: 32,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border, alignSelf: 'center', marginTop: 10, marginBottom: 16,
    },
    detailRestaurant: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
    detailLogo: { width: 52, height: 52, borderRadius: 12 },
    detailLogoPlaceholder: {
      backgroundColor: C.background, borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    detailRestaurantName: { fontSize: 18, fontWeight: '800', color: C.text },
    detailClose: { padding: 4 },
    detailDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 20, marginVertical: 16 },
    detailRows: { paddingHorizontal: 20, gap: 14, marginBottom: 20 },
    detailActions: { paddingHorizontal: 20, gap: 10 },
    btnGoRestaurant: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderWidth: 1.5, borderColor: C.primary, borderRadius: 14, paddingVertical: 14,
    },
    btnGoRestaurantText: { color: C.primary, fontWeight: '700', fontSize: 15 },
    btnCancel: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14,
    },
    btnCancelText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    editCard: { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
    modalInput: {
      borderWidth: 1, borderColor: C.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
      color: C.text, backgroundColor: C.background, marginBottom: 20,
    },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: {
      flex: 1, paddingVertical: 13, borderRadius: 10,
      borderWidth: 1, borderColor: C.border, alignItems: 'center',
    },
    modalBtnCancelText: { fontSize: 15, color: C.text, fontWeight: '500' },
    modalBtnSave: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center' },
    modalBtnSaveText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  });
}
