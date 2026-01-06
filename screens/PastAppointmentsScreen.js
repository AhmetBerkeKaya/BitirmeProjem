import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StatusBar
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// --- FUTURE HEALTH PALETİ ---
const COLORS = {
  BG_START: '#0F172A',
  BG_END: '#1E293B',
  
  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',
  
  GLASS_BG: 'rgba(30, 41, 59, 0.6)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
  
  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
  PURPLE: '#8B5CF6'
};

/**
 * Duruma göre renk ve ikon yapılandırması
 */
const getStatusConfig = (status) => {
  switch (status) {
    case 'completed': return { icon: 'checkmark-done-circle', color: COLORS.SUCCESS, label: 'TAMAMLANDI' };
    case 'pending': return { icon: 'time', color: COLORS.WARNING, label: 'ONAY BEKLİYOR' };
    case 'confirmed': return { icon: 'calendar', color: COLORS.ACCENT_START, label: 'ONAYLANDI' };
    case 'cancelled': return { icon: 'close-circle', color: COLORS.DANGER, label: 'İPTAL EDİLDİ' };
    default: return { icon: 'help-circle', color: COLORS.TEXT_SEC, label: 'BİLİNMİYOR' };
  }
};

/**
 * Modern Cam Kart (Randevu Kartı)
 */
const AppointmentCard = ({ item }) => {
  const statusConfig = getStatusConfig(item.status);
  const navigation = useNavigation();

  return (
    <LinearGradient
      colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.4)']}
      style={[styles.glassCard, { borderColor: statusConfig.color + '40' }]}
    >
      {/* Üst Kısım: İkon ve Başlıklar */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: statusConfig.color + '15' }]}>
          <Ionicons name={statusConfig.icon} size={24} color={statusConfig.color} />
        </View>
        
        <View style={styles.headerText}>
          <Text style={styles.typeName}>{item.typeName}</Text>
          <Text style={styles.doctorName}>Dr. {item.doctorName}</Text>
        </View>

        <View style={[styles.statusBadge, { borderColor: statusConfig.color }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Ayırıcı Çizgi */}
      <View style={styles.divider} />

      {/* Alt Kısım: Tarih ve Saat */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.TEXT_SEC} style={{marginRight:6}} />
          <Text style={styles.detailText}>{item.dateISO}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.TEXT_SEC} style={{marginRight:6}} />
          <Text style={styles.detailText}>{item.start} ({item.durationMinutes} dk)</Text>
        </View>
      </View>

      {/* --- AKSİYON BUTONLARI --- */}
      
      {/* 1. ANAMNEZ BUTONU (Sadece Onaylı ve Formu Yoksa) */}
      {item.status === 'confirmed' && !item.hasAnamnesis && (
        <TouchableOpacity 
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AnamnesisScreen', {
             appointmentId: item.id,
             doctorName: item.doctorName,
             clinicId: item.clinicId,
             patientName: item.patientName,
             patientPhone: item.patientPhone
          })}
        >
          <LinearGradient
            colors={[COLORS.PURPLE, '#9B59B6']}
            start={{x:0, y:0}} end={{x:1, y:0}}
            style={styles.actionGradient}
          >
            <Ionicons name="clipboard" size={18} color="#FFF" style={{marginRight:8}} />
            <Text style={styles.actionText}>Anamnez Formunu Doldur</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* 2. FORM TAMAMLANDI ROZETİ */}
      {item.hasAnamnesis && (
        <View style={styles.completedBadge}>
           <Ionicons name="checkmark-done" size={14} color={COLORS.SUCCESS} style={{marginRight:6}} />
           <Text style={styles.completedText}>Form Gönderildi</Text>
        </View>
      )}

    </LinearGradient>
  );
};

const PastAppointmentsScreen = ({ route, navigation }) => {
  const { clinicId } = route.params;

  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filterMode, setFilterMode] = useState('upcoming'); // 'upcoming' | 'past'

  // --- Header Ayarları (GÜNCELLENDİ) ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'RANDEVULARIM',
      headerStyle: { backgroundColor: COLORS.BG_START, shadowOpacity: 0, elevation: 0 },
      headerTintColor: COLORS.TEXT_MAIN,
      headerTitleStyle: { fontWeight: '800', letterSpacing: 1 },
      headerLeft: () => (
        <Ionicons 
          name="arrow-back" size={24} color={COLORS.TEXT_MAIN} 
          style={{marginLeft: 15}} onPress={() => navigation.goBack()} 
        />
      ),
      // 🔥 DÜZELTME: headerBottom KISMI TAMAMEN KALDIRILDI
      headerShadowVisible: false, 
    });
  }, [navigation]);

  // --- Veri Çekme ---
  const fetchAppointments = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || !clinicId) { setLoading(false); setRefreshing(false); return; }

    try {
      if (!refreshing) setLoading(true); 
      setError(null);

      const q = query(
        collection(db, 'appointments'),
        where('clinicId', '==', clinicId),
        where('patientId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      let apptList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sıralama (Tarihe Göre)
      apptList.sort((a, b) => {
          if (b.dateISO < a.dateISO) return -1;
          if (b.dateISO > a.dateISO) return 1;
          return 0;
      });

      setAllAppointments(apptList);

    } catch (err) {
      console.error(err);
      setError("Veri alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicId, refreshing]);

  useFocusEffect(useCallback(() => { fetchAppointments(); }, [fetchAppointments]));

  const onRefresh = () => { setRefreshing(true); fetchAppointments(); };

  // --- Filtreleme ---
  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (filterMode === 'upcoming') {
      setFilteredAppointments(allAppointments.filter(appt => appt.dateISO >= today));
    } else { 
      setFilteredAppointments(allAppointments.filter(appt => appt.dateISO < today));
    }
  }, [filterMode, allAppointments]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      
      {/* Arkaplan Gradient */}
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      
      {/* Dekoratif Işıltılar */}
      <View style={styles.glowTop} />

      {/* --- CUSTOM NEON TABS --- */}
      {/* Header'dan ayırmak için biraz boşluk */}
      <View style={{height: 10}} /> 
      
      <View style={styles.tabContainer}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity 
            style={[styles.tabButton, filterMode === 'upcoming' && styles.tabActive]} 
            onPress={() => setFilterMode('upcoming')}
          >
            <Text style={[styles.tabText, filterMode === 'upcoming' && styles.tabTextActive]}>GELECEK</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, filterMode === 'past' && styles.tabActive]} 
            onPress={() => setFilterMode('past')}
          >
            <Text style={[styles.tabText, filterMode === 'past' && styles.tabTextActive]}>GEÇMİŞ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AppointmentCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ACCENT_START} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color={COLORS.TEXT_SEC} />
              <Text style={styles.emptyText}>
                {filterMode === 'upcoming' ? 'Gelecek randevunuz yok.' : 'Geçmiş randevunuz yok.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default PastAppointmentsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Dekoratif
  glowTop: {
    position: 'absolute', top: -80, right: -50, width: 250, height: 250,
    borderRadius: 125, backgroundColor: COLORS.ACCENT_START, opacity: 0.1, blurRadius: 60
  },

  // TABS
  tabContainer: { paddingHorizontal: 20, marginBottom: 10 },
  tabWrapper: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4, borderWidth: 1, borderColor: COLORS.GLASS_BORDER
  },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.ACCENT_START },
  tabText: { color: COLORS.TEXT_SEC, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  tabTextActive: { color: COLORS.BG_START },

  listContent: { padding: 20, paddingBottom: 40 },

  // CAM KART
  glassCard: {
    borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  headerText: { flex: 1 },
  typeName: { color: COLORS.TEXT_MAIN, fontSize: 16, fontWeight: '700' },
  doctorName: { color: COLORS.TEXT_SEC, fontSize: 13, marginTop: 2 },
  
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.2)'
  },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: COLORS.GLASS_BORDER, marginVertical: 12 },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flexDirection: 'row', alignItems: 'center' },
  detailText: { color: COLORS.TEXT_MAIN, marginLeft: 6, fontSize: 13, fontWeight: '500' },

  // AKSİYON BUTONU
  actionButton: { marginTop: 15, borderRadius: 12, overflow: 'hidden' },
  actionGradient: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, alignItems: 'center' },
  actionText: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 },

  // TAMAMLANDI ROZETİ
  completedBadge: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 8,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  completedText: { color: COLORS.SUCCESS, fontSize: 12, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.TEXT_SEC, marginTop: 15, fontSize: 15 }
});