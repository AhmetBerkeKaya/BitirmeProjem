import React, { useLayoutEffect } from 'react'; // useLayoutEffect ekleyin
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList, // Liste görünümü için
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // İkonlar

// --- YENİ RENK PALETİ ---
const COLORS = {
  PRIMARY: '#00BFA6',     // Turkuaz (Ana renk)
  PRIMARY_LIGHT: '#E6F8F5', // Turkuaz'ın çok açık tonu
  BACKGROUND: '#F5F9FC', // Çok hafif soğuk gri
  WHITE: '#FFFFFF',        // Kart Arkaplanı
  TEXT: '#2C3E50',         // Koyu Metin Rengi
  TEXT_LIGHT: '#5D6D7E',  // Açık Metin Rengi
  BORDER: '#EAECEE',      // Kenarlık Rengi
};

// --- ŞİMDİLİK STATİK VERİ (Madde 12'ye göre) ---
// (Mimaride 'prescriptions' koleksiyonu tanımlanmadığı için statik)
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
 * (YENİ KART TASARIMI)
 */
const PrescriptionCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    {/* Kart Başlığı: Doktor ve Tarih (Madde 12) */}
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconContainer, { backgroundColor: COLORS.PRIMARY_LIGHT }]}>
        <Ionicons name="document-text-outline" size={28} color={COLORS.PRIMARY} />
      </View>
      <View style={styles.cardTextContainer}>
        {/* Madde 12: Hangi doktor tarafından */}
        <Text style={styles.cardTitle}>{item.doctorName}</Text>
        <Text style={styles.cardSubtitle}>{item.department}</Text>
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

  // Header stilini ayarlamak için useLayoutEffect ekleyin:
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Reçetelerim',
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
  }, [navigation]);
  // Reçeteye tıklandığında (şimdilik bir şey yapmıyor)
  const handleSelectPrescription = (prescription) => {
    // İleride reçete detay ekranı (PDF veya görüntüleme) açılabilir
    console.log("Seçilen Reçete:", prescription.id);
  };

  // Liste boşken gösterilecek bileşen
  const renderEmptyList = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="documents-outline" size={80} color={COLORS.BORDER} />
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

// --- YENİ UI/UX STİLLERİ ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  listContainer: {
    padding: 15,
    flexGrow: 1, // Boş liste bileşeninin ortalanması için
  },
  mainHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  centerContainer: { // Boş Liste için
    flex: 1,
    paddingTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: { // Boş liste mesajı
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    marginTop: 15,
    textAlign: 'center'
  },
  card: { // Reçete Kartı
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 15,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#95A5A6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    paddingBottom: 10,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: { // Doktor Adı
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.TEXT,
  },
  cardSubtitle: { // Departman
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
  },
  dateText: { // Tarih
    fontSize: 13,
    color: COLORS.TEXT_LIGHT,
    fontWeight: '500',
  },
  drugList: { // İlaç listesi alanı
    paddingTop: 10,
  },
  drugListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 5,
  },
  drugItem: {
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
    lineHeight: 20,
    marginLeft: 5,
  },
});