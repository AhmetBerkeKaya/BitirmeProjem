import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TextInput,
  Animated,
  Modal,
  ScrollView
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// --- GELİŞTİRİLMİŞ RENK PALETİ ---
const COLORS = {
  PRIMARY: '#00BFA6',
  PRIMARY_LIGHT: '#4DD0C1',
  PRIMARY_DARK: '#00A690',
  BACKGROUND: '#F8FAFB',
  CARD_BG: '#FFFFFF',
  TEXT: '#2C3E50',
  TEXT_LIGHT: '#7F8C8D',
  TEXT_MUTED: '#95A5A6',
  BORDER: '#E8ECEF',
  DANGER: '#E74C3C',
  SUCCESS: '#27AE60',
  SHADOW: '#000000',
  SEARCH_BG: '#F0F3F5',
  OVERLAY: 'rgba(0, 0, 0, 0.5)',
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
  
  // Animasyon değeri
  const fadeAnim = useState(new Animated.Value(0))[0];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <View style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.DANGER} />
          </View>
        </TouchableOpacity>
      ),
      title: 'Klinikler',
      headerLeft: () => null,
      headerStyle: {
        backgroundColor: COLORS.CARD_BG,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 20,
        color: COLORS.TEXT,
      },
    });
  }, [navigation]);

  useEffect(() => {
    fetchClinics();
  }, []);

  // Şehir listesini çıkar
  useEffect(() => {
    if (clinics.length > 0) {
      const uniqueCities = [...new Set(clinics
        .map(clinic => extractCity(clinic.address))
        .filter(city => city)
      )].sort((a, b) => a.localeCompare(b, 'tr'));
      
      setCities(uniqueCities);
    }
  }, [clinics]);

  // Şehirden adres çıkarma fonksiyonu
  const extractCity = (address) => {
    if (!address) return null;
    
    // Örnek: "Konak, İzmir" veya "İzmir, Türkiye" gibi formatlar
    const parts = address.split(',').map(p => p.trim());
    
    // Türkiye kelimesini atla
    const cityPart = parts.find(p => 
      p.toLowerCase() !== 'türkiye' && 
      p.toLowerCase() !== 'turkey' &&
      p.length > 2
    );
    
    // Eğer virgülle ayrılmışsa son anlamlı kısmı al
    if (parts.length >= 2) {
      return parts[parts.length - 1].toLowerCase() !== 'türkiye' 
        ? parts[parts.length - 1] 
        : parts[parts.length - 2];
    }
    
    return cityPart || parts[0];
  };

  // Arama ve şehir filtreleme
  useEffect(() => {
    let filtered = [...clinics];
    
    // Şehir filtresi
    if (selectedCity !== 'all') {
      filtered = filtered.filter(clinic => {
        const clinicCity = extractCity(clinic.address);
        return clinicCity === selectedCity;
      });
    }
    
    // Arama filtresi
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(clinic =>
        clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (clinic.address && clinic.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (clinic.phone && clinic.phone.includes(searchQuery))
      );
    }
    
    setFilteredClinics(filtered);
  }, [searchQuery, selectedCity, clinics]);

  // Fade-in animasyonu
  useEffect(() => {
    if (!loading && clinics.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, clinics]);

  const fetchClinics = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setError(null);
      setLoading(true);
    }
    
    try {
      const clinicsCollection = collection(db, 'clinics');
      const clinicSnapshot = await getDocs(clinicsCollection);
      
      const clinicList = clinicSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Alfabetik sıralama
      clinicList.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      
      setClinics(clinicList);
      setFilteredClinics(clinicList);
      
    } catch (err) {
      console.error("Klinikleri çekerken hata:", err);
      setError("Klinikler yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchClinics(true);
  };

  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Oturumunuzu kapatmak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Çıkış Yap", 
          onPress: () => {
            signOut(auth).catch(err => console.error("Çıkış hatası:", err));
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleSelectClinic = (clinic) => {
    navigation.navigate('Dashboard', {
      clinicId: clinic.id,
      clinicName: clinic.name
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const selectCity = (city) => {
    setSelectedCity(city);
    setShowCityFilter(false);
  };

  const clearCityFilter = () => {
    setSelectedCity('all');
  };

  // --- RENDER FONKSIYONLARI ---

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Klinikler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.DANGER} />
          </View>
          <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchClinics()}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.CARD_BG} />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (clinics.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="business-outline" size={80} color={COLORS.TEXT_MUTED} />
          </View>
          <Text style={styles.emptyTitle}>Klinik Bulunamadı</Text>
          <Text style={styles.emptyText}>Henüz kayıtlı klinik bulunmuyor.</Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.cardWrapper,
        { 
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })
          }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleSelectClinic(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="medical" size={28} color={COLORS.PRIMARY} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            
            {item.address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.TEXT_LIGHT} />
                <Text style={styles.cardAddress} numberOfLines={2}>
                  {item.address}
                </Text>
              </View>
            )}
            
            {item.phone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={COLORS.TEXT_LIGHT} />
                <Text style={styles.cardPhone}>{item.phone}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={24} color={COLORS.PRIMARY} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
      <Text style={styles.subtitle}>
        Devam etmek için bir klinik seçin
      </Text>
      
      {/* Arama Çubuğu */}
      <View style={styles.searchContainer}>
        <Ionicons 
          name="search-outline" 
          size={20} 
          color={COLORS.TEXT_LIGHT} 
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Klinik ara..."
          placeholderTextColor={COLORS.TEXT_MUTED}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={COLORS.TEXT_LIGHT} />
          </TouchableOpacity>
        )}
      </View>

      {/* Şehir Filtresi */}
      {cities.length > 0 && (
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.cityFilterButton}
            onPress={() => setShowCityFilter(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.cityFilterText}>
              {selectedCity === 'all' ? 'Tüm Şehirler' : selectedCity}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.TEXT_LIGHT} />
          </TouchableOpacity>

          {selectedCity !== 'all' && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={clearCityFilter}
            >
              <Ionicons name="close" size={16} color={COLORS.CARD_BG} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sonuç Sayacı */}
      <View style={styles.resultContainer}>
        <Text style={styles.resultText}>
          {filteredClinics.length} klinik bulundu
        </Text>
        {selectedCity !== 'all' && (
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterText}>{selectedCity}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptySearchContainer}>
      <Ionicons name="search-outline" size={60} color={COLORS.TEXT_MUTED} />
      <Text style={styles.emptySearchText}>
        Sonuç bulunamadı
      </Text>
      <Text style={styles.emptySearchSubtext}>
        {searchQuery && `"${searchQuery}" için `}
        {selectedCity !== 'all' && `${selectedCity} şehrinde `}
        klinik bulunamadı
      </Text>
      {(searchQuery || selectedCity !== 'all') && (
        <TouchableOpacity 
          style={styles.resetFiltersButton}
          onPress={() => {
            setSearchQuery('');
            setSelectedCity('all');
          }}
        >
          <Text style={styles.resetFiltersText}>Filtreleri Temizle</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredClinics}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {/* Şehir Seçim Modal */}
      <Modal
        visible={showCityFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCityFilter(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCityFilter(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şehir Seçin</Text>
              <TouchableOpacity onPress={() => setShowCityFilter(false)}>
                <Ionicons name="close" size={28} color={COLORS.TEXT} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cityList}>
              <TouchableOpacity 
                style={[
                  styles.cityOption,
                  selectedCity === 'all' && styles.cityOptionSelected
                ]}
                onPress={() => selectCity('all')}
              >
                <Ionicons 
                  name="globe-outline" 
                  size={22} 
                  color={selectedCity === 'all' ? COLORS.PRIMARY : COLORS.TEXT_LIGHT} 
                />
                <Text style={[
                  styles.cityOptionText,
                  selectedCity === 'all' && styles.cityOptionTextSelected
                ]}>
                  Tüm Şehirler
                </Text>
                {selectedCity === 'all' && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                )}
              </TouchableOpacity>

              {cities.map((city, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[
                    styles.cityOption,
                    selectedCity === city && styles.cityOptionSelected
                  ]}
                  onPress={() => selectCity(city)}
                >
                  <Ionicons 
                    name="location" 
                    size={22} 
                    color={selectedCity === city ? COLORS.PRIMARY : COLORS.TEXT_LIGHT} 
                  />
                  <Text style={[
                    styles.cityOptionText,
                    selectedCity === city && styles.cityOptionTextSelected
                  ]}>
                    {city}
                  </Text>
                  {selectedCity === city && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// --- GELİŞTİRİLMİŞ STİLLER ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  listContainer: {
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    padding: 20,
  },
  
  // Header Stilleri
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    marginBottom: 20,
  },
  
  // Arama Stilleri
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SEARCH_BG,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  clearButton: {
    padding: 5,
  },

  // Şehir Filtresi
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cityFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
  },
  cityFilterText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.TEXT,
    fontWeight: '600',
    marginLeft: 8,
  },
  clearFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.DANGER,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
    fontWeight: '500',
  },
  activeFilterBadge: {
    backgroundColor: COLORS.PRIMARY + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  activeFilterText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  
  // Kart Stilleri
  cardWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    elevation: 2,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  cardAddress: {
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
    marginLeft: 6,
    flex: 1,
  },
  cardPhone: {
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
    marginLeft: 6,
    fontWeight: '500',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Yükleme Stilleri
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
  },
  
  // Hata Stilleri
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.DANGER + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: COLORS.CARD_BG,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Boş Liste Stilleri
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.SEARCH_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    textAlign: 'center',
  },
  
  // Boş Arama Sonucu
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySearchSubtext: {
    fontSize: 15,
    color: COLORS.TEXT_LIGHT,
    textAlign: 'center',
    marginBottom: 20,
  },
  resetFiltersButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  resetFiltersText: {
    color: COLORS.CARD_BG,
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Header Button
  headerButton: {
    marginRight: 10,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.DANGER + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  cityList: {
    maxHeight: 400,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  cityOptionSelected: {
    backgroundColor: COLORS.PRIMARY + '10',
  },
  cityOptionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
    marginLeft: 12,
    fontWeight: '500',
  },
  cityOptionTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
});

export default ClinicListScreen;