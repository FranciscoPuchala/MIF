import { useCallback, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthChange } from '@/services/auth';
import { auth, db } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser]   = useState<FirebaseUser | null>(null);
  const [role, setRole]   = useState<'client' | 'restaurant' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthChange((u) => {
      if (unsubFirestore) { unsubFirestore(); unsubFirestore = null; }

      if (u) {
        setUser(auth.currentUser);
        unsubFirestore = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          setRole((snap.data()?.role ?? 'client') as 'client' | 'restaurant');
          setLoading(false);
        });
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const refresh = useCallback(() => {
    setUser(auth.currentUser ?? null);
  }, []);

  return { user, loading, isLoggedIn: !!user, role, refresh };
}
