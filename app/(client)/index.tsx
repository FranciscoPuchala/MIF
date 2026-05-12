import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar,
  Image, Modal, Animated, Dimensions,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { MifLogo } from '@/components/MifLogo';
import { subscribeToFeed, subscribeToStories, getFeedRestaurants, getRestaurant } from '@/services/restaurants';
import { useAuth } from '@/hooks/useAuth';
import { Post, Restaurant } from '@/types';

const { width: W, height: H } = Dimensions.get('window');
const STORY_DURATION = 5000;
const CATEGORIES = ['Todos', 'Sushi', 'Italiano', 'Argentino', 'Vegano', 'Brunch'];

function SkeletonBox({ width, height, radius = 10, style }: { width: any; height: number; radius?: number; style?: any }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 850, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: '#E4E4E4', opacity: pulse }, style]} />;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts]             = useState<Post[]>([]);
  const [stories, setStories]         = useState<Post[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [groupIdx, setGroupIdx]   = useState(0);
  const [itemIdx, setItemIdx]     = useState(0);
  const [storyVisible, setStoryVisible] = useState(false);

  const groupIdxRef  = useRef(0);
  const itemIdxRef   = useRef(0);
  const progress     = useRef(new Animated.Value(0)).current;
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideX       = useRef(new Animated.Value(0)).current;

  const headerAnim  = useRef(new Animated.Value(0)).current;
  const cardsAnim   = useRef(new Animated.Value(0)).current;
  const feedAnim    = useRef(new Animated.Value(0)).current;
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardsAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(feedAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    getFeedRestaurants().then((data) => {
      setRestaurants(data);
      data.forEach((r) => fetchedIdsRef.current.add(r.id));
      setLoading(false);
    });
    const unsubFeed    = subscribeToFeed((data) => setPosts(data));
    const unsubStories = subscribeToStories((data) => setStories(data));
    return () => { unsubFeed(); unsubStories(); };
  }, []);

  useEffect(() => {
    if (posts.length === 0) return;
    const missingIds = [...new Set(posts.map((p) => p.restaurantId))]
      .filter((id) => !fetchedIdsRef.current.has(id));
    if (missingIds.length === 0) return;
    missingIds.forEach((id) => fetchedIdsRef.current.add(id));
    Promise.all(missingIds.map((id) => getRestaurant(id))).then((results) => {
      const found = results.filter(Boolean) as Restaurant[];
      if (found.length > 0) setRestaurants((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        return [...prev, ...found.filter((r) => !existingIds.has(r.id))];
      });
    });
  }, [posts]);

  const filteredRestaurants = activeCategory === 'Todos'
    ? restaurants
    : restaurants.filter((r) => r.tags?.some((t) => t.toLowerCase().includes(activeCategory.toLowerCase())));

  // ── Story groups (one per restaurant, excludes highlights) ────────
  const storyGroups = useMemo(() => {
    const map = new Map<string, Post[]>();
    stories.filter(s => !s.isHighlight).forEach(s => {
      const arr = map.get(s.restaurantId) ?? [];
      arr.push(s);
      map.set(s.restaurantId, arr);
    });
    return Array.from(map.values());
  }, [stories]);

  const storyGroupsRef = useRef(storyGroups);
  useEffect(() => { storyGroupsRef.current = storyGroups; }, [storyGroups]);

  const currentGroup = storyGroups[groupIdx] ?? [];
  const currentStory = currentGroup[itemIdx];

  const getGroupLogo = (group: Post[]) => {
    const first = group[0];
    return first?.restaurantLogoUrl || restaurants.find(r => r.id === first?.restaurantId)?.logoUrl || null;
  };
  const getGroupName = (group: Post[]) => {
    const first = group[0];
    return restaurants.find(r => r.id === first?.restaurantId)?.name || first?.restaurantName || '';
  };

  // ── Story logic ──────────────────────────────────────────────────
  const startProgress = () => {
    progress.setValue(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(progress, { toValue: 1, duration: STORY_DURATION, useNativeDriver: false }).start();
    timerRef.current = setTimeout(advanceStory, STORY_DURATION);
  };

  const openStory = (gIdx: number) => {
    groupIdxRef.current = gIdx;
    itemIdxRef.current  = 0;
    setGroupIdx(gIdx);
    setItemIdx(0);
    setStoryVisible(true);
    startProgress();
  };

  const advanceStory = () => {
    const gIdx = groupIdxRef.current;
    const sIdx = itemIdxRef.current;
    const groups = storyGroupsRef.current;
    const curGroup = groups[gIdx] ?? [];
    if (sIdx + 1 < curGroup.length) {
      itemIdxRef.current = sIdx + 1;
      setItemIdx(sIdx + 1);
      startProgress();
      return;
    }
    if (gIdx + 1 < groups.length) {
      goToNextGroup(gIdx + 1);
      return;
    }
    closeStory();
  };

  const goToNextGroup = (nextGIdx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    progress.stopAnimation();
    Animated.timing(slideX, { toValue: -W, duration: 220, useNativeDriver: true }).start(() => {
      groupIdxRef.current = nextGIdx;
      itemIdxRef.current  = 0;
      setGroupIdx(nextGIdx);
      setItemIdx(0);
      slideX.setValue(W);
      Animated.timing(slideX, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => startProgress());
    });
  };

  const closeStory = () => {
    progress.stopAnimation();
    if (timerRef.current) clearTimeout(timerRef.current);
    slideX.setValue(0);
    setStoryVisible(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };
  const firstName = user?.displayName?.split(' ')[0] || '';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#12131f" />

      {/* ── Header ───────────────────────────────────────────────── */}
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
      }]}>
        <View>
          <Text style={styles.greeting}>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</Text>
          <Text style={styles.subGreeting}>¿Qué vas a comer hoy?</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/(client)/profile')} style={styles.avatarBtn}>
            {user?.photoURL
              ? <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
              : <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={18} color="rgba(255,255,255,0.8)" />
                </View>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Search ───────────────────────────────────────────── */}
        <Animated.View style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}>
          <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/(client)/search')} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.45)" />
            <Text style={styles.searchText}>Buscar restaurante o comida...</Text>
            <View style={styles.searchFilter}>
              <Ionicons name="options-outline" size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── White content card ──────────────────────────────── */}
        <View style={styles.contentCard}>

          {/* Categories */}
          <Animated.View style={{
            opacity: cardsAnim,
            transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {loading ? (
            <View style={styles.skeletonWrap}>
              <SkeletonBox width={W - 48} height={200} radius={16} />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <SkeletonBox width={130} height={150} radius={14} />
                <SkeletonBox width={130} height={150} radius={14} />
              </View>
              <View style={{ gap: 10, marginTop: 20 }}>
                <SkeletonBox width={W - 48} height={60} radius={10} />
                <SkeletonBox width={W - 48} height={60} radius={10} />
              </View>
            </View>
          ) : (
            <>
              {/* ── Stories ──────────────────────────────────────── */}
              {storyGroups.length > 0 && (
                <Animated.View style={{
                  opacity: cardsAnim,
                  transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                }}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Historias</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesRow}>
                    {storyGroups.map((group, gIdx) => {
                      const logoUrl = getGroupLogo(group);
                      const name    = getGroupName(group);
                      return (
                        <TouchableOpacity key={group[0].restaurantId} style={styles.storyItem} onPress={() => openStory(gIdx)}>
                          <View style={styles.storyRingOuter}>
                            <View style={styles.storyRingInner}>
                              {logoUrl
                                ? <Image source={{ uri: logoUrl }} style={styles.storyThumb} />
                                : <View style={styles.storyThumbPlaceholder}>
                                    <Ionicons name="storefront" size={24} color={Colors.primary} />
                                  </View>
                              }
                            </View>
                          </View>
                          <Text style={styles.storyName} numberOfLines={1}>{name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </Animated.View>
              )}

              {/* ── Featured hero ─────────────────────────────────── */}
              {filteredRestaurants.length > 0 && (
                <Animated.View style={{
                  opacity: cardsAnim,
                  transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                }}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Destacados</Text>
                    <TouchableOpacity onPress={() => router.push('/(client)/search')}>
                      <Text style={styles.seeAll}>Ver todo →</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Square cards row */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squareRow}>
                    {filteredRestaurants.map((r) => (
                      <Link key={r.id} href={`/restaurant/${r.id}`} asChild>
                        <TouchableOpacity style={styles.squareCard} activeOpacity={0.88}>
                          {r.bannerUrl || r.logoUrl
                            ? <Image source={{ uri: r.bannerUrl || r.logoUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                            : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.dark }]} />
                          }
                          <View style={styles.squareDim} />
                          {r.logoUrl
                            ? <Image source={{ uri: r.logoUrl }} style={styles.squareLogo} />
                            : <View style={[styles.squareLogo, styles.squareLogoFallback]}>
                                <Ionicons name="storefront-outline" size={22} color="rgba(255,255,255,0.7)" />
                              </View>
                          }
                          <View style={styles.squareBottom}>
                            <Text style={styles.squareName} numberOfLines={1}>{r.name}</Text>
                            {r.isOpen === true && <View style={styles.squareOpenDot} />}
                          </View>
                        </TouchableOpacity>
                      </Link>
                    ))}
                  </ScrollView>
                </Animated.View>
              )}

              {/* ── Feed ─────────────────────────────────────────── */}
              <Animated.View style={{
                opacity: feedAnim,
                transform: [{ translateY: feedAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
              }}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Novedades</Text>
                </View>
                {(() => {
                  const displayPosts = posts.filter((p) => !!p.imageUrl);
                  if (displayPosts.length === 0) return (
                    <View style={styles.emptyFeed}>
                      <View style={styles.emptyIconWrap}>
                        <Ionicons name="images-outline" size={36} color={Colors.primary} />
                      </View>
                      <Text style={styles.emptyTitle}>Sin publicaciones aún</Text>
                      <Text style={styles.emptyText}>Seguí restaurantes para ver sus novedades acá</Text>
                      <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(client)/search')}>
                        <Text style={styles.exploreBtnText}>Explorar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                  const groups: Post[][] = [];
                  for (let i = 0; i < displayPosts.length; i += 3) groups.push(displayPosts.slice(i, i + 3));
                  const getLogo = (p: Post) => p.restaurantLogoUrl || restaurants.find((r) => r.id === p.restaurantId)?.logoUrl || null;
                  const PostOverlay = ({ post }: { post: Post }) => {
                    const logo = getLogo(post);
                    return (
                      <View style={styles.gridOverlay}>
                        {logo
                          ? <Image source={{ uri: logo }} style={styles.gridAvatar} />
                          : <View style={styles.gridAvatarPlaceholder}><Ionicons name="storefront" size={10} color={Colors.primary} /></View>
                        }
                        <Text style={styles.gridRestaurant} numberOfLines={1}>{post.restaurantName}</Text>
                      </View>
                    );
                  };
                  return (
                    <View style={styles.staggeredGrid}>
                      {groups.map((group, gi) => (
                        <View key={gi} style={{ gap: 3, marginBottom: 3 }}>
                          <Link href={`/restaurant/${group[0].restaurantId}`} asChild>
                            <TouchableOpacity style={styles.bigItem} activeOpacity={0.88}>
                              <Image source={{ uri: group[0].imageUrl }} style={styles.bigItemImg} resizeMode="cover" />
                              <PostOverlay post={group[0]} />
                            </TouchableOpacity>
                          </Link>
                          {group.length > 1 && (
                            <View style={{ flexDirection: 'row', gap: 3 }}>
                              {group[1] && (
                                <Link href={`/restaurant/${group[1].restaurantId}`} asChild>
                                  <TouchableOpacity style={styles.smallItem} activeOpacity={0.88}>
                                    <Image source={{ uri: group[1].imageUrl }} style={styles.smallItemImg} resizeMode="cover" />
                                    <PostOverlay post={group[1]} />
                                  </TouchableOpacity>
                                </Link>
                              )}
                              {group[2] && (
                                <Link href={`/restaurant/${group[2].restaurantId}`} asChild>
                                  <TouchableOpacity style={styles.smallItem} activeOpacity={0.88}>
                                    <Image source={{ uri: group[2].imageUrl }} style={styles.smallItemImg} resizeMode="cover" />
                                    <PostOverlay post={group[2]} />
                                  </TouchableOpacity>
                                </Link>
                              )}
                              {group.length === 2 && <View style={styles.smallItem} />}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </Animated.View>
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Story viewer ─────────────────────────────────────────── */}
      <Modal visible={storyVisible} animationType="fade" statusBarTranslucent>
        <View style={styles.storyModal}>
          {/* Slide container for group transitions */}
          <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: slideX }] }]}>
            {currentStory?.imageUrl && (
              <Image source={{ uri: currentStory.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
            )}
          </Animated.View>

          {/* Progress bars — one per story in current restaurant group */}
          <View style={styles.progressBar}>
            {currentGroup.map((_, i) => (
              <View key={i} style={styles.progressSegment}>
                <Animated.View style={[styles.progressFill, {
                  width: i < itemIdx ? '100%'
                    : i === itemIdx
                      ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                      : '0%',
                }]} />
              </View>
            ))}
          </View>

          {/* Header — restaurant profile photo */}
          <View style={styles.storyHeader}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => { closeStory(); router.push(`/restaurant/${currentStory?.restaurantId}`); }}
            >
              {getGroupLogo(currentGroup)
                ? <Image source={{ uri: getGroupLogo(currentGroup)! }} style={styles.storyAvatar} />
                : <View style={styles.storyAvatarFallback}>
                    <Ionicons name="storefront" size={18} color={Colors.white} />
                  </View>
              }
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.storyRestaurant}>{getGroupName(currentGroup)}</Text>
                <Text style={styles.storyAgo}>hace unos momentos</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={closeStory} style={styles.storyClose}>
              <Ionicons name="close" size={26} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Overlays */}
          {currentStory?.overlays?.map((o) => {
            const isEmoji = o.type === 'emoji';
            const label   = o.type === 'location' ? `📍 ${o.content}` : o.content;
            return (
              <View key={o.id} pointerEvents="none"
                style={{ position: 'absolute', left: o.x * W, top: o.y * H, zIndex: 10 }}>
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

          {currentStory?.caption && (
            <View style={styles.storyCaption}>
              <Text style={styles.storyCaptionText}>{currentStory.caption}</Text>
            </View>
          )}

          {/* Tap zones: left = prev, right = next */}
          <View style={styles.storyTapZones}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              const sIdx = itemIdxRef.current;
              if (sIdx > 0) { itemIdxRef.current = sIdx - 1; setItemIdx(sIdx - 1); }
              startProgress();
            }} />
            <TouchableOpacity style={{ flex: 1 }} onPress={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              advanceStory();
            }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#12131f' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#12131f',
  },
  greeting: { color: Colors.white, fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },
  subGreeting: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBtn: {},
  avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.primary },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20, marginBottom: 20,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  searchFilter: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Content card (white area)
  scroll: { flex: 1 },
  contentCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 600,
    paddingTop: 8,
  },

  // Categories
  catContainer: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  catTextActive: { color: Colors.white },

  // Skeleton
  skeletonWrap: { padding: 16, gap: 0 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, letterSpacing: 0.1 },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Stories
  storiesRow: { paddingLeft: 16, paddingBottom: 4, gap: 16 },
  storyItem: { alignItems: 'center', width: 72 },
  storyRingOuter: {
    width: 72, height: 72, borderRadius: 36,
    padding: 2.5,
    borderWidth: 2.5, borderColor: Colors.primary,
    marginBottom: 6,
  },
  storyRingInner: {
    flex: 1, borderRadius: 32, overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.background,
  },
  storyThumb: { width: '100%', height: '100%' },
  storyThumbPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center',
  },
  storyName: { fontSize: 11, color: Colors.text, textAlign: 'center', fontWeight: '500' },

  // Square cards
  squareRow: { paddingLeft: 16, paddingRight: 8, paddingBottom: 8, gap: 10 },
  squareCard: {
    width: 150, height: 150, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, elevation: 5,
  },
  squareDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },
  squareLogo: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 2.5, borderColor: Colors.white,
    alignSelf: 'center', marginTop: 28,
  },
  squareLogoFallback: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  squareBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingBottom: 10, paddingTop: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  squareName: { flex: 1, color: Colors.white, fontSize: 12, fontWeight: '700' },
  squareOpenDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.success, marginLeft: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },

  // Feed
  emptyFeed: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32, gap: 8 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  exploreBtn: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12,
  },
  exploreBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

  staggeredGrid: { paddingHorizontal: 16, paddingBottom: 8 },
  bigItem: { width: '100%', borderRadius: 18, overflow: 'hidden', position: 'relative' },
  bigItemImg: { width: '100%', height: 280 },
  smallItem: { flex: 1, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  smallItemImg: { width: '100%', height: 170 },
  gridOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gridAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  gridAvatarPlaceholder: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center',
  },
  gridRestaurant: { flex: 1, fontSize: 12, color: Colors.white, fontWeight: '700' },

  // Story viewer modal
  storyModal: { flex: 1, backgroundColor: '#000' },
  storyFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  progressBar: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 52, gap: 4, zIndex: 10 },
  progressSegment: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.white },
  storyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, zIndex: 10 },
  storyAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: Colors.white },
  storyAvatarFallback: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  storyRestaurant: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  storyAgo: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  storyClose: { padding: 6 },
  storyCaption: {
    position: 'absolute', bottom: 60, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: 14, zIndex: 10,
  },
  storyCaptionText: { color: Colors.white, fontSize: 14, lineHeight: 21 },
  storyTapZones: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 5 },
});
