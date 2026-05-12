import { useEffect, useState } from 'react';
import { Reservation } from '@/types';
import { subscribeRestaurantReservations, subscribeUserReservations } from '@/services/reservations';

// Para el panel del restaurante
export function useRestaurantReservations(restaurantId: string) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeRestaurantReservations(restaurantId, (data) => {
      setReservations(data);
      setLoading(false);
    });
    return unsub;
  }, [restaurantId]);

  return { reservations, loading };
}

// Para el perfil del usuario
export function useUserReservations(userId: string) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeUserReservations(userId, (data) => {
      setReservations(data);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { reservations, loading };
}
