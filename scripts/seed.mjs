import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBqMaH_6FO3S7YPeOmGSZogL0MYDbbgIrY',
  authDomain: 'makeitfind.firebaseapp.com',
  projectId: 'makeitfind',
  storageBucket: 'makeitfind.firebasestorage.app',
  messagingSenderId: '346130883873',
  appId: '1:346130883873:web:3b4afe45b90c3f97f1ca60',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── CONFIGURACIÓN ───────────────────────────────────────────────
const restaurantId = 'nombre-del-restaurante'; // ID único del restaurante
const ownerUid     = 'ik8ppVngLmWofGmfKcBJzfCqxep2'; // UID del usuario en Firebase Auth
const ownerEmail   = 'franpuchala@gmail.com';   // Email del usuario

const restaurant = {
  name: 'Make it find',
  description: 'Fusión nikkei con los mejores cortes y mariscos frescos en un ambiente único en Palermo.',
  tags: ['Sushi', 'Japonés', 'Nikkei', 'Fusión', 'Mariscos'],
  rating: 0,
  reviewCount: 0,
  address: 'Soler 5608, Palermo, Buenos Aires',
  neighborhood: 'Palermo',
  location: { lat: -34.5797, lng: -58.4267 },
  logoUrl: '',
  bannerUrl: '',
  phone: '+54 11 4775-6964',
  email: 'reservas@osaka.com.ar',
  website: 'osaka.com.ar',
  followersCount: 0,
  isOpen: true,
  capacity: 40,
  ownerId: ownerUid,
  hours: {
    monday:    { open: '12:00', close: '23:30', closed: false },
    tuesday:   { open: '12:00', close: '23:30', closed: false },
    wednesday: { open: '12:00', close: '23:30', closed: false },
    thursday:  { open: '12:00', close: '23:30', closed: false },
    friday:    { open: '12:00', close: '00:30', closed: false },
    saturday:  { open: '12:00', close: '00:30', closed: false },
    sunday:    { open: '12:00', close: '23:00', closed: false },
  },
  createdAt: new Date(),
};

// ─── MESAS ───────────────────────────────────────────────────────
const tables = [
  { number: 1,  capacity: 2, x: 0, y: 0, floor: 1, isAvailable: true },
  { number: 2,  capacity: 2, x: 1, y: 0, floor: 1, isAvailable: false },
  { number: 3,  capacity: 4, x: 3, y: 0, floor: 1, isAvailable: true },
  { number: 4,  capacity: 4, x: 1, y: 1, floor: 1, isAvailable: true },
  { number: 5,  capacity: 4, x: 2, y: 1, floor: 1, isAvailable: false },
  { number: 6,  capacity: 2, x: 0, y: 2, floor: 1, isAvailable: true },
  { number: 7,  capacity: 6, x: 2, y: 2, floor: 1, isAvailable: true },
  { number: 8,  capacity: 2, x: 3, y: 2, floor: 1, isAvailable: true },
  { number: 9,  capacity: 4, x: 0, y: 3, floor: 1, isAvailable: false },
  { number: 10, capacity: 4, x: 1, y: 3, floor: 1, isAvailable: true },
  { number: 11, capacity: 2, x: 3, y: 3, floor: 1, isAvailable: true },
];

// ─── PUBLICACIONES ───────────────────────────────────────────────
const posts = [
  {
    restaurantId,
    restaurantName: 'Osaka Buenos Aires',
    restaurantLogoUrl: '',
    imageUrl: '',
    caption: 'Nuestro niguiri especial de salmón con trufa negra. Cada bocado cuenta una historia. 🍣',
    tags: ['Especial', 'Plato del día'],
    likes: 124,
    type: 'post',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    restaurantId,
    restaurantName: 'Osaka Buenos Aires',
    restaurantLogoUrl: '',
    imageUrl: '',
    caption: 'Roll de langostino con palta y salsa de maracuyá. Disponible toda la semana. 🦐',
    tags: ['Nuevo en carta'],
    likes: 88,
    type: 'post',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    restaurantId,
    restaurantName: 'Osaka Buenos Aires',
    restaurantLogoUrl: '',
    imageUrl: '',
    caption: 'Degustación de 8 pasos. Una experiencia completa para los amantes de la cocina nikkei. ✨',
    tags: ['Especial', 'Evento'],
    likes: 210,
    type: 'post',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

// ─── CARGA ───────────────────────────────────────────────────────
async function seed() {
  console.log('Creando usuario en Firestore...');
  await setDoc(doc(db, 'users', ownerUid), {
    name: restaurant.name,
    email: ownerEmail,
    phone: '',
    photoUrl: '',
    role: 'restaurant',
    following: [],
    savedRestaurants: [],
    createdAt: new Date(),
  });
  console.log('✓ Usuario creado:', ownerEmail);

  console.log('Cargando restaurante...');
  await setDoc(doc(db, 'restaurants', restaurantId), restaurant);
  console.log('✓ Restaurante creado:', restaurantId);

  console.log('Cargando mesas...');
  for (const table of tables) {
    await addDoc(collection(db, 'restaurants', restaurantId, 'tables'), table);
  }
  console.log(`✓ ${tables.length} mesas creadas`);

  console.log('Cargando publicaciones...');
  for (const post of posts) {
    await addDoc(collection(db, 'posts'), post);
  }
  console.log(`✓ ${posts.length} publicaciones creadas`);

  console.log('\n✅ Base de datos lista. ID del restaurante: osaka-buenos-aires');
  process.exit(0);
}

seed().catch((e) => { console.error('Error:', e); process.exit(1); });
