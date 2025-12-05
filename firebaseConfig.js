import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions } from "firebase/functions";
// -----------------------------------------------------------------
// UYARI: BURADAKİ BİLGİLERİ KENDİ FIREBASE PROJENİZDEN ALIN
// -----------------------------------------------------------------
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

// --- UYGULAMA BAŞLATMA ---
// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// AsyncStorage ile uyumlu hale getir
initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Diğer dosyalarda kullanmak için 'db' ve 'auth'u export et
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app); // Bunu mutlaka ekle!

export default app;
