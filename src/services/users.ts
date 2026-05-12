import {
  doc, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc, increment,
  collection, query, where, getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Restaurant } from '@/types';
import { getRestaurant } from './restaurants';
import { createNotification } from './notifications';

export async function followRestaurant(userId: string, restaurantId: string) {
  await setDoc(doc(db, 'users', userId), { following: arrayUnion(restaurantId) }, { merge: true });
  try {
    await updateDoc(doc(db, 'restaurants', restaurantId), { followersCount: increment(1) });
  } catch { /* rules may restrict; count is derived from query in UI */ }

  // Notificar al dueño del restaurante
  try {
    const [restSnap, userSnap] = await Promise.all([
      getDoc(doc(db, 'restaurants', restaurantId)),
      getDoc(doc(db, 'users', userId)),
    ]);
    const ownerId: string | undefined = restSnap.data()?.ownerId;
    if (ownerId) {
      const followerName: string = userSnap.data()?.name ?? 'Alguien';
      await createNotification({
        userId: ownerId,
        type: 'new_follower',
        title: '¡Nuevo seguidor!',
        body: `${followerName} empezó a seguir tu restaurante`,
        restaurantName: restSnap.data()?.name ?? '',
        restaurantLogoUrl: restSnap.data()?.logoUrl ?? '',
        reservationId: '',
      });
    }
  } catch { /* no crítico */ }
}

export async function unfollowRestaurant(userId: string, restaurantId: string) {
  await setDoc(doc(db, 'users', userId), { following: arrayRemove(restaurantId) }, { merge: true });
  try {
    await updateDoc(doc(db, 'restaurants', restaurantId), { followersCount: increment(-1) });
  } catch { /* rules may restrict; count is derived from query in UI */ }
}

export async function getFollowersCount(restaurantId: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('following', 'array-contains', restaurantId)),
  );
  return snap.size;
}

export async function isFollowing(userId: string, restaurantId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', userId));
  const following: string[] = snap.data()?.following ?? [];
  return following.includes(restaurantId);
}

export async function getFollowedRestaurants(userId: string): Promise<Restaurant[]> {
  const snap = await getDoc(doc(db, 'users', userId));
  const following: string[] = snap.data()?.following ?? [];
  if (following.length === 0) return [];
  const results = await Promise.all(following.map((id) => getRestaurant(id)));
  return results.filter(Boolean) as Restaurant[];
}
