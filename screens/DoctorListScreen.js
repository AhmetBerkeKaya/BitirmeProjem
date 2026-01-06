import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// --- FUTURE HEALTH PALETİ ---
const COLORS = {
  BG_START: '#0F172A',
  BG_END: '#1E293B',
  
  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',
  
  GLASS_BG: 'rgba(30, 41, 59, 0.6)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
  INPUT_BG: 'rgba(15, 23, 42, 0.6)',
  
  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  
  PURPLE: '#8B5CF6'
};

const DoctorCard = ({ item, onPress }) => (
  <LinearGradient
    colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.4)']}
    style={styles.glassCard}
  >
    <View style={styles.cardContentRow}>
      {/* Sol: Doktor İkonu */}
      <View style={styles.iconBox}>
        <LinearGradient
          colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
          style={styles.iconGradient}
        >
          <Ionicons name="person" size={28} color="#FFF" />
        </LinearGradient>
      </View>

      {/* Orta: Doktor Bilgileri */}
      <View style={styles.infoSection}>
        <Text style={styles.doctorName}>Dr. {item.fullName}</Text>
        <View style={styles.specialityBadge}>
          <Text style={styles.specialityText}>{item.specialization}</Text>
        </View>
        <View style={styles.hospitalRow}>
          <Ionicons name="business" size={12} color={COLORS.TEXT_SEC} style={{marginRight: 4}} />
          <Text style={styles.hospitalText} numberOfLines={1}>{item.hospitalName || 'Merkez Klinik'}</Text>
        </View>
      </View>
    </View>
    
    {/* Alt: Randevu Al Butonu */}
    <TouchableOpacity 
      style={styles.actionButton} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
        start={{x:0, y:0}} end={{x:1, y:0}}
        style={styles.actionGradient}
      >
        <Text style={styles.actionText}>RANDEVU AL</Text>
        <Ionicons name="arrow-forward-circle" size={18} color="#FFF" style={{marginLeft: 6}} />
      </LinearGradient>
    </TouchableOpacity>
  </LinearGradient>
);

const DoctorListScreen = ({ route, navigation }) => {
  const { clinicId, clinicName, departmentName } = route.params;
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: departmentName ? departmentName.toUpperCase() : 'DOKTORLAR',
      headerStyle: { backgroundColor: COLORS.BG_START, shadowOpacity: 0, elevation: 0 },
      headerTintColor: COLORS.TEXT_MAIN,
      headerTitleStyle: { fontWeight: '800', letterSpacing: 1, fontSize: 18 },
      headerLeft: () => (
        <Ionicons 
          name="arrow-back" size={24} color={COLORS.TEXT_MAIN} 
          style={{marginLeft: 15}} onPress={() => navigation.goBack()} 
        />
      )
    });
  }, [navigation, departmentName]);

  const fetchDoctors = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const doctorsRef = collection(db, 'doctors');
      let q = query(doctorsRef, where('clinicId', '==', clinicId));
      if (departmentName) {
        q = query(q, where('specialization', '==', departmentName));
      }
      const querySnapshot = await getDocs(q);
      const doctorList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Hastane isimlerini çek
      const doctorsWithHospitals = await Promise.all(doctorList.map(async (docData) => {
          let hospitalName = clinicName;
          if (docData.clinicId && docData.clinicId !== clinicId) {
              try {
                  const clinicDoc = await getDoc(doc(db, 'clinics', docData.clinicId));
                  if (clinicDoc.exists()) hospitalName = clinicDoc.data().name;
              } catch(e) {}
          }
          return { ...docData, hospitalName };
      }));

      doctorsWithHospitals.sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr'));
      setDoctors(doctorsWithHospitals);
      setFilteredDoctors(doctorsWithHospitals);
    } catch (err) {
      setError("Doktor listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [clinicId, departmentName, clinicName]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDoctors(doctors);
    } else {
      const lower = searchQuery.toLowerCase();
      setFilteredDoctors(doctors.filter(doc =>
        doc.fullName.toLowerCase().includes(lower) ||
        doc.specialization.toLowerCase().includes(lower)
      ));
    }
  }, [searchQuery, doctors]);

  const handleDoctorSelect = (doctor) => {
    navigation.navigate('Appointment', {
      doctorId: doctor.id, doctorName: doctor.fullName,
      clinicId: clinicId, clinicName: clinicName,
      branch: doctor.specialization
    });
  };

  if (loading) return (
    <View style={styles.centerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
      <Text style={styles.loadingText}>Uzmanlar Listeleniyor...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      
      {/* Dekoratif Işıltılar */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <SafeAreaView style={{flex: 1}}>
        <FlatList
          data={filteredDoctors}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <DoctorCard item={item} onPress={() => handleDoctorSelect(item)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>UZMAN KADROMUZ</Text>
              <Text style={styles.headerSubtitle}>Randevu almak istediğiniz doktoru seçin</Text>
              
              {/* Arama Çubuğu */}
              <View style={styles.searchWrapper}>
                <Ionicons name="search" size={20} color={COLORS.ACCENT_START} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Doktor veya branş ara..."
                  placeholderTextColor={COLORS.TEXT_SEC}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={COLORS.TEXT_SEC} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={60} color={COLORS.TEXT_SEC} />
                <Text style={styles.emptyText}>Kriterlere uygun doktor bulunamadı.</Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
};

export default DoctorListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BG_START },
  loadingText: { color: COLORS.TEXT_SEC, marginTop: 15 },

  // Dekoratif Glow
  glowTopRight: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.ACCENT_START, opacity: 0.1, transform: [{ scale: 1.2 }] },
  glowBottomLeft: { position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.ACCENT_END, opacity: 0.1 },

  listContent: { paddingBottom: 30 },

  // Header
  headerContainer: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.TEXT_MAIN, letterSpacing: 1 },
  headerSubtitle: { fontSize: 14, color: COLORS.TEXT_SEC, marginBottom: 20, marginTop: 5 },

  // Arama
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.INPUT_BG,
    borderRadius: 16, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, marginBottom: 5
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.TEXT_MAIN, fontSize: 16 },

  // CAM KART (Doktor)
  glassCard: {
    borderRadius: 20, padding: 16, marginBottom: 16, marginHorizontal: 20,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER, overflow: 'hidden'
  },
  cardContentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  
  iconBox: {
    width: 60, height: 60, borderRadius: 20, marginRight: 16,
    shadowColor: COLORS.ACCENT_START, shadowOpacity: 0.3, shadowRadius: 10
  },
  iconGradient: { flex: 1, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  infoSection: { flex: 1 },
  doctorName: { fontSize: 18, fontWeight: '700', color: COLORS.TEXT_MAIN, marginBottom: 6 },
  specialityBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0, 242, 195, 0.1)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0, 242, 195, 0.3)'
  },
  specialityText: { color: COLORS.ACCENT_START, fontSize: 12, fontWeight: '600' },
  hospitalRow: { flexDirection: 'row', alignItems: 'center' },
  hospitalText: { color: COLORS.TEXT_SEC, fontSize: 12 },

  // Randevu Al Butonu
  actionButton: { borderRadius: 14, overflow: 'hidden' },
  actionGradient: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12
  },
  actionText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.TEXT_SEC, marginTop: 15, fontSize: 15 }
});