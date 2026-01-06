import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  Dimensions
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- FUTURE HEALTH RENK PALETİ ---
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
  
  DANGER: '#FF4757',
  DANGER_DARK: '#B91C1C',
  SUCCESS: '#10B981',
  OVERLAY: 'rgba(15, 23, 42, 0.95)',
};

const ClinicListScreen = ({ navigation }) => {
  const [clinics, setClinics] = useState([]);
  const [filteredClinics, setFilteredClinics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Şehir Filtreleme
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('all');
  const [showCityFilter, setShowCityFilter] = useState(false);

  // ÇIKIŞ MODAL STATE
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Animasyon
  const fadeAnim = useState(new Animated.Value(0))[0];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'KLİNİKLER',
      headerStyle: {
        backgroundColor: COLORS.BG_START,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
      headerTintColor: COLORS.TEXT_MAIN,
      headerTitleStyle: {
        fontWeight: '800',
        fontSize: 20,
        letterSpacing: 1.5,
      },
      headerLeft: () => null,
      headerRight: () => (
        <TouchableOpacity onPress={() => setShowLogoutModal(true)} style={styles.headerButton}>
          <View style={styles.logoutButton}>
            <Ionicons name="power" size={20} color={COLORS.DANGER} />
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    fetchClinics();
  }, []);

  // --- GÜNCELLENMİŞ ŞEHİR AYIKLAMA MANTIĞI (Ters Slash Destekli) ---
  const extractCity = (address) => {
    if (!address) return null;
    let cleanCity = '';

    // Regex Açıklaması: /[/\\]/ 
    // Hem normal slash (/) hem de ters slash (\) karakterinden böler.
    // Not: Ters slash JS stringinde '\\' olarak ifade edilir.
    
    if (address.match(/[/\\]/)) {
      const parts = address.split(/[/\\]/); // / veya \ görünce böl
      cleanCity = parts[parts.length - 1].trim(); // En sondaki parçayı al (Şehir)
    }
    // Eğer slash yoksa ama virgül varsa
    else if (address.includes(',')) {
      const parts = address.split(',');
      const lastPart = parts[parts.length - 1].trim();
      
      // Son parça "Türkiye" ise bir öncekini al
      if (lastPart.toLowerCase() === 'türkiye' || lastPart.toLowerCase() === 'turkey') {
        cleanCity = parts[parts.length - 2] ? parts[parts.length - 2].trim() : lastPart;
      } else {
        cleanCity = lastPart;
      }
    }
    // Hiçbiri yoksa düz metni al
    else {
      cleanCity = address.trim();
    }

    return cleanCity;
  };

  useEffect(() => {
    if (clinics.length > 0) {
      const uniqueCities = [...new Set(clinics
        .map(clinic => extractCity(clinic.address))
        .filter(city => city && city.length > 2)
      )].sort((a, b) => a.localeCompare(b, 'tr'));
      setCities(uniqueCities);
    }
  }, [clinics]);

  useEffect(() => {
    let filtered = [...clinics];
    
    // Şehir Filtresi
    if (selectedCity !== 'all') {
      filtered = filtered.filter(clinic => {
        const city = extractCity(clinic.address);
        return city === selectedCity; // Tam eşleşme kontrolü
      });
    }

    // Arama Filtresi
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(clinic =>
        clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (clinic.address && clinic.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    setFilteredClinics(filtered);
  }, [searchQuery, selectedCity, clinics]);

  useEffect(() => {
    if (!loading && clinics.length > 0) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [loading, clinics]);

  const fetchClinics = async (isRefreshing = false) => {
    if (!isRefreshing) { setError(null); setLoading(true); }
    try {
      const clinicsCollection = collection(db, 'clinics');
      const clinicSnapshot = await getDocs(clinicsCollection);
      const clinicList = clinicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      clinicList.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      setClinics(clinicList);
      setFilteredClinics(clinicList);
    } catch (err) {
      setError("Veri bağlantısı kurulamadı.");
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); fetchClinics(true); };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    signOut(auth).catch(err => console.error("Çıkış hatası:", err));
  };

  const handleSelectClinic = (clinic) => {
    navigation.navigate('Dashboard', { clinicId: clinic.id, clinicName: clinic.name });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
        <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
        <Text style={styles.loadingText}>Sistem Verileri Yükleniyor...</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity 
        style={styles.cardContainer} 
        onPress={() => handleSelectClinic(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.4)']}
          style={styles.glassCard}
        >
          <View style={styles.cardIconBox}>
            <LinearGradient
              colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
              style={styles.iconGradient}
            >
              <Ionicons name="business" size={24} color="#FFF" />
            </LinearGradient>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-sharp" size={14} color={COLORS.TEXT_SEC} />
                <Text style={styles.cardText} numberOfLines={2}>{item.address}</Text>
              </View>
            )}
            {item.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={14} color={COLORS.TEXT_SEC} />
                <Text style={styles.cardText}>{item.phone}</Text>
              </View>
            )}
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={COLORS.ACCENT_START} style={{opacity: 0.8}} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Bu fonksiyon input focus kaybını önlemek için dışarıda tanımlı değil,
  // ancak FlatList'e doğrudan fonksiyon çağrısı olarak veriliyor.
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
      <Text style={styles.subtitle}>İşlem yapmak istediğiniz kliniği seçin</Text>
      
      {/* Arama Alanı */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={20} color={COLORS.ACCENT_START} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Klinik veya semt ara..."
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

      {/* Şehir Filtresi */}
      {cities.length > 0 && (
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterBtn, selectedCity !== 'all' && styles.filterBtnActive]}
            onPress={() => setShowCityFilter(true)}
          >
            <Ionicons name="map" size={16} color={selectedCity !== 'all' ? '#FFF' : COLORS.ACCENT_START} />
            <Text style={[styles.filterBtnText, selectedCity !== 'all' && {color:'#FFF'}]}>
              {selectedCity === 'all' ? 'Konum Filtrele' : selectedCity}
            </Text>
            <Ionicons name="chevron-down" size={16} color={selectedCity !== 'all' ? '#FFF' : COLORS.TEXT_SEC} />
          </TouchableOpacity>

          {selectedCity !== 'all' && (
            <TouchableOpacity onPress={() => setSelectedCity('all')} style={styles.clearFilterBtn}>
              <Ionicons name="refresh" size={18} color={COLORS.TEXT_SEC} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.resultCount}>{filteredClinics.length} Klinik Bulundu</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={{flex: 1}}>
        <FlatList
          data={filteredClinics}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader()}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Ionicons name="planet-outline" size={60} color={COLORS.TEXT_SEC} />
                <Text style={styles.emptyText}>Kriterlere uygun klinik bulunamadı.</Text>
              </View>
            )
          }
        />
      </SafeAreaView>

      {/* Şehir Seçim Modal */}
      <Modal visible={showCityFilter} transparent animationType="fade" onRequestClose={() => setShowCityFilter(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCityFilter(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>KONUM SEÇİN</Text>
              <TouchableOpacity onPress={() => setShowCityFilter(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_SEC} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.cityOption} onPress={() => { setSelectedCity('all'); setShowCityFilter(false); }}>
                <Text style={[styles.cityText, selectedCity === 'all' && styles.cityTextActive]}>Tüm Şehirler</Text>
                {selectedCity === 'all' && <Ionicons name="checkmark" size={20} color={COLORS.ACCENT_START} />}
              </TouchableOpacity>
              {cities.map((city, index) => (
                <TouchableOpacity key={index} style={styles.cityOption} onPress={() => { setSelectedCity(city); setShowCityFilter(false); }}>
                  <Text style={[styles.cityText, selectedCity === city && styles.cityTextActive]}>{city}</Text>
                  {selectedCity === city && <Ionicons name="checkmark" size={20} color={COLORS.ACCENT_START} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ÇIKIŞ MODALI */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutOverlay}>
          <LinearGradient colors={[COLORS.BG_END, COLORS.BG_START]} style={styles.logoutCard}>
            
            <View style={styles.logoutIconContainer}>
              <Ionicons name="power" size={32} color={COLORS.DANGER} />
            </View>

            <Text style={styles.logoutTitle}>SİSTEMDEN ÇIKIŞ</Text>
            <Text style={styles.logoutMessage}>Oturumu kapatmak istiyor musunuz?</Text>

            <View style={styles.logoutBtnRow}>
              <TouchableOpacity style={styles.logoutBtnCancel} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.logoutBtnTextCancel}>İPTAL</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtnConfirm} onPress={confirmLogout}>
                <LinearGradient colors={[COLORS.DANGER, COLORS.DANGER_DARK]} style={styles.logoutBtnGradient}>
                  <Text style={styles.logoutBtnTextConfirm}>ÇIKIŞ YAP</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </LinearGradient>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BG_START },
  
  glowTop: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.ACCENT_START, opacity: 0.1, transform: [{ scale: 1.2 }] },
  glowBottom: { position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.ACCENT_END, opacity: 0.1 },

  headerButton: { marginRight: 15 },
  logoutButton: { padding: 8, backgroundColor: 'rgba(255, 71, 87, 0.15)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.3)' },

  listContent: { paddingBottom: 30 },
  
  headerContainer: { padding: 20, paddingTop: 10 },
  welcomeText: { fontSize: 28, fontWeight: '800', color: COLORS.TEXT_MAIN, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: COLORS.TEXT_SEC, marginBottom: 20 },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.INPUT_BG,
    borderRadius: 16, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, marginBottom: 15
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.TEXT_MAIN, fontSize: 16 },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.GLASS_BORDER
  },
  filterBtnActive: { backgroundColor: COLORS.ACCENT_START, borderColor: COLORS.ACCENT_START },
  filterBtnText: { color: COLORS.TEXT_SEC, fontSize: 14, fontWeight: '600', marginHorizontal: 8 },
  clearFilterBtn: { marginLeft: 10, padding: 10 },

  resultCount: { color: COLORS.TEXT_SEC, fontSize: 12, fontWeight: 'bold', marginLeft: 5, marginTop: 5, letterSpacing: 1 },

  cardContainer: { paddingHorizontal: 20, marginBottom: 12 },
  glassCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER, overflow: 'hidden'
  },
  cardIconBox: {
    width: 50, height: 50, borderRadius: 16, marginRight: 15,
    shadowColor: COLORS.ACCENT_START, shadowOpacity: 0.3, shadowRadius: 10
  },
  iconGradient: { flex: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.TEXT_MAIN, marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  cardText: { fontSize: 13, color: COLORS.TEXT_SEC, marginLeft: 6, flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: COLORS.OVERLAY, justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#1E293B', borderRadius: 24, padding: 20, maxHeight: '60%',
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: COLORS.TEXT_MAIN, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  cityOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cityText: { color: COLORS.TEXT_SEC, fontSize: 16 },
  cityTextActive: { color: COLORS.ACCENT_START, fontWeight: 'bold' },

  loadingText: { color: COLORS.TEXT_SEC, marginTop: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.TEXT_SEC, marginTop: 15 },

  logoutOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  logoutCard: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.GLASS_BORDER, shadowColor: COLORS.DANGER, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  logoutIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 71, 87, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.3)' },
  logoutTitle: { fontSize: 20, fontWeight: '900', color: COLORS.TEXT_MAIN, marginBottom: 8, letterSpacing: 1 },
  logoutMessage: { fontSize: 14, color: COLORS.TEXT_SEC, textAlign: 'center', marginBottom: 24 },
  logoutBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  logoutBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  logoutBtnTextCancel: { color: COLORS.TEXT_MAIN, fontWeight: '700', fontSize: 13 },
  logoutBtnConfirm: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  logoutBtnGradient: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  logoutBtnTextConfirm: { color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 }
});

export default ClinicListScreen;