import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Geliştirilmiş Renk Paleti
const COLORS = {
  PRIMARY: '#00BFA6',
  PRIMARY_DARK: '#00A08E',
  PRIMARY_LIGHT: '#E6F8F5',
  ACCENT: '#4ECDC4',
  BACKGROUND: '#F8FAFC',
  CARD_BG: '#FFFFFF',
  TEXT_PRIMARY: '#1E293B',
  TEXT_SECONDARY: '#64748B',
  TEXT_LIGHT: '#94A3B8',
  BORDER: '#E2E8F0',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  SHADOW: '#000000',
};

/**
 * Stat Card Component - İstatistik kartları için
 */
const StatCard = ({ icon, value, label, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * Geliştirilmiş Dashboard Button Component
 */
const DashboardButton = ({ icon, title, subtitle, onPress, badge }) => (
  <TouchableOpacity 
    style={styles.card} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.cardContent}>
      <View style={[styles.cardIconContainer, { backgroundColor: COLORS.PRIMARY_LIGHT }]}>
        <Ionicons name={icon} size={26} color={COLORS.PRIMARY} />
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_LIGHT} />
      </View>
    </View>
  </TouchableOpacity>
);

/**
 * Quick Action Button - Hızlı erişim butonları
 */
const QuickActionButton = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const DashboardScreen = ({ route, navigation }) => {
  const { clinicId, clinicName } = route.params;
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  // Günün zamanına göre selamlama
  const getGreeting = () => {
    if (currentHour < 12) return 'Günaydın';
    if (currentHour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  useLayoutEffect(() => {
    navigation.setOptions({ 
      title: clinicName,
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: COLORS.CARD_BG,
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
      },
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-horizontal-outline" size={22} color={COLORS.CARD_BG} />
          <Text style={styles.headerButtonText}>Değiştir</Text>
        </TouchableOpacity>
      ),
      headerBackVisible: false,
    });

    const fetchPatientName = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const patientRef = doc(db, 'patients', user.uid);
          const patientSnap = await getDoc(patientRef);
          
          if (patientSnap.exists()) {
            const fullName = patientSnap.data().fullName;
            const firstName = fullName.split(' ')[0];
            setPatientName(firstName);
          } else {
            setPatientName("Değerli Hastamız");
          }
        } catch (err) {
          console.error('Hasta bilgisi alınamadı:', err);
          setPatientName("Değerli Hastamız");
        }
      }
      setLoading(false);
    };

    fetchPatientName();
  }, [navigation, clinicId, clinicName]);

  // Navigasyon fonksiyonları
  const go_RandevuAl = () => {
    navigation.navigate('DepartmentList', { 
      clinicId: clinicId, 
      clinicName: clinicName 
    });
  };

  const go_Tedavilerim = () => {
    navigation.navigate('TreatmentList'); 
  };

  const go_Recetelerim = () => {
    navigation.navigate('PrescriptionList', {
      clinicId: clinicId 
    }); 
  };

  const go_GecmisRandevular = () => {
    navigation.navigate('PastAppointments', {
      clinicId: clinicId
    }); 
  };
  
  const go_Doktorlarim = () => {
    navigation.navigate('DoctorList', {
      clinicId: clinicId,
      departmentName: null 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        
        {/* Hero Section - Gradient Background */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.patientName}>{patientName}</Text>
            </View>
            
            {/* Ana CTA Butonu */}
            <TouchableOpacity 
              style={styles.ctaButton} 
              onPress={go_RandevuAl}
              activeOpacity={0.9}
            >
              <View style={styles.ctaIconContainer}>
                <Ionicons name="calendar" size={24} color={COLORS.PRIMARY} />
              </View>
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaButtonText}>Randevu Al</Text>
                <Text style={styles.ctaButtonSubtext}>Hemen randevu oluştur</Text>
              </View>
              <Ionicons name="arrow-forward" size={22} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions - Hızlı Erişim */}
        <View style={styles.quickActionsContainer}>
          <QuickActionButton
            icon="calendar-outline"
            label="Randevular"
            color={COLORS.PRIMARY}
            onPress={go_GecmisRandevular}
          />
          <QuickActionButton
            icon="medical-outline"
            label="Tedaviler"
            color="#8B5CF6"
            onPress={go_Tedavilerim}
          />
          <QuickActionButton
            icon="document-text-outline"
            label="Reçeteler"
            color="#F59E0B"
            onPress={go_Recetelerim}
          />
          <QuickActionButton
            icon="people-outline"
            label="Doktorlar"
            color="#EF4444"
            onPress={go_Doktorlarim}
          />
        </View>

        {/* Ana Menü */}
        <View style={styles.mainContent}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sağlık Hizmetleri</Text>
            <Text style={styles.sectionSubtitle}>Size özel işlemleriniz</Text>
          </View>
          
          <DashboardButton
            title="Tedavilerim"
            subtitle="Aktif tedavi ve protokolleriniz"
            icon="medical"
            onPress={go_Tedavilerim}
          />
          
          <DashboardButton
            title="Reçetelerim"
            subtitle="İlaç ve reçete bilgileriniz"
            icon="document-text"
            onPress={go_Recetelerim}
          />
          
          <DashboardButton
            title="Randevu Geçmişi"
            subtitle="Tüm randevu kayıtlarınız"
            icon="time"
            onPress={go_GecmisRandevular}
          />

          <DashboardButton
            title="Klinik Doktorları"
            subtitle="Uzman doktorlarımızı inceleyin"
            icon="people"
            onPress={go_Doktorlarim}
          />
        </View>

        {/* Alt Boşluk */}
        <View style={styles.bottomSpacer} />

      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  
  // Header Button
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  headerButtonText: {
    color: COLORS.CARD_BG,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Hero Section
  heroSection: {
    backgroundColor: COLORS.PRIMARY,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  greetingContainer: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 20,
    color: COLORS.CARD_BG + 'CC',
    fontWeight: '400',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.CARD_BG,
    letterSpacing: 0.5,
  },
  
  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.CARD_BG,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  ctaButtonSubtext: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '400',
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: COLORS.CARD_BG,
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  
  // Main Content
  mainContent: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '400',
  },
  
  // Card Component
  card: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.CARD_BG,
    fontSize: 11,
    fontWeight: '700',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '400',
    lineHeight: 18,
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Bottom Spacer
  bottomSpacer: {
    height: 32,
  },
});