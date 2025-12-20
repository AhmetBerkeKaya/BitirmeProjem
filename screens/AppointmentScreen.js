import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
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

// --- RENK PALETİ ---
const COLORS = {
  PRIMARY: '#00BFA6',
  PRIMARY_DARK: '#00997A',
  PRIMARY_LIGHT: '#E6F8F5',
  GRADIENT_START: '#00BFA6',
  GRADIENT_END: '#00D9B8',
  BACKGROUND: '#F5F9FC',
  WHITE: '#FFFFFF',
  TEXT: '#2C3E50',
  TEXT_LIGHT: '#5D6D7E',
  BORDER: '#EAECEE',
  SUCCESS: '#27AE60',
  SUCCESS_LIGHT: '#E8F8F5',
  DANGER: '#e74c3c',
  DISABLED: '#D5D8DC',
};

// --- SABİTLER ---
const BASE_SLOT_MINUTES = 30;
const ALL_DAY_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

const AppointmentScreen = ({ route, navigation }) => {
  const { doctorId, doctorName, clinicId, clinicName } = route.params;

  // --- STATE'LER ---
  const [patientInfo, setPatientInfo] = useState(null);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [timeSlotsStatus, setTimeSlotsStatus] = useState([]);
  const [selectedTime, setSelectedTime] = useState('');

  // UI State'leri
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [error, setError] = useState('');

  // Animation
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  /**
   * 1. FONKSİYON: İlk Verileri Çek
   */
  useEffect(() => {
    navigation.setOptions({
      title: `Dr. ${doctorName}`,
      headerStyle: { backgroundColor: COLORS.PRIMARY, elevation: 0, shadowOpacity: 0 },
      headerTintColor: COLORS.WHITE,
      headerTitleStyle: { fontWeight: '700', fontSize: 18, color: COLORS.WHITE },
    });

    const fetchInitialData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("Kullanıcı oturumu bulunamadı.");
        setLoadingInitial(false);
        return;
      }
      try {
        const patientRef = doc(db, 'patients', user.uid);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
          setPatientInfo(patientSnap.data());
        } else {
          throw new Error("Hasta kaydı bulunamadı.");
        }

        const typesCollection = collection(db, 'appointment_types');
        const typesQuery = query(typesCollection); // Filtresiz çekiyoruz
        const typesSnapshot = await getDocs(typesQuery);
        const typesList = typesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAppointmentTypes(typesList);
      } catch (err) {
        setError("Gerekli veriler yüklenemedi: " + err.message);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitialData();
  }, [navigation, doctorName]);

  /**
   * 2. FONKSİYON: Dinamik Saatleri Hesapla (GEÇMİŞ SAAT KONTROLÜ EKLENDİ)
   */
  useEffect(() => {
    if (!selectedDate || !selectedType) {
      setTimeSlotsStatus([]);
      return;
    }
    const fetchSlotStatus = async () => {
      setLoadingSlots(true);
      setError('');
      try {
        // 1. Veritabanından Dolu Randevuları Çek
        const appointmentsRef = collection(db, 'appointments');
        const q = query(
          appointmentsRef,
          where('doctorId', '==', doctorId),
          where('dateISO', '==', selectedDate)
        );
        const querySnapshot = await getDocs(q);
        const fullyTakenSlots = new Set();
        querySnapshot.docs.forEach(doc => {
          const appt = doc.data();
          const duration = appt.durationMinutes;
          const startTime = appt.start;
          const slotsToBlock = Math.ceil(duration / BASE_SLOT_MINUTES);
          const startIndex = ALL_DAY_SLOTS.indexOf(startTime);
          if (startIndex === -1) return;
          for (let i = 0; i < slotsToBlock; i++) {
            if (startIndex + i < ALL_DAY_SLOTS.length) {
              fullyTakenSlots.add(ALL_DAY_SLOTS[startIndex + i]);
            }
          }
        });

        // 2. Bugünün Tarihi ve Saatini Al
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
        
        // Şu anki saati dakika cinsinden hesapla (Örn: 14:30 -> 14*60 + 30 = 870 dk)
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const newAppointmentDuration = selectedType.durationMinutes;
        const slotsNeeded = Math.ceil(newAppointmentDuration / BASE_SLOT_MINUTES);

        const statusList = ALL_DAY_SLOTS.map((slot, i) => {
          let status = 'available';

          // A) Geçmiş Saat Kontrolü
          // Eğer seçilen gün BUGÜN ise ve slot saati şu anki saatten önceyse -> Kapalı
          if (selectedDate === todayStr) {
             const [h, m] = slot.split(':').map(Number);
             const slotMinutes = h * 60 + m;
             
             // Opsiyonel: 30 dk tolerans payı bırakabiliriz (şu anki saatten 30 dk sonrasına kadar kapalı olsun)
             // Burası katı kontrol: slot saati şu anki dakikadan küçükse kapat.
             if (slotMinutes < currentMinutes) {
                 status = 'unavailable';
             }
          }

          // B) Doluluk Kontrolü (Veritabanı)
          // Eğer zaten geçmiş saat nedeniyle kapandıysa buraya bakmaya gerek yok
          if (status === 'available') {
              if (fullyTakenSlots.has(slot)) {
                status = 'unavailable';
              } else {
                for (let j = 1; j < slotsNeeded; j++) {
                  if (i + j >= ALL_DAY_SLOTS.length || fullyTakenSlots.has(ALL_DAY_SLOTS[i + j])) {
                    status = 'unavailable';
                    break;
                  }
                }
              }
          }
          
          return { time: slot, status: status };
        });
        setTimeSlotsStatus(statusList);
      } catch (err) {
        console.error("Uygun saatleri getirirken hata:", err);
        setError("Uygun saatler getirilirken hata oluştu.");
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlotStatus();
  }, [selectedDate, selectedType, doctorId]);

  /**
   * 3. FONKSİYON: Randevuyu Onayla
   */
  const handleConfirmAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedType || !patientInfo || !clinicId) {
      setError("Lütfen tarih, randevu tipi ve saat seçin. Klinik ID eksik.");
      return;
    }
    setLoadingConfirm(true);
    setError('');

    try {
      const appointmentData = {
        clinicId: clinicId,
        patientId: auth.currentUser.uid,
        patientName: patientInfo.fullName,
        patientPhone: patientInfo.phone,
        doctorId: doctorId,
        dateISO: selectedDate,
        start: selectedTime,
        typeId: selectedType.id,
        typeName: selectedType.name,
        durationMinutes: selectedType.durationMinutes,
        status: 'pending',
        isQuickReservation: false,
        notes: "Mobil uygulama üzerinden alındı.",
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "appointments"), appointmentData);

      Alert.alert(
        "Randevu Başarılı",
        `Dr. ${doctorName} için ${selectedDate} ${selectedTime} tarihli randevunuz başarıyla oluşturuldu.`,
        [{ text: "Tamam", onPress: () => navigation.pop(3) }]
      );

    } catch (e) {
      console.error("Randevu kaydı hatası:", e);
      setError("Randevu oluşturulurken bir sorun oluştu: " + e.message);
    } finally {
      setLoadingConfirm(false);
    }
  };

  // --- RENDER --- (Değişiklik Yok)
  if (loadingInitial) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
        <LinearGradient colors={[COLORS.GRADIENT_START, COLORS.GRADIENT_END]} style={styles.loadingGradient}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />

      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient colors={[COLORS.GRADIENT_START, COLORS.GRADIENT_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.doctorIconContainer}>
              <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.iconGradient}>
                <Ionicons name="medical" size={32} color={COLORS.WHITE} />
              </LinearGradient>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Dr. {doctorName}</Text>
              <View style={styles.clinicBadge}>
                <Ionicons name="business-outline" size={14} color={COLORS.WHITE} />
                <Text style={styles.headerSubtitle}>{clinicName}</Text>
              </View>
            </View>
          </View>
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
        </LinearGradient>
      </Animated.View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* 1. Adım: Takvim */}
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <LinearGradient colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]} style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></LinearGradient>
              <Text style={styles.stepTitle}>Tarih Seçin</Text>
              {selectedDate && <View style={styles.checkmarkBadge}><Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} /></View>}
            </View>
            <View style={styles.card}>
              <View style={styles.cardTopAccent} />
              <Calendar
                onDayPress={(day) => { setSelectedDate(day.dateString); setSelectedTime(''); setSelectedType(null); }}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: COLORS.PRIMARY, selectedTextColor: COLORS.WHITE } }}
                minDate={new Date().toISOString().split('T')[0]}
                theme={{
                  todayTextColor: COLORS.PRIMARY, arrowColor: COLORS.PRIMARY, selectedDayBackgroundColor: COLORS.PRIMARY,
                  dotColor: COLORS.PRIMARY, textDayFontWeight: '600', textMonthFontWeight: 'bold', textMonthFontSize: 18, textDayFontSize: 15, calendarBackground: 'transparent',
                }}
              />
            </View>
          </View>

          {/* 2. Adım: Randevu Tipi */}
          {selectedDate && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <LinearGradient colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]} style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></LinearGradient>
                <Text style={styles.stepTitle}>Randevu Tipi</Text>
                {selectedType && <View style={styles.checkmarkBadge}><Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} /></View>}
              </View>
              <View style={styles.card}>
                <View style={styles.cardTopAccent} />
                {appointmentTypes.map((type, index) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[styles.optionButton, selectedType?.id === type.id && styles.selectedOptionButton, index !== 0 && { marginTop: 12 }]}
                    onPress={() => { setSelectedType(type); setSelectedTime(''); }} activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.optionLeft}>
                        <View style={[styles.optionIconContainer, selectedType?.id === type.id && styles.selectedIconContainer]}>
                          <Ionicons name="time" size={20} color={selectedType?.id === type.id ? COLORS.WHITE : COLORS.PRIMARY} />
                        </View>
                        <View style={styles.optionTextContainer}>
                          <Text style={selectedType?.id === type.id ? styles.selectedOptionText : styles.optionText}>{type.name}</Text>
                          <Text style={selectedType?.id === type.id ? styles.selectedOptionSubText : styles.optionSubText}>{type.durationMinutes} Dakika</Text>
                        </View>
                      </View>
                      {selectedType?.id === type.id && <View style={styles.selectedIndicator}><Ionicons name="checkmark-circle" size={26} color={COLORS.PRIMARY} /></View>}
                    </View>
                    {selectedType?.id === type.id && <View style={styles.selectedUnderline} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 3. Adım: Saat Seçimi */}
          {selectedType && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <LinearGradient colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]} style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></LinearGradient>
                <Text style={styles.stepTitle}>Saat Seçin</Text>
                {selectedTime && <View style={styles.checkmarkBadge}><Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} /></View>}
              </View>
              <View style={styles.card}>
                <View style={styles.cardTopAccent} />
                {loadingSlots ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                    <Text style={styles.loadingSlotText}>Uygun saatler kontrol ediliyor...</Text>
                  </View>
                ) : (
                  <View style={styles.timeSlotsContainer}>
                    {timeSlotsStatus.length > 0 && timeSlotsStatus.some(s => s.status === 'available') ? (
                      timeSlotsStatus.map((slot) => (
                        <TouchableOpacity
                          key={slot.time}
                          style={[
                            styles.timeSlot,
                            slot.status === 'available' ? styles.availableTimeSlot : styles.unavailableTimeSlot,
                            selectedTime === slot.time && styles.selectedTimeSlot
                          ]}
                          onPress={() => setSelectedTime(slot.time)}
                          disabled={slot.status === 'unavailable'}
                          activeOpacity={0.7}
                        >
                          {selectedTime === slot.time ? (
                            <LinearGradient colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]} style={styles.timeSlotGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                              <Ionicons name="checkmark-circle" size={18} color={COLORS.WHITE} />
                              <Text style={styles.selectedTimeText}>{slot.time}</Text>
                            </LinearGradient>
                          ) : (
                            <>
                              <Text style={[styles.timeText, slot.status === 'available' ? styles.availableTimeText : styles.unavailableTimeText]}>{slot.time}</Text>
                              {slot.status === 'available' && <View style={styles.availableDot} />}
                            </>
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}><Ionicons name="calendar-outline" size={48} color={COLORS.TEXT_LIGHT} /></View>
                        <Text style={styles.emptyText}>Bu tarih için uygun saat bulunamadı</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconContainer}><Ionicons name="alert-circle" size={22} color={COLORS.DANGER} /></View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Özet Kartı */}
          {selectedDate && selectedType && selectedTime && (
            <View style={styles.summaryCard}>
              <LinearGradient colors={[COLORS.PRIMARY_LIGHT, COLORS.WHITE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryGradient}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="document-text" size={22} color={COLORS.PRIMARY} />
                  <Text style={styles.summaryTitle}>Randevu Özeti</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconBox}><Ionicons name="calendar" size={18} color={COLORS.PRIMARY} /></View>
                  <View style={styles.summaryTextContainer}><Text style={styles.summaryLabel}>Tarih</Text><Text style={styles.summaryText}>{selectedDate}</Text></View>
                </View>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconBox}><Ionicons name="time" size={18} color={COLORS.PRIMARY} /></View>
                  <View style={styles.summaryTextContainer}><Text style={styles.summaryLabel}>Saat & Tip</Text><Text style={styles.summaryText}>{selectedTime} - {selectedType.name}</Text></View>
                </View>
              </LinearGradient>
            </View>
          )}
          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      {/* Onay Butonu */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, (!selectedDate || !selectedTime || !selectedType || loadingConfirm) && styles.disabledButton]}
          onPress={handleConfirmAppointment}
          disabled={!selectedDate || !selectedTime || !selectedType || loadingConfirm}
          activeOpacity={0.8}
        >
          {loadingConfirm ? (
            <View style={styles.confirmButtonContent}><ActivityIndicator size="small" color={COLORS.WHITE} /></View>
          ) : (
            <LinearGradient colors={(!selectedDate || !selectedTime || !selectedType) ? [COLORS.DISABLED, COLORS.DISABLED] : [COLORS.SUCCESS, '#229954']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmButtonGradient}>
              <Ionicons name="checkmark-circle-outline" size={26} color={COLORS.WHITE} />
              <Text style={styles.confirmButtonText}>Randevuyu Onayla</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AppointmentScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.BACKGROUND },
  loadingGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingCard: { backgroundColor: COLORS.WHITE, padding: 40, borderRadius: 24, alignItems: 'center', elevation: 10, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  loadingText: { marginTop: 20, fontSize: 16, fontWeight: '600', color: COLORS.TEXT },
  header: { paddingTop: 20, paddingBottom: 30, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 12, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, overflow: 'hidden', position: 'relative' },
  decorativeCircle1: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)', top: -50, right: -30 },
  decorativeCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)', bottom: -20, left: -20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  doctorIconContainer: { width: 70, height: 70, borderRadius: 35, marginRight: 16, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  iconGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.WHITE, marginBottom: 6, letterSpacing: 0.5 },
  clinicBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  headerSubtitle: { fontSize: 13, color: COLORS.WHITE, fontWeight: '600', marginLeft: 6 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  stepContainer: { marginTop: 20, paddingHorizontal: 20 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 4, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  stepBadgeText: { color: COLORS.WHITE, fontSize: 17, fontWeight: 'bold' },
  stepTitle: { fontSize: 19, fontWeight: 'bold', color: COLORS.TEXT, flex: 1, letterSpacing: 0.3 },
  checkmarkBadge: { marginLeft: 'auto' },
  card: { backgroundColor: COLORS.WHITE, borderRadius: 24, padding: 20, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, overflow: 'hidden', position: 'relative' },
  cardTopAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: COLORS.PRIMARY },
  optionButton: { borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.BORDER, backgroundColor: COLORS.WHITE, position: 'relative' },
  selectedOptionButton: { borderColor: COLORS.PRIMARY, elevation: 4, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
  optionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  optionIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center' },
  selectedIconContainer: { backgroundColor: COLORS.PRIMARY },
  optionTextContainer: { marginLeft: 14, flex: 1 },
  optionText: { fontSize: 16, fontWeight: '600', color: COLORS.TEXT, marginBottom: 4 },
  selectedOptionText: { fontSize: 16, fontWeight: '700', color: COLORS.PRIMARY, marginBottom: 4 },
  optionSubText: { fontSize: 13, color: COLORS.TEXT_LIGHT, fontWeight: '500' },
  selectedOptionSubText: { fontSize: 13, color: COLORS.PRIMARY, fontWeight: '600' },
  selectedIndicator: { marginLeft: 12 },
  selectedUnderline: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: COLORS.PRIMARY, borderRadius: 2 },
  timeSlotsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 10 },
  timeSlot: { paddingVertical: 14, paddingHorizontal: 18, borderWidth: 2, borderRadius: 16, minWidth: 85, alignItems: 'center', position: 'relative' },
  availableTimeSlot: { borderColor: COLORS.SUCCESS, backgroundColor: COLORS.SUCCESS_LIGHT },
  unavailableTimeSlot: { borderColor: COLORS.DISABLED, backgroundColor: '#F8F9FA', opacity: 0.5 },
  selectedTimeSlot: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY, padding: 0, elevation: 6, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8 },
  timeSlotGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, gap: 6 },
  timeText: { fontSize: 15, fontWeight: '700' },
  availableTimeText: { color: COLORS.SUCCESS },
  unavailableTimeText: { color: COLORS.TEXT_LIGHT, textDecorationLine: 'line-through' },
  selectedTimeText: { color: COLORS.WHITE, fontSize: 15, fontWeight: '700' },
  availableDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.SUCCESS },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingSlotText: { marginTop: 16, fontSize: 15, color: COLORS.TEXT_LIGHT, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 15, color: COLORS.TEXT_LIGHT, textAlign: 'center', fontWeight: '500', maxWidth: 250 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FED7D7', elevation: 2, shadowColor: COLORS.DANGER, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  errorIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.DANGER, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  errorText: { color: COLORS.DANGER, fontSize: 14, flex: 1, fontWeight: '500', lineHeight: 20 },
  summaryCard: { marginHorizontal: 20, marginTop: 24, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  summaryGradient: { padding: 20 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.PRIMARY, marginLeft: 10, letterSpacing: 0.3 },
  summaryDivider: { height: 2, backgroundColor: COLORS.PRIMARY, opacity: 0.2, marginBottom: 16, borderRadius: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  summaryIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.WHITE, justifyContent: 'center', alignItems: 'center', marginRight: 14, elevation: 2, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  summaryTextContainer: { flex: 1 },
  summaryLabel: { fontSize: 12, color: COLORS.TEXT_LIGHT, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { fontSize: 15, color: COLORS.TEXT, fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.WHITE, borderTopWidth: 1, borderTopColor: COLORS.BORDER, elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12 },
  confirmButton: { height: 60, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: COLORS.SUCCESS, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  confirmButtonContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.DISABLED },
  confirmButtonGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  confirmButtonText: { color: COLORS.WHITE, fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  disabledButton: { elevation: 0, shadowOpacity: 0 },
});