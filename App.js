// Bu dosya, uygulamanın ana giriş noktasıdır.
// Firebase'i başlatır ve kullanıcının giriş durumuna göre
// hangi ekranların gösterileceğini yönetir (navigasyon).
import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// --- FIREBASE BAŞLATMA BÖLÜMÜ ---
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// firebaseConfig.js'ten süslü parantez içinde import ediyoruz
import { firebaseConfig } from './firebaseConfig';

// Firebase uygulamasını burada, en başta başlatıyoruz
const app = initializeApp(firebaseConfig);
initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
// --- BAŞLATMA BÖLÜMÜ SONU ---


// Ekranlar
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ClinicListScreen from './screens/ClinicListScreen';
import DepartmentListScreen from './screens/DepartmentListScreen';
import DoctorListScreen from './screens/DoctorListScreen';
import AppointmentScreen from './screens/AppointmentScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe; 
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // Kullanıcı giriş yapmışsa gösterilecek ekranlar
          <>
            <Stack.Screen name="ClinicList" component={ClinicListScreen} options={{ title: 'Klinikler' }} />
            <Stack.Screen name="DepartmentList" component={DepartmentListScreen} options={{ title: 'Departman Seçin' }}/>
            <Stack.Screen name="DoctorList" component={DoctorListScreen} options={{ title: 'Doktor Seçin' }}/>
            <Stack.Screen name="Appointment" component={AppointmentScreen} options={{ title: 'Randevu Al' }}/>
          </>
        ) : (
          // Kullanıcı giriş yapmamışsa gösterilecek ekranlar
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}