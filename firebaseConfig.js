import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence 
} from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // Crypto hatası almamak için

// Firebase Proje Ayarları
export const firebaseConfig = {
  apiKey: "AIzaSyBqkGT3pX0enKf7gBPY2VFSfxx447Qc3Cg",
  authDomain: "rtmsoft-a17ac.firebaseapp.com",
  projectId: "rtmsoft-a17ac",
  storageBucket: "rtmsoft-a17ac.firebasestorage.app",
  messagingSenderId: "176933628299",
  appId: "1:176933628299:web:5898dc21ac395d67b9a78e",
  measurementId: "G-QGPPV9XXKW"
};



// Firebase'i başlat ve servisleri export et
let app;
let auth;
let db;

try {
  // Uygulamayı başlat
  app = initializeApp(firebaseConfig);
  
  // Auth'u (Kimlik Doğrulama) yerel depolama (AsyncStorage) ile başlat
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  // Firestore (Veritabanı) servisini başlat
  db = getFirestore(app);

} catch (error) {
  if (error.code !== 'auth/already-initialized') {
    console.error("Firebase başlatma hatası:", error);
  }
}

// Servisleri diğer dosyalarda kullanmak için export et
export { app, auth, db };
