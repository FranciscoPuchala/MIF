import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBqMaH_6FO3S7YPeOmGSZogL0MYDbbgIrY',
  authDomain: 'makeitfind.firebaseapp.com',
  projectId: 'makeitfind',
  storageBucket: 'makeitfind.firebasestorage.app',
  messagingSenderId: '346130883873',
  appId: '1:346130883873:web:3b4afe45b90c3f97f1ca60',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
