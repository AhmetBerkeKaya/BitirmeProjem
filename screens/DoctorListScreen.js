import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Image 
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons'; 

// Renk paletimiz
const COLORS = {
  primary: '#007bff',
  lightGray: '#f8f9fa',
  darkGray: '#6c757d',
  white: '#ffffff',
  danger: '#dc3545',
  text: '#343a40',
  textLight: '#495057'
};

const DoctorListScreen = ({ route, navigation }) => {
  // DepartmentList'ten gelen parametreler (GÜNCELLENDİ)
  const { clinicId, departmentName, clinicName } = route.params; // clinicName eklendi

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Doktorları Çekme (Stratejiye Uygun)
   */
  useEffect(() => {
    const headerTitle = departmentName ? `${departmentName} Doktorları` : 'Tüm Doktorlar';
    navigation.setOptions({ title: headerTitle });

    const fetchDoctors = async () => {
      setError(null);
      setLoading(true);
      try {
        if (!clinicId) {
          throw new Error("Klinik ID bulunamadı.");
        }

        const doctorsRef = collection(db, 'doctors');
        let q; 

        if (departmentName) {
          q = query(
            doctorsRef,
            where('clinicId', '==', clinicId),
            where('specialization', '==', departmentName)
          );
        } 
        else {
          q = query(
            doctorsRef,
            where('clinicId', '==', clinicId)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const doctorList = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        setDoctors(doctorList);

      } catch (err) {
        console.error("Doktorları çekerken hata:", err);
        setError("Doktorlar yüklenemedi. (Firestore Dizinlerini kontrol ettiniz mi?)");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [clinicId, departmentName, navigation]);

  /**
   * Randevu Ekranına Yönlendirme (GÜNCELLENDİ)
   */
  const handleSelectDoctor = (doctor) => {
    navigation.navigate('Appointment', {
      doctorId: doctor.id, 
      doctorName: doctor.fullName,
      clinicId: clinicId,
      // KRİTİK DÜZELTME: clinicName'i son ekrana taşı
      clinicName: clinicName 
    });
  };

  // --- RENDER (UI) (Aynı) ---

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Doktorlar Yükleniyor...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning-outline" size={50} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (doctors.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="people-outline" size={50} color={COLORS.darkGray} />
        <Text style={styles.infoText}>Bu kritere uygun doktor bulunamadı.</Text>
      </View>
    );
  }
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleSelectDoctor(item)}
    >
      <View style={styles.iconContainer}>
         <Ionicons name="person-outline" size={28} color={COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.cardTitle}>{item.fullName}</Text>
        <Text style={styles.cardSubtitle}>{item.education || item.specialization}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color={COLORS.darkGray} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={doctors}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};
// --- Stiller (Aynı) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  listContainer: {
    padding: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
  infoText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f2ff', 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  }
});

export default DoctorListScreen;