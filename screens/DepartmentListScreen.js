import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView
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

const DepartmentListScreen = ({ route, navigation }) => {
  // Dashboard'dan gelen parametreler
  const { clinicId, clinicName } = route.params;

  const [departments, setDepartments] = useState([]);
  
  // --- UI/UX State'leri ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Departmanları Çekme (DOĞRU Strateji: Kaynak 9)
   */
  useEffect(() => {
    navigation.setOptions({ title: `${clinicName} - Branşlar` });

    const fetchDepartments = async () => {
      setError(null);
      setLoading(true);
      try {
        if (!clinicId) {
          throw new Error("Klinik ID bulunamadı.");
        }

        // Strateji: 'doctors' (Kaynak 9) koleksiyonunu sorgula
        const doctorsRef = collection(db, 'doctors');
        
        const q = query(
          doctorsRef,
          where('clinicId', '==', clinicId)
        );

        // !! UYARI: Bu sorgu 'doctors' koleksiyonunda 'clinicId' 
        // !! üzerinde tekil bir dizin gerektirebilir.

        const querySnapshot = await getDocs(q);

        // Doktorların 'specialization' (uzmanlık) alanlarını topla
        const allSpecializations = querySnapshot.docs.map(
          doc => doc.data().specialization // Kaynak 9'dan
        );

        // Benzersiz (Unique) hale getir (BÜYÜK/KÜÇÜK HARF DUYARSIZ)
        const uniqueSpecMap = new Map();
        allSpecializations.forEach(specName => {
          if (specName && typeof specName === 'string') { 
            const key = specName.toLowerCase(); 
            if (!uniqueSpecMap.has(key)) {
              uniqueSpecMap.set(key, specName); 
            }
          }
        });

        const formattedList = [...uniqueSpecMap.values()].map((specName) => ({
          id: specName, 
          name: specName
        }));

        setDepartments(formattedList);

      } catch (err) {
        console.error("Departmanları çekerken hata:", err);
        setError("Departmanlar yüklenemedi. (Firestore Dizinlerini kontrol edin!)");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [clinicId, navigation]); 

  /**
   * Doktor Listesine Yönlendirme (GÜNCELLENDİ)
   */
  const handleSelectDepartment = (departmentName) => {
    navigation.navigate('DoctorList', {
      clinicId: clinicId, 
      departmentName: departmentName,
      // KRİTİK DÜZELTME: clinicName'i de bir sonraki ekrana taşı
      clinicName: clinicName 
    });
  };

  // --- RENDER (UI) (Aynı) ---

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Branşlar Yükleniyor...</Text>
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
  if (departments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="medkit-outline" size={50} color={COLORS.darkGray} />
        <Text style={styles.infoText}>Bu klinikte aktif branş bulunamadı.</Text>
      </View>
    );
  }
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleSelectDepartment(item.name)}
    >
      <View style={styles.iconContainer}>
         <Ionicons name="medkit-outline" size={28} color={COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>Bölüm doktorlarını listele</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color={COLORS.darkGray} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={departments}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <Text style={styles.listHeader}>Randevu almak için branş seçin:</Text>
        }
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
  listHeader: {
    fontSize: 16,
    color: COLORS.textLight,
    paddingHorizontal: 10,
    paddingBottom: 10,
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

export default DepartmentListScreen;