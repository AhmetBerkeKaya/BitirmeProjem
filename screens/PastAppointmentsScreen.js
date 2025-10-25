import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'; 
import { db, auth } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons'; 

// Renk paletimiz
const COLORS = {
  primary: '#007bff',
  lightGray: '#f8f9fa',
  darkGray: '#6c757d',
  white: '#ffffff',
  text: '#343a40',
  textLight: '#495057',
  success: '#28a745', // Yeşil (Tamamlandı)
  warning: '#ffc107', // Sarı (Beklemede)
  danger: '#dc3545', // Kırmızı (İptal)
};

// Randevu durumuna göre ikon ve renk belirleyen yardımcı fonksiyon
const getStatusStyle = (status) => {
  switch (status) {
    case 'completed':
      return { icon: 'checkmark-circle', color: COLORS.success };
    case 'pending':
      return { icon: 'time-outline', color: COLORS.warning };
    case 'confirmed':
      return { icon: 'calendar-outline', color: COLORS.primary };
    case 'cancelled':
      return { icon: 'close-circle', color: COLORS.danger };
    default:
      return { icon: 'help-circle-outline', color: COLORS.darkGray };
  }
};


/**
 * Her bir randevu kartını çizen bileşen
 */
const AppointmentCard = ({ item }) => {
  const statusStyle = getStatusStyle(item.status);

  return (
    <View style={styles.card}>
      {/* Kart Başlığı: Doktor ve Tarih */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${statusStyle.color}20` }]}>
          <Ionicons name={statusStyle.icon} size={24} color={statusStyle.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.doctorName}>{item.typeName}</Text>
          <Text style={styles.departmentName}>Dr. {item.doctorName}</Text>
        </View>
        <Text style={styles.dateText}>{item.dateISO}</Text>
      </View>
      
      {/* Detaylar */}
      <View style={styles.detailsList}>
        <Text style={styles.detailItem}>
          <Text style={styles.detailTitle}>Saat: </Text>
          {item.start} ({item.durationMinutes} dk)
        </Text>
        <Text style={styles.detailItem}>
          <Text style={styles.detailTitle}>Durum: </Text>
          <Text style={{ color: statusStyle.color, fontWeight: 'bold' }}>
            {item.status.toUpperCase()}
          </Text>
        </Text>
      </View>
    </View>
  );
};


const PastAppointmentsScreen = ({ route, navigation }) => {
  // DÜZELTME: Dashboard'dan gelen clinicId'yi al
  const { clinicId } = route.params; 

  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('upcoming'); 

  /**
   * Header'a filtre butonlarını ekle
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Randevularım',
      headerRight: () => (
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentButton, filterMode === 'upcoming' && styles.segmentButtonActive]}
            onPress={() => setFilterMode('upcoming')}
          >
            <Text style={[styles.segmentText, filterMode === 'upcoming' && styles.segmentTextActive]}>Gelecek</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, filterMode === 'past' && styles.segmentButtonActive]}
            onPress={() => setFilterMode('past')}
          >
            <Text style={[styles.segmentText, filterMode === 'past' && styles.segmentTextActive]}>Geçmiş</Text>
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, filterMode]);

  /**
   * 1. Tüm Randevuları Çek (SORGUSU GÜNCELLENDİ)
   */
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) {
        setError("Kullanıcı bulunamadı.");
        setLoading(false);
        return;
      }
      // DÜZELTME: clinicId de gelmiş mi diye kontrol et
      if (!clinicId) {
        setError("Klinik ID bilgisi bulunamadı.");
        setLoading(false);
        return;
      }

      try {
        const apptRef = collection(db, 'appointments');
        
        // DÜZELTME: Sorguya 'where('clinicId', '==', clinicId)' eklendi
        const q = query(
          apptRef,
          where('patientId', '==', user.uid), // 1. Sadece bu hasta
          where('clinicId', '==', clinicId), // 2. Sadece bu klinikteki
          orderBy('dateISO', 'desc') // 3. Tarihe göre sırala
        );

        // !! ÇOK ÖNEMLİ UYARI !!
        // Bu sorgu (patientId, clinicId, dateISO üzerinde)
        // Firestore'da YENİ BİR BİRLEŞİK DİZİN (Composite Index) gerektirir.
        // Hata alırsanız, lütfen hata mesajındaki linke tıklayarak
        // bu yeni dizini oluşturun!
        // (Bir önceki dizin sadece patientId ve dateISO içindi)

        const querySnapshot = await getDocs(q);
        const apptList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        setAllAppointments(apptList); 
        
      } catch (err) {
        console.error("Randevular çekilirken hata:", err);
        setError("Randevular yüklenemedi. (Firestore Dizinlerini kontrol edin!)");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [clinicId]); // Artık clinicId'ye de bağlı

  /**
   * 2. Filtreleme Mantığı (Aynı)
   */
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; 
    if (filterMode === 'upcoming') {
      const upcoming = allAppointments.filter(appt => appt.dateISO >= today);
      setFilteredAppointments(upcoming);
    } else { 
      const past = allAppointments.filter(appt => appt.dateISO < today);
      setFilteredAppointments(past);
    }
  }, [filterMode, allAppointments]);


  // Liste boşken gösterilecek bileşen
  const renderEmptyList = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="calendar-outline" size={80} color={COLORS.disabled} />
      <Text style={styles.infoText}>
        {filterMode === 'upcoming' ? 'Bu klinikte gelecek randevunuz yok.' : 'Bu klinikte geçmiş randevunuz yok.'}
      </Text>
    </View>
  );

  // Yükleniyor...
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Hata...
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning-outline" size={50} color={COLORS.danger} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={filteredAppointments} 
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AppointmentCard item={item} />}
          ListEmptyComponent={renderEmptyList} 
          contentContainerStyle={styles.listContainer}
        />
    </SafeAreaView>
  );
};

export default PastAppointmentsScreen;

// --- Stiller (Aynı, kopyalamıyorum) ---
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
    paddingTop: 100, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: COLORS.darkGray,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    marginTop: 10,
    textAlign: 'center'
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1, 
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  departmentName: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  detailsList: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  detailItem: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginLeft: 5,
  },
  detailTitle: {
    fontWeight: '600',
    color: COLORS.text
  },
  // Header Filtre Stilleri
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.disabled,
    borderRadius: 8,
    marginRight: 10,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  segmentText: {
    color: COLORS.darkGray,
    fontWeight: '600',
    fontSize: 14,
  },
  segmentTextActive: {
    color: COLORS.primary,
  }
});