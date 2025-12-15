import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl // Aşağı çekip yenileme için eklendi
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // useFocusEffect eklendi

// --- RENK PALETİ ---
const COLORS = {
  PRIMARY: '#00BFA6',     // Turkuaz (Ana renk)
  BACKGROUND: '#F5F9FC', // Çok hafif soğuk gri
  WHITE: '#FFFFFF',        // Kart Arkaplanı
  TEXT: '#2C3E50',         // Koyu Metin Rengi
  TEXT_LIGHT: '#5D6D7E',  // Açık Metin Rengi
  BORDER: '#EAECEE',      // Kenarlık Rengi
  SUCCESS: '#27AE60',      // Yeşil (Tamamlandı)
  WARNING: '#F39C12',      // Sarı (Beklemede)
  DANGER: '#e74c3c',      // Kırmızı (İptal)
};

/**
 * Randevu durumuna (status) göre ikon ve renk belirleyen yardımcı fonksiyon
 */
const getStatusStyle = (status) => {
  switch (status) {
    case 'completed': // Tamamlandı
      return { icon: 'checkmark-circle-outline', color: COLORS.SUCCESS };
    case 'pending': // Beklemede
      return { icon: 'time-outline', color: COLORS.WARNING };
    case 'confirmed': // Onaylandı (Gelecek)
      return { icon: 'calendar-outline', color: COLORS.PRIMARY };
    case 'cancelled': // İptal
      return { icon: 'close-circle-outline', color: COLORS.DANGER };
    default:
      return { icon: 'help-circle-outline', color: COLORS.TEXT_LIGHT };
  }
};

/**
 * Her bir randevu kartını çizen bileşen
 */
const AppointmentCard = ({ item }) => {
  const statusStyle = getStatusStyle(item.status);
  const navigation = useNavigation();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, { backgroundColor: `${statusStyle.color}1A` }]}>
          <Ionicons name={statusStyle.icon} size={28} color={statusStyle.color} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{item.typeName}</Text>
          <Text style={styles.cardSubtitle}>Dr. {item.doctorName}</Text>
        </View>
        <Text style={styles.dateText}>{item.dateISO}</Text>
      </View>

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

      {/* 🔥 ANAMNEZ BUTONU (Sadece Onaylı Randevular ve Anamnezi YOKSA) */}
      {item.status === 'confirmed' && !item.hasAnamnesis && (
        <TouchableOpacity 
          style={styles.anamnesisButton}
          onPress={() => navigation.navigate('AnamnesisScreen', {
             appointmentId: item.id,
             doctorName: item.doctorName,
             clinicId: item.clinicId,
             patientName: item.patientName,
             patientPhone: item.patientPhone
          })}
        >
          <Ionicons name="clipboard-outline" size={20} color="#FFF" style={{marginRight:8}} />
          <Text style={styles.anamnesisButtonText}>Anamnez Formunu Doldur</Text>
        </TouchableOpacity>
      )}

      {/* Form dolduysa bunu göster */}
      {item.hasAnamnesis && (
        <View style={styles.completedBadge}>
           <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
           <Text style={styles.completedText}>Anamnez Formu Dolduruldu</Text>
        </View>
      )}

    </View>
  );
};

const PastAppointmentsScreen = ({ route, navigation }) => {
  const { clinicId } = route.params;

  const [allAppointments, setAllAppointments] = useState([]); // Tüm randevular
  const [filteredAppointments, setFilteredAppointments] = useState([]); // Filtrelenmiş
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Manuel yenileme state'i
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('upcoming'); // 'upcoming' | 'past'

  // --- Header Ayarları ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Randevularım',
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
        color: COLORS.WHITE,
      },
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

  // --- VERİ ÇEKME FONKSİYONU ---
  // useCallback içine aldık ki hem focus hem refresh ile çağrılabilsin
  const fetchAppointments = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || !clinicId) {
        setLoading(false);
        setRefreshing(false);
        return;
    }

    try {
      // Sadece hata varsa loading göster, refresh yaparken gösterme (RefreshControl kendi gösterir)
      if (!refreshing) setLoading(true); 
      setError(null);

      const apptRef = collection(db, 'appointments');
      
      // orderBy kaldırıldı (Index hatası olmaması için), JS ile sıralanacak
      const q = query(
        apptRef,
        where('clinicId', '==', clinicId),
        where('patientId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      let apptList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // JS tarafında Tarihe Göre Sıralama
      apptList.sort((a, b) => {
          if (b.dateISO < a.dateISO) return -1;
          if (b.dateISO > a.dateISO) return 1;
          return 0;
      });

      setAllAppointments(apptList);

    } catch (err) {
      console.error("Randevular çekilirken hata:", err);
      setError("Randevular yüklenemedi: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, refreshing]);

  // --- EKRAN ODAKLANDIĞINDA YENİLE (Otomatik Refresh) ---
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments])
  );

  // --- MANUEL YENİLEME (Aşağı Çekince) ---
  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  // --- FİLTRELEME MANTIĞI ---
  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // Bugünün tarihi 'YYYY-MM-DD'

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
      <Ionicons name="calendar-outline" size={80} color={COLORS.BORDER} />
      <Text style={styles.infoText}>
        {filterMode === 'upcoming' ? 'Bu klinikte gelecek randevunuz yok.' : 'Bu klinikte geçmiş randevunuz yok.'}
      </Text>
    </View>
  );

  // İlk yükleme
  if (loading && !refreshing && allAppointments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning-outline" size={60} color={COLORS.DANGER} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAppointments}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
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
        // Aşağı çekip yenileme özelliği
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />
        }
      />
    </SafeAreaView>
  );
};

export default PastAppointmentsScreen;

// --- STİLLER ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  listContainer: {
    padding: 15,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    paddingTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    marginTop: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.DANGER,
    marginTop: 15,
    textAlign: 'center'
  },
  retryButton: {
      marginTop: 20,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8
  },
  retryText: {
      color: COLORS.WHITE,
      fontWeight: 'bold'
  },
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 15,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#95A5A6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.TEXT_LIGHT,
    fontWeight: '500',
  },
  detailsList: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  detailItem: {
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
    lineHeight: 20,
    marginLeft: 5,
  },
  detailTitle: {
    fontWeight: '600',
    color: COLORS.TEXT
  },

  // Header Filtre Stilleri
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.BORDER,
    borderRadius: 8,
    marginRight: 10,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.WHITE,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  segmentText: {
    color: COLORS.TEXT_LIGHT,
    fontWeight: '600',
    fontSize: 14,
  },
  segmentTextActive: {
    color: COLORS.PRIMARY,
  },

  // Anamnez Buton Stilleri
  anamnesisButton: {
    marginTop: 15,
    backgroundColor: '#8E44AD', // Mor
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2
  },
  anamnesisButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  completedBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F5',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.SUCCESS
  },
  completedText: {
    color: COLORS.SUCCESS,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  }
});