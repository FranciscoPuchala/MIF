import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBqMaH_6FO3S7YPeOmGSZogL0MYDbbgIrY',
  authDomain: 'makeitfind.firebaseapp.com',
  projectId: 'makeitfind',
  storageBucket: 'makeitfind.firebasestorage.app',
  messagingSenderId: '346130883873',
  appId: '1:346130883873:web:3b4afe45b90c3f97f1ca60',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const ownerUid = 'ik8ppVngLmWofGmfKcBJzfCqxep2';

async function resetStats() {
  const q    = query(collection(db, 'restaurants'), where('ownerId', '==', ownerUid));
  const snap = await getDocs(q);

  if (snap.empty) {
    console.error('No se encontró el restaurante para el ownerId:', ownerUid);
    process.exit(1);
  }

  for (const d of snap.docs) {
    await updateDoc(d.ref, { followersCount: 0, rating: 0, reviewCount: 0 });
    console.log(`✓ Stats reseteados para: ${d.data().name} (${d.id})`);
  }

  process.exit(0);
}

resetStats().catch((e) => { console.error('Error:', e); process.exit(1); });
