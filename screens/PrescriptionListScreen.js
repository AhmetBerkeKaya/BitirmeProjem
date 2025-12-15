import React, { useState, useEffect, useLayoutEffect } from 'react';
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

const COLORS = {
  PRIMARY: '#00BFA6',
  PRIMARY_LIGHT: '#E6F8F5',
  BACKGROUND: '#F5F9FC',
  WHITE: '#FFFFFF',
  TEXT: '#2C3E50',
  TEXT_LIGHT: '#5D6D7E',
  BORDER: '#EAECEE',
};

// Kart Bileşeni
const PharmacySaleCard = ({ saleDate, items, doctorName }) => (
  <View style={styles.card}>
    {/* Kart Başlığı */}
    <View style={styles.cardHeader}>
      <View style={styles.cardIconContainer}>
        <Ionicons name="medkit-outline" size={24} color={COLORS.PRIMARY} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>Eczane / İlaç Satışı</Text>
        <Text style={styles.cardSubtitle}>Dr. {doctorName}</Text>
      </View>
      <Text style={styles.dateText}>{saleDate}</Text>
    </View>

    {/* İlaç Listesi */}
    <View style={styles.drugList}>
      <Text style={styles.drugListTitle}>Verilen İlaçlar:</Text>
      {items.map((drug, index) => (
        <View key={index} style={styles.drugRow}>
          <Ionicons name="ellipse" size={6} color={COLORS.PRIMARY} style={{marginTop:6, marginRight:6}} />
          <View>
             <Text style={styles.drugName}>{drug.name}</Text>
             <Text style={styles.drugDosage}>Dozaj: {drug.dosage} {drug.type ? `(${drug.type})` : ''}</Text>
          </View>
        </View>
      ))}
    </View>
  </View>
);

const PrescriptionListScreen = ({ navigation }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'İlaçlarım & Reçeteler',
      headerStyle: { backgroundColor: COLORS.PRIMARY, elevation: 0, shadowOpacity: 0 },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: { fontWeight: '700', fontSize: 18 },
    });
  }, [navigation]);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const docRef = doc(db, 'patients', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.pharmacySoldItems || [];
          
          if (items.length > 0) {
            // Veritabanında tek bir liste var, bunu bir "Satış İşlemi" olarak grupluyoruz.
            // Eğer ileride birden fazla satış olursa, 'pharmacySaleDate' e göre gruplamak gerekir.
            // Şu anki yapıda tek bir satış tarihi var.
            
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
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <View style={styles.centerContainer}>
            <Ionicons name="cube-outline" size={60} color="#CCC" />
            <Text style={styles.infoText}>Henüz kayıtlı bir ilaç satışı bulunmuyor.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

export default PrescriptionListScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  listContainer: { padding: 15, flexGrow: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop:50 },
  infoText: { fontSize: 16, color: COLORS.TEXT_LIGHT, marginTop: 15, textAlign: 'center' },
  
  card: {
    backgroundColor: COLORS.WHITE, borderRadius: 16, padding: 15, marginBottom: 15,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.BORDER, paddingBottom: 10, marginBottom:10
  },
  cardIconContainer: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.TEXT },
  cardSubtitle: { fontSize: 13, color: COLORS.TEXT_LIGHT },
  dateText: { fontSize: 12, color: COLORS.TEXT_LIGHT, fontWeight: '500' },
  
  drugList: { paddingLeft: 5 },
  drugListTitle: { fontSize: 14, fontWeight: '600', color: COLORS.TEXT, marginBottom: 8 },
  drugRow: { flexDirection:'row', marginBottom: 8 },
  drugName: { fontSize: 14, color: COLORS.TEXT, fontWeight:'500' },
  drugDosage: { fontSize: 12, color: COLORS.TEXT_LIGHT },
});