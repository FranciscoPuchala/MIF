// ─── RESTAURANTE ────────────────────────────────────────────────
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  tags: string[];             // ['Sushi', 'Japonés', 'Nikkei']
  rating: number;
  reviewCount: number;
  address: string;
  neighborhood: string;
  location: { lat: number; lng: number };
  logoUrl: string;
  bannerUrl: string;
  phone: string;
  email: string;
  website?: string;
  hours: WeeklyHours;
  followersCount: number;
  isOpen: boolean;
  capacity: number;
  ownerId: string;            // uid del usuario dueño
  createdAt: Date;
}

export interface WeeklyHours {
  monday:    DayHours;
  tuesday:   DayHours;
  wednesday: DayHours;
  thursday:  DayHours;
  friday:    DayHours;
  saturday:  DayHours;
  sunday:    DayHours;
}

export interface DayHours {
  open: string;   // '12:00'
  close: string;  // '23:30'
  closed: boolean;
}

// ─── MESA ────────────────────────────────────────────────────────
export interface Table {
  id: string;
  restaurantId?: string;
  number?: number;
  label?: string;
  capacity: 2 | 4 | 6 | 8;
  x: number;
  y: number;
  floor?: number;
  isAvailable?: boolean;
}

// ─── OVERLAY DE HISTORIA ─────────────────────────────────────────
export interface StoryOverlay {
  id: string;
  type: 'text' | 'location' | 'emoji';
  content: string;
  x: number;       // 0–1 relative to canvas width
  y: number;       // 0–1 relative to canvas height
  color: string;
  bgColor?: string;
  fontSize: number;
}

// ─── PUBLICACIÓN ─────────────────────────────────────────────────
export interface Post {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogoUrl: string;
  imageUrl: string;
  caption: string;
  tags: string[];
  likes: number;
  type: 'post' | 'story';
  createdAt: Date;
  overlays?: StoryOverlay[];
  isHighlight?: boolean;
  highlightCategory?: string;
}

// ─── RESERVA ─────────────────────────────────────────────────────
export interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogoUrl?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  tableId: string;
  tableNumber?: number;
  tableLabel?: string;
  guests: number;
  date: Date;
  timeSlot: string;         // '20:00'
  comments: string;
  status: ReservationStatus;
  createdAt: Date;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'done';

// ─── NOTIFICACIÓN ────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  userId: string;
  type: 'reservation_confirmed' | 'reservation_cancelled' | 'new_reservation' | 'new_follower' | 'new_post';
  title: string;
  body: string;
  restaurantName: string;
  restaurantLogoUrl: string;
  reservationId: string;
  createdAt: Date;
  read: boolean;
}

// ─── USUARIO ─────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  role: 'client' | 'restaurant';
  following: string[];        // restaurantIds
  savedRestaurants: string[]; // restaurantIds
  createdAt: Date;
}
