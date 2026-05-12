import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/hooks/useAuth';
import { getFollowedRestaurants, unfollowRestaurant } from '@/services/users';
import { Restaurant } from '@/types';

export default function FollowingScreen() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const list = await getFollowedRestaurants(user.uid);
    setRestaurants(list);
    setLoading(false);
  }, [user?.uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUnfollow = async (restaurantId: string) => {
    if (!user?.uid) return;
    await unfollowRestaurant(user.uid, restaurantId);
    setRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seguidos</Text>
        <Text style={styles.headerSub}>{restaurants.length} restaurantes</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : restaurants.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>Todavía no seguís ningún restaurante</Text>
          <Text style={styles.emptyText}>Explorá y tocá "Seguir" en los perfiles que te gusten</Text>
          <TouchableOpacity style={styles.btnExplore} onPress={() => router.push('/(client)/search')}>
            <Text style={styles.btnExploreText}>Explorar restaurantes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {restaurants.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.card}
              onPress={() => router.push(`/restaurant/${r.id}`)}
            >
              {r.logoUrl
                ? <Image source={{ uri: r.logoUrl }} style={styles.logo} resizeMode="cover" />
                : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="storefront-outline" size={28} color={Colors.border} />
                  </View>
                )
              }
              <View style={styles.info}>
                <Text style={styles.name}>{r.name}</Text>
                <View style={styles.tags}>
                  {r.tags.slice(0, 2).map((t) => (
                    <View key={t} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.meta}>
                  <Ionicons name="star" size={12} color="#FFC107" />
                  <Text style={styles.metaText}>{r.rating}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Ionicons
                    name={r.isOpen ? 'checkmark-circle' : 'close-circle'}
                    size={12}
                    color={r.isOpen ? Colors.success : Colors.primary}
                  />
                  <Text style={[styles.metaText, { color: r.isOpen ? Colors.success : Colors.primary }]}>
                    {r.isOpen ? 'Abierto' : 'Cerrado'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.unfollowBtn} onPress={() => handleUnfollow(r.id)}>
                <Ionicons name="heart" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  logo: { width: 72, height: 72, borderRadius: 10 },
  logoPlaceholder: {
    width: 72, height: 72, borderRadius: 10,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  tag: { backgroundColor: Colors.tag, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 11, color: Colors.tagText },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  dot: { color: Colors.textLight },
  unfollowBtn: { padding: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  btnExplore: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  btnExploreText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
});
