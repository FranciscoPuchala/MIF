import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { auth, db } from '../firebase';

interface Restaurant {
  id: string;
  name: string;
  category: string;
  city: string;
  email: string;
}

interface Props {
  user: User;
  onEdit: (id: string, name: string) => void;
}

export default function Restaurants({ user, onEdit }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'restaurants'));
      setRestaurants(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? 'Sin nombre',
          category: d.data().category ?? '',
          city: d.data().city ?? '',
          email: d.data().email ?? '',
        })),
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>MIF</span>
          <span style={styles.headerTitle}>Panel de Administración</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userEmail}>{user.email}</span>
          <button style={styles.logoutBtn} onClick={() => signOut(auth)}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.topBar}>
          <h1 style={styles.pageTitle}>Restaurantes</h1>
          <input
            style={styles.search}
            type="text"
            placeholder="Buscar por nombre o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={styles.empty}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>No se encontraron restaurantes.</div>
        ) : (
          <div style={styles.grid}>
            {filtered.map((r) => (
              <div key={r.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.avatar}>{r.name[0]?.toUpperCase()}</div>
                  <div>
                    <div style={styles.cardName}>{r.name}</div>
                    <div style={styles.cardMeta}>
                      {[r.category, r.city].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                {r.email && <div style={styles.cardEmail}>{r.email}</div>}
                <button style={styles.editBtn} onClick={() => onEdit(r.id, r.name)}>
                  Editar mapa de mesas
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: 60,
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { fontSize: 20, fontWeight: 900, color: 'var(--primary)', letterSpacing: -0.5 },
  headerTitle: { fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  userEmail: { fontSize: 13, color: 'var(--text-secondary)' },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '6px 14px',
    color: 'var(--text)',
    fontSize: 13,
  },
  main: { flex: 1, padding: '28px 28px' },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  pageTitle: { fontSize: 22, fontWeight: 800, color: 'var(--text)' },
  search: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 14px',
    color: 'var(--text)',
    fontSize: 14,
    width: 280,
    outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    flexShrink: 0,
  },
  cardName: { fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  cardMeta: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 },
  cardEmail: { fontSize: 12, color: 'var(--text-secondary)' },
  editBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    fontSize: 13,
    fontWeight: 600,
    width: '100%',
  },
  empty: { color: 'var(--text-secondary)', textAlign: 'center', marginTop: 60, fontSize: 15 },
};
