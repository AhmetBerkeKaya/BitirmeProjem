import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Easing, Dimensions, LayoutAnimation, UIManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig'; 
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width } = Dimensions.get('window');

// --- TEMA RENKLERİ ---
const COLORS = {
  BG_START: '#0F172A',
  BG_END: '#1E293B',
  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',
  GLASS_BG: 'rgba(30, 41, 59, 0.85)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  MED_COLOR: '#F43F5E',
  TREAT_COLOR: '#A855F7',
  APPT_COLOR: '#F59E0B',
  DOC_COLOR: '#00F2C3',
  DANGER: '#EF4444',
};

const SCREEN_MAPPING = {
  'AppointmentScreen': 'Appointment',
  'PastAppointmentsScreen': 'PastAppointmentsScreen',
  'TreatmentListScreen': 'TreatmentListScreen',
  'PrescriptionListScreen': 'PrescriptionListScreen'
};

// --- YARDIMCI BİLEŞENLER ---

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: -6, duration: 400, useNativeDriver: true, delay }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true })
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.typingContainer}>
      <View style={styles.botAvatarSmall}>
        <Ionicons name="sparkles" size={12} color="#FFF" />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
      </View>
    </View>
  );
};

const AnimatedBubble = ({ children, isUser }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: isUser ? 'flex-end' : 'flex-start', marginVertical: 8 }}>
      {children}
    </Animated.View>
  );
};

const PulsingAvatar = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 1000, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1000, easing: Easing.ease, useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.headerAvatarContainer}>
      <Animated.View style={[styles.headerAvatarGlow, { transform: [{ scale: scaleAnim }] }]} />
      <View style={styles.headerAvatar}>
        <Ionicons name="chatbubbles" size={20} color="#FFF" />
      </View>
      <View style={styles.onlineDot} />
    </View>
  );
};

const MessageContent = ({ text, isUser, type, data, options, onOptionPress }) => {
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', marginVertical: 8 }}>
      {isUser ? (
        <LinearGradient colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]} start={{x:0, y:0}} end={{x:1, y:1}} style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userText}>{text}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.botBubble]}>
          <Text style={styles.botText}>{text}</Text>
        </View>
      )}

      {!isUser && data && (
        <View style={styles.cardContainer}>
          {data.map((item, index) => {
            let borderColor = COLORS.ACCENT_START;
            let icon = "information-circle";
            let title = item.name || item.branch || item.fullName;
            let sub = item.dosage || item.date || item.specialization;
            let desc = item.description || item.doctor || item.hospital;

            if (type === 'MEDICATION_LIST') { borderColor = COLORS.MED_COLOR; icon = "medkit"; }
            else if (type === 'TREATMENT_LIST') { borderColor = COLORS.TREAT_COLOR; icon = "fitness"; sub = `Faz: ${item.phase}`; }
            else if (type === 'APPOINTMENT_LIST') { borderColor = COLORS.APPT_COLOR; icon = "calendar"; desc = `Dr. ${item.doctor}`; }
            else if (type === 'DOCTOR_LIST') { borderColor = COLORS.DOC_COLOR; icon = "person"; desc = item.hospital; }

            return (
              <LinearGradient key={index} colors={[COLORS.GLASS_BG, 'rgba(255,255,255,0.05)']} style={[styles.infoCard, { borderLeftColor: borderColor }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: borderColor + '20' }]}>
                     <Ionicons name={icon} size={18} color={borderColor} />
                  </View>
                  <View style={{flex:1}}>
                      <Text style={styles.cardTitle}>{title}</Text>
                      <Text style={styles.cardSubtitle}>{sub}</Text>
                  </View>
                </View>
                {desc && <Text style={styles.cardBodyText}>{desc}</Text>}
                
                {type === 'DOCTOR_LIST' && (
                  <TouchableOpacity 
                    style={styles.miniBtn} 
                    onPress={() => onOptionPress({
                      action: 'NAVIGATE_DIRECT', screen: 'AppointmentScreen',
                      params: { doctorId: item.id, clinicId: item.clinicId, branch: item.specialization, doctorName: item.fullName, clinicName: item.hospital }
                    })}
                  >
                     <Text style={styles.miniBtnText}>Randevu Al</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            );
          })}
        </View>
      )}

      {!isUser && options && options.length > 0 && (
        <View style={styles.optionsContainer}>
          {options.map((opt, index) => (
            <TouchableOpacity key={index} activeOpacity={0.7} onPress={() => onOptionPress(opt)}>
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.optionButton}>
                <Text style={styles.optionText}>{opt.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// --- ANA COMPONENT ---
export default function ChatWidget({ visible = true }) {
  const [isVisible, setIsVisible] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const navigation = useNavigation(); 
  const insets = useSafeAreaInsets(); 

  const INITIAL_MESSAGE = { 
    id: 'init', 
    text: 'Merhaba! Ben RTM Asistan. Size nasıl yardımcı olabilirim?', 
    isUser: false, type: 'TEXT',
    options: [
      { label: '💊 İlaçlarım', action: 'İlaçlarımı göster' },
      { label: '📋 Tedavilerim', action: 'Tedavi planımı göster' },
      { label: '📅 Randevularım', action: 'Randevularımı getir' },
      { label: '👨‍⚕️ Doktor Bul', action: 'Doktor bul' }
    ]
  };

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const flatListRef = useRef(null);

  useEffect(() => {
    if(isVisible) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping, isVisible]);

  if (!visible) return null;

  const handleCloseChatRequest = () => {
    setShowCloseModal(true);
  };

  const handleConfirmClose = (shouldClear) => {
    setShowCloseModal(false);
    setIsVisible(false);
    if (shouldClear) {
      setTimeout(() => setMessages([INITIAL_MESSAGE]), 300);
    }
  };

  const handleBotResponse = async (userText) => {
    setIsTyping(true);
    try {
      const chatWithAI = httpsCallable(functions, 'chatWithAI');
      const result = await chatWithAI({ text: userText });
      const { text, data, type, options } = result.data;
      addMessage(text, false, type, data, options);
    } catch (error) {
      addMessage("Bağlantı hatası.", false, "ERROR", null, [{label: "Tekrar Dene", action: userText}]);
    } finally { setIsTyping(false); }
  };

  const addMessage = (text, isUser, type = 'TEXT', data = null, options = null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages(prev => [...prev, { id: Date.now().toString(), text, isUser, type, data, options }]);
  };

  const sendMessage = (text) => {
    if (!text || !text.trim()) return;
    addMessage(text, true);
    setInputText('');
    handleBotResponse(text);
  };

  const handleOptionPress = (option) => {
    if (option.action === 'NAVIGATE_DIRECT') {
        setIsVisible(false);
        const target = SCREEN_MAPPING[option.screen] || option.screen;
        try { navigation.navigate(target, option.params); } catch(e) {}
        return;
    }
    sendMessage(option.action); 
  };

  return (
    <>
      {!isVisible && (
        <TouchableOpacity style={styles.fabWrapper} onPress={() => setIsVisible(true)} activeOpacity={0.8}>
          <View style={styles.fabContainer}>
            <LinearGradient colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]} style={styles.fab}>
              <Ionicons name="chatbubbles" size={28} color="#FFF" />
            </LinearGradient>
            <View style={styles.fabPulse} />
          </View>
        </TouchableOpacity>
      )}

      {/* ANA SOHBET MODALI */}
      <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={handleCloseChatRequest}>
        
        {/* DÜZELTME: KeyboardAvoidingView'i Modal'ın hemen içine aldık ve flex:1 verdik */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.keyboardView}
          // Klavye açılınca header'ın üstte kalmaması için gerekli olabilecek bir offset (deneme yanılma ile ince ayar gerekebilir)
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0} 
        >
          <View style={styles.modalContainer}>
            <LinearGradient 
              colors={[COLORS.BG_START, COLORS.BG_END]} 
              style={[styles.modalGradient, { marginTop: Platform.OS === 'ios' ? insets.top : 0 }]}
            >
              {/* Header */}
              <View style={[styles.header, { marginTop: Platform.OS === 'ios' ? 10 : 0 }]}>
                <View style={styles.headerTitleRow}>
                  <PulsingAvatar />
                  <View style={{marginLeft: 12}}>
                    <Text style={styles.headerTitle}>RTM ASİSTAN</Text>
                    <Text style={styles.headerSubtitle}>Çevrimiçi • Yapay Zeka</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCloseChatRequest} style={styles.closeBtn} activeOpacity={0.7} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                  <Ionicons name="close" size={24} color={COLORS.TEXT_SEC} />
                </TouchableOpacity>
              </View>

              {/* Sohbet */}
              <FlatList
                ref={flatListRef} data={messages} keyExtractor={item => item.id}
                renderItem={({ item }) => <AnimatedBubble isUser={item.isUser}><MessageContent {...item} onOptionPress={handleOptionPress} /></AnimatedBubble>}
                contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={isTyping ? <TypingIndicator /> : null}
              />

              {/* Input Alanı */}
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <TextInput 
                    style={styles.input} placeholder="Bir şeyler yazın..." placeholderTextColor={COLORS.TEXT_SEC}
                    value={inputText} onChangeText={setInputText} onSubmitEditing={() => sendMessage(inputText)} 
                  />
                  <TouchableOpacity onPress={() => sendMessage(inputText)} disabled={!inputText.trim()} style={[styles.sendButton, !inputText.trim() && {opacity: 0.5}]}>
                    <LinearGradient colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]} style={styles.sendGradient}>
                      <Ionicons name="arrow-up" size={20} color="#FFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ALERT OVERLAY */}
              {showCloseModal && (
                <View style={styles.alertOverlayAbsolute}>
                  <LinearGradient colors={[COLORS.BG_END, COLORS.BG_START]} style={styles.alertCard}>
                    <View style={styles.alertIconContainer}>
                      <Ionicons name="warning" size={32} color={COLORS.DANGER} />
                    </View>
                    <Text style={styles.alertTitle}>Sohbeti Kapat</Text>
                    <Text style={styles.alertMessage}>Sohbet geçmişi temizlensin mi?</Text>
                    <View style={styles.alertBtnRow}>
                      <TouchableOpacity style={styles.alertBtnCancel} onPress={() => handleConfirmClose(false)}>
                        <Text style={styles.alertBtnTextCancel}>Hayır, Sakla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.alertBtnConfirm} onPress={() => handleConfirmClose(true)}>
                        <LinearGradient colors={[COLORS.DANGER, '#B91C1C']} style={styles.alertBtnGradient}>
                          <Text style={styles.alertBtnTextConfirm}>Evet, Temizle</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )}

            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrapper: { position: 'absolute', bottom: 30, right: 20, zIndex: 999 },
  fabContainer: { alignItems: 'center', justifyContent: 'center' },
  fab: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', zIndex: 2, elevation: 10, shadowColor: COLORS.ACCENT_START, shadowOpacity: 0.5, shadowRadius: 10 },
  fabPulse: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.ACCENT_START, opacity: 0.2, zIndex: 1 },

  // DÜZELTME: KeyboardAvoidingView için stil
  keyboardView: { flex: 1 },
  
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalGradient: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: COLORS.GLASS_BORDER, backgroundColor: 'rgba(0,0,0,0.3)', alignItems:'center', zIndex: 10 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerAvatarContainer: { position: 'relative', width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.ACCENT_END, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  headerAvatarGlow: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.ACCENT_START, opacity: 0.6 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.SUCCESS, borderWidth: 2, borderColor: '#1E293B', zIndex: 3 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.TEXT_MAIN, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 12, color: COLORS.ACCENT_START, fontWeight: '600' },
  closeBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, zIndex: 50 },

  bubble: { padding: 14, borderRadius: 20, maxWidth: '85%' },
  userBubble: { borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: COLORS.GLASS_BG, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, borderBottomLeftRadius: 4 },
  userText: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  botText: { color: COLORS.TEXT_MAIN, fontSize: 15, lineHeight: 22 },

  typingContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, marginLeft: 10 },
  botAvatarSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.ACCENT_END, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  typingBubble: { flexDirection: 'row', backgroundColor: COLORS.GLASS_BG, padding: 12, borderRadius: 16, borderBottomLeftRadius: 4, gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.TEXT_SEC },

  cardContainer: { marginTop: 8, width: '100%' },
  infoCard: { padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, width: width * 0.75, borderLeftWidth: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardTitle: { fontWeight: 'bold', fontSize: 15, color: COLORS.TEXT_MAIN },
  cardSubtitle: { fontSize: 12, color: COLORS.TEXT_SEC },
  cardBodyText: { fontSize: 13, color: COLORS.TEXT_MAIN, opacity: 0.8 },
  miniBtn: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  miniBtnText: { color: COLORS.ACCENT_START, fontSize: 12, fontWeight: 'bold' },

  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  optionButton: { borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, overflow:'hidden' },
  optionText: { color: COLORS.ACCENT_START, fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 10 },

  inputWrapper: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 25 : 15, backgroundColor: 'rgba(15, 23, 42, 0.98)', borderTopWidth: 1, borderColor: COLORS.GLASS_BORDER },
  inputContainer: { flexDirection: 'row', backgroundColor: COLORS.GLASS_BORDER, borderRadius: 30, padding: 5, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, paddingHorizontal: 20, color: COLORS.TEXT_MAIN, fontSize: 15, height: 45 },
  sendButton: { width: 45, height: 45, borderRadius: 23, overflow: 'hidden', marginLeft: 5 },
  sendGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ABSOLUTE ALERT STİLİ
  alertOverlayAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999 },
  alertCard: { width: '85%', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.GLASS_BORDER, shadowColor: COLORS.DANGER, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  alertIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  alertTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.TEXT_MAIN, marginBottom: 8 },
  alertMessage: { fontSize: 14, color: COLORS.TEXT_SEC, textAlign: 'center', marginBottom: 24 },
  alertBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  alertBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  alertBtnTextCancel: { color: COLORS.TEXT_MAIN, fontWeight: '600' },
  alertBtnConfirm: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  alertBtnGradient: { paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  alertBtnTextConfirm: { color: '#FFF', fontWeight: 'bold' }
});