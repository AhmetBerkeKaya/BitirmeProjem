import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- FIREBASE BAĞLANTILARI EKLENDİ ---
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; // firebaseConfig yolun doğru olsun (../ ile çıkıyoruz)

// Mesaj Baloncuğu (Değişmedi)
const MessageBubble = ({ text, isUser, options, onOptionPress }) => (
  <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginVertical: 5 }}>
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
      <Text style={isUser ? styles.userText : styles.botText}>{text}</Text>
    </View>
    {!isUser && options && (
      <View style={styles.optionsContainer}>
        {options.map((opt, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.optionButton}
            onPress={() => onOptionPress(opt)}
          >
            <Text style={styles.optionText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

export default function ChatWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false); // Bot yazıyor efekti için
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([
    { 
      id: '1', 
      text: 'Merhaba! Ben Asistan. Size nasıl yardımcı olabilirim?', 
      isUser: false,
      options: [
        { label: '📅 Randevularım', value: 'randevu_menu' },
        { label: '💊 Reçetelerim', value: 'receteler' },
        { label: '🏥 İletişim', value: 'iletisim' }
      ]
    }
  ]);

  // Mesaj Ekleme Yardımcısı
  const addMessage = (text, isUser, options = null) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      isUser,
      options
    }]);
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;
    addMessage(text, true); // Kullanıcı mesajını ekle
    setInputText('');
    setIsTyping(true); // Bot düşünüyor...

    // Bot cevabını tetikle
    setTimeout(() => {
      handleBotResponse(text);
    }, 500); // Biraz doğal gecikme
  };

  // --- 🧠 BOTUN BEYNİ VE FIREBASE MANTIĞI ---
  const handleBotResponse = async (userText) => {
    const lowerText = userText.toLowerCase();
    setIsTyping(false); // Düşünme bitti

    // 1. RANDEVU MENÜSÜ SEÇİLDİYSE
    if (lowerText.includes('randevu_menu') || (lowerText.includes('randevu') && !lowerText.includes('geçmiş'))) {
      addMessage('Randevu işlemleriniz için ne yapmak istersiniz?', false, [
        { label: '📅 Yeni Randevu Al', value: 'yeni_randevu' },
        { label: '🕒 Geçmiş Randevular', value: 'gecmis_randevu' } // Value'ya dikkat
      ]);
      return;
    }

    // 2. GEÇMİŞ RANDEVULAR SEÇİLDİYSE (FIREBASE SORGUSU)
    if (lowerText.includes('gecmis_randevu') || lowerText.includes('geçmiş randevu')) {
      await fetchPastAppointments();
      return;
    }

    // 3. DİĞER DURUMLAR (Placeholder)
    if (lowerText.includes('receteler')) {
      addMessage('Reçeteleriniz "Reçetelerim" sayfasında listelenmektedir. Oraya gitmek ister misiniz?', false);
    } else if (lowerText.includes('iletisim')) {
      addMessage('Klinik iletişim bilgilerimiz: 0212 555 55 55. Hafta içi 09:00 - 18:00 hizmet veriyoruz.', false);
    } else {
      addMessage('Bunu tam anlayamadım. Lütfen aşağıdaki seçeneklerden birini deneyin.', false, [
        { label: '📅 Randevularım', value: 'randevu_menu' },
        { label: '💊 Reçetelerim', value: 'receteler' },
      ]);
    }
  };

  // --- 🔥 FIREBASE: GEÇMİŞ RANDEVULARI ÇEKME FONKSİYONU ---
  const fetchPastAppointments = async () => {
    // 1. Kullanıcı giriş yapmış mı?
    const user = auth.currentUser;
    if (!user) {
      addMessage('Randevularınızı görmek için önce giriş yapmalısınız.', false);
      return;
    }

    addMessage('Randevularınız kontrol ediliyor, lütfen bekleyin...', false);

    try {
      // 2. Email üzerinden "patients" tablosundan hasta ID'sini bul
      // (Çünkü randevular email ile değil patientId ile kayıtlı olabilir)
      const patientsRef = collection(db, 'patients');
      const qPatient = query(patientsRef, where('email', '==', user.email));
      const patientSnapshot = await getDocs(qPatient);

      if (patientSnapshot.empty) {
        addMessage('Sistemde kayıtlı hasta profiliniz bulunamadı.', false);
        return;
      }

      const patientId = patientSnapshot.docs[0].id; // Hastanın asıl ID'si
      
      // 3. Bu ID ile "appointments" tablosunu sorgula
      const appointmentsRef = collection(db, 'appointments');
      const qApp = query(
        appointmentsRef, 
        where('patientId', '==', patientId),
        // orderBy('dateISO', 'desc') // İstersen tarihe göre sırala (Index hatası verirse bunu kapat)
        limit(5) // Son 5 randevu
      );

      const appSnapshot = await getDocs(qApp);

      if (appSnapshot.empty) {
        addMessage('Geçmişe ait kayıtlı bir randevunuz bulunmamaktadır.', false);
      } else {
        // Randevuları tek tek listele
        let responseText = '📋 İşte son randevularınız:\n';
        appSnapshot.forEach(doc => {
          const data = doc.data();
          // Tarihi düzgün formatla (Basit string işlemi)
          const dateStr = data.dateISO ? data.dateISO.split('T')[0] : 'Tarih Yok';
          const timeStr = data.start || '';
          const status = data.status === 'completed' ? '✅ Tamamlandı' : '⏳ Bekliyor';
          
          responseText += `\n📅 ${dateStr} ${timeStr}\nDurum: ${status}\n----------------`;
        });
        
        addMessage(responseText, false);
      }

    } catch (error) {
      console.error("Chat Error:", error);
      addMessage('Veriler çekilirken bir hata oluştu. Lütfen internetinizi kontrol edin.', false);
    }
  };

  const handleOptionPress = (option) => {
    // Butona basınca sanki kullanıcı yazmış gibi işlem yap
    // Value'yu gönderiyoruz ki handleBotResponse içindeki logic çalışsın
    sendMessage(option.value); 
  };

  useEffect(() => {
    if(flatListRef.current) {
        setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  return (
    <>
      {!isVisible && (
        <View style={styles.floatingContainer}>
           <View style={styles.helpBubble}>
            <Text style={styles.helpText}>Nasıl yardımcı olabilirim?</Text>
          </View>
          <TouchableOpacity style={styles.fab} onPress={() => setIsVisible(true)} activeOpacity={0.8}>
             <Ionicons name="chatbubble-ellipses-outline" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsVisible(false)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Asistan</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={30} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble text={item.text} isUser={item.isUser} options={item.options} onOptionPress={handleOptionPress} />
            )}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            ListFooterComponent={isTyping ? <Text style={{marginLeft: 20, color: '#999', fontStyle: 'italic'}}>Yazıyor...</Text> : null}
          />

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Mesaj yazın..."
                value={inputText}
                onChangeText={setInputText}
              />
              <TouchableOpacity onPress={() => sendMessage(inputText)} style={styles.sendButton}>
                <Ionicons name="send" size={24} color="#00BFA6" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FC' },
  floatingContainer: { position: 'absolute', bottom: 40, right: 20, alignItems: 'flex-end', zIndex: 9999, elevation: 10 },
  helpBubble: { backgroundColor: 'white', padding: 8, borderRadius: 8, marginBottom: 5, marginRight: 5, elevation: 5, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.2 },
  helpText: { fontSize: 12, color: '#333' },
  fab: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#00BFA6', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderColor: '#EEE', backgroundColor: '#FFF', marginTop: Platform.OS === 'android' ? 20 : 0 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  bubble: { padding: 12, borderRadius: 15, maxWidth: '80%' },
  userBubble: { backgroundColor: '#00BFA6', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  botBubble: { backgroundColor: '#FFF', alignSelf: 'flex-start', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#EEE' },
  userText: { color: '#FFF' },
  botText: { color: '#333' },
  optionsContainer: { marginTop: 5, flexDirection: 'row', flexWrap: 'wrap' },
  optionButton: { backgroundColor: '#E0F2F1', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#B2DFDB' },
  optionText: { color: '#00695C', fontSize: 13, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, maxHeight: 100 },
});