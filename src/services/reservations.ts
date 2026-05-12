import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Reservation, ReservationStatus } from '@/types';
import { createNotification } from './notifications';

const COL = 'reservations';

// ─── CREAR ───────────────────────────────────────────────────────

export async function createReservation(data: Omit<Reservation, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── LEER (cliente) ──────────────────────────────────────────────

export function subscribeUserReservations(userId: string, callback: (r: Reservation[]) => void): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation));
  });
}

// ─── LEER (restaurante) ───────────────────────────────────────────

export function subscribeRestaurantReservations(
  restaurantId: string,
  callback: (r: Reservation[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('restaurantId', '==', restaurantId),
    orderBy('date', 'asc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation));
  });
}

// ─── ACTUALIZAR ──────────────────────────────────────────────────

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  await updateDoc(doc(db, COL, id), { status });

  if (status === 'confirmed' || status === 'cancelled') {
    const snap = await getDoc(doc(db, COL, id));
    const res = snap.data() as Reservation | undefined;
    if (res?.userId) {
      await createNotification({
        userId: res.userId,
        type: status === 'confirmed' ? 'reservation_confirmed' : 'reservation_cancelled',
        title: status === 'confirmed' ? '¡Reserva confirmada! 🎉' : 'Reserva cancelada',
        body: status === 'confirmed'
          ? `Tu reserva en ${res.restaurantName} está confirmada. ¡Te esperamos!`
          : `Tu reserva en ${res.restaurantName} fue cancelada.`,
        restaurantName: res.restaurantName,
        restaurantLogoUrl: res.restaurantLogoUrl ?? '',
        reservationId: id,
      });
    }
  }
}

// ─── MESAS OCUPADAS (para el mapa) ───────────────────────────────

const MEAL_DURATION_MIN = 90;

function timeToMin(slot: string): number {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}

export async function getOccupiedTables(
  restaurantId: string,
  date: Date,
  timeSlot?: string,
): Promise<string[]> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, COL),
      where('restaurantId', '==', restaurantId),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay),
      where('status', 'in', ['pending', 'confirmed']),
    );
    const snap = await getDocs(q);
    const reqMin = timeSlot ? timeToMin(timeSlot) : null;

    return snap.docs
      .filter((d) => {
        if (!reqMin) return true;
        const resMin = timeToMin((d.data() as Reservation).timeSlot);
        // Bloqueada si las ventanas de 90 min se superponen
        return resMin < reqMin + MEAL_DURATION_MIN && reqMin < resMin + MEAL_DURATION_MIN;
      })
      .map((d) => (d.data() as Reservation).tableId);
  } catch {
    return [];
  }
}
