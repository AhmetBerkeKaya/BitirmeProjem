import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// --- FUTURE HEALTH PALETİ ---
const COLORS = {
  BG_START: '#0F172A',
  BG_END: '#1E293B',
  
  GLASS_BG: 'rgba(30, 41, 59, 0.6)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
  
  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',
  
  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  
  WARNING: '#F59E0B',  // İlaç uyarısı rengi
  PURPLE: '#8B5CF6'    // Reçete ikonu için
};

// Modern Cam Kart (Reçete Kartı)
const PharmacySaleCard = ({ saleDate, items, doctorName }) => (
  <LinearGradient
    colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.4)']}
    style={styles.glassCard}
  >
    {/* Kart Başlığı */}
    <View style={styles.cardHeader}>
      <View style={styles.iconBox}>
        <LinearGradient
          colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
          style={styles.iconGradient}
        >
          <Ionicons name="medkit" size={20} color="#FFF" />
        </LinearGradient>
      </View>
      
      <View style={styles.headerText}>
        <Text style={styles.cardTitle}>ECZANE SATIŞI</Text>
        <Text style={styles.cardSubtitle}>Dr. {doctorName}</Text>
      </View>
      
      <View style={styles.dateBadge}>
        <Ionicons name="calendar-outline" size={12} color={COLORS.TEXT_SEC} style={{marginRight:4}} />
        <Text style={styles.dateText}>{saleDate}</Text>
      </View>
    </View>

    <View style={styles.divider} />

    {/* İlaç Listesi */}
    <View style={styles.drugList}>
      <Text style={styles.listLabel}>İLAÇLAR & TAKVİYELER</Text>
      {items.map((drug, index) => (
        <View key={index} style={styles.drugRow}>
          {/* Neon Nokta */}
          <View style={styles.neonDot} />
          
          <View style={{flex: 1}}>
             <Text style={styles.drugName}>{drug.name}</Text>
             <Text style={styles.drugDetail}>
               {drug.dosage} {drug.type ? `• ${drug.type}` : ''}
             </Text>
          </View>
        </View>
      ))}
    </View>
  </LinearGradient>
);

const PrescriptionListScreen = ({ navigation }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'REÇETELERİM',
      headerStyle: { backgroundColor: COLORS.BG_START, shadowOpacity: 0, elevation: 0 },
      headerTintColor: COLORS.TEXT_MAIN,
      headerTitleStyle: { fontWeight: '800', letterSpacing: 1 },
      headerLeft: () => (
        <Ionicons 
          name="arrow-back" size={24} color={COLORS.TEXT_MAIN} 
          style={{marginLeft: 15}} onPress={() => navigation.goBack()} 
        />
      )
    });
  }, [navigation]);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }

      try {
        const docRef = doc(db, 'patients', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.pharmacySoldItems || [];
          
          if (items.length > 0) {
            // Veritabanında tek liste var, bunu bir satış işlemi gibi gösteriyoruz
            const saleDate = data.pharmacySaleDate 
                ? new Date(data.pharmacySaleDate).toLocaleDateString('tr-TR') 
                : 'Tarih Yok';

            const saleObject = {
                id: 'unique_sale_1',
                date: saleDate,
                doctorName: data.assignedDoctorName || 'Belirtilmemiş',
                drugs: items
            };
            setPrescriptions([saleObject]);
          } else {
            setPrescriptions([]);
          }
        }
      } catch (error) {
        console.error("Hata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
        <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      
      {/* Arkaplan Gradient */}
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      
      {/* Dekoratif Glow */}
      <View style={styles.glowBlob} />

      <FlatList
        data={prescriptions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PharmacySaleCard 
            saleDate={item.date} 
            items={item.drugs} 
            doctorName={item.doctorName} 
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="cube-outline" size={50} color={COLORS.TEXT_SEC} />
            </View>
            <Text style={styles.infoText}>Henüz ilaç kaydı bulunmuyor.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

export default PrescriptionListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BG_START },
  listContainer: { padding: 20 },

  // Dekoratif
  glowBlob: {
    position: 'absolute', top: 50, right: -50, width: 200, height: 200,
    borderRadius: 100, backgroundColor: COLORS.PURPLE, opacity: 0.15, blurRadius: 50
  },

  // Cam Kart
  glassCard: {
    borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER,
    shadowColor: COLORS.ACCENT_START, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10
  },
  
  // Header
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 44, height: 44, borderRadius: 14, marginRight: 12,
    shadowColor: COLORS.ACCENT_START, shadowOpacity: 0.3, shadowRadius: 8
  },
  iconGradient: { flex: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1 },
  cardTitle: { color: COLORS.TEXT_MAIN, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  cardSubtitle: { color: COLORS.TEXT_SEC, fontSize: 13, marginTop: 2 },
  
  dateBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.GLASS_BORDER 
  },
  dateText: { color: COLORS.TEXT_SEC, fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: COLORS.GLASS_BORDER, marginVertical: 15 },

  // İlaç Listesi
  drugList: { paddingLeft: 4 },
  listLabel: { color: COLORS.ACCENT_START, fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  
  drugRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  neonDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.WARNING,
    marginTop: 6, marginRight: 12,
    shadowColor: COLORS.WARNING, shadowOpacity: 0.8, shadowRadius: 6
  },
  drugName: { color: COLORS.TEXT_MAIN, fontSize: 15, fontWeight: '600' },
  drugDetail: { color: COLORS.TEXT_SEC, fontSize: 13, marginTop: 2 },

  // Boş Durum
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIconBox: { 
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER
  },
  infoText: { fontSize: 15, color: COLORS.TEXT_SEC, textAlign: 'center' },
});