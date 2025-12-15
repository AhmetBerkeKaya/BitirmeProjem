import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// --- RENK PALETİ ---
const COLORS = {
  PRIMARY: '#00BFA6',
  PRIMARY_LIGHT: '#E6F8F5',
  BACKGROUND: '#F5F9FC',
  WHITE: '#FFFFFF',
  TEXT: '#2C3E50',
  TEXT_LIGHT: '#5D6D7E',
  BORDER: '#EAECEE',
  DANGER: '#e74c3c',
};

const TreatmentStepCard = ({ item, index }) => (
  <View style={styles.card}>
    <View style={styles.stepIndicator}>
      <Text style={styles.stepNumber}>{item.order || index + 1}</Text>
    </View>
    <View style={styles.stepDetails}>
      <Text style={styles.treatmentName}>{item.treatment}</Text>
      
      {/* Faz Bilgisi (Remember, Regeneration vb.) */}
      {item.phase && (
        <View style={styles.tagContainer}>
          <Text style={styles.phaseName}>{item.phase}</Text>
        </View>
      )}
      
      {/* Dozaj Bilgisi */}
      {item.dosage ? (
        <Text style={styles.dosageText}>Dozaj: <Text style={{fontWeight:'bold'}}>{item.dosage}</Text></Text>
      ) : null}

      {/* Açıklama Varsa */}
      {item.description ? (
        <Text style={styles.descriptionText}>{item.description}</Text>
      ) : null}
    </View>
  </View>
);

const TreatmentListScreen = ({ navigation }) => {
  const [treatmentSequence, setTreatmentSequence] = useState([]);
  const [protocolName, setProtocolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Header Ayarı
    navigation.setOptions({
      title: 'Tedavi Planım',
      headerStyle: { backgroundColor: COLORS.PRIMARY, elevation: 0, shadowOpacity: 0 },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: { fontWeight: '700', fontSize: 18 },
    });

    const fetchTreatment = async () => {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError("Kullanıcı bulunamadı.");
        setLoading(false);
        return;
      }

      try {
        const patientRef = doc(db, 'patients', user.uid);
        const patientSnap = await getDoc(patientRef);

        if (patientSnap.exists()) {
          const data = patientSnap.data();

          // 🔥 ÖNCELİK: selectedProtocol, YOKSA customizedProtocol
          const protocol = data.selectedProtocol || data.customizedProtocol;
          
          if (protocol && protocol.treatmentSequence) {
            setProtocolName(protocol.name || 'Tedavi Protokolü');
            
            // Sıralama (order'a göre)
            const sequence = protocol.treatmentSequence.sort((a, b) => (a.order || 0) - (b.order || 0));
            setTreatmentSequence(sequence);
          } else {
            setError("Aktif bir tedavi protokolünüz bulunmamaktadır.");
          }
        } else {
          setError("Hasta kaydı bulunamadı.");
        }
      } catch (err) {
        console.error("Hata:", err);
        setError("Veriler yüklenirken sorun oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchTreatment();
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={treatmentSequence}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => <TreatmentStepCard item={item} index={index} />}
        ListHeaderComponent={
          protocolName ? <Text style={styles.mainHeader}>{protocolName}</Text> : null
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
             <Ionicons name="document-text-outline" size={60} color="#CCC" />
             <Text style={styles.infoText}>{error || "Liste Boş"}</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

export default TreatmentListScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  listContainer: { padding: 15, flexGrow: 1 },
  mainHeader: { fontSize: 20, fontWeight: 'bold', color: COLORS.TEXT, marginBottom: 15, textAlign:'center', marginTop:5 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  infoText: { fontSize: 16, color: COLORS.TEXT_LIGHT, marginTop: 10, textAlign:'center' },
  
  card: {
    backgroundColor: COLORS.WHITE, borderRadius: 16, padding: 15, marginBottom: 12,
    flexDirection: 'row', alignItems: 'flex-start',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  stepIndicator: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2
  },
  stepNumber: { fontSize: 16, fontWeight: 'bold', color: COLORS.PRIMARY },
  stepDetails: { flex: 1 },
  treatmentName: { fontSize: 16, fontWeight: 'bold', color: COLORS.TEXT, marginBottom: 4 },
  tagContainer: { alignSelf:'flex-start', backgroundColor:'#FFF3E0', borderRadius:4, paddingHorizontal:6, paddingVertical:2, marginBottom:4 },
  phaseName: { fontSize: 12, color: '#F57C00', fontWeight: '600' },
  dosageText: { fontSize: 14, color: COLORS.TEXT_LIGHT, marginBottom: 2 },
  descriptionText: { fontSize: 13, color: '#95A5A6', fontStyle: 'italic', marginTop: 4, lineHeight:18 },
});