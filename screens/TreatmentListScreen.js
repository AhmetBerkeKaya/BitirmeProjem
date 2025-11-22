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
import { db, auth } from '../firebaseConfig'; // Sıfırdan kurduğumuz config
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
  DANGER: '#e74c3c',      // Hata Rengi
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
    // Header başlığını ayarla (App.js'ten gelen global stile uyar)
    navigation.setOptions({
      title: protocolName || 'Tedavi Protokolüm',
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
            setTreatmentSequence([]);
            setProtocolName('');
            navigation.setOptions({
              title: name,
            }); 
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
        setTreatmentSequence([]);
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
      <Ionicons name="clipboard-outline" size={80} color={COLORS.BORDER} />
      {/* Hata varsa hatayı (kırmızı), yoksa standart mesajı (gri) göster */}
      <Text style={error && treatmentSequence.length === 0 ? styles.errorText : styles.infoText}>
        {error || "Size atanmış bir tedavi protokolü bulunmuyor."}
      </Text>
    </View>
  );

  // Yükleniyor...
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
        data={treatmentSequence} // Firestore'dan çekilen (ve sıralanan) tedavi adımları
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

// --- YENİ UI/UX STİLLERİ ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  listContainer: {
    padding: 15,
    flexGrow: 1, // Boş liste bileşeninin ortalanması için gerekli
  },
  mainHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 15,
    textAlign: 'center',
  },
  centerContainer: { // Yükleme ve Boş Liste için
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
  errorText: { // Hata mesajı
    fontSize: 16,
    color: COLORS.DANGER,
    marginTop: 15,
    textAlign: 'center'
  },
  card: { // Her bir tedavi adımı kartı
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 15,
    marginVertical: 8,
    flexDirection: 'row', // İkon ve metin yan yana
    alignItems: 'flex-start', // Üste hizala
    elevation: 3,
    shadowColor: '#95A5A6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  stepIndicator: { // Sıra numarası çemberi
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY_LIGHT, // Açık turkuaz arkaplan
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 5,
  },
  stepNumber: { // Sıra numarası metni
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  stepDetails: { // Tedavi adı, faz, dozaj alanı
    flex: 1, // Kalan tüm alanı kapla
  },
  treatmentName: { // Tedavi adı metni
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  phaseName: { // Faz adı metni
    fontSize: 14,
    color: COLORS.PRIMARY, // Vurgulu renk
    fontWeight: '500',
    marginBottom: 4,
  },
  dosageText: { // Dozaj metni
    fontSize: 14,
    color: COLORS.TEXT_LIGHT,
    marginBottom: 4,
  },
  descriptionText: { // Açıklama metni
    fontSize: 13,
    color: COLORS.TEXT_LIGHT,
    fontStyle: 'italic', // Eğik yazı
    lineHeight: 18,
    marginTop: 5,
  },
});