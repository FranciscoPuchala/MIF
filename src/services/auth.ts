import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

// ─── REGISTRO ────────────────────────────────────────────────────

export async function register(name: string, email: string, password: string): Promise<FirebaseUser> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });

  // Crear documento del usuario en Firestore
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    phone: '',
    photoUrl: '',
    role: 'client',
    following: [],
    savedRestaurants: [],
    createdAt: serverTimestamp(),
  });

  return user;
}

// ─── LOGIN ───────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<FirebaseUser> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

// ─── GOOGLE ──────────────────────────────────────────────────────

export async function signInWithGoogle(idToken: string | null, accessToken: string | undefined): Promise<FirebaseUser> {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const { user } = await signInWithCredential(auth, credential);

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      name: user.displayName ?? '',
      email: user.email ?? '',
      phone: '',
      photoUrl: user.photoURL ?? '',
      role: 'client',
      following: [],
      savedRestaurants: [],
      createdAt: serverTimestamp(),
    });
  }
  return user;
}

// ─── LOGOUT ──────────────────────────────────────────────────────

export async function logout() {
  await signOut(auth);
}

// ─── PERFIL ──────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function getUserRole(uid: string): Promise<'client' | 'restaurant'> {
  const snap = await getDoc(doc(db, 'users', uid));
  return (snap.data()?.role ?? 'client') as 'client' | 'restaurant';
}

// ─── OBSERVER ────────────────────────────────────────────────────

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
