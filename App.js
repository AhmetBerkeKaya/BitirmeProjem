import React, { useState, useEffect } from 'react';
import { StatusBar, View } from 'react-native'; // <--- DİKKAT: 'View' buraya eklendi
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

// --- CHATBOT BİLEŞENİNİ ÇAĞIRIYORUZ ---
import ChatWidget from './components/ChatWidget';

// --- YENİ RENK PALETİMİZ ---
const COLORS = {
  PRIMARY: '#00BFA6',
  BACKGROUND: '#F5F9FC',
  WHITE: '#FFFFFF',
  TEXT: '#2C3E50',
  TEXT_LIGHT: '#5D6D7E',
  BORDER: '#EAECEE',
};

// --- EKRAN İMPORTLARI ---
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ClinicListScreen from './screens/ClinicListScreen';
import DashboardScreen from './screens/DashboardScreen';
import DepartmentListScreen from './screens/DepartmentListScreen';
import DoctorListScreen from './screens/DoctorListScreen';
import AppointmentScreen from './screens/AppointmentScreen';
import PrescriptionListScreen from './screens/PrescriptionListScreen';
import PastAppointmentsScreen from './screens/PastAppointmentsScreen';
import TreatmentListScreen from './screens/TreatmentListScreen';
import AnamnesisScreen from './screens/AnamnesisScreen';

const Stack = createNativeStackNavigator();

const globalScreenOptions = {
  headerStyle: {
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitleStyle: {
    color: COLORS.TEXT,
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerTintColor: COLORS.TEXT,
  headerBackTitleVisible: false,
  contentStyle: {
    backgroundColor: COLORS.BACKGROUND,
  },
};

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
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={globalScreenOptions}>
    <Stack.Screen name="ClinicList" component={ClinicListScreen} options={{ title: 'Klinik Seçin' }} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="DepartmentList" component={DepartmentListScreen} />
    <Stack.Screen name="DoctorList" component={DoctorListScreen} />
    <Stack.Screen name="Appointment" component={AppointmentScreen} options={{ title: 'Randevu Al' }} />
    <Stack.Screen name="PrescriptionList" component={PrescriptionListScreen} options={{ title: 'Reçetelerim' }} />
    <Stack.Screen name="PastAppointments" component={PastAppointmentsScreen} options={{ title: 'Randevularım' }} />
    <Stack.Screen name="TreatmentList" component={TreatmentListScreen} options={{ title: 'Tedavilerim' }} />
    <Stack.Screen name="AnamnesisScreen" component={AnamnesisScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) {
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />

      {user ? (
        // --- DEĞİŞİKLİK BURADA ---
        // Navigasyon ve Chatbot'u aynı kapsayıcı (View) içine alıyoruz.
        // flex: 1 demezsek ekran boş görünür.
        <View style={{ flex: 1 }}>
          <AppStack />
          <ChatWidget />
        </View>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}