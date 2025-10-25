import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList, // Liste görünümü için
  TouchableOpacity // Kartlara tıklanabilirlik için (ileride)
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // İkonlar

// Renk paletimiz
const COLORS = {
  primary: '#007bff',
  lightGray: '#f8f9fa',
  darkGray: '#6c757d',
  white: '#ffffff',
  text: '#343a40',
  textLight: '#495057'
};

// --- ŞİMDİLİK STATİK VERİ (Madde 12'ye göre) ---
// Gelecekte bu veriyi Firestore'dan çekeceğiz
const DUMMY_PRESCRIPTIONS = [
  {
    id: 'recete123',
    doctorName: 'Dr. Elif Yılmaz',
    department: 'Kardiyoloji',
    date: '2025-10-20',
    clinicName: 'RTM Sağlık',
    drugs: [
      { id: 'd1', name: 'Beloc ZOK', dosage: 'Günde 1 kez' },
      { id: 'd2', name: 'Coraspin 100mg', dosage: 'Günde 1 kez (Tok)' },
    ],
  },
  {
    id: 'recete456',
    doctorName: 'Dr. Ahmet Öztürk',
    department: 'Dahiliye',
    date: '2025-09-15',
    clinicName: 'RTM Sağlık',
    drugs: [
      { id: 'd3', name: 'Parol 500mg', dosage: 'Günde 3 kez (Ağrı oldukça)' },
    ],
  },
    {
    id: 'recete789',
    doctorName: 'Dr. Zeynep Kaya',
    department: 'Göz Hastalıkları',
    date: '2025-08-01',
    clinicName: 'Merkez Klinik',
    drugs: [
      { id: 'd4', name: 'Refresh Göz Damlası', dosage: 'Günde 4 kez' },
    ],
  },
];
// --- Statik Veri Sonu ---


/**
 * Her bir reçete kartını çizen bileşen
 */
const PrescriptionCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    {/* Kart Başlığı: Doktor ve Tarih (Madde 12) */}
    <View style={styles.cardHeader}>
      <View style={styles.iconContainer}>
        <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.headerText}>
        {/* Madde 12: Hangi doktor tarafından */}
        <Text style={styles.doctorName}>{item.doctorName}</Text>
        <Text style={styles.departmentName}>{item.department}</Text>
      </View>
      {/* Madde 12: Hangi tarihte */}
      <Text style={styles.dateText}>{item.date}</Text>
    </View>
    
    {/* İlaç Listesi */}
    <View style={styles.drugList}>
      <Text style={styles.drugListTitle}>İlaçlar:</Text>
      {item.drugs.map(drug => (
        <Text key={drug.id} style={styles.drugItem}>• {drug.name} ({drug.dosage})</Text>
      ))}
    </View>
  </TouchableOpacity>
);


const PrescriptionListScreen = ({ navigation }) => {

  // Reçeteye tıklandığında (şimdilik bir şey yapmıyor)
  const handleSelectPrescription = (prescription) => {
    // İleride reçete detay ekranı (PDF veya görüntüleme) açılabilir
    console.log("Seçilen Reçete:", prescription.id);
  };

  // Liste boşken gösterilecek bileşen
  const renderEmptyList = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="documents-outline" size={80} color={COLORS.disabled} />
      <Text style={styles.infoText}>Henüz kayıtlı bir reçeteniz bulunmuyor.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={DUMMY_PRESCRIPTIONS} // Şimdilik statik veriyi kullan
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PrescriptionCard 
              item={item} 
              onPress={() => handleSelectPrescription(item)} 
            />
          )}
          ListHeaderComponent={
            <Text style={styles.mainHeader}>Reçetelerim</Text>
          }
          ListEmptyComponent={renderEmptyList} // Liste boşsa bunu göster
          contentContainerStyle={styles.listContainer}
        />
    </SafeAreaView>
  );
};

export default PrescriptionListScreen;

// --- Stiller (UI Güzelleştirmesi) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  listContainer: {
    padding: 10,
  },
  mainHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  centerContainer: {
    flex: 1,
    paddingTop: 100, // Ekranın ortasına doğru
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: COLORS.darkGray,
    marginTop: 10,
    textAlign: 'center'
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 10,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#e6f2ff', // Primary açık tonu
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1, // Kalan alanı kapla
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  departmentName: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  drugList: {
    paddingTop: 10,
  },
  drugListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  drugItem: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginLeft: 5,
  },
});
