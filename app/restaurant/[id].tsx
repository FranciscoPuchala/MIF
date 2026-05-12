import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
  Image, Modal, Animated, Dimensions, Linking, Share, Alert, Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { WireframeBox } from '@/components/WireframeBox';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useAuth } from '@/hooks/useAuth';
import { followRestaurant, unfollowRestaurant, isFollowing } from '@/services/users';
import { Post } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
const STORY_DURATION = 5000;

function is24hActive(post: Post): boolean {
  try {
    const ts = (post.createdAt as any)?.seconds
      ? (post.createdAt as any).seconds * 1000
      : new Date(post.createdAt as any).getTime();
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  } catch { return false; }
}

export default function RestaurantProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { restaurant, posts, loading, refetch } = useRestaurant(id ?? '');
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (user?.uid && id) {
      isFollowing(user.uid, id).then(setFollowing);
    }
  }, [user?.uid, id]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyVisible, setStoryVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStories = posts.filter((p) => p.type === 'story' && is24hActive(p) && !p.isHighlight && !!p.imageUrl);
  const feedPosts     = posts.filter((p) => p.type === 'post' && !!p.imageUrl);
  const highlights    = posts.filter((p) => p.type === 'story' && !!p.isHighlight && !!p.imageUrl);
  const highlightGroups = highlights.reduce<Record<string, Post[]>>((acc, p) => {
    const cat = p.highlightCategory ?? 'Destacadas';
    (acc[cat] = acc[cat] ?? []).push(p);
    return acc;
  }, {});

  const hasStories     = activeStories.length > 0;
  const hasHighlights  = Object.keys(highlightGroups).length > 0;

  // Unified viewer list (used for both stories and highlights)
  const [viewerList, setViewerList]   = useState<Post[]>([]);
  const currentStory = viewerList[storyIndex];

  const openStory = () => { setViewerList(activeStories); setStoryIndex(0); setStoryVisible(true); startProgress(); };
  const openHighlight = (cat: string) => {
    setViewerList(highlightGroups[cat] ?? []);
    setStoryIndex(0);
    setStoryVisible(true);
    startProgress();
  };

  const openInMaps = () => {
    if (!restaurant) return;
    const hasCoords = restaurant.location?.lat && restaurant.location.lat !== 0;
    if (hasCoords) {
      const lat = restaurant.location.lat;
      const lng = restaurant.location.lng;
      const label = encodeURIComponent(restaurant.name);
      const url = Platform.OS === 'ios'
        ? `maps://?ll=${lat},${lng}&q=${label}`
        : `geo:${lat},${lng}?q=${label}`;
      Linking.openURL(url);
    } else {
      const q = encodeURIComponent(`${restaurant.address} ${restaurant.neighborhood}`);
      const url = Platform.OS === 'ios'
        ? `maps://?address=${q}`
        : `https://www.google.com/maps/search/?api=1&query=${q}`;
      Linking.openURL(url);
    }
  };

  const startProgress = () => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: STORY_DURATION, useNativeDriver: false }).start();
    timerRef.current = setTimeout(advanceStory, STORY_DURATION);
  };

  const advanceStory = () => {
    setStoryIndex((prev) => {
      if (prev + 1 < viewerList.length) { startProgress(); return prev + 1; }
      closeStory(); return prev;
    });
  };

  const closeStory = () => {
    progress.stopAnimation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setStoryVisible(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <Text style={{ color: Colors.textSecondary }}>Restaurante no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Banner + logo centrado */}
        <View style={styles.bannerWrapper}>
          {restaurant.bannerUrl
            ? <Image source={{ uri: restaurant.bannerUrl }} style={styles.bannerImg} resizeMode="cover" />
            : <View style={styles.bannerPlaceholder} />
          }

          {/* Botones top */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => Share.share({
                message: `${restaurant.name} — Make It Find\n${restaurant.address}${restaurant.neighborhood ? ', ' + restaurant.neighborhood : ''}`,
              })}
            >
              <Ionicons name="share-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Logo centrado con ring de historia */}
          <View style={styles.avatarCenter}>
            <TouchableOpacity
              onPress={hasStories ? openStory : undefined}
              style={[styles.avatarRing, hasStories && styles.avatarRingActive]}
            >
              {restaurant.logoUrl
                ? <Image source={{ uri: restaurant.logoUrl }} style={styles.avatarImg} />
                : <View style={styles.avatarPlaceholder}>
                    <Ionicons name="storefront-outline" size={34} color={Colors.border} />
                  </View>
              }
            </TouchableOpacity>
            {hasStories && (
              <View style={styles.storyDot}>
                <Ionicons name="ellipse" size={8} color={Colors.primary} />
              </View>
            )}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <View style={styles.metaRow}>
            {restaurant.reviewCount > 0 && (
              <>
                <Ionicons name="star" size={14} color="#FFC107" />
                <Text style={styles.metaText}>{restaurant.rating}</Text>
                <Text style={styles.dot}>·</Text>
              </>
            )}
            <Text style={styles.metaText}>{restaurant.tags.slice(0, 2).join(' · ')}</Text>
            <Text style={styles.dot}>·</Text>
            <Ionicons name="location-outline" size={13} color={Colors.textLight} />
            <Text style={styles.metaText}>{restaurant.neighborhood}</Text>
          </View>

          <View style={styles.actions}>
            <Link href={`/restaurant/${id}/reserve`} asChild>
              <TouchableOpacity style={styles.btnReserva}>
                <Ionicons name="calendar" size={18} color={Colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.btnReservaText}>¡Reserva ya!</Text>
              </TouchableOpacity>
            </Link>
            <TouchableOpacity
              style={[styles.btnFollow, following && styles.btnFollowing, followLoading && { opacity: 0.6 }]}
              disabled={followLoading || !user}
              onPress={async () => {
                if (!user?.uid || !id) return;
                setFollowLoading(true);
                try {
                  if (following) {
                    await unfollowRestaurant(user.uid, id);
                    setFollowing(false);
                  } else {
                    await followRestaurant(user.uid, id);
                    setFollowing(true);
                  }
                  refetch();
                } catch {
                  Alert.alert('Error', 'No se pudo completar la acción. Intentá de nuevo.');
                } finally {
                  setFollowLoading(false);
                }
              }}
            >
              {followLoading
                ? <ActivityIndicator size="small" color={following ? Colors.primary : Colors.text} />
                : <Text style={[styles.btnFollowText, following && { color: Colors.primary }]}>
                    {following ? 'Siguiendo' : 'Seguir'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.extraInfo}>
            <View style={styles.extraRow}>
              <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.extraText}>{restaurant.address}</Text>
            </View>
            <View style={styles.extraRow}>
              <Ionicons name="call-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.extraText}>{restaurant.phone}</Text>
            </View>
            <View style={styles.extraRow}>
              <Ionicons
                name={restaurant.isOpen ? 'checkmark-circle' : 'close-circle'}
                size={15}
                color={restaurant.isOpen ? Colors.success : Colors.primary}
              />
              <Text style={[styles.extraText, { color: restaurant.isOpen ? Colors.success : Colors.primary }]}>
                {restaurant.isOpen ? 'Abierto ahora' : 'Cerrado'}
              </Text>
            </View>
          </View>
        </View>

        {/* Historias destacadas (highlights) */}
        {hasHighlights && (
          <View style={styles.storiesSection}>
            <Text style={styles.storiesTitle}>Destacadas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.entries(highlightGroups).map(([cat, catStories]) => (
                <TouchableOpacity key={cat} style={styles.storyItem} onPress={() => openHighlight(cat)}>
                  <View style={[styles.storyRing, styles.highlightRing]}>
                    <Image source={{ uri: catStories[0].imageUrl }} style={styles.storyThumb} />
                  </View>
                  <Text style={styles.storyLabel} numberOfLines={1}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Historias activas (24h) */}
        {activeStories.length > 0 && (
          <View style={styles.storiesSection}>
            <Text style={styles.storiesTitle}>Historias</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activeStories.map((s, i) => (
                <TouchableOpacity key={s.id} style={styles.storyItem}
                  onPress={() => { setViewerList(activeStories); setStoryIndex(i); setStoryVisible(true); startProgress(); }}>
                  <View style={styles.storyRing}>
                    {restaurant.logoUrl
                      ? <Image source={{ uri: restaurant.logoUrl }} style={styles.storyThumb} />
                      : <WireframeBox width={56} height={56} circle />
                    }
                  </View>
                  <Text style={styles.storyLabel} numberOfLines={1}>{s.caption || 'Historia'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Mapa */}
        {restaurant.location?.lat !== 0 && restaurant.location?.lng !== 0 && restaurant.location?.lat ? (
          <View style={styles.mapSection}>
            <Text style={styles.mapTitle}>Ubicación</Text>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={{
                latitude: restaurant.location.lat,
                longitude: restaurant.location.lng,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{ latitude: restaurant.location.lat, longitude: restaurant.location.lng }}
                title={restaurant.name}
                description={restaurant.address}
              />
            </MapView>
            <TouchableOpacity style={styles.mapBtn} onPress={openInMaps}>
              <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
              <Text style={styles.mapBtnText}>Cómo llegar</Text>
            </TouchableOpacity>
          </View>
        ) : restaurant.address ? (
          <View style={styles.mapSection}>
            <Text style={styles.mapTitle}>Ubicación</Text>
            <TouchableOpacity style={styles.mapBtnFull} onPress={openInMaps}>
              <Ionicons name="map-outline" size={18} color={Colors.primary} />
              <Text style={styles.mapBtnText}>
                {Platform.OS === 'ios' ? 'Ver en Apple Maps' : 'Ver en Google Maps'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Posts */}
        {feedPosts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Ionicons name="images-outline" size={36} color={Colors.border} />
            <Text style={styles.emptyText}>Sin publicaciones todavía</Text>
          </View>
        ) : (
          feedPosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                {restaurant.logoUrl
                  ? <Image source={{ uri: restaurant.logoUrl }} style={styles.postAvatar} />
                  : <View style={styles.postAvatarPlaceholder}>
                      <Ionicons name="storefront-outline" size={16} color={Colors.border} />
                    </View>
                }
                <View style={styles.postMeta}>
                  <Text style={styles.postRestaurant}>{restaurant.name}</Text>
                  <Text style={styles.postTime}>
                    {post.createdAt
                      ? (() => {
                          const ts = (post.createdAt as any)?.seconds
                            ? (post.createdAt as any).seconds * 1000
                            : new Date(post.createdAt as any).getTime();
                          return new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
                        })()
                      : 'Reciente'}
                  </Text>
                </View>
              </View>
              {post.imageUrl
                ? <Image source={{ uri: post.imageUrl }} style={styles.postImg} resizeMode="cover" />
                : <WireframeBox width="100%" height={200} rounded style={styles.postImg} />
              }
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Visor de historia */}
      <Modal visible={storyVisible} animationType="fade" statusBarTranslucent>
        <View style={styles.storyModal}>
          {currentStory?.imageUrl && (
            <Image source={{ uri: currentStory.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
          )}

          <View style={styles.progressBar}>
            {viewerList.map((_, i) => (
              <View key={i} style={styles.progressSegment}>
                <Animated.View style={[styles.progressFill, {
                  width: i < storyIndex ? '100%'
                    : i === storyIndex
                      ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                      : '0%',
                }]} />
              </View>
            ))}
          </View>

          <View style={styles.storyHeader}>
            {restaurant.logoUrl
              ? <Image source={{ uri: restaurant.logoUrl }} style={styles.storyAvatar} />
              : <WireframeBox width={36} height={36} circle />
            }
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.storyRestaurantName}>{restaurant.name}</Text>
              <Text style={styles.storyAgo}>hace unos momentos</Text>
            </View>
            <TouchableOpacity onPress={closeStory} style={{ padding: 6 }}>
              <Ionicons name="close" size={26} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Overlays */}
          {currentStory?.overlays?.map((o) => {
            const { width: vW, height: vH } = Dimensions.get('window');
            const isEmoji = o.type === 'emoji';
            const label   = o.type === 'location' ? `📍 ${o.content}` : o.content;
            return (
              <View key={o.id} pointerEvents="none"
                style={{ position: 'absolute', left: o.x * vW, top: o.y * vH, zIndex: 10 }}>
                <View style={{
                  backgroundColor: isEmoji ? undefined : (o.bgColor ?? 'rgba(0,0,0,0.45)'),
                  borderRadius: isEmoji ? 0 : 8,
                  paddingHorizontal: isEmoji ? 0 : 12,
                  paddingVertical: isEmoji ? 0 : 5,
                }}>
                  <Text style={{ color: o.color, fontSize: o.fontSize, fontWeight: isEmoji ? '400' : '700' }}>
                    {label}
                  </Text>
                </View>
              </View>
            );
          })}

          {currentStory?.caption ? (
            <View style={styles.storyCaptionBox}>
              <Text style={styles.storyCaptionText}>{currentStory.caption}</Text>
            </View>
          ) : null}

          <View style={styles.storyTapZones}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => {
              if (storyIndex > 0) { if (timerRef.current) clearTimeout(timerRef.current); setStoryIndex((p) => p - 1); startProgress(); }
            }} />
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { if (timerRef.current) clearTimeout(timerRef.current); advanceStory(); }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  bannerWrapper: { position: 'relative', height: 220 },
  bannerImg: { width: '100%', height: 220 },
  bannerPlaceholder: { width: '100%', height: 220, backgroundColor: Colors.dark },
  headerOverlay: {
    position: 'absolute', top: 48, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  iconBtn: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: 7 },
  avatarCenter: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 3, borderColor: Colors.white,
    overflow: 'hidden', backgroundColor: Colors.background,
  },
  avatarRingActive: { borderColor: Colors.primary, borderWidth: 3 },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  storyDot: { marginTop: 4 },
  infoSection: { backgroundColor: Colors.white, paddingTop: 20, paddingHorizontal: 16, paddingBottom: 16 },
  restaurantName: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 6, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 10, justifyContent: 'center' },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  dot: { fontSize: 13, color: Colors.textLight },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  btnReserva: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 13, borderRadius: 10,
  },
  btnReservaText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  btnFollow: {
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  btnFollowing: { borderColor: Colors.primary },
  btnFollowText: { fontWeight: '600', fontSize: 14, color: Colors.text },
  extraInfo: { gap: 8 },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  extraText: { fontSize: 13, color: Colors.textSecondary },
  storiesSection: { backgroundColor: Colors.white, paddingVertical: 14, paddingHorizontal: 16, marginTop: 8 },
  storiesTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  storyItem: { alignItems: 'center', marginRight: 14 },
  storyRing: { borderWidth: 2.5, borderColor: Colors.primary, borderRadius: 34, padding: 2, marginBottom: 4 },
  highlightRing: { borderColor: '#FFB300' },
  storyThumb: { width: 56, height: 56, borderRadius: 28 },
  storyLabel: { fontSize: 11, color: Colors.text, maxWidth: 64, textAlign: 'center' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  postCard: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  postAvatar: { width: 36, height: 36, borderRadius: 18 },
  postAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  postMeta: { flex: 1, marginLeft: 10 },
  postRestaurant: { fontSize: 14, fontWeight: '600', color: Colors.text },
  postTime: { fontSize: 12, color: Colors.textLight },
  postImg: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  postCaption: { fontSize: 13, color: Colors.text, marginBottom: 8 },
  postTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  postTag: { backgroundColor: Colors.tag, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  postTagText: { fontSize: 11, color: Colors.tagText },
  emptyPosts: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  // Story viewer
  storyModal: { flex: 1, backgroundColor: '#000' },
  storyDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  progressBar: { position: 'absolute', top: 52, left: 8, right: 8, flexDirection: 'row', gap: 4, zIndex: 10 },
  progressSegment: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.white },
  storyHeader: { position: 'absolute', top: 64, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  storyAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: Colors.white },
  storyRestaurantName: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  storyAgo: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  storyCaptionBox: {
    position: 'absolute', bottom: 60, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 12, zIndex: 10,
  },
  storyCaptionText: { color: Colors.white, fontSize: 14, lineHeight: 20 },
  storyTapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 },
  mapSection: { backgroundColor: Colors.white, marginTop: 8, padding: 16 },
  mapTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  map: { width: '100%', height: 180, borderRadius: 12, marginBottom: 10 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 10,
    paddingVertical: 12,
  },
  mapBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
