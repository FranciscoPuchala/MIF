import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator, Image, Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { WireframeBox } from '@/components/WireframeBox';
import { useRestaurant } from '@/hooks/useRestaurant';
import { updateRestaurant, getRestaurantByOwner, updatePostsRestaurantLogo } from '@/services/restaurants';
import { uploadRestaurantLogo, uploadRestaurantBanner } from '@/services/storage';
import { useAuth } from '@/hooks/useAuth';

const DAYS: { key: string; label: string }[] = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
];

const SUGGESTED_TAGS = [
  'Sushi', 'Japonés', 'Nikkei', 'Poké', 'Ramen', 'Coreano', 'Thai', 'Chino',
  'Italiano', 'Pizza', 'Pasta', 'Parrilla', 'Argentina', 'Mexicano', 'Español',
  'Mediterráneo', 'Árabe', 'Peruano', 'Vegano', 'Vegetariano', 'Sin Gluten',
  'Mariscos', 'Hamburguesas', 'Sandwiches', 'Café', 'Postres', 'Brunch',
];

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getRestaurantByOwner(user.uid).then((r) => { if (r) setRestaurantId(r.id); });
  }, [user?.uid]);

  const { restaurant, loading } = useRestaurant(restaurantId);
  const [saving, setSaving] = useState(false);

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress]         = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [website, setWebsite]         = useState('');
  const [isOpen, setIsOpen]           = useState(true);
  const [tags, setTags]               = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [hours, setHours]             = useState<Record<string, { open: string; close: string; closed: boolean }>>({});
  const [logoUri, setLogoUri]         = useState<string | null>(null);
  const [bannerUri, setBannerUri]     = useState<string | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    setName(restaurant.name ?? '');
    setDescription(restaurant.description ?? '');
    setAddress(restaurant.address ?? '');
    setNeighborhood(restaurant.neighborhood ?? '');
    setPhone(restaurant.phone ?? '');
    setEmail(restaurant.email ?? '');
    setWebsite(restaurant.website ?? '');
    setIsOpen(restaurant.isOpen ?? true);
    setTags(restaurant.tags ?? []);
    setHours(restaurant.hours as any ?? {});
  }, [restaurant]);

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setLogoUri(result.assets[0].uri);
  };

  const pickBanner = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled) setBannerUri(result.assets[0].uri);
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed || tags.includes(trimmed)) { setCustomTagInput(''); return; }
    setTags((prev) => [...prev, trimmed]);
    setCustomTagInput('');
  };

  const updateHour = (day: string, field: 'open' | 'close', value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? { open: '12:00', close: '23:00', closed: false }), [field]: value },
    }));
  };

  const toggleDayClosed = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? { open: '12:00', close: '23:00', closed: false }), closed: !(prev[day]?.closed) },
    }));
  };

  const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('El nombre es obligatorio'); return; }
    if (!restaurantId) { Alert.alert('Error', 'No se pudo identificar tu restaurante.'); return; }
    const invalidDay = DAYS.find(({ key }) => {
      const d = hours[key];
      return d && !d.closed && (!isValidTime(d.open) || !isValidTime(d.close));
    });
    if (invalidDay) {
      Alert.alert('Horario inválido', `El formato de ${invalidDay.label} debe ser HH:MM (ej: 12:00).`);
      return;
    }
    setSaving(true);
    try {
      let logoUrl  = restaurant?.logoUrl  ?? '';
      let bannerUrl = restaurant?.bannerUrl ?? '';

      if (logoUri)   logoUrl   = await uploadRestaurantLogo(restaurantId, logoUri);
      if (bannerUri) bannerUrl = await uploadRestaurantBanner(restaurantId, bannerUri);
      if (logoUri)   await updatePostsRestaurantLogo(restaurantId, logoUrl);

      await updateRestaurant(restaurantId, {
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        isOpen,
        tags,
        hours: hours as any,
        logoUrl,
        bannerUrl,
      });

      Alert.alert('¡Guardado!', 'El perfil fue actualizado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Text style={styles.saveBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Imágenes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imágenes</Text>

          <Text style={styles.fieldLabel}>Banner</Text>
          <TouchableOpacity style={styles.bannerPicker} onPress={pickBanner}>
            {bannerUri || restaurant?.bannerUrl ? (
              <Image
                source={{ uri: bannerUri ?? restaurant?.bannerUrl }}
                style={styles.bannerImg}
                resizeMode="cover"
              />
            ) : (
              <WireframeBox width="100%" height={120} rounded label="Tocar para agregar banner" />
            )}
            <View style={styles.bannerOverlay}>
              <Ionicons name="camera" size={22} color={Colors.white} />
              <Text style={styles.bannerOverlayText}>Cambiar banner</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Logo</Text>
          <TouchableOpacity style={styles.logoPicker} onPress={pickLogo}>
            {logoUri || restaurant?.logoUrl ? (
              <Image source={{ uri: logoUri ?? restaurant?.logoUrl }} style={styles.logoImg} />
            ) : (
              <WireframeBox width={90} height={90} circle />
            )}
            <View style={styles.logoCamera}>
              <Ionicons name="camera" size={14} color={Colors.white} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Info básica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información básica</Text>

          <Text style={styles.fieldLabel}>Nombre del restaurante *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor={Colors.placeholderText} />

          <Text style={styles.fieldLabel}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={description} onChangeText={setDescription}
            placeholder="Contá algo sobre tu restaurante..." placeholderTextColor={Colors.placeholderText}
            multiline numberOfLines={3}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Teléfono</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+54 11..." placeholderTextColor={Colors.placeholderText} keyboardType="phone-pad" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="correo@..." placeholderTextColor={Colors.placeholderText} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Sitio web</Text>
          <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="www.turestaurante.com" placeholderTextColor={Colors.placeholderText} autoCapitalize="none" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Abierto ahora</Text>
            <Switch value={isOpen} onValueChange={setIsOpen} trackColor={{ true: Colors.success }} thumbColor={Colors.white} />
          </View>
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>

          <Text style={styles.fieldLabel}>Dirección</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Av. Corrientes 1234" placeholderTextColor={Colors.placeholderText} />

          <Text style={styles.fieldLabel}>Barrio</Text>
          <TextInput style={styles.input} value={neighborhood} onChangeText={setNeighborhood} placeholder="Palermo, San Telmo..." placeholderTextColor={Colors.placeholderText} />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de cocina</Text>

          {/* Selected tags */}
          {tags.length > 0 && (
            <View style={[styles.tagsGrid, { marginBottom: 12 }]}>
              {tags.map((tag) => (
                <TouchableOpacity key={tag} style={[styles.tag, styles.tagActive]} onPress={() => toggleTag(tag)}>
                  <Text style={[styles.tagText, styles.tagTextActive]}>{tag}</Text>
                  <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Custom tag input */}
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              value={customTagInput}
              onChangeText={setCustomTagInput}
              placeholder="Escribí una etiqueta personalizada..."
              placeholderTextColor={Colors.placeholderText}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={[styles.tagAddBtn, !customTagInput.trim() && { opacity: 0.4 }]}
              onPress={addCustomTag}
              disabled={!customTagInput.trim()}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Suggestions */}
          <Text style={styles.tagSuggestLabel}>Sugerencias</Text>
          <View style={styles.tagsGrid}>
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
              <TouchableOpacity key={tag} style={styles.tag} onPress={() => toggleTag(tag)}>
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Horarios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horarios</Text>
          {DAYS.map(({ key, label }) => {
            const day = hours[key] ?? { open: '12:00', close: '23:00', closed: false };
            return (
              <View key={key} style={styles.dayRow}>
                <TouchableOpacity onPress={() => toggleDayClosed(key)} style={styles.dayCheck}>
                  <Ionicons
                    name={day.closed ? 'square-outline' : 'checkbox'}
                    size={20}
                    color={day.closed ? Colors.border : Colors.primary}
                  />
                </TouchableOpacity>
                <Text style={[styles.dayLabel, day.closed && { color: Colors.textLight }]}>{label}</Text>
                {day.closed ? (
                  <Text style={styles.dayClosed}>Cerrado</Text>
                ) : (
                  <View style={styles.dayHours}>
                    <TextInput
                      style={[styles.hourInput, day.open && !isValidTime(day.open) && styles.hourInputError]}
                      value={day.open}
                      onChangeText={(v) => updateHour(key, 'open', v)}
                      placeholder="12:00"
                      placeholderTextColor={Colors.placeholderText}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={styles.hourSep}>–</Text>
                    <TextInput
                      style={[styles.hourInput, day.close && !isValidTime(day.close) && styles.hourInputError]}
                      value={day.close}
                      onChangeText={(v) => updateHour(key, 'close', v)}
                      placeholder="23:00"
                      placeholderTextColor={Colors.placeholderText}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
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
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  scroll: { backgroundColor: Colors.background },
  section: { backgroundColor: Colors.white, marginTop: 8, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.background,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  switchLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  bannerPicker: { position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  bannerImg: { width: '100%', height: 120, borderRadius: 10 },
  bannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8,
  },
  bannerOverlayText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  logoPicker: { position: 'relative', width: 90, marginTop: 4 },
  logoImg: { width: 90, height: 90, borderRadius: 45 },
  logoCamera: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 12, width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white,
  },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  tagActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagText: { fontSize: 13, color: Colors.text },
  tagTextActive: { color: Colors.white, fontWeight: '600' },
  tagInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tagInput: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: Colors.text, backgroundColor: Colors.background,
  },
  tagAddBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  tagSuggestLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  dayCheck: { padding: 2 },
  dayLabel: { width: 90, fontSize: 14, color: Colors.text, fontWeight: '500' },
  dayClosed: { flex: 1, fontSize: 13, color: Colors.textLight, fontStyle: 'italic' },
  dayHours: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hourInput: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 14,
    color: Colors.text, textAlign: 'center', backgroundColor: Colors.background,
  },
  hourInputError: { borderColor: Colors.primary },
  hourSep: { fontSize: 14, color: Colors.textSecondary },
});
