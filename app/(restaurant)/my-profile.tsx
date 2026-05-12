import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Image, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { WireframeBox } from '@/components/WireframeBox';
import { useRestaurant } from '@/hooks/useRestaurant';
import { deletePost, getRestaurantByOwner } from '@/services/restaurants';
import { getFollowersCount } from '@/services/users';
import { useAuth } from '@/hooks/useAuth';
import { Post, Restaurant } from '@/types';

export default function MyProfileScreen() {
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.uid) return;
    getRestaurantByOwner(user.uid).then((r) => { if (r) setRestaurantId(r.id); });
  }, [user?.uid]);

  const { restaurant, posts, loading, error, refetch } = useRestaurant(restaurantId ?? '');
  const [editMode, setEditMode] = useState(false);
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    refetch();
    if (restaurantId) {
      getFollowersCount(restaurantId).then(setFollowersCount);
    }
  }, [restaurantId]));
  const [deleting, setDeleting] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<Post[] | null>(null);

  const displayPosts = localPosts ?? posts;
  const feedPosts  = displayPosts.filter((p) => p.type === 'post' && !!p.imageUrl);
  const storyPosts = displayPosts.filter((p) => p.type === 'story' && !!p.imageUrl);

  const handleDelete = (post: Post) => {
    Alert.alert(
      'Eliminar publicación',
      `¿Eliminar "${post.caption || 'esta publicación'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            setDeleting(post.id);
            try {
              await deletePost(post.id);
              setLocalPosts((displayPosts).filter((p) => p.id !== post.id));
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la publicación.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <TouchableOpacity onPress={() => setEditMode(!editMode)}>
          <Text style={[styles.editBtn, editMode && { color: Colors.primary }]}>
            {editMode ? 'Listo' : 'Gestionar'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Info restaurante */}
          <View style={styles.profileCard}>
            {restaurant?.logoUrl
              ? <Image source={{ uri: restaurant.logoUrl }} style={styles.profileLogo} />
              : <WireframeBox width={72} height={72} circle />
            }
            <View style={styles.profileInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.profileName}>{restaurant?.name ?? 'Mi restaurante'}</Text>
                <TouchableOpacity onPress={() => router.push('/(restaurant)/edit-profile')} style={styles.editProfileBtn}>
                  <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                  <Text style={styles.editProfileText}>Editar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.profileTags}>{restaurant?.tags?.slice(0, 3).join(' · ')}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{feedPosts.length + storyPosts.length}</Text>
                  <Text style={styles.statLbl}>Posts</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNum}>{followersCount ?? restaurant?.followersCount ?? 0}</Text>
                  <Text style={styles.statLbl}>Seguidores</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Historias */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historias ({storyPosts.length})</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <TouchableOpacity style={styles.addStory} onPress={() => router.push('/(restaurant)/new-post')}>
                <Ionicons name="add" size={26} color={Colors.primary} />
                <Text style={styles.addStoryText}>Nueva</Text>
              </TouchableOpacity>
              {storyPosts.map((s) => (
                <View key={s.id} style={styles.storyItem}>
                  {s.imageUrl
                    ? <Image source={{ uri: s.imageUrl }} style={styles.storyImg} />
                    : <WireframeBox width={72} height={72} circle />
                  }
                  <Text style={styles.storyCaption} numberOfLines={1}>{s.caption || 'Historia'}</Text>
                  {editMode && (
                    <TouchableOpacity style={styles.storyDelete} onPress={() => handleDelete(s)}>
                      {deleting === s.id
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Ionicons name="close" size={12} color={Colors.white} />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Posts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Publicaciones ({feedPosts.length})</Text>
              <TouchableOpacity onPress={() => router.push('/(restaurant)/new-post')}>
                <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {feedPosts.length === 0 ? (
              <View style={styles.emptyPosts}>
                <Ionicons name="images-outline" size={40} color={Colors.border} />
                <Text style={styles.emptyText}>No hay publicaciones todavía</Text>
                <TouchableOpacity style={styles.btnNewPost} onPress={() => router.push('/(restaurant)/new-post')}>
                  <Text style={styles.btnNewPostText}>Crear publicación</Text>
                </TouchableOpacity>
              </View>
            ) : editMode ? (
              // Modo edición: lista con botón eliminar
              feedPosts.map((post) => (
                <View key={post.id} style={styles.listItem}>
                  {post.imageUrl
                    ? <Image source={{ uri: post.imageUrl }} style={styles.listThumb} resizeMode="cover" />
                    : <WireframeBox width={64} height={64} rounded />
                  }
                  <View style={styles.listInfo}>
                    <Text style={styles.listCaption} numberOfLines={2}>
                      {post.caption || 'Sin descripción'}
                    </Text>
                    <View style={styles.listMeta}>
                      {post.tags.slice(0, 2).map((t) => (
                        <View key={t} style={styles.listTag}>
                          <Text style={styles.listTagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(post)}>
                    {deleting === post.id
                      ? <ActivityIndicator size="small" color={Colors.primary} />
                      : <Ionicons name="trash-outline" size={20} color={Colors.primary} />
                    }
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              // Modo normal: grid
              <View style={styles.postsGrid}>
                {feedPosts.map((post) => (
                  <View key={post.id} style={styles.gridItem}>
                    {post.imageUrl
                      ? <Image source={{ uri: post.imageUrl }} style={styles.gridImg} resizeMode="cover" />
                      : <WireframeBox width="100%" height={110} rounded />
                    }
                    {post.tags.length > 0 && (
                      <View style={styles.gridTag}>
                        <Text style={styles.gridTagText}>{post.tags[0]}</Text>
                      </View>
                    )}
                    <View style={styles.gridLikes}>
                      <Ionicons name="heart" size={10} color={Colors.white} />
                      <Text style={styles.gridLikesText}>{post.likes}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

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
  editBtn: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.tag, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  editProfileText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  scroll: { backgroundColor: Colors.background },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.white, padding: 16,
  },
  profileLogo: { width: 72, height: 72, borderRadius: 36 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  profileTags: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textSecondary },
  section: { backgroundColor: Colors.white, marginTop: 8, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  addStory: {
    width: 72, alignItems: 'center', gap: 4, marginRight: 12,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 36, height: 72, justifyContent: 'center',
  },
  addStoryText: { fontSize: 10, color: Colors.textSecondary },
  storyItem: { alignItems: 'center', marginRight: 12, width: 72, position: 'relative' },
  storyImg: { width: 72, height: 72, borderRadius: 36, marginBottom: 4 },
  storyCaption: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  storyDelete: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.primary, borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  emptyPosts: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  btnNewPost: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnNewPostText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 },
  gridItem: { width: '31.5%', position: 'relative' },
  gridImg: { width: '100%', height: 110, borderRadius: 8 },
  gridTag: {
    position: 'absolute', bottom: 20, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  gridTagText: { fontSize: 9, color: Colors.white, fontWeight: '600' },
  gridLikes: {
    position: 'absolute', bottom: 4, left: 4,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  gridLikesText: { fontSize: 10, color: Colors.white, fontWeight: '600' },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  listThumb: { width: 64, height: 64, borderRadius: 8 },
  listInfo: { flex: 1 },
  listCaption: { fontSize: 14, color: Colors.text, fontWeight: '500', marginBottom: 6 },
  listMeta: { flexDirection: 'row', gap: 6 },
  listTag: { backgroundColor: Colors.tag, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  listTagText: { fontSize: 11, color: Colors.tagText },
  deleteBtn: { padding: 8 },
});
