import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
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
  DANGER: '#e74c3c',
};

const DoctorListScreen = ({ route, navigation }) => {
  const { clinicId, departmentName, clinicName } = route.params;

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Doktorları Çekme
   */
  useEffect(() => {
    const headerTitle = departmentName ? `${departmentName} Doktorları` : 'Klinik Doktorları';
    navigation.setOptions({
      title: headerTitle,
      headerStyle: {
        backgroundColor: COLORS.PRIMARY, // Beyaz yerine PRIMARY renk
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: COLORS.WHITE, // Geri butonu ve başlık beyaz
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
        color: COLORS.WHITE,
      },
    });

    const fetchDoctors = async () => {
      setError(null);
      setLoading(true);
      try {
        if (!clinicId) {
          throw new Error("Klinik ID bulunamadı.");
        }

        const doctorsRef = collection(db, 'doctors');
        let q;

        if (departmentName) {
          q = query(
            doctorsRef,
            where('clinicId', '==', clinicId),
            where('specialization', '==', departmentName)
          );
        }
        else {
          q = query(
            doctorsRef,
            where('clinicId', '==', clinicId)
          );
        }

        const querySnapshot = await getDocs(q);
        const doctorList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setDoctors(doctorList);

      } catch (err) {
        console.error("Doktorları çekerken hata:", err);
        setError("Doktorlar yüklenemedi. (Firestore Dizinlerini kontrol edin!)");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [clinicId, departmentName, navigation]);

  /**
   * Randevu Ekranına Yönlendirme
   */
  const handleSelectDoctor = (doctor) => {
    navigation.navigate('Appointment', {
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      clinicId: clinicId,
      clinicName: clinicName
    });
  };

  // --- RENDER ---

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.infoText}>Doktorlar Yükleniyor...</Text>
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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectDoctor(item)}
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
            <Ionicons name="person" size={28} color={COLORS.PRIMARY} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{item.fullName}</Text>
            <Text style={styles.cardSubtitle}>
              {item.education || item.specialization}
            </Text>
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
        <Text style={styles.headerTitle}>
          {departmentName || 'Tüm Doktorlar'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {doctors.length} doktor listeleniyor
        </Text>
      </LinearGradient>

      <View style={styles.contentContainer}>
        {doctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={COLORS.TEXT_LIGHT} />
            <Text style={styles.emptyText}>
              Bu kritere uygun doktor bulunamadı.
            </Text>
          </View>
        ) : (
          <FlatList
            data={doctors}
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
  listContainer: {
    paddingTop: 20,
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

export default DoctorListScreen;