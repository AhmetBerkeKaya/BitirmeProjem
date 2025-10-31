import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig'; // Yeni config dosyamızdan import ediyoruz

// --- Ekranlar ---
// Bu ekranları birazdan tek tek oluşturacağız, şimdilik import ediyoruz
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ClinicListScreen from './screens/ClinicListScreen';
import DashboardScreen from './screens/DashboardScreen';
import DepartmentListScreen from './screens/DepartmentListScreen';
import DoctorListScreen from './screens/DoctorListScreen';
import AppointmentScreen from './screens/AppointmentScreen';
import PrescriptionListScreen from './screens/PrescriptionListScreen';
// Excel 11. madde için "Geçmiş Görüşmelerim" ekranı
import PastAppointmentsScreen from './screens/PastAppointmentsScreen';
import TreatmentListScreen from './screens/TreatmentListScreen';
// Navigasyon Stack'ini oluştur
const Stack = createNativeStackNavigator();

// Renk paletimiz (Tüm uygulamada ortak)
const COLORS = {
  primary: '#007bff',
  lightGray: '#f8f9fa',
  white: '#ffffff',
  text: '#343a40',
};

// --- Ana Navigasyon Akışı ---

// 1. Kullanıcı giriş yapmamışsa (Auth Stack)
const AuthStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Login" 
      component={LoginScreen} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen 
      name="SignUp" 
      component={SignUpScreen} 
      options={{ 
        title: 'Kayıt Ol',
        headerStyle: { backgroundColor: COLORS.lightGray },
        headerShadowVisible: false,
        headerTintColor: COLORS.text,
        headerBackTitleVisible: false
      }}
    />
  </Stack.Navigator>
);

// 2. Kullanıcı giriş yapmışsa (App Stack)
const AppStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.white },
      headerTintColor: COLORS.text,
      headerShadowVisible: true,
      headerBackTitleVisible: false
    }}
  >
    {/* Stratejimiz:
      1. ClinicList (Klinik seç)
      2. Dashboard (Ana menü)
      3. Diğer ekranlar...
    */}
    <Stack.Screen 
      name="ClinicList" 
      component={ClinicListScreen} 
      options={{ title: 'Klinik Seçin' }} 
    />
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      // Header başlığı DashboardScreen içinde ayarlanacak
    />
    <Stack.Screen 
      name="DepartmentList" 
      component={DepartmentListScreen} 
      options={{ title: 'Branş Seçin' }} 
    />
    <Stack.Screen 
      name="DoctorList" 
      component={DoctorListScreen} 
      // Başlık DoctorListScreen içinde ayarlanacak
    />
    <Stack.Screen 
      name="Appointment" 
      component={AppointmentScreen} 
      options={{ title: 'Randevu Al' }} 
    />
    <Stack.Screen 
      name="PrescriptionList" 
      component={PrescriptionListScreen} 
      options={{ title: 'Reçetelerim' }} 
    />
    <Stack.Screen 
      name="PastAppointments" 
      component={PastAppointmentsScreen} 
      options={{ title: 'Geçmiş Randevular' }} 
    />
    {/* YENİ EKLENEN EKRAN */}
    <Stack.Screen 
      name="TreatmentList" 
      component={TreatmentListScreen} 
      options={{ title: 'Tedavilerim' }} 
    />
  </Stack.Navigator>
);

// --- Ana Uygulama Bileşeni ---
export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Firebase Auth durumunu dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) {
        setInitializing(false);
      }
    });
    return unsubscribe; // Component unmount olduğunda dinleyiciyi kaldır
  }, []);

  // Auth durumu kontrol edilirken boş ekran (veya yükleme) göster
  if (initializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.lightGray} />
      {/* Kullanıcı varsa (user true ise) AppStack'i,
        yoksa (user false ise) AuthStack'i göster.
      */}
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
