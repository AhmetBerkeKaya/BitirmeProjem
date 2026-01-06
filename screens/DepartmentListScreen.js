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
  StatusBar
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
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
  
  DANGER: '#FF4757',
};

const DepartmentListScreen = ({ route, navigation }) => {
  const { clinicId, clinicName } = route.params;

  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Header Ayarları
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'BRANŞ SEÇİMİ',
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
  }, [navigation]);

  /**
   * Departmanları Çekme
   */
  useEffect(() => {
    const fetchDepartments = async () => {
      setError(null);
      setLoading(true);
      try {
        if (!clinicId) throw new Error("Klinik ID bulunamadı.");

        const doctorsRef = collection(db, 'doctors');
        const q = query(doctorsRef, where('clinicId', '==', clinicId));
        const querySnapshot = await getDocs(q);

        const allSpecializations = querySnapshot.docs.map(doc => doc.data().specialization);
        const uniqueSpecMap = new Map();
        
        allSpecializations.forEach(specName => {
          if (specName && typeof specName === 'string') {
            const key = specName.toLowerCase();
            if (!uniqueSpecMap.has(key)) uniqueSpecMap.set(key, specName);
          }
        });

        const formattedList = [...uniqueSpecMap.values()].map((specName) => ({
          id: specName, name: specName
        }));

        formattedList.sort((a, b) => a.name.localeCompare(b.name));
        setDepartments(formattedList);
        setFilteredDepartments(formattedList);

      } catch (err) {
        setError("Branş listesi alınamadı.");
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, [clinicId]);

  /**
   * Arama Filtresi
   */
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDepartments(filtered);
    }
  }, [searchQuery, departments]);

  const handleSelectDepartment = (departmentName) => {
    navigation.navigate('DoctorList', {
      clinicId, departmentName, clinicName
    });
  };

  /**
   * Fütüristik Arama Çubuğu
   */
  const SearchBar = () => (
    <View style={styles.searchWrapper}>
      <Ionicons name="search" size={20} color={COLORS.ACCENT_START} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Branş ara... (örn: Kardiyoloji)"
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
  );

  // --- RENDER ---

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
        <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
        <Text style={styles.loadingText}>Branşlar Yükleniyor...</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => handleSelectDepartment(item.name)}
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
            <Ionicons name="medkit" size={22} color="#FFF" />
          </LinearGradient>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>Doktorları görüntüle</Text>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color={COLORS.ACCENT_START} style={{opacity: 0.8}} />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      
      {/* Dekoratif Işıltılar */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <View style={styles.headerInfo}>
            <Text style={styles.clinicName}>{clinicName}</Text>
            <Text style={styles.deptCount}>{departments.length} Branş Mevcut</Text>
          </View>

          <SearchBar />

          {filteredDepartments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color={COLORS.TEXT_SEC} />
              <Text style={styles.emptyText}>Branş bulunamadı.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredDepartments}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default DepartmentListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BG_START },
  loadingText: { color: COLORS.TEXT_SEC, marginTop: 15 },

  // Dekoratif
  glowTop: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.ACCENT_START, opacity: 0.1, transform: [{ scale: 1.2 }] },
  glowBottom: { position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.ACCENT_END, opacity: 0.1 },

  contentContainer: { flex: 1 },
  
  // Header Info
  headerInfo: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
  clinicName: { fontSize: 14, color: COLORS.ACCENT_START, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  deptCount: { fontSize: 24, fontWeight: '800', color: COLORS.TEXT_MAIN, marginTop: 4 },

  // Arama
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.INPUT_BG,
    borderRadius: 16, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, 
    marginHorizontal: 20, marginBottom: 20
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.TEXT_MAIN, fontSize: 16 },

  // Liste
  listContainer: { paddingBottom: 30 },

  // Cam Kart (Branş)
  cardContainer: { paddingHorizontal: 20, marginBottom: 12 },
  glassCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER, overflow: 'hidden'
  },
  cardIconBox: {
    width: 48, height: 48, borderRadius: 16, marginRight: 15,
    shadowColor: COLORS.ACCENT_START, shadowOpacity: 0.3, shadowRadius: 10
  },
  iconGradient: { flex: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.TEXT_MAIN, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: COLORS.TEXT_SEC },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.TEXT_SEC, marginTop: 15, fontSize: 15 }
});