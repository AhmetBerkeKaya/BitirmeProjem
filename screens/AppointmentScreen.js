import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
  Modal, // Modal eklendi
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// --- FUTURE HEALTH PALETİ ---
const COLORS = {
  BG_START: '#0F172A',
  BG_END: '#1E293B',
  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',
  GLASS_BG: 'rgba(30, 41, 59, 0.6)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  SUCCESS: '#10B981',
  DISABLED: 'rgba(148, 163, 184, 0.2)',
};

const BASE_SLOT_MINUTES = 30;
const ALL_DAY_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

const AppointmentScreen = ({ route, navigation }) => {
  const { doctorId, doctorName, clinicId, clinicName } = route.params;

  const [patientInfo, setPatientInfo] = useState(null);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [timeSlotsStatus, setTimeSlotsStatus] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [error, setError] = useState('');
  
  // 🔥 YENİ: Başarı Modalı Görünürlük State'i
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // İlk Verileri Çek
  useEffect(() => {
    const fetchInitialData = async () => {
      const user = auth.currentUser;
      if (!user) { setLoadingInitial(false); return; }
      try {
        const patientRef = doc(db, 'patients', user.uid);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) setPatientInfo(patientSnap.data());

        const typesCollection = collection(db, 'appointment_types');
        const typesSnapshot = await getDocs(typesCollection);
        const typesList = typesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAppointmentTypes(typesList);
      } catch (err) { setError("Veri yüklenemedi."); } 
      finally { setLoadingInitial(false); }
    };
    fetchInitialData();
  }, [doctorId]);

  // Saatleri Hesapla
  useEffect(() => {
    if (!selectedDate || !selectedType) { setTimeSlotsStatus([]); return; }
    const fetchSlotStatus = async () => {
      setLoadingSlots(true);
      try {
        const q = query(collection(db, 'appointments'), where('doctorId', '==', doctorId), where('dateISO', '==', selectedDate));
        const querySnapshot = await getDocs(q);
        const fullyTakenSlots = new Set();
        querySnapshot.docs.forEach(doc => {
          const appt = doc.data();
          const slotsToBlock = Math.ceil(appt.durationMinutes / BASE_SLOT_MINUTES);
          const startIndex = ALL_DAY_SLOTS.indexOf(appt.start);
          if (startIndex !== -1) {
            for (let i = 0; i < slotsToBlock; i++) {
              if (startIndex + i < ALL_DAY_SLOTS.length) fullyTakenSlots.add(ALL_DAY_SLOTS[startIndex + i]);
            }
          }
        });
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const slotsNeeded = Math.ceil(selectedType.durationMinutes / BASE_SLOT_MINUTES);

        const statusList = ALL_DAY_SLOTS.map((slot, i) => {
          let status = 'available';
          if (selectedDate === todayStr) {
             const [h, m] = slot.split(':').map(Number);
             if ((h * 60 + m) < currentMinutes) status = 'unavailable';
          }
          if (status === 'available') {
              if (fullyTakenSlots.has(slot)) status = 'unavailable';
              else {
                for (let j = 1; j < slotsNeeded; j++) {
                  if (i + j >= ALL_DAY_SLOTS.length || fullyTakenSlots.has(ALL_DAY_SLOTS[i + j])) { status = 'unavailable'; break; }
                }
              }
          }
          return { time: slot, status };
        });
        setTimeSlotsStatus(statusList);
      } catch (err) { setError("Saatler alınamadı."); }
      finally { setLoadingSlots(false); }
    };
    fetchSlotStatus();
  }, [selectedDate, selectedType, doctorId]);

  // Randevuyu Onayla
  const handleConfirmAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedType) return;
    setLoadingConfirm(true);
    try {
      await addDoc(collection(db, "appointments"), {
        clinicId, patientId: auth.currentUser.uid,
        patientName: patientInfo?.fullName || 'Hasta', patientPhone: patientInfo?.phone || '',
        doctorId, doctorName, dateISO: selectedDate, start: selectedTime,
        typeId: selectedType.id, typeName: selectedType.name, durationMinutes: selectedType.durationMinutes,
        status: 'pending', createdAt: new Date().toISOString()
      });
      
      // 🔥 STANDART ALERT YERİNE MODAL AÇIYORUZ
      setShowSuccessModal(true);

    } catch (e) { 
      setError("Hata oluştu."); 
      console.error(e);
    }
    finally { setLoadingConfirm(false); }
  };

  // Modaldaki "Tamam" butonu
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.pop(3); // Ana ekrana dön
  };

  if (loadingInitial) return (
    <View style={styles.centerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      <ActivityIndicator size="large" color={COLORS.ACCENT_START} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      
      {/* Dekoratif Glow */}
      <View style={styles.glowTop} />
      
      {/* Header */}
      <SafeAreaView style={styles.customHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>RANDEVU OLUŞTUR</Text>
        <View style={{width: 40}} /> 
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* DOKTOR PROFİL */}
        <View style={styles.doctorProfileContainer}>
          <View style={styles.avatarWrapper}>
            <LinearGradient colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]} style={styles.avatarGradient}>
              <Ionicons name="person" size={40} color="#FFF" />
            </LinearGradient>
            <View style={styles.avatarGlow} />
          </View>
          <Text style={styles.doctorName}>Dr. {doctorName}</Text>
          <View style={styles.clinicTag}>
            <Ionicons name="location" size={12} color={COLORS.TEXT_SEC} />
            <Text style={styles.clinicText}>{clinicName}</Text>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ADIM 1 */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>1. TARİH SEÇİN</Text>
            <LinearGradient colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.2)']} style={styles.glassCard}>
              <Calendar
                onDayPress={(day) => { setSelectedDate(day.dateString); setSelectedTime(''); setSelectedType(null); }}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: COLORS.ACCENT_START, selectedTextColor: '#000' } }}
                minDate={new Date().toISOString().split('T')[0]}
                theme={{
                  backgroundColor: 'transparent', calendarBackground: 'transparent',
                  textSectionTitleColor: COLORS.TEXT_SEC, selectedDayBackgroundColor: COLORS.ACCENT_START,
                  selectedDayTextColor: '#000', todayTextColor: COLORS.ACCENT_START, dayTextColor: COLORS.TEXT_MAIN,
                  textDisabledColor: '#334155', arrowColor: COLORS.ACCENT_START, monthTextColor: COLORS.TEXT_MAIN,
                  textDayFontWeight: '600', textMonthFontWeight: 'bold',
                }}
              />
            </LinearGradient>
          </View>

          {/* ADIM 2 */}
          {selectedDate && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>2. TÜR SEÇİN</Text>
              {appointmentTypes.map((type) => (
                <TouchableOpacity
                  key={type.id} activeOpacity={0.8}
                  onPress={() => { setSelectedType(type); setSelectedTime(''); }}
                  style={[styles.typeButton, selectedType?.id === type.id && styles.typeButtonSelected]}
                >
                  <LinearGradient
                    colors={selectedType?.id === type.id ? [COLORS.ACCENT_START, COLORS.ACCENT_END] : [COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.4)']}
                    style={styles.typeGradient} start={{x:0, y:0}} end={{x:1, y:0}}
                  >
                    <View style={styles.typeRow}>
                      <Ionicons name={selectedType?.id === type.id ? "radio-button-on" : "radio-button-off"} size={20} color={selectedType?.id === type.id ? "#000" : COLORS.ACCENT_START} />
                      <Text style={[styles.typeName, selectedType?.id === type.id && {color: '#000', fontWeight: 'bold'}]}>{type.name}</Text>
                      <Text style={[styles.typeDuration, selectedType?.id === type.id && {color: 'rgba(0,0,0,0.6)'}]}>{type.durationMinutes} dk</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ADIM 3 */}
          {selectedType && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>3. SAAT SEÇİN</Text>
              <LinearGradient colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.2)']} style={styles.glassCard}>
                {loadingSlots ? (
                  <ActivityIndicator color={COLORS.ACCENT_START} style={{padding: 20}} />
                ) : (
                  <View style={styles.slotsGrid}>
                    {timeSlotsStatus.map((slot) => {
                      const isSelected = selectedTime === slot.time;
                      const isUnavailable = slot.status === 'unavailable';
                      return (
                        <TouchableOpacity
                          key={slot.time} disabled={isUnavailable}
                          onPress={() => setSelectedTime(slot.time)}
                          style={[styles.slotButton, isUnavailable && styles.slotUnavailable, isSelected && styles.slotSelected]}
                        >
                          <Text style={[styles.slotText, isUnavailable && styles.slotTextDisabled, isSelected && styles.slotTextSelected]}>{slot.time}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </LinearGradient>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!selectedTime || loadingConfirm}
          onPress={handleConfirmAppointment}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={(!selectedTime) ? [COLORS.DISABLED, COLORS.DISABLED] : [COLORS.ACCENT_START, COLORS.ACCENT_END]}
            start={{x:0, y:0}} end={{x:1, y:0}}
            style={styles.confirmBtn}
          >
            {loadingConfirm ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>RANDEVUYU ONAYLA</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 🔥🔥 ÖZEL BAŞARI MODALI 🔥🔥 */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[COLORS.BG_END, COLORS.BG_START]}
            style={styles.successModalCard}
          >
            {/* Animasyonlu İkon Çerçevesi */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconOuterRing} />
              <LinearGradient
                colors={[COLORS.SUCCESS, '#059669']}
                style={styles.successIconCircle}
              >
                <Ionicons name="checkmark" size={50} color="#FFF" />
              </LinearGradient>
            </View>

            <Text style={styles.successTitle}>HARİKA!</Text>
            <Text style={styles.successMessage}>
              Randevunuz başarıyla oluşturuldu.
            </Text>

            <View style={styles.successDivider} />

            {/* Randevu Detayları */}
            <View style={styles.successDetailRow}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.TEXT_SEC} />
              <Text style={styles.successDetailText}>{selectedDate}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.TEXT_SEC} />
              <Text style={styles.successDetailText}>{selectedTime} • {selectedType?.name}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Ionicons name="person-outline" size={18} color={COLORS.TEXT_SEC} />
              <Text style={styles.successDetailText}>Dr. {doctorName}</Text>
            </View>

            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessClose}
            >
               <LinearGradient
                  colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
                  start={{x:0, y:0}} end={{x:1, y:0}}
                  style={styles.successButtonGradient}
                >
                  <Text style={styles.successButtonText}>TAMAM</Text>
                </LinearGradient>
            </TouchableOpacity>

          </LinearGradient>
        </View>
      </Modal>

    </View>
  );
};

export default AppointmentScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BG_START },
  glowTop: { position: 'absolute', top: -150, left: 0, right: 0, height: 400, backgroundColor: COLORS.ACCENT_START, opacity: 0.08, borderBottomLeftRadius: 200, borderBottomRightRadius: 200, transform: [{ scaleX: 1.5 }] },
  customHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, zIndex: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerTitleText: { color: COLORS.TEXT_MAIN, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  doctorProfileContainer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatarGradient: { width: 90, height: 90, borderRadius: 30, justifyContent: 'center', alignItems: 'center', zIndex: 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarGlow: { position: 'absolute', top: 15, left: 15, right: 15, bottom: -10, backgroundColor: COLORS.ACCENT_START, opacity: 0.5, borderRadius: 30, zIndex: 1, blurRadius: 20 },
  doctorName: { fontSize: 26, fontWeight: '800', color: COLORS.TEXT_MAIN, letterSpacing: 0.5 },
  clinicTag: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  clinicText: { color: COLORS.TEXT_SEC, fontSize: 13, marginLeft: 6 },
  stepContainer: { paddingHorizontal: 24, marginBottom: 30 },
  stepTitle: { color: COLORS.ACCENT_START, fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1.5 },
  glassCard: { borderRadius: 24, padding: 10, borderWidth: 1, borderColor: COLORS.GLASS_BORDER },
  typeButton: { borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.GLASS_BORDER },
  typeButtonSelected: { borderColor: COLORS.ACCENT_START },
  typeGradient: { padding: 16 },
  typeRow: { flexDirection: 'row', alignItems: 'center' },
  typeName: { flex: 1, color: COLORS.TEXT_MAIN, fontSize: 15, fontWeight: '600', marginLeft: 12 },
  typeDuration: { color: COLORS.TEXT_SEC, fontSize: 12 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 10 },
  slotButton: { width: '22%', margin: '1.5%', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.GLASS_BORDER, alignItems: 'center' },
  slotUnavailable: { opacity: 0.2 },
  slotSelected: { backgroundColor: COLORS.ACCENT_START, borderColor: COLORS.ACCENT_START },
  slotText: { color: COLORS.TEXT_MAIN, fontSize: 13, fontWeight: '600' },
  slotTextDisabled: { textDecorationLine: 'line-through' },
  slotTextSelected: { color: '#000', fontWeight: '800' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 20, paddingBottom: 30, borderTopWidth: 1, borderTopColor: COLORS.GLASS_BORDER },
  confirmBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 20 },
  confirmText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  // 🔥 YENİ MODAL STİLLERİ 🔥
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  successModalCard: { width: '100%', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: COLORS.GLASS_BORDER, shadowColor: COLORS.ACCENT_START, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  successIconContainer: { marginBottom: 20, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  successIconOuterRing: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16, 185, 129, 0.2)', zIndex: 1 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: 1, marginBottom: 8 },
  successMessage: { color: COLORS.TEXT_SEC, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  successDivider: { width: '100%', height: 1, backgroundColor: COLORS.GLASS_BORDER, marginBottom: 20 },
  successDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, alignSelf: 'flex-start', marginLeft: 20 },
  successDetailText: { color: COLORS.TEXT_MAIN, fontSize: 15, marginLeft: 10 },
  successButton: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 20 },
  successButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  successButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});