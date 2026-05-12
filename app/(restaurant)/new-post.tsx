import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, SafeAreaView, StatusBar, Alert, ActivityIndicator, Image,
  Modal, PanResponder, Dimensions, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { WireframeBox } from '@/components/WireframeBox';
import { createPost, getRestaurantByOwner } from '@/services/restaurants';
import { uploadPostImage } from '@/services/storage';
import { useAuth } from '@/hooks/useAuth';
import { Restaurant, StoryOverlay } from '@/types';

const { width: SW, height: SH } = Dimensions.get('window');

const TAGS = ['Plato del día', 'Especial', 'Nuevo en carta', 'Evento', 'Promoción', 'Temporada'];
const TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD600', '#FF1744', '#00BCD4', '#FF4081'];
const STICKERS = [
  '🍕', '🍣', '🍔', '🌮', '🍜', '🥗',
  '🍩', '🍰', '🥩', '🍷', '🥂', '☕',
  '🎉', '🔥', '⭐', '❤️', '😍', '✨',
  '💯', '🙌', '🎊', '👨‍🍳', '🌿', '🌶️',
];

// ── Draggable overlay ─────────────────────────────────────────────
function DraggableOverlay({ overlay, canvasW, canvasH, onMoved, onRemove }: {
  overlay: StoryOverlay;
  canvasW: number;
  canvasH: number;
  onMoved: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}) {
  const posRef = useRef({ x: overlay.x * canvasW, y: overlay.y * canvasH });
  const [pos, setPos] = useState({ x: overlay.x * canvasW, y: overlay.y * canvasH });

  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      setPos({
        x: Math.max(0, Math.min(canvasW - 100, posRef.current.x + g.dx)),
        y: Math.max(0, Math.min(canvasH - 60, posRef.current.y + g.dy)),
      });
    },
    onPanResponderRelease: (_, g) => {
      const nx = Math.max(0, Math.min(canvasW - 100, posRef.current.x + g.dx));
      const ny = Math.max(0, Math.min(canvasH - 60, posRef.current.y + g.dy));
      posRef.current = { x: nx, y: ny };
      onMoved(overlay.id, nx / canvasW, ny / canvasH);
    },
  })).current;

  const isEmoji = overlay.type === 'emoji';
  const label = overlay.type === 'location' ? `📍 ${overlay.content}` : overlay.content;

  return (
    <View {...pr.panHandlers} style={{ position: 'absolute', left: pos.x, top: pos.y }}>
      <TouchableOpacity onLongPress={() => onRemove(overlay.id)} delayLongPress={600} activeOpacity={0.9}>
        <View style={{
          backgroundColor: isEmoji ? undefined : (overlay.bgColor ?? 'rgba(0,0,0,0.45)'),
          borderRadius: isEmoji ? 0 : 8,
          paddingHorizontal: isEmoji ? 0 : 12,
          paddingVertical: isEmoji ? 0 : 5,
        }}>
          <Text style={{ color: overlay.color, fontSize: overlay.fontSize, fontWeight: isEmoji ? '400' : '700' }}>
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Story editor modal ────────────────────────────────────────────
function StoryEditorModal({ visible, imageUri, overlays, restaurant, onClose, onDone, onAdd, onMove, onRemove }: {
  visible: boolean;
  imageUri: string | null;
  overlays: StoryOverlay[];
  restaurant: Restaurant | null;
  onClose: () => void;
  onDone: () => void;
  onAdd: (o: StoryOverlay) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}) {
  const [mode, setMode] = useState<'idle' | 'text' | 'emoji'>('idle');
  const [textDraft, setTextDraft] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');

  const addText = () => {
    if (!textDraft.trim()) return;
    onAdd({
      id: Date.now().toString(),
      type: 'text',
      content: textDraft.trim(),
      x: 0.08,
      y: 0.3 + overlays.filter(o => o.type === 'text').length * 0.12,
      color: textColor,
      bgColor: textColor === '#000000' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.45)',
      fontSize: 22,
    });
    setTextDraft('');
    setMode('idle');
  };

  const addLocation = () => {
    const loc = restaurant?.neighborhood || restaurant?.address;
    if (!loc) { Alert.alert('Sin ubicación', 'Completá la dirección en tu perfil primero.'); return; }
    if (overlays.some((o) => o.type === 'location')) { Alert.alert('', 'Ya hay una ubicación en la historia.'); return; }
    onAdd({
      id: Date.now().toString(),
      type: 'location',
      content: loc,
      x: 0.05,
      y: 0.82,
      color: '#FFFFFF',
      bgColor: 'rgba(0,0,0,0.55)',
      fontSize: 15,
    });
  };

  const addEmoji = (emoji: string) => {
    onAdd({
      id: Date.now().toString(),
      type: 'emoji',
      content: emoji,
      x: 0.28 + Math.random() * 0.4,
      y: 0.18 + Math.random() * 0.5,
      color: '#FFFFFF',
      bgColor: 'transparent',
      fontSize: 52,
    });
    setMode('idle');
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ width: SW, height: SH }}>
          {/* Background image */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          )}

          {/* Dim when in a sub-mode */}
          {mode !== 'idle' && (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.38)' }]} />
          )}

          {/* Draggable overlays */}
          {mode === 'idle' && overlays.map((o) => (
            <DraggableOverlay key={o.id} overlay={o}
              canvasW={SW} canvasH={SH}
              onMoved={onMove} onRemove={onRemove}
            />
          ))}

          {/* Top bar */}
          <SafeAreaView style={edStyles.topBar}>
            <TouchableOpacity
              onPress={mode === 'idle' ? onClose : () => setMode('idle')}
              style={edStyles.iconBtn}
            >
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
            {mode === 'idle' && (
              <TouchableOpacity onPress={onDone} style={edStyles.doneBtn}>
                <Text style={edStyles.doneTxt}>Listo</Text>
              </TouchableOpacity>
            )}
          </SafeAreaView>

          {/* Drag hint */}
          {mode === 'idle' && overlays.length > 0 && (
            <View style={edStyles.hint}>
              <Text style={edStyles.hintTxt}>Arrastrá · mantené presionado para eliminar</Text>
            </View>
          )}

          {/* Bottom toolbar */}
          {mode === 'idle' && (
            <View style={edStyles.bottomBar}>
              <TouchableOpacity style={edStyles.toolBtn} onPress={() => setMode('text')}>
                <View style={edStyles.toolCircle}>
                  <Ionicons name="text" size={22} color="#FFF" />
                </View>
                <Text style={edStyles.toolLabel}>Texto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={edStyles.toolBtn} onPress={addLocation}>
                <View style={edStyles.toolCircle}>
                  <Ionicons name="location" size={22} color="#FFF" />
                </View>
                <Text style={edStyles.toolLabel}>Ubicación</Text>
              </TouchableOpacity>
              <TouchableOpacity style={edStyles.toolBtn} onPress={() => setMode('emoji')}>
                <View style={edStyles.toolCircle}>
                  <Text style={{ fontSize: 22 }}>🎨</Text>
                </View>
                <Text style={edStyles.toolLabel}>Sticker</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Text input panel */}
          {mode === 'text' && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'position' : undefined}
              style={edStyles.textPanel}
            >
              <View style={edStyles.colorRow}>
                {TEXT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setTextColor(c)}
                    style={[edStyles.colorDot, { backgroundColor: c },
                      textColor === c && { borderWidth: 3, borderColor: '#FFF', transform: [{ scale: 1.2 }] }]}
                  />
                ))}
              </View>
              <View style={edStyles.textRow}>
                <TextInput
                  style={[edStyles.textIn, { color: textColor }]}
                  value={textDraft}
                  onChangeText={setTextDraft}
                  placeholder="Escribí algo..."
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  autoFocus
                  onSubmitEditing={addText}
                  returnKeyType="done"
                  maxLength={80}
                />
                <TouchableOpacity
                  style={[edStyles.addTextBtn, !textDraft.trim() && { opacity: 0.35 }]}
                  onPress={addText}
                  disabled={!textDraft.trim()}
                >
                  <Ionicons name="checkmark" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* Emoji / sticker picker */}
          {mode === 'emoji' && (
            <View style={edStyles.emojiPanel}>
              <Text style={edStyles.emojiTitle}>Stickers</Text>
              <View style={edStyles.emojiGrid}>
                {STICKERS.map((s, i) => (
                  <TouchableOpacity key={i} style={edStyles.emojiCell} onPress={() => addEmoji(s)}>
                    <Text style={edStyles.emojiChar}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const edStyles = StyleSheet.create({
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, zIndex: 100,
  },
  iconBtn: {
    padding: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20,
  },
  doneBtn: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  doneTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  hint: { position: 'absolute', bottom: 130, left: 0, right: 0, alignItems: 'center' },
  hintTxt: {
    color: 'rgba(255,255,255,0.7)', fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    paddingTop: 18, paddingBottom: 44, backgroundColor: 'rgba(0,0,0,0.65)',
  },
  toolBtn: { alignItems: 'center', gap: 6 },
  toolCircle: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  toolLabel: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  textPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 16,
    paddingTop: 18, paddingBottom: 52, gap: 14,
  },
  colorRow: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  textRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  textIn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 18, fontWeight: '700',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  addTextBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  emojiPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(12,12,22,0.94)',
    paddingTop: 18, paddingBottom: 52, paddingHorizontal: 8,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  emojiTitle: { color: '#FFF', fontWeight: '700', fontSize: 14, marginBottom: 12, paddingLeft: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emojiCell: { width: SW / 6, alignItems: 'center', paddingVertical: 10 },
  emojiChar: { fontSize: 36 },
});

// ── Main screen ───────────────────────────────────────────────────
export default function NewPostScreen() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [postType, setPostType] = useState<'post' | 'story'>('post');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overlays, setOverlays] = useState<StoryOverlay[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isHighlight, setIsHighlight] = useState(false);
  const [highlightCategory, setHighlightCategory] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    getRestaurantByOwner(user.uid).then((r) => { if (r) setRestaurant(r); });
  }, [user?.uid]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para agregar una foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: postType !== 'story',
      aspect: postType === 'story' ? undefined : [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setOverlays([]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: postType !== 'story',
      aspect: postType === 'story' ? undefined : [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setOverlays([]);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Agregar foto', undefined, [
      { text: 'Galería', onPress: pickImage },
      { text: 'Cámara', onPress: takePhoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handlePublish = async () => {
    if (!imageUri) { Alert.alert('Agregá una foto antes de publicar'); return; }
    if (!restaurant) { Alert.alert('Error', 'No se pudo identificar tu restaurante.'); return; }
    setSaving(true);
    try {
      const imageUrl = await uploadPostImage(restaurant.id, imageUri);
      await createPost({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantLogoUrl: restaurant.logoUrl ?? '',
        imageUrl,
        caption,
        tags: selectedTags,
        type: postType,
        ...(postType === 'story' && isHighlight && {
          isHighlight: true,
          highlightCategory: highlightCategory.trim() || 'Destacadas',
        }),
        ...(overlays.length > 0 && { overlays }),
      });
      Alert.alert('¡Publicado!', 'Tu publicación ya está visible.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo publicar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva publicación</Text>
        <TouchableOpacity style={[styles.publishBtn, saving && { opacity: 0.6 }]} onPress={handlePublish} disabled={saving}>
          {saving
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Text style={styles.publishBtnText}>Publicar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Tipo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tipo</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, postType === 'post' && styles.typeBtnActive]}
              onPress={() => { setPostType('post'); setOverlays([]); }}
            >
              <Ionicons name="grid-outline" size={18} color={postType === 'post' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.typeBtnText, postType === 'post' && { color: Colors.white }]}>Publicación</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, postType === 'story' && styles.typeBtnActive]}
              onPress={() => setPostType('story')}
            >
              <Ionicons name="play-circle-outline" size={18} color={postType === 'story' ? Colors.white : Colors.textSecondary} />
              <Text style={[styles.typeBtnText, postType === 'story' && { color: Colors.white }]}>Historia</Text>
            </TouchableOpacity>
          </View>

          {/* Highlight toggle — only for stories */}
          {postType === 'story' && (
            <>
              <View style={styles.highlightRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.highlightTitle}>Historia destacada ⭐</Text>
                  <Text style={styles.highlightSub}>Se guarda en tu perfil, no desaparece</Text>
                </View>
                <Switch
                  value={isHighlight}
                  onValueChange={setIsHighlight}
                  trackColor={{ true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
              {isHighlight && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.sectionLabel}>Nombre de la categoría</Text>
                  <TextInput
                    style={styles.captionInput}
                    value={highlightCategory}
                    onChangeText={setHighlightCategory}
                    placeholder="Ej: Especiales, Novedades, Eventos..."
                    placeholderTextColor={Colors.placeholderText}
                    maxLength={30}
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* Foto */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Foto</Text>
          {imageUri ? (
            <>
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: imageUri }}
                  style={[styles.pickedImage, { height: postType === 'story' ? 320 : 220 }]}
                  resizeMode="cover"
                />
                <TouchableOpacity style={styles.removeImg} onPress={() => { setImageUri(null); setOverlays([]); }}>
                  <Ionicons name="close-circle" size={28} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeImg} onPress={showImageOptions}>
                  <Ionicons name="camera-outline" size={16} color={Colors.white} />
                  <Text style={styles.changeImgText}>Cambiar</Text>
                </TouchableOpacity>
              </View>

              {/* Story edit button */}
              {postType === 'story' && (
                <TouchableOpacity style={styles.editStoryRow} onPress={() => setEditorOpen(true)}>
                  <Ionicons name="color-wand-outline" size={16} color={Colors.primary} />
                  <Text style={styles.editStoryTxt}>
                    {overlays.length > 0
                      ? `Editar historia · ${overlays.length} elemento${overlays.length !== 1 ? 's' : ''}`
                      : 'Agregar texto, stickers y ubicación'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.addImageBtn} onPress={showImageOptions}>
              <Ionicons name="camera-outline" size={32} color={Colors.textLight} />
              <Text style={styles.addImageText}>Tocá para agregar una foto</Text>
              <Text style={styles.addImageHint}>Galería o cámara · JPG, PNG</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Descripción</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Contá algo sobre este plato o momento..."
            placeholderTextColor={Colors.placeholderText}
            multiline
            numberOfLines={4}
            maxLength={300}
            value={caption}
            onChangeText={setCaption}
          />
          <Text style={styles.charCount}>{caption.length}/300</Text>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Etiquetas</Text>
          <View style={styles.tagsGrid}>
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                onPress={() => toggleTag(tag)}
              >
                {selectedTags.includes(tag) && (
                  <Ionicons name="checkmark" size={13} color={Colors.white} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview */}
        {imageUri && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Vista previa</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                {restaurant?.logoUrl
                  ? <Image source={{ uri: restaurant.logoUrl }} style={{ width: 34, height: 34, borderRadius: 17 }} />
                  : <WireframeBox width={34} height={34} circle />
                }
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.previewRestaurant}>{restaurant?.name ?? 'Mi restaurante'}</Text>
                  <Text style={styles.previewTime}>Ahora</Text>
                </View>
              </View>
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: imageUri }}
                  style={[styles.pickedImage, { height: postType === 'story' ? 200 : 160, marginBottom: 10, borderRadius: 10 }]}
                  resizeMode="cover"
                />
                {postType === 'story' && overlays.length > 0 && (
                  <View style={styles.overlayBadge}>
                    <Ionicons name="layers" size={11} color={Colors.white} />
                    <Text style={styles.overlayBadgeTxt}>{overlays.length}</Text>
                  </View>
                )}
              </View>
              {caption.length > 0 && <Text style={styles.previewCaption}>{caption}</Text>}
              {selectedTags.length > 0 && (
                <View style={styles.previewTags}>
                  {selectedTags.map((t) => (
                    <View key={t} style={styles.previewTag}>
                      <Text style={styles.previewTagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Story editor modal */}
      <StoryEditorModal
        visible={editorOpen}
        imageUri={imageUri}
        overlays={overlays}
        restaurant={restaurant}
        onClose={() => setEditorOpen(false)}
        onDone={() => setEditorOpen(false)}
        onAdd={(o) => setOverlays((prev) => [...prev, o])}
        onMove={(id, x, y) => setOverlays((prev) => prev.map((o) => o.id === id ? { ...o, x, y } : o))}
        onRemove={(id) => setOverlays((prev) => prev.filter((o) => o.id !== id))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  publishBtn: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7 },
  publishBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  section: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 14,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  typeBtnActive: { backgroundColor: Colors.dark, borderColor: Colors.dark },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  addImageBtn: {
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 12, height: 160,
    alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.background,
  },
  addImageText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  addImageHint: { fontSize: 12, color: Colors.textLight },
  imagePreview: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  pickedImage: { width: '100%', borderRadius: 12 },
  removeImg: { position: 'absolute', top: 8, right: 8 },
  changeImg: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  changeImgText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  highlightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  highlightTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  highlightSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  editStoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FFD6D6',
  },
  editStoryTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.primary },
  overlayBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  overlayBadgeTxt: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  captionInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 12, fontSize: 14, color: Colors.text, backgroundColor: Colors.background,
    minHeight: 90, textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, color: Colors.textLight, textAlign: 'right', marginTop: 4 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  tagActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagText: { fontSize: 13, color: Colors.text },
  tagTextActive: { color: Colors.white, fontWeight: '600' },
  previewCard: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 12, backgroundColor: Colors.background,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  previewRestaurant: { fontSize: 13, fontWeight: '600', color: Colors.text },
  previewTime: { fontSize: 11, color: Colors.textLight },
  previewCaption: { fontSize: 13, color: Colors.text, marginBottom: 8 },
  previewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  previewTag: { backgroundColor: Colors.tag, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  previewTagText: { fontSize: 11, color: Colors.tagText },
});
