import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
  TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig'; // Config yolunun doğruluğunu kontrol et

// --- ÖZEL MESAJ BİLEŞENİ ---
const MessageBubble = ({ text, isUser, type, data, onActionPress }) => {
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginVertical: 8 }}>
      
      {/* Baloncuk */}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={isUser ? styles.userText : styles.botText}>{text}</Text>
      </View>

      {/* TİPE GÖRE İÇERİK GÖSTERİMİ */}
      
      {/* 1. DOKTOR LİSTESİ KARTI */}
      {!isUser && type === 'DOCTOR_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((doc, index) => (
            <View key={index} style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="medkit" size={20} color="#00BFA6" />
                <Text style={styles.cardTitle}>{doc.fullName}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{doc.specialization}</Text>
              <Text style={styles.cardDetail}>{doc.hospital}</Text>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => onActionPress('randevu_al', doc)}
              >
                <Text style={styles.actionButtonText}>Randevu Al</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* 2. RANDEVU LİSTESİ KARTI */}
      {!isUser && type === 'APPOINTMENT_LIST' && data && (
        <View style={styles.cardContainer}>
          {data.map((app, index) => (
            <View key={index} style={styles.infoCard}>
               <Text style={styles.cardTitle}>{app.branch}</Text>
               <Text style={styles.cardDetail}>📅 {new Date(app.date).toLocaleDateString('tr-TR')}</Text>
               <Text style={[styles.statusText, { color: app.status === 'completed' ? 'green' : 'orange' }]}>
                 {app.status}
               </Text>
            </View>
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
  const [messages, setMessages] = useState([
    { id: '1', text: 'Merhaba! Ben Klinik Asistanı. Size nasıl yardımcı olabilirim? (Örn: Başım ağrıyor, randevularım nedir?)', isUser: false, type: 'TEXT' }
  ]);
  
  const flatListRef = useRef(null);

  // --- AI İLE İLETİŞİM ---
  const handleBotResponse = async (userText) => {
    setIsTyping(true);
    
    try {
      const chatWithAI = httpsCallable(functions, 'chatWithAI');
      const result = await chatWithAI({ text: userText });
      
      const { text, data, type } = result.data;

      // Backend'den gelen yanıtı ekle
      addMessage(text, false, type, data);

    } catch (error) {
      console.error("AI Hatası:", error);
      addMessage("Bağlantı hatası oluştu. Lütfen tekrar deneyin.", false, "ERROR");
    } finally {
      setIsTyping(false);
    }
  };

  const addMessage = (text, isUser, type = 'TEXT', data = null) => {
    setMessages(prev => [
      ...prev, 
      { id: Date.now().toString(), text, isUser, type, data }
    ]);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    
    addMessage(textToSend, true);
    setInputText('');
    handleBotResponse(textToSend);
  };

  const handleCardAction = (action, item) => {
    if (action === 'randevu_al') {
      // Burada normalde navigasyon çalışır. 
      // Örnek: navigation.navigate('AppointmentScreen', { doctor: item });
      addMessage(`${item.fullName} için randevu ekranına yönlendiriyorum...`, false);
    }
  };

  // Otomatik aşağı kaydırma
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  return (
    <>
      {/* FAB BUTONU */}
      {!isVisible && (
        <TouchableOpacity style={styles.fab} onPress={() => setIsVisible(true)}>
          <Ionicons name="chatbubbles" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* CHAT MODAL */}
      <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsVisible(false)}>
        <SafeAreaView style={styles.container}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Asistan 🤖</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Ionicons name="close-circle" size={30} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble 
                text={item.text} 
                isUser={item.isUser} 
                type={item.type} 
                data={item.data}
                onActionPress={handleCardAction}
              />
            )}
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
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
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
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, color: '#333' },
  sendButton: { backgroundColor: '#00BFA6', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  // Kart Stilleri
  cardContainer: { marginTop: 10, width: '100%' },
  infoCard: { backgroundColor: 'white', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEE', width: 250 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, marginLeft: 5, color: '#333' },
  cardSubtitle: { fontSize: 12, color: '#666' },
  cardDetail: { fontSize: 11, color: '#999', marginTop: 2 },
  actionButton: { marginTop: 8, backgroundColor: '#E0F2F1', padding: 6, borderRadius: 5, alignItems: 'center' },
  actionButtonText: { color: '#00695C', fontSize: 12, fontWeight: 'bold' },
  statusText: { fontSize: 12, fontWeight: 'bold', marginTop: 5 }
});