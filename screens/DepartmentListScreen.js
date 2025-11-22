import React, { useState, useEffect } from 'react';
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

// --- RENK PALETİ ---
const COLORS = {
  PRIMARY: '#00BFA6',
  PRIMARY_DARK: '#00997A',
  PRIMARY_LIGHT: '#E6F8F5',
  GRADIENT_START: '#00BFA6',
  GRADIENT_END: '#00D9B8',
  BACKGROUND: '#F5F9FC',
  WHITE: '#FFFFFF',
  TEXT: '#2C3E50',
  TEXT_LIGHT: '#5D6D7E',
  BORDER: '#EAECEE',
  SEARCH_BG: '#EEF2F5',
  DANGER: '#e74c3c',
};

const DepartmentListScreen = ({ route, navigation }) => {
  const { clinicId, clinicName } = route.params;

  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Departmanları Çekme
   */
  useEffect(() => {
    navigation.setOptions({
      title: `${clinicName} - Branşlar`,
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
    });
    const fetchDepartments = async () => {
      setError(null);
      setLoading(true);
      try {
        if (!clinicId) {
          throw new Error("Klinik ID bulunamadı.");
        }

        const doctorsRef = collection(db, 'doctors');
        const q = query(doctorsRef, where('clinicId', '==', clinicId));
        const querySnapshot = await getDocs(q);

        const allSpecializations = querySnapshot.docs.map(
          doc => doc.data().specialization
        );

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

        formattedList.sort((a, b) => a.name.localeCompare(b.name));

        setDepartments(formattedList);
        setFilteredDepartments(formattedList);

      } catch (err) {
        console.error("Departmanları çekerken hata:", err);
        setError("Departmanlar yüklenemedi. (Firestore Dizinlerini kontrol edin!)");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [clinicId, navigation, clinicName]);

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

  /**
   * Doktor Listesine Yönlendirme
   */
  const handleSelectDepartment = (departmentName) => {
    navigation.navigate('DoctorList', {
      clinicId: clinicId,
      departmentName: departmentName,
      clinicName: clinicName
    });
  };

  /**
   * Arama Çubuğu Component
   */
  const SearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons name="search-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Branş ara... (örn: Kardiyoloji)"
        placeholderTextColor={COLORS.TEXT_LIGHT}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Ionicons name="close-circle" size={20} color={COLORS.TEXT_LIGHT} />
        </TouchableOpacity>
      )}
    </View>
  );

  // --- RENDER ---

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.infoText}>Branşlar Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
        <View style={styles.centerContainer}>
          <Ionicons name="warning-outline" size={60} color={COLORS.DANGER} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.card, {
        transform: [{ scale: 1 }]
      }]}
      onPress={() => handleSelectDepartment(item.name)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[COLORS.PRIMARY_LIGHT, COLORS.WHITE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="medkit" size={26} color={COLORS.PRIMARY} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>Doktorları görüntüle</Text>
          </View>
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={22} color={COLORS.PRIMARY} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />

      {/* Header Gradient */}
      <LinearGradient
        colors={[COLORS.GRADIENT_START, COLORS.GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Branş Seçimi</Text>
        <Text style={styles.headerSubtitle}>
          {departments.length} branş listeleniyor
        </Text>
      </LinearGradient>

      <View style={styles.contentContainer}>
        <SearchBar />

        {filteredDepartments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color={COLORS.TEXT_LIGHT} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Arama sonucu bulunamadı' : 'Branş bulunamadı'}
            </Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>Aramayı Temizle</Text>
              </TouchableOpacity>
            )}
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
  );
};

// --- STİLLER ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.WHITE,
    opacity: 0.9,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    marginVertical: 8,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  cardGradient: {
    borderRadius: 18,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 2,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.TEXT_LIGHT,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    textAlign: 'center',
    marginTop: 15,
  },
  clearButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 25,
    elevation: 3,
  },
  clearButtonText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
  infoText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.DANGER,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default DepartmentListScreen;