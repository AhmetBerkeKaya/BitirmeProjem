import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList, // Liste görünümü için
  ActivityIndicator, // Yükleniyor
  TouchableOpacity
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'; // orderBy eklendi
import { db, auth } from '../firebaseConfig'; // Sıfırdan kurduğumuz config
import { Ionicons } from '@expo/vector-icons'; // İkonlar

// --- YENİ RENK PALETİ ---
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
 * (YENİ KART TASARIMI)
 */
const AppointmentCard = ({ item }) => {
  const statusStyle = getStatusStyle(item.status); // Duruma göre renk ve ikon al

  return (
    <View style={styles.card}>
      {/* Kart Başlığı: Doktor ve Tarih */}
      <View style={styles.cardHeader}>
        {/* Durum ikonu (Renkli) */}
        <View style={[styles.cardIconContainer, { backgroundColor: `${statusStyle.color}1A` }]}>
          <Ionicons name={statusStyle.icon} size={28} color={statusStyle.color} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{item.typeName}</Text>
          <Text style={styles.cardSubtitle}>Dr. {item.doctorName}</Text>
        </View>
        <Text style={styles.dateText}>{item.dateISO}</Text>
      </View>

      {/* Detaylar: Saat ve Durum */}
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
  // Dashboard'dan gelen clinicId'yi al (Mimari Düzeltmesi)
  const { clinicId } = route.params;

  const [allAppointments, setAllAppointments] = useState([]); // Tüm randevular (Geçmiş + Gelecek)
  const [filteredAppointments, setFilteredAppointments] = useState([]); // Ekranda gösterilenler
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Segment (Filtre) state'i: 'upcoming' (gelecek) veya 'past' (geçmiş)
  const [filterMode, setFilterMode] = useState('upcoming');

  /**
   * Header'a (Başlık Çubuğuna) Filtre Butonlarını Ekle
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Randevularım',
      headerStyle: {
        backgroundColor: COLORS.PRIMARY, // Beyaz yerine PRIMARY renk
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: COLORS.WHITE, // Geri butonu beyaz
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
        color: COLORS.WHITE,
      },
      // Filtre butonları için stil güncellemesi
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
   * 1. Tüm Randevuları Çek (Sadece 1 Kez)
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
      if (!clinicId) {
        setError("Klinik ID bilgisi bulunamadı.");
        setLoading(false);
        return;
      }

      try {
        // Strateji: 'appointments' (Kaynak 4) koleksiyonunu sorgula
        const apptRef = collection(db, 'appointments');

        // (Mimari Düzeltmesi - İki filtre + Sıralama)
        const q = query(
          apptRef,
          where('clinicId', '==', clinicId), // 1. Sadece bu klinikteki
          where('patientId', '==', user.uid), // 2. Sadece bu hasta
          orderBy('dateISO', 'desc') // 3. Tarihe göre sırala (En yeni en üstte)
        );

        // !! ÇOK ÖNEMLİ UYARI !!
        // Bu sorgu (clinicId, patientId, dateISO üzerinde)
        // Firestore'da YENİ BİR BİRLEŞİK DİZİN (Composite Index) gerektirir.
        // Hata alırsanız, lütfen hata mesajındaki linke tıklayarak
        // bu yeni dizini oluşturun! (clinicId ASC, patientId ASC, dateISO DESC)

        const querySnapshot = await getDocs(q);
        const apptList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        setAllAppointments(apptList); // Tüm randevuları depola

      } catch (err) {
        console.error("Randevular çekilirken hata:", err);
        setError("Randevular yüklenemedi. (Firestore Dizinlerini kontrol edin!)");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [clinicId]); // Sadece clinicId değiştiğinde (ekran açıldığında) çalışır

  /**
   * 2. Filtreleme Mantığı (Lokalde çalışır, hızlıdır)
   * 'allAppointments' veya 'filterMode' değiştikçe çalışır
   */
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // Bugünün tarihi 'YYYY-MM-DD'

    if (filterMode === 'upcoming') {
      // 'dateISO' bugünden büyük veya eşit olanlar
      const upcoming = allAppointments.filter(appt => appt.dateISO >= today);
      setFilteredAppointments(upcoming);
    } else { // 'past'
      // 'dateISO' bugünden küçük olanlar
      const past = allAppointments.filter(appt => appt.dateISO < today);
      setFilteredAppointments(past);
    }
  }, [filterMode, allAppointments]); // Filtre modu veya data değişince listeyi güncelle


  // Liste boşken gösterilecek bileşen
  const renderEmptyList = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="calendar-outline" size={80} color={COLORS.BORDER} />
      <Text style={styles.infoText}>
        {filterMode === 'upcoming' ? 'Bu klinikte gelecek randevunuz yok.' : 'Bu klinikte geçmiş randevunuz yok.'}
      </Text>
    </View>
  );

  // Yükleniyor...
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  // Hata...
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning-outline" size={60} color={COLORS.DANGER} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredAppointments} // Sadece filtrelenmiş olanı göster
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AppointmentCard item={item} />}
        ListEmptyComponent={renderEmptyList} // Liste boşsa bunu göster
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

export default PastAppointmentsScreen;

// --- YENİ UI/UX STİLLERİ ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  listContainer: {
    padding: 15,
    flexGrow: 1, // Boş liste bileşeninin ortalanması için
  },
  centerContainer: { // Yükleme, Hata ve Boş Liste için
    flex: 1,
    paddingTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: { // Boş liste mesajı
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    marginTop: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorText: { // Hata mesajı
    fontSize: 16,
    color: COLORS.DANGER,
    marginTop: 15,
    textAlign: 'center'
  },
  card: { // Randevu Kartı
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
  cardIconContainer: { // Durum İkonu Arkaplanı
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
  cardTitle: { // Randevu Tipi (örn: "İlk Muayene")
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  cardSubtitle: { // Doktor Adı
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
  },
  dateText: { // Tarih
    fontSize: 13,
    color: COLORS.TEXT_LIGHT,
    fontWeight: '500',
  },
  detailsList: { // Saat ve Durum alanı
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
  }
});