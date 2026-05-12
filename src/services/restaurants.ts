import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { createNotification } from './notifications';
import { db } from '@/lib/firebase';
import { Restaurant, Table, Post } from '@/types';

const COL = 'restaurants';

// ─── LEER ────────────────────────────────────────────────────────

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Restaurant;
}

export async function searchRestaurants(tag?: string, name?: string): Promise<Restaurant[]> {
  const q = query(collection(db, COL), orderBy('rating', 'desc'), limit(50));
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restaurant);
  const lower = (s: string) => s.toLowerCase();
  if (tag) {
    results = results.filter((r) =>
      (r.tags ?? []).some((t) => lower(t).includes(lower(tag)))
    );
  }
  if (name) {
    const n = lower(name);
    results = results.filter((r) =>
      lower(r.name).includes(n) ||
      lower(r.neighborhood ?? '').includes(n) ||
      (r.tags ?? []).some((t) => lower(t).includes(n))
    );
  }
  return results;
}

export async function getRestaurantByOwner(ownerId: string): Promise<Restaurant | null> {
  const q = query(collection(db, COL), where('ownerId', '==', ownerId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Restaurant;
}

export async function getFeedRestaurants(): Promise<Restaurant[]> {
  const q = query(collection(db, COL), orderBy('rating', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Restaurant);
}

// Escucha historias de las últimas 24 horas
export function subscribeToStories(callback: (posts: Post[]) => void): Unsubscribe {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const q = query(
    collection(db, 'posts'),
    where('type', '==', 'story'),
    where('createdAt', '>=', since),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post));
  });
}

// Escucha en tiempo real el feed de posts
export function subscribeToFeed(callback: (posts: Post[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'posts'),
    where('type', '==', 'post'),
    orderBy('createdAt', 'desc'),
    limit(30),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post));
  });
}

// ─── MESAS ───────────────────────────────────────────────────────

export async function getTables(restaurantId: string): Promise<Table[]> {
  const snap = await getDocs(collection(db, COL, restaurantId, 'tables'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Table);
}

export async function updateTable(restaurantId: string, tableId: string, data: Partial<Table>) {
  await updateDoc(doc(db, COL, restaurantId, 'tables', tableId), data);
}

export async function addTable(restaurantId: string, table: Omit<Table, 'id'>) {
  await addDoc(collection(db, COL, restaurantId, 'tables'), table);
}

export async function deleteTable(restaurantId: string, tableId: string) {
  await deleteDoc(doc(db, COL, restaurantId, 'tables', tableId));
}

// ─── PUBLICACIONES ───────────────────────────────────────────────

export async function getPosts(restaurantId: string): Promise<Post[]> {
  const q = query(
    collection(db, 'posts'),
    where('restaurantId', '==', restaurantId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
}

export async function createPost(post: Omit<Post, 'id' | 'createdAt' | 'likes'>) {
  await addDoc(collection(db, 'posts'), {
    ...post,
    likes: 0,
    createdAt: serverTimestamp(),
  });

  // Notificar a todos los seguidores
  try {
    const followersSnap = await getDocs(
      query(collection(db, 'users'), where('following', 'array-contains', post.restaurantId)),
    );
    await Promise.all(
      followersSnap.docs.map((userDoc) =>
        createNotification({
          userId: userDoc.id,
          type: 'new_post',
          title: post.restaurantName,
          body: post.caption
            ? `Nueva publicación: "${post.caption.slice(0, 60)}${post.caption.length > 60 ? '…' : ''}"`
            : 'Hizo una nueva publicación',
          restaurantName: post.restaurantName,
          restaurantLogoUrl: post.restaurantLogoUrl,
          reservationId: '',
        }),
      ),
    );
  } catch { /* no crítico */ }
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db, 'posts', postId));
}

// ─── RESTAURANTE (escritura) ──────────────────────────────────────

export async function updateRestaurant(id: string, data: Partial<Restaurant>) {
  await updateDoc(doc(db, COL, id), data);
}

export async function updatePostsRestaurantLogo(restaurantId: string, logoUrl: string) {
  const q = query(collection(db, 'posts'), where('restaurantId', '==', restaurantId));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { restaurantLogoUrl: logoUrl }));
  await batch.commit();
}

export async function createRestaurant(data: Omit<Restaurant, 'id' | 'createdAt' | 'followersCount' | 'rating' | 'reviewCount'>) {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    rating: 0,
    reviewCount: 0,
    followersCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
