import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './pages/Login';
import Restaurants from './pages/Restaurants';
import Editor from './pages/Editor';

export type Page =
  | { name: 'restaurants' }
  | { name: 'editor'; restaurantId: string; restaurantName: string };

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [page, setPage] = useState<Page>({ name: 'restaurants' });

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); return; }
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (!snap.data()?.isAdmin) {
        await auth.signOut();
        setUser(null);
        return;
      }
      setUser(u);
    });
  }, []);

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Cargando...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  if (page.name === 'editor') {
    return (
      <Editor
        restaurantId={page.restaurantId}
        restaurantName={page.restaurantName}
        onBack={() => setPage({ name: 'restaurants' })}
      />
    );
  }

  return (
    <Restaurants
      user={user}
      onEdit={(id, name) => setPage({ name: 'editor', restaurantId: id, restaurantName: name })}
    />
  );
}
