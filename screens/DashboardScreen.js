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
 * Modern Cam Kart Butonu (Dashboard Listesi İçin)
 */
const DashboardButton = ({ icon, title, subtitle, onPress, badge }) => (
  <TouchableOpacity 
    style={styles.glassCardButton} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.3)']}
      style={styles.glassCardInner}
    >
      <View style={styles.cardIconBox}>
        <LinearGradient
          colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
          style={styles.iconGradientBg}
          start={{x:0, y:0}} end={{x:1, y:1}}
        >
          <Ionicons name={icon} size={22} color="#FFF" />
        </LinearGradient>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardTextArea}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={18} color={COLORS.TEXT_SEC} />
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

/**
 * Hızlı Erişim Küreleri (Quick Action Orbs)
 */
const QuickActionOrb = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={styles.orbContainer} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.orb, { borderColor: color }]}>
      {/* İkonun arkasındaki hafif glow */}
      <View style={[styles.orbGlow, { backgroundColor: color }]} />
      <Ionicons name={icon} size={24} color="#FFF" style={{ zIndex: 2 }} />
    </View>
    <Text style={styles.orbLabel}>{label}</Text>
  </TouchableOpacity>
);

const DashboardScreen = ({ route, navigation }) => {
  const { clinicId, clinicName } = route.params;
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  const getGreeting = () => {
    if (currentHour < 12) return 'Günaydın';
    if (currentHour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  useLayoutEffect(() => {
    // Header'ı Dark Mode'a uygun hale getiriyoruz
    navigation.setOptions({ 
      title: clinicName,
      headerStyle: {
        backgroundColor: COLORS.BG_START,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
      headerTintColor: COLORS.TEXT_MAIN,
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
        letterSpacing: 0.5
      },
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
        >
          <View style={styles.headerBackIcon}>
            <Ionicons name="apps" size={20} color="#FFF" />
          </View>
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
            setPatientName("Misafir");
          }
        } catch (err) {
          setPatientName("Misafir");
        }
      }
      setLoading(false);
    };

    fetchPatientName();
  }, [navigation, clinicId, clinicName]);

  // --- NAVİGASYON FONKSİYONLARI ---
  
  // 1. Randevu Al -> Bölüm Seçimi
  const go_RandevuAl = () => navigation.navigate('DepartmentList', { clinicId, clinicName });
  
  // 2. Tedaviler -> Tedavi Listesi
  const go_Tedavilerim = () => navigation.navigate('TreatmentList'); 
  
  // 3. Reçeteler -> Reçete Listesi
  const go_Recetelerim = () => navigation.navigate('PrescriptionList', { clinicId }); 
  
  // 4. Geçmiş -> Geçmiş Randevular
  const go_GecmisRandevular = () => navigation.navigate('PastAppointments', { clinicId }); 
  
  // 🔥 DÜZELTME BURADA: Klinik Kadrosu -> ÖNCE BÖLÜMLER (DepartmentList)
  // Kullanıcı önce bölüm seçsin, sonra doktorları görsün.
  const go_Doktorlarim = () => navigation.navigate('DepartmentList', { clinicId, clinicName });

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
        <Text style={{color: COLORS.TEXT_SEC, marginTop: 10}}>Sistem Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      
      {/* 1. ZEMİN GRADIENT */}
      <LinearGradient
        colors={[COLORS.BG_START, COLORS.BG_END]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 2. DEKORATİF GLOW */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        
        {/* HERO SECTION (Selamlama & CTA) */}
        <View style={styles.heroSection}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.patientName}>{patientName}</Text>
          </View>
          
          {/* Ana CTA: Neon Gradient Buton */}
          <TouchableOpacity 
            style={styles.ctaWrapper}
            onPress={go_RandevuAl}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
              start={{x: 0, y: 0}} end={{x: 1, y: 0}}
              style={styles.ctaGradient}
            >
              <View style={styles.ctaContent}>
                <View>
                  <Text style={styles.ctaTitle}>YENİ RANDEVU</Text>
                  <Text style={styles.ctaSub}>Hemen bir uzman bulun</Text>
                </View>
                <View style={styles.ctaIconBox}>
                  <Ionicons name="calendar" size={24} color={COLORS.ACCENT_END} />
                </View>
              </View>
            </LinearGradient>
            {/* Buton Arkası Glow */}
            <View style={styles.ctaGlow} />
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS (Hızlı Erişim Küreleri) */}
        <View style={styles.quickActionsRow}>
          <QuickActionOrb
            icon="time"
            label="Geçmiş"
            color={COLORS.ACCENT_START}
            onPress={go_GecmisRandevular}
          />
          <QuickActionOrb
            icon="medical"
            label="Tedavi"
            color={COLORS.PURPLE}
            onPress={go_Tedavilerim}
          />
          <QuickActionOrb
            icon="document-text"
            label="Reçete"
            color={COLORS.WARNING}
            onPress={go_Recetelerim}
          />
          <QuickActionOrb
            icon="people"
            label="Kadro"
            color={COLORS.DANGER}
            onPress={go_Doktorlarim}
          />
        </View>

        {/* ANA MENÜ LİSTESİ */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>HİZMETLERİMİZ</Text>
          
          <DashboardButton
            title="Tedavi Protokolleri"
            subtitle="Aktif tedavilerinizi takip edin"
            icon="pulse"
            onPress={go_Tedavilerim}
          />
          
          <DashboardButton
            title="E-Reçeteler"
            subtitle="İlaç kullanım talimatları"
            icon="flask"
            onPress={go_Recetelerim}
          />
          
          <DashboardButton
            title="Randevu Geçmişi"
            subtitle="Önceki ziyaret detayları"
            icon="file-tray-full"
            onPress={go_GecmisRandevular}
          />

          <DashboardButton
            title="Klinik Kadrosu"
            subtitle="Uzmanlarımızı ve branşları inceleyin"
            icon="id-card"
            onPress={go_Doktorlarim}
          />
        </View>

      </ScrollView>
    </View>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  scrollView: { flex: 1 },

  // DEKORATİF
  glowTopRight: {
    position: 'absolute', top: -100, right: -50,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.ACCENT_START, opacity: 0.1,
    transform: [{ scale: 1.2 }]
  },
  glowBottomLeft: {
    position: 'absolute', bottom: 0, left: -50,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: COLORS.ACCENT_END, opacity: 0.1,
  },

  // HEADER CUSTOM
  headerBackButton: {
    marginLeft: 0,
    padding: 4,
  },
  headerBackIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },

  // HERO SECTION
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 16, color: COLORS.ACCENT_START, fontWeight: '600', letterSpacing: 0.5
  },
  patientName: {
    fontSize: 34, color: COLORS.TEXT_MAIN, fontWeight: '800', letterSpacing: 1,
    textShadowColor: 'rgba(0, 242, 195, 0.2)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 10
  },

  // CTA BUTTON (NEON)
  ctaWrapper: { marginTop: 24, position: 'relative' },
  ctaGradient: {
    borderRadius: 20, padding: 20, zIndex: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  ctaContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  ctaSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  ctaIconBox: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5
  },
  ctaGlow: {
    position: 'absolute', top: 10, left: 15, right: 15, bottom: -10,
    backgroundColor: COLORS.ACCENT_START, opacity: 0.3, borderRadius: 20, zIndex: 1,
    transform: [{ scaleY: 0.9 }], blurRadius: 10
  },

  // QUICK ACTIONS
  quickActionsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 20, marginBottom: 30
  },
  orbContainer: { alignItems: 'center' },
  orb: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, position: 'relative', overflow: 'hidden'
  },
  orbGlow: {
    position: 'absolute', width: 60, height: 60, borderRadius: 30, opacity: 0.2
  },
  orbLabel: {
    color: COLORS.TEXT_SEC, fontSize: 12, marginTop: 8, fontWeight: '600'
  },

  // LISTE
  sectionContainer: { paddingHorizontal: 24 },
  sectionHeader: {
    color: COLORS.TEXT_SEC, fontSize: 12, fontWeight: 'bold',
    marginBottom: 16, letterSpacing: 1.5, marginLeft: 4
  },
  
  // DASHBOARD BUTTON (GLASS CARD)
  glassCardButton: { marginBottom: 14, borderRadius: 20, overflow: 'hidden' },
  glassCardInner: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER, borderRadius: 20
  },
  cardIconBox: {
    width: 50, height: 50, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    position: 'relative'
  },
  iconGradientBg: {
    width: '100%', height: '100%', borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', opacity: 0.9
  },
  cardTextArea: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.TEXT_MAIN, letterSpacing: 0.5 },
  cardSubtitle: { fontSize: 13, color: COLORS.TEXT_SEC, marginTop: 3 },
  arrowContainer: {
    width: 32, height: 32, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center'
  },
  
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.DANGER, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.BG_START
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' }
});