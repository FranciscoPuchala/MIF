import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('No se pudo leer la imagen'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uploadPostImage(restaurantId: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const path = `posts/${restaurantId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const path = `avatars/${userId}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadRestaurantLogo(restaurantId: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const storageRef = ref(storage, `restaurants/${restaurantId}/logo.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadRestaurantBanner(restaurantId: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  const storageRef = ref(storage, `restaurants/${restaurantId}/banner.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
