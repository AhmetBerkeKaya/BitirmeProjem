import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebaseConfig'; // Hazırladığımız config'den 'db' ve 'auth'u import et
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

const ClinicListScreen = ({ navigation }) => {
  const [clinics, setClinics] = useState([]);
  
  // --- UI/UX State'leri ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Çıkış Yap Butonunu Header'a Ekleme
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Ionicons name="log-out-outline" size={26} color={COLORS.danger} />
        </TouchableOpacity>
      ),
      // App.js'te title verdik ama buradan da override edebiliriz
      title: 'Klinik Seçin', 
      headerLeft: () => null, // Ana ekran olduğu için geri butonu olmasın
    });
  }, [navigation]);

  /**
   * Klinikleri Firestore'dan Çekme
   */
  useEffect(() => {
    const fetchClinics = async () => {
      setError(null);
      setLoading(true);
      try {
        // Strateji: 'clinics' (Kaynak 6) koleksiyonunu çek
        const clinicsCollection = collection(db, 'clinics');
        const clinicSnapshot = await getDocs(clinicsCollection);
        
        const clinicList = clinicSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        setClinics(clinicList);
        
      } catch (err) {
        console.error("Klinikleri çekerken hata:", err);
        setError("Klinikler yüklenemedi. İnternet bağlantınızı kontrol edin.");
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, []); // Sadece bir kez çalışır

  /**
   * Çıkış Yapma Fonksiyonu
   */
  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Çıkış yapmak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Evet", 
          onPress: () => {
            signOut(auth).catch(err => console.error("Çıkış hatası:", err));
            // Çıkış yapınca App.js'teki onAuthStateChanged tetiklenecek
            // ve otomatik olarak AuthStack'e (LoginScreen) yönlendirilecek.
          },
          style: "destructive"
        }
      ]
    );
  };

  /**
   * Klinik Seçme ve Dashboard'a Yönlendirme
   */
  const handleSelectClinic = (clinic) => {
    // Strateji: 'Dashboard' ekranına yönlendir (App.js'te tanımlı)
    navigation.navigate('Dashboard', {
      clinicId: clinic.id,
      clinicName: clinic.name // Şema (Kaynak 6) 'name' alanı
    });
  };

  // --- RENDER (UI) ---

  // 1. Yükleniyor...
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Klinikler Yükleniyor...</Text>
      </View>
    );
  }

  // 2. Hata oluştu...
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning-outline" size={50} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // 3. Boş Liste
  if (clinics.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="business-outline" size={50} color={COLORS.darkGray} />
        <Text style={styles.infoText}>Kayıtlı klinik bulunamadı.</Text>
      </View>
    );
  }

  // Her bir klinik kartı
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => handleSelectClinic(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="business-outline" size={28} color={COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        {/* Şema (Kaynak 6) 'name' */}
        <Text style={styles.cardTitle}>{item.name}</Text> 
        {/* Şema (Kaynak 6) 'address' */}
        <Text style={styles.cardSubtitle} numberOfLines={1}>{item.address}</Text>
        {/* Şema (Kaynak 6) 'phone' */}
        {item.phone && (
           <Text style={styles.cardPhone}>{item.phone}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color={COLORS.darkGray} />
    </TouchableOpacity>
  );

  // 4. Dolu Liste
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={clinics}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

// --- Stiller ---
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
  },
  headerButton: {
    marginRight: 10,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3, // Android gölge
    shadowColor: '#000', // iOS gölge
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f2ff', // Primary açık tonu
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
  },
  cardPhone: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default ClinicListScreen;
