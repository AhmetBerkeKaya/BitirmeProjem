import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig'; 

// 🔥 Navigasyon Haritası (Senin App.js'in ile uyumlu)
const SCREEN_MAPPING = {
  'AppointmentScreen': 'Appointment',
  'PastAppointmentsScreen': 'PastAppointmentsScreen',
  'TreatmentListScreen': 'TreatmentListScreen', // Eğer varsa
  'PrescriptionListScreen': 'PrescriptionListScreen' // Eğer varsa
};

const MessageBubble = ({ text, isUser, type, data, options, onOptionPress }) => {
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginVertical: 8 }}>
      {/* Balon */}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={isUser ? styles.userText : styles.botText}>{text}</Text>
      </View>

      {/* --- KARTLAR BÖLÜMÜ --- */}

      {/* 1. İLAÇ KARTLARI (MEDICATION) */}
      {!isUser && type === 'MEDICATION_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((med, index) => (
            <View key={index} style={[styles.infoCard, { borderLeftColor: '#E91E63' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, {backgroundColor: '#FCE4EC'}]}>
                   <Ionicons name="medkit" size={20} color="#E91E63" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.cardTitle}>{med.name}</Text>
                    <Text style={styles.cardSubtitle}>{med.dosage}</Text>
                </View>
              </View>
              {/* Halk Dili Açıklaması */}
              <View style={styles.explanationBox}>
                 <Text style={styles.explanationText}>ℹ️ {med.description}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 2. TEDAVİ KARTLARI (TREATMENT) */}
      {!isUser && type === 'TREATMENT_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((treat, index) => (
            <View key={index} style={[styles.infoCard, { borderLeftColor: '#9C27B0' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, {backgroundColor: '#F3E5F5'}]}>
                   <Ionicons name="fitness" size={20} color="#9C27B0" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.cardTitle}>{treat.name}</Text>
                    <Text style={styles.cardSubtitle}>Faz: {treat.phase}</Text>
                </View>
              </View>
              <Text style={styles.cardBodyText}>{treat.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 3. RANDEVU KARTLARI (APPOINTMENT) */}
      {!isUser && type === 'APPOINTMENT_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((app, index) => (
            <View key={index} style={[styles.infoCard, { borderLeftColor: '#FF9800' }]}>
               <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, {backgroundColor: '#FFF3E0'}]}>
                     <Ionicons name="calendar" size={20} color="#FF9800" />
                  </View>
                  <View style={{flex:1}}>
                      <Text style={styles.cardTitle}>{app.branch}</Text>
                      <Text style={styles.cardSubtitle}>{app.date}</Text>
                  </View>
               </View>
               <View style={styles.detailRow}>
                 <Ionicons name="person-outline" size={14} color="#666" />
                 <Text style={styles.detailText}>Dr. {app.doctor}</Text>
               </View>
               <View style={styles.detailRow}>
                 <Ionicons name="business-outline" size={14} color="#666" />
                 <Text style={styles.detailText}>{app.clinic}</Text>
               </View>
               <View style={[styles.statusBadge, app.status === 'completed' ? styles.badgeSuccess : styles.badgePending]}>
                 <Text style={app.status === 'completed' ? styles.textSuccess : styles.textPending}>
                   {app.status === 'confirmed' ? 'Onaylandı' : app.status === 'pending' ? 'Bekliyor' : 'Tamamlandı'}
                 </Text>
               </View>
            </View>
          ))}
        </View>
      )}

      {/* 4. DOKTOR KARTLARI (DOCTOR) */}
      {!isUser && type === 'DOCTOR_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((doc, index) => (
            <View key={index} style={[styles.infoCard, { borderLeftColor: '#00BFA6' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, {backgroundColor: '#E0F2F1'}]}>
                   <Ionicons name="person" size={20} color="#00BFA6" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.cardTitle}>{doc.fullName}</Text>
                    <Text style={styles.cardSubtitle}>{doc.specialization}</Text>
                </View>
              </View>
              <Text style={styles.cardBodyText}>🏥 {doc.hospital}</Text>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => onOptionPress({
                  action: 'NAVIGATE_DIRECT', 
                  screen: 'AppointmentScreen',
                  params: { 
                    doctorId: doc.id, 
                    clinicId: doc.clinicId, 
                    branch: doc.specialization, 
                    doctorName: doc.fullName,
                    clinicName: doc.hospital 
                  }
                })}
              >
                 <Text style={styles.actionButtonText}>📅 Randevu Al</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* SEÇENEK BUTONLARI */}
      {!isUser && options && options.length > 0 && (
        <View style={styles.optionsContainer}>
          {options.map((opt, index) => (
            <TouchableOpacity key={index} style={styles.optionButton} onPress={() => onOptionPress(opt)}>
              <Text style={styles.optionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function ChatWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const navigation = useNavigation(); 

  const INITIAL_MESSAGE = { 
    id: 'init', 
    text: 'Merhaba! Ben Klinik Asistanı. İlaçlarınızı, tedavilerinizi veya randevularınızı sorabilirsiniz.', 
    isUser: false, 
    type: 'TEXT',
    options: [
      { label: '💊 İlaçlarım', action: 'İlaçlarımı göster' },
      { label: '📋 Tedavilerim', action: 'Tedavi planımı göster' },
      { label: '📅 Randevularım', action: 'Randevularımı getir' },
      { label: '👨‍⚕️ Doktor Bul', action: 'Doktor bul' }
    ]
  };

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const flatListRef = useRef(null);

  const handleCloseChat = () => {
    Alert.alert("Sohbeti Kapat", "Sohbet geçmişini temizlemek ister misiniz?", [
        { text: "Hayır, Kalsın", onPress: () => setIsVisible(false), style: "cancel" },
        { text: "Evet, Temizle", style: "destructive", onPress: () => { setIsVisible(false); setTimeout(() => setMessages([INITIAL_MESSAGE]), 300); } }
    ]);
  };

  const handleBotResponse = async (userText) => {
    setIsTyping(true);
    try {
      const chatWithAI = httpsCallable(functions, 'chatWithAI');
      const result = await chatWithAI({ text: userText });
      const { text, data, type, options } = result.data;
      addMessage(text, false, type, data, options);
    } catch (error) {
      console.error("AI Hatası:", error);
      addMessage("Bağlantı hatası oluştu. Lütfen tekrar deneyin.", false, "ERROR", null, [{label: "Tekrar Dene", action: userText}]);
    } finally { setIsTyping(false); }
  };

  const addMessage = (text, isUser, type = 'TEXT', data = null, options = null) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, isUser, type, data, options }]);
  };

  const sendMessage = (text) => {
    if (!text || !text.trim()) return;
    addMessage(text, true);
    setInputText('');
    handleBotResponse(text);
  };

  const handleOptionPress = (option) => {
    // Navigasyon kontrolü
    if (option.action === 'NAVIGATE_DIRECT') {
        setIsVisible(false);
        const target = SCREEN_MAPPING[option.screen] || option.screen;
        try { navigation.navigate(target, option.params); } catch(e) { Alert.alert("Hata", "Sayfa bulunamadı."); }
        return;
    }
    // Normal mesaj gönderme
    sendMessage(option.action); 
  };

  useEffect(() => flatListRef.current?.scrollToEnd({ animated: true }), [messages, isTyping]);

  return (
    <>
      {!isVisible && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsVisible(true)}>
          <Ionicons name="chatbubbles" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseChat}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>RTM Asistan 🤖</Text>
            <TouchableOpacity onPress={handleCloseChat}><Ionicons name="close-circle" size={32} color="#333" /></TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef} data={messages} keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble {...item} onOptionPress={handleOptionPress} />}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            ListFooterComponent={isTyping ? <ActivityIndicator size="small" color="#00BFA6" style={{marginTop:10}} /> : null}
          />

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.inputContainer}>
              <TextInput style={styles.input} placeholder="Bir şeyler yazın..." value={inputText} onChangeText={setInputText} onSubmitEditing={() => sendMessage(inputText)} />
              <TouchableOpacity onPress={() => sendMessage(inputText)} style={styles.sendButton}><Ionicons name="send" size={20} color="#FFF" /></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FC' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#00BFA6', justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 999 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#EEE', backgroundColor: '#FFF', alignItems:'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  // Balonlar
  bubble: { padding: 12, borderRadius: 16, maxWidth: '85%' },
  userBubble: { backgroundColor: '#00BFA6', borderBottomRightRadius: 2 },
  botBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  userText: { color: '#FFF', fontSize: 15 },
  botText: { color: '#333', fontSize: 15 },

  // Genel Kart Stili
  cardContainer: { marginTop: 10, width: '100%' },
  infoCard: { backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE', width: 280, elevation: 2, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  cardSubtitle: { fontSize: 13, color: '#666' },
  cardBodyText: { fontSize: 13, color: '#444', lineHeight: 18 },
  
  // Detay Satırları
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detailText: { fontSize: 12, color: '#555', marginLeft: 6 },

  // Açıklama Kutusu (Sarı/Pembe kutular)
  explanationBox: { backgroundColor: '#FFF3E0', padding: 8, borderRadius: 8, marginTop: 8 },
  explanationText: { fontSize: 12, color: '#E65100', fontStyle: 'italic' },

  // Rozetler
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  badgeSuccess: { backgroundColor: '#E8F8F5' },
  badgePending: { backgroundColor: '#FFF3E0' },
  textSuccess: { color: '#27AE60', fontSize: 11, fontWeight: 'bold' },
  textPending: { color: '#F39C12', fontSize: 11, fontWeight: 'bold' },

  // Aksiyonlar
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, maxWidth: '90%' },
  optionButton: { backgroundColor: '#E0F2F1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#B2DFDB' },
  optionText: { color: '#00796B', fontSize: 13, fontWeight: '600' },
  actionButton: { marginTop: 12, backgroundColor: '#E0F2F1', padding: 10, borderRadius: 10, alignItems: 'center' },
  actionButtonText: { color: '#00796B', fontWeight: 'bold', fontSize: 13 },

  // Input
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, color: '#333' },
  sendButton: { backgroundColor: '#00BFA6', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});