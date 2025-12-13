import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig'; 

// Backend'deki ekran ismi ile App.js'deki ismin eşleşmesi
const SCREEN_MAPPING = {
  'AppointmentScreen': 'Appointment', // App.js'de burası neyse onu yaz (Örn: 'Appointment')
};

const MessageBubble = ({ text, isUser, type, data, options, onOptionPress }) => {
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginVertical: 8 }}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={isUser ? styles.userText : styles.botText}>{text}</Text>
      </View>

      {/* 1. Doktor Kartları */}
      {!isUser && type === 'DOCTOR_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((doc, index) => (
            <View key={index} style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="medkit" size={20} color="#00BFA6" />
                <Text style={styles.cardTitle}>{doc.fullName}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{doc.specialization}</Text>
              <Text style={styles.cardDetail}>{doc.hospital || 'Merkez Klinik'}</Text>
              
              {/* 🔥 DÜZELTME BURADA: Eksik parametreler eklendi */}
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                   onOptionPress({
                      action: 'NAVIGATE_DIRECT', 
                      screen: 'AppointmentScreen',
                      params: { 
                        doctorId: doc.id,
                        clinicId: doc.clinicId,
                        branch: doc.specialization,
                        // 👇 EKLENEN KISIM: İsimleri de gönderiyoruz
                        doctorName: doc.fullName, 
                        clinicName: doc.hospital || 'Merkez Klinik'
                      }
                   });
                }}
              >
                 <Text style={styles.actionButtonText}>📅 Randevu Al</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* 2. Randevu Kartları */}
      {!isUser && type === 'APPOINTMENT_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((app, index) => (
            <View key={index} style={styles.infoCard}>
               <Text style={styles.cardTitle}>{app.branch}</Text>
               <Text style={styles.cardDetail}>📅 {new Date(app.date).toLocaleDateString('tr-TR')}</Text>
               <Text style={[styles.statusText, { color: app.status === 'pending' ? 'orange' : 'green' }]}>
                 {app.status === 'pending' ? 'Bekliyor' : 'Onaylandı'}
               </Text>
            </View>
          ))}
        </View>
      )}

      {/* 3. Protokol Kartları */}
      {!isUser && type === 'PROTOCOL_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((p, index) => (
            <View key={index} style={styles.infoCard}>
               <View style={styles.cardHeader}>
                  <Ionicons name="clipboard" size={20} color="#FF9800" />
                  <Text style={styles.cardTitle}>{p.name}</Text>
               </View>
               <Text style={styles.cardDetail}>{p.details || "Detay bulunamadı."}</Text>
               {p.control && <Text style={[styles.cardSubtitle, {marginTop:5}]}>Kontrol: {p.control}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Butonlar */}
      {!isUser && options && options.length > 0 && (
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
};

export default function ChatWidget() {
  const [isVisible, setIsVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const navigation = useNavigation(); 

  const INITIAL_MESSAGE = { 
    id: 'init', 
    text: 'Merhaba! Ben Klinik Asistanı. Size nasıl yardımcı olabilirim?', 
    isUser: false, 
    type: 'TEXT',
    options: [
      { label: '📅 Randevularım', action: 'Randevularımı listele' },
      { label: '👨‍⚕️ Doktor Bul', action: 'Doktorları göster' },
      { label: '📋 Tedavi Bilgisi', action: 'Tedavi protokolleri neler?' }
    ]
  };

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const flatListRef = useRef(null);

  const handleBotResponse = async (userText) => {
    setIsTyping(true);
    
    try {
      const chatWithAI = httpsCallable(functions, 'chatWithAI');
      const result = await chatWithAI({ text: userText });
      const { text, data, type, options, screen, params } = result.data;

      addMessage(text, false, type, data, options);
      
      // AI Genel Yönlendirme (Eğer varsa)
      if (type === 'NAVIGATION' && screen) {
         setTimeout(() => {
            setIsVisible(false); 
            const targetScreen = SCREEN_MAPPING[screen] || screen;
            if (navigation) navigation.navigate(targetScreen, params);
         }, 1500);
      }
      
    } catch (error) {
      console.error("AI Hatası:", error);
      addMessage("Bağlantı hatası oluştu.", false, "ERROR", null, [{label: "Tekrar Dene", action: userText}]);
    } finally {
      setIsTyping(false);
    }
  };

  const addMessage = (text, isUser, type = 'TEXT', data = null, options = null) => {
    setMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), text, isUser, type, data, options }
    ]);
  };

  const sendMessage = (text) => {
    if (!text || !text.trim()) return;
    addMessage(text, true);
    setInputText('');
    handleBotResponse(text);
  };

  const handleOptionPress = (option) => {
    // 🔥 DİREKT NAVİGASYON (KART ÜZERİNDEN)
    if (option.action === 'NAVIGATE_DIRECT') {
        setIsVisible(false);
        const targetScreen = SCREEN_MAPPING[option.screen] || option.screen;
        // console.log("Navigasyon Parametreleri:", option.params); // Debug için
        if (navigation) navigation.navigate(targetScreen, option.params);
        return;
    }
    sendMessage(option.action); 
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  return (
    <>
      {!isVisible && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsVisible(true)}>
          <Ionicons name="chatbubbles" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsVisible(false)}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>RTM Asistan 🤖</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Ionicons name="close-circle" size={30} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble {...item} onOptionPress={handleOptionPress} />}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            ListFooterComponent={isTyping ? <ActivityIndicator size="small" color="#00BFA6" style={{marginTop:10}} /> : null}
          />

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={styles.inputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="Mesajınızı yazın..." 
                value={inputText} 
                onChangeText={setInputText}
                onSubmitEditing={() => sendMessage(inputText)}
              />
              <TouchableOpacity onPress={() => sendMessage(inputText)} style={styles.sendButton}>
                <Ionicons name="send" size={20} color="#FFF" />
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
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#00BFA6', justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 999 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#EEE', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  bubble: { padding: 12, borderRadius: 16, maxWidth: '85%' },
  userBubble: { backgroundColor: '#00BFA6', borderBottomRightRadius: 2 },
  botBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  userText: { color: '#FFF', fontSize: 15 },
  botText: { color: '#333', fontSize: 15 },
  cardContainer: { marginTop: 10, width: '100%' },
  infoCard: { backgroundColor: 'white', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEE', width: 260 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, marginLeft: 5, color: '#333' },
  cardSubtitle: { fontSize: 12, color: '#666' },
  cardDetail: { fontSize: 11, color: '#555', marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, maxWidth: '90%' },
  optionButton: { backgroundColor: '#E0F2F1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#B2DFDB' },
  optionText: { color: '#00796B', fontSize: 13, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, color: '#333' },
  sendButton: { backgroundColor: '#00BFA6', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionButton: { marginTop: 10, backgroundColor: '#E0F2F1', padding: 8, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#00796B', fontWeight: 'bold', fontSize: 13 },
});