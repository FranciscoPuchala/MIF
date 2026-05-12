import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppNotification } from '@/types';

const COL = 'notifications';

export async function createNotification(data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  await addDoc(collection(db, COL), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeNotifications(userId: string, callback: (n: AppNotification[]) => void): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification));
  });
}

export async function markAsRead(notificationId: string) {
  await updateDoc(doc(db, COL, notificationId), { read: true });
}

export async function markAllAsRead(userId: string) {
  const q = query(collection(db, COL), where('userId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { read: true })));
}
