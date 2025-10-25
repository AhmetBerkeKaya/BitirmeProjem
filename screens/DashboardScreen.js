import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar 
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons'; 

// Renk paletimiz
const COLORS = {
  primary: '#007bff',
  primaryDark: '#0056b3',
  lightGray: '#f8f9fa',
  darkGray: '#6c757d',
  white: '#ffffff',
  text: '#343a40',
  textLight: '#495057'
};

/**
 * Menü Butonları için Tekrar Kullanılabilir Bileşen
 */
const DashboardButton = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.buttonCard} onPress={onPress}>
    <View style={styles.buttonIconContainer}>
      <Ionicons name={icon} size={30} color={COLORS.primary} />
    </View>
    <View style={styles.buttonTextContainer}>
      <Text style={styles.buttonTitle}>{title}</Text>
      <Text style={styles.buttonSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={24} color={COLORS.darkGray} />
  </TouchableOpacity>
);


const DashboardScreen = ({ route, navigation }) => {
  const { clinicId, clinicName } = route.params;
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);

  /**
   * Hastanın Adını Çek ve Header'ı Ayarla
   */
  useLayoutEffect(() => {
    navigation.setOptions({ 
      title: clinicName, 
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerButton}
        >
          <Ionicons name="swap-horizontal-outline" size={24} color={COLORS.primary} />
          <Text style={styles.headerButtonText}>Değiştir</Text>
        </TouchableOpacity>
      ),
      headerBackVisible: false, 
    });

    const fetchPatientName = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const patientRef = doc(db, 'patients', user.uid);
          const patientSnap = await getDoc(patientRef);
          
          if (patientSnap.exists()) {
            setPatientName(patientSnap.data().fullName); 
          } else {
            setPatientName("Değerli Hastamız");
          }
        } catch (err) {
          setPatientName("Değerli Hastamız");
        }
      }
      setLoading(false);
    };

    fetchPatientName();
  }, [navigation, clinicId, clinicName]);

  // --- Navigasyon Fonksiyonları (GÜNCELLENDİ) ---

  const go_RandevuAl = () => {
    navigation.navigate('DepartmentList', { 
      clinicId: clinicId, 
      clinicName: clinicName 
    });
  };

  // Madde 12
  const go_Recetelerim = () => {
    // DÜZELTME: Artık clinicId'yi de gönderiyoruz
    navigation.navigate('PrescriptionList', {
      clinicId: clinicId
    }); 
  };

  // Madde 11 (Geçmiş Görüşmelerim)
  const go_GecmisRandevular = () => {
    // DÜZELTME: Artık clinicId'yi de gönderiyoruz
    navigation.navigate('PastAppointments', {
      clinicId: clinicId
    }); 
  };
  
  const go_Doktorlarim = () => {
    navigation.navigate('DoctorList', {
      clinicId: clinicId,
      departmentName: null 
    });
  };

  // --- RENDER (UI) (Aynı) ---
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.lightGray} />
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.welcomeTitle}>Merhaba,</Text>
          <Text style={styles.welcomeName}>{patientName}</Text>
          <Text style={styles.welcomeClinic}>
            <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
            {' '}{clinicName}
          </Text>
        </View>
        <TouchableOpacity style={styles.ctaButton} onPress={go_RandevuAl}>
          <Ionicons name="calendar" size={24} color={COLORS.white} />
          <Text style={styles.ctaButtonText}>Hemen Randevu Al</Text>
        </TouchableOpacity>
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Hızlı İşlemler</Text>
          <DashboardButton
            title="Reçetelerim"
            subtitle="Bu klinikteki reçeteleriniz"
            icon="document-text-outline"
            onPress={go_Recetelerim}
          />
          <DashboardButton
            title="Geçmiş Randevularım"
            subtitle="Bu klinikteki randevularınız"
            icon="time-outline"
            onPress={go_GecmisRandevular}
          />
          <DashboardButton
            title="Klinik Doktorları"
            subtitle="Tüm doktorları inceleyin"
            icon="people-outline"
            onPress={go_Doktorlarim}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
export default DashboardScreen;
// --- Stiller (Aynı, kopyalamıyorum) ---
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  container: {
    flex: 1,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingVertical: 5,
    paddingRight: 10, 
  },
  headerButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    color: COLORS.textLight,
  },
  welcomeName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  welcomeClinic: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    marginHorizontal: 20,
    marginTop: -15, 
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  ctaButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  buttonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  buttonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f2ff', 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  buttonTextContainer: {
    flex: 1, 
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
});