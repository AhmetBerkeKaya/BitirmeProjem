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
  
  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',
  
  GLASS_BG: 'rgba(30, 41, 59, 0.6)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
  
  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  
  ORANGE_GLOW: '#F59E0B',
  LINE_COLOR: 'rgba(0, 242, 195, 0.3)'
};

const TreatmentStepCard = ({ item, index, isLast }) => (
  <View style={styles.stepRow}>
    {/* SOL: TIMELINE (Zaman Çizelgesi) */}
    <View style={styles.timelineContainer}>
      <View style={styles.lineTop} />
      <View style={styles.nodeGlow}>
        <LinearGradient
          colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
          style={styles.nodeCircle}
        >
          <Text style={styles.stepIndex}>{item.order || index + 1}</Text>
        </LinearGradient>
      </View>
      {!isLast && <View style={styles.lineBottom} />}
    </View>

    {/* SAĞ: CAM KART (İçerik) */}
    <LinearGradient
      colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.4)']}
      style={styles.glassCard}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.treatmentTitle}>{item.treatment}</Text>
        {item.phase && (
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseText}>{item.phase}</Text>
          </View>
        )}
      </View>

      {item.dosage && (
        <View style={styles.infoRow}>
          <Ionicons name="medkit-outline" size={14} color={COLORS.ACCENT_START} />
          <Text style={styles.infoText}>Dozaj: <Text style={styles.boldText}>{item.dosage}</Text></Text>
        </View>
      )}

      {item.description && (
        <View style={styles.descContainer}>
          <View style={styles.descLine} />
          <Text style={styles.descText}>{item.description}</Text>
        </View>
      )}
    </LinearGradient>
  </View>
);

const TreatmentListScreen = ({ navigation }) => {
  const [treatmentSequence, setTreatmentSequence] = useState([]);
  const [protocolName, setProtocolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'TEDAVİ PLANIM',
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
    const fetchTreatment = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) { setError("Giriş yapılmalı."); setLoading(false); return; }

      try {
        const patientRef = doc(db, 'patients', user.uid);
        const patientSnap = await getDoc(patientRef);

        if (patientSnap.exists()) {
          const data = patientSnap.data();
          const protocol = data.selectedProtocol || data.customizedProtocol;
          
          if (protocol && protocol.treatmentSequence) {
            setProtocolName(protocol.name || 'Özel Protokol');
            const sequence = protocol.treatmentSequence.sort((a, b) => (a.order || 0) - (b.order || 0));
            setTreatmentSequence(sequence);
          } else {
            setError("Aktif protokol bulunamadı.");
          }
        }
      } catch (err) {
        setError("Veri hatası.");
      } finally {
        setLoading(false);
      }
    };
    fetchTreatment();
  }, []);

  if (loading) return (
    <View style={styles.centerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      
      {/* Dekoratif Glow */}
      <View style={styles.glowTop} />

      <FlatList
        data={treatmentSequence}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <TreatmentStepCard 
            item={item} 
            index={index} 
            isLast={index === treatmentSequence.length - 1} 
          />
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.headerLabel}>AKTİF PROTOKOL</Text>
            <Text style={styles.protocolTitle}>{protocolName}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={50} color={COLORS.TEXT_SEC} />
            <Text style={styles.emptyText}>{error || "Liste Boş"}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default TreatmentListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BG_START },
  
  glowTop: {
    position: 'absolute', top: -100, left: 50, right: 50, height: 200,
    backgroundColor: COLORS.ACCENT_START, opacity: 0.15, borderRadius: 100, transform: [{ scaleX: 2 }]
  },

  listContent: { padding: 20, paddingBottom: 40 },
  
  listHeader: { marginBottom: 30, alignItems: 'center' },
  headerLabel: { color: COLORS.ACCENT_START, fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 5 },
  protocolTitle: { color: COLORS.TEXT_MAIN, fontSize: 24, fontWeight: '800', textAlign: 'center', textShadowColor: COLORS.ACCENT_START, textShadowRadius: 10 },

  // TIMELINE CARD YAPISI
  stepRow: { flexDirection: 'row', marginBottom: 0 },
  
  timelineContainer: { width: 50, alignItems: 'center' },
  lineTop: { width: 2, height: 20, backgroundColor: COLORS.LINE_COLOR },
  lineBottom: { width: 2, flex: 1, backgroundColor: COLORS.LINE_COLOR },
  nodeGlow: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0, 242, 195, 0.2)',
    justifyContent: 'center', alignItems: 'center'
  },
  nodeCircle: {
    width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center'
  },
  stepIndex: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  // CAM KART
  glassCard: {
    flex: 1, marginBottom: 20, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.GLASS_BORDER, marginLeft: 10
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  treatmentTitle: { color: COLORS.TEXT_MAIN, fontSize: 16, fontWeight: '700', flex: 1, marginRight: 10 },
  
  phaseBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.5)'
  },
  phaseText: { color: COLORS.ORANGE_GLOW, fontSize: 10, fontWeight: 'bold' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { color: COLORS.TEXT_SEC, fontSize: 14, marginLeft: 6 },
  boldText: { color: COLORS.TEXT_MAIN, fontWeight: '600' },

  descContainer: { marginTop: 8, flexDirection: 'row' },
  descLine: { width: 2, backgroundColor: COLORS.ACCENT_END, marginRight: 10, borderRadius: 2 },
  descText: { color: COLORS.TEXT_SEC, fontSize: 12, fontStyle: 'italic', flex: 1, lineHeight: 18 },

  emptyBox: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: COLORS.TEXT_SEC, marginTop: 10 }
});