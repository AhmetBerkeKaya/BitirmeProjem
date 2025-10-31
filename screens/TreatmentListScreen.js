import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList, // Liste için
  ActivityIndicator // Yükleniyor göstergesi
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore'; // Tek doküman çekmek için
import { db, auth } from '../firebaseConfig'; // Config dosyamız
import { Ionicons } from '@expo/vector-icons'; // İkonlar

// Renk paletimiz
const COLORS = {
  primary: '#007bff',
  lightGray: '#f8f9fa',
  darkGray: '#6c757d',
  white: '#ffffff',
  text: '#343a40',
  textLight: '#495057',
  success: '#28a745',
  warning: '#ffc107',
  disabled: '#e9ecef', // Boş liste ikonu için
};

/**
 * Her bir tedavi adımını gösteren kart bileşeni
 */
const TreatmentStepCard = ({ item, index }) => (
  <View style={styles.card}>
    {/* Sıra Numarası */}
    <View style={styles.stepIndicator}>
      {/* Gönderdiğiniz örnekte 'order' alanı var, onu kullanalım */}
      <Text style={styles.stepNumber}>{item.order || index + 1}</Text>
    </View>
    {/* Tedavi Detayları */}
    <View style={styles.stepDetails}>
      {/* 'treatment' alanı */}
      <Text style={styles.treatmentName}>{item.treatment}</Text>
      {/* 'phase' alanı (varsa) */}
      {item.phase && <Text style={styles.phaseName}>Faz: {item.phase}</Text>}
      {/* 'dosage' alanı (varsa) */}
      {item.dosage && <Text style={styles.dosageText}>Dozaj: {item.dosage}</Text>}
      {/* 'description' alanı (varsa) */}
      {item.description && <Text style={styles.descriptionText}>{item.description}</Text>}
    </View>
  </View>
);

const TreatmentListScreen = ({ navigation }) => {
  const [treatmentSequence, setTreatmentSequence] = useState([]); // Tedavi adımları listesi
  const [protocolName, setProtocolName] = useState(''); // Protokolün adı
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Tedavilerim' }); // Header başlığını ayarla

    const fetchTreatment = async () => {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) {
        setError("Kullanıcı bulunamadı.");
        setLoading(false);
        return;
      }

      try {
        // 1. 'patients' (Kaynak 15) koleksiyonundan hastanın dokümanını ID ile çek
        const patientRef = doc(db, 'patients', user.uid);
        const patientSnap = await getDoc(patientRef);

        if (patientSnap.exists()) {
          const patientData = patientSnap.data();

          // 2. Hasta verisinden 'customizedProtocol' objesini al
          //    (Veri yapısı karmaşık olduğu için ?. operatörü ile güvenli erişim yapalım)
          const protocol = patientData?.customizedProtocol; // Tüm protokol objesi
          const sequence = protocol?.treatmentSequence; // Protokol içindeki sequence dizisi

          // 3. 'treatmentSequence' geçerli bir dizi mi diye kontrol et
          if (protocol && Array.isArray(sequence)) {
             // Sıralama: Dizi içindeki 'order' alanına göre küçükten büyüğe sırala
             const sortedSequence = sequence.sort((a, b) => (a.order || 0) - (b.order || 0));
             setTreatmentSequence(sortedSequence);
             // Protokol adını da alalım (varsa)
             setProtocolName(protocol.name || 'Özel Tedavi Protokolü');
          } else {
             // Eğer protocol veya sequence yoksa veya dizi değilse, boş liste ata
             console.log("Tedavi protokolü veya sequence bulunamadı/geçersiz:", protocol);
             setTreatmentSequence([]);
             setProtocolName('');
             // Hata yerine bilgi mesajı gösterebiliriz
             setError("Size atanmış bir tedavi protokolü bulunmuyor.");
          }
        } else {
          setError("Hasta kaydı bulunamadı.");
          setTreatmentSequence([]);
          setProtocolName('');
        }
      } catch (err) {
        console.error("Tedavi çekilirken hata:", err);
        setError("Tedaviler yüklenirken bir hata oluştu.");
        setTreatmentSequence([]); // Hata durumunda listeyi boşalt
        setProtocolName('');
      } finally {
        setLoading(false);
      }
    };
    fetchTreatment();
  }, [navigation]); // navigation bağımlılığı setOptions için eklendi

  // Liste boşken veya hata varken gösterilecek bileşen
  const renderEmptyList = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="clipboard-outline" size={80} color={COLORS.disabled} />
      {/* Hata varsa hatayı, yoksa standart mesajı göster */}
      <Text style={styles.infoText}>{error || "Size atanmış bir tedavi protokolü bulunmuyor."}</Text>
    </View>
  );

  // Yükleniyor...
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={treatmentSequence} // Firestore'dan çekilen (ve sıralanan) tedavi adımları
        // Her adım için benzersiz bir anahtar (key) oluştur
        keyExtractor={(item, index) => item.id || `treatment-${index}-${item.order}`}
        renderItem={({ item, index }) => <TreatmentStepCard item={item} index={index} />}
        ListHeaderComponent={
          // Protokol adı varsa başlık olarak göster
          protocolName ? <Text style={styles.mainHeader}>{protocolName}</Text> : null
        }
        ListEmptyComponent={renderEmptyList} // Liste boşsa veya hata varsa bunu göster
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

export default TreatmentListScreen;

// --- Stiller ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  listContainer: {
    padding: 10,
    flexGrow: 1, // Boş liste bileşeninin ortalanması için gerekli
  },
  mainHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 15,
    textAlign: 'center',
  },
  centerContainer: { // Yükleme ve Boş Liste için
    flex: 1,
    paddingTop: 50, // Biraz aşağıda başlasın
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: { // Boş liste mesajı
    fontSize: 16,
    color: COLORS.darkGray,
    marginTop: 10,
    textAlign: 'center'
  },
  errorText: { // Hata mesajı (Boş listeyle aynı yerde görünebilir)
    fontSize: 16,
    color: COLORS.danger,
    marginTop: 10,
    textAlign: 'center'
  },
  card: { // Her bir tedavi adımı kartı
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 5,
    flexDirection: 'row', // İkon ve metin yan yana
    alignItems: 'flex-start', // Üste hizala
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepIndicator: { // Sıra numarası çemberi
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20', // Açık mavi arkaplan
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 5, // Metinle daha iyi hizalanması için
  },
  stepNumber: { // Sıra numarası metni
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  stepDetails: { // Tedavi adı, faz, dozaj alanı
    flex: 1, // Kalan tüm alanı kapla
  },
  treatmentName: { // Tedavi adı metni
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  phaseName: { // Faz adı metni
    fontSize: 14,
    color: COLORS.primary, // Vurgulu renk
    fontWeight: '500',
    marginBottom: 4,
  },
  dosageText: { // Dozaj metni
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  descriptionText: { // Açıklama metni
    fontSize: 13,
    color: COLORS.darkGray,
    fontStyle: 'italic', // Eğik yazı
    marginTop: 5,
  },
});