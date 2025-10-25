import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView, 
  ActivityIndicator, 
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

// Renk paletimiz
const COLORS = {
  primary: '#007bff', 
  lightGray: '#f8f9fa',
  darkGray: '#6c757d',
  white: '#ffffff',
  danger: '#dc3545', 
  text: '#343a40',
  disabled: '#e9ecef',
  success: '#28a745' 
};

// Sabitler
const BASE_SLOT_MINUTES = 30;
const ALL_DAY_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];


const AppointmentScreen = ({ route, navigation }) => {
  // DoctorList'ten gelen parametreler (GÜNCELLENDİ)
  const { doctorId, doctorName, clinicId, clinicName } = route.params; // clinicName eklendi

  // State'ler
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

  /**
   * 1. FONKSİYON: İlk Verileri Çek (Hasta Bilgisi + Randevu Tipleri)
   * (Bu fonksiyonda değişiklik yok)
   */
  useEffect(() => {
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
        const typesQuery = query(typesCollection, where('status', '==', 'active')); 
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
  }, []); 


  /**
   * 2. FONKSİYON: Dinamik Saatleri Hesapla (Madde 8: Kırmızı/Yeşil)
   * (Bu fonksiyonda değişiklik yok)
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
        const newAppointmentDuration = selectedType.durationMinutes; 
        const slotsNeeded = Math.ceil(newAppointmentDuration / BASE_SLOT_MINUTES);
        const statusList = ALL_DAY_SLOTS.map((slot, i) => {
          let status = 'available'; 
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
   * 3. FONKSİYON: Randevuyu Onayla (GÜNCELLENDİ)
   */
  const handleConfirmAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedType || !patientInfo || !clinicId) {
      setError("Lütfen tarih, randevu tipi ve saat seçin. Klinik ID eksik.");
      return;
    }
    
    setLoadingConfirm(true);
    setError('');
    
    try {
      // 'appointments' (Kaynak 4) şemasına 'clinicId' ekliyoruz
      const appointmentData = {
        clinicId: clinicId, // Artık clinicId'yi kaydediyoruz
        patientId: auth.currentUser.uid,
        patientName: patientInfo.fullName, 
        patientPhone: patientInfo.phone, 
        doctorId: doctorId,
        dateISO: selectedDate, 
        start: selectedTime, 
        typeId: selectedType.id, 
        typeName: selectedType.name, 
        durationMinutes: selectedType.durationMinutes, 
        status: 'pending', // (Web'de 'confirmed' olarak değiştirilmeli)
        isQuickReservation: false, 
        notes: "Mobil uygulama üzerinden alındı.", 
        createdAt: new Date().toISOString() 
      };

      await addDoc(collection(db, "appointments"), appointmentData);

      Alert.alert(
        "Randevu Başarılı",
        `Dr. ${doctorName} için ${selectedDate} ${selectedTime} tarihli randevunuz başarıyla oluşturuldu.`,
        [{ 
          text: "Tamam", 
          // KRİTİK DÜZELTME: 'navigate' ile yeni ekran açmak yerine,
          // stack'te 3 ekran geri giderek (Appt -> DocList -> DeptList)
          // *orijinal* Dashboard'a dönüyoruz.
          onPress: () => navigation.pop(3) 
        }] 
      );
      
    } catch (e) {
      console.error("Randevu kaydı hatası:", e);
      setError("Randevu oluşturulurken bir sorun oluştu: " + e.message);
    } finally {
      setLoadingConfirm(false);
    }
  };

  // --- RENDER (UI) (Aynı) ---
  
  if (loadingInitial) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Randevu Bilgileri Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Dr. {doctorName}</Text>
        
        {/* 1. Adım: Takvim */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>1. Tarih Seçin</Text>
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setSelectedTime(''); 
              setSelectedType(null); 
            }}
            markedDates={{ [selectedDate]: { selected: true, selectedColor: COLORS.primary } }}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
                todayTextColor: COLORS.primary,
                arrowColor: COLORS.primary,
            }}
          />
        </View>

        {/* 2. Adım: Randevu Tipi (Kaynak 3) */}
        {selectedDate && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>2. Randevu Tipi Seçin</Text>
            {appointmentTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionButton,
                  selectedType?.id === type.id && styles.selectedOptionButton
                ]}
                onPress={() => {
                  setSelectedType(type);
                  setSelectedTime(''); 
                }}
              >
                <Text style={selectedType?.id === type.id ? styles.selectedOptionText : styles.optionText}>
                  {type.name}
                </Text>
                <Text style={selectedType?.id === type.id ? styles.selectedOptionSubText : styles.optionSubText}>
                  {type.durationMinutes} Dakika
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 3. Adım: Saat Seçimi (Madde 8: Kırmızı/Yeşil) */}
        {selectedType && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>3. Saat Seçin</Text>
            {loadingSlots ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.timeSlotsContainer}>
                {timeSlotsStatus.length > 0 ? (
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
                    >
                      <Text style={[
                        styles.timeText, 
                        slot.status === 'available' ? styles.availableTimeText : styles.unavailableTimeText,
                        selectedTime === slot.time && styles.selectedTimeText
                      ]}>
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.infoText}>Bu tarih için uygun saat bulunamadı.</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Hata Mesajı */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Onay Butonu */}
        <TouchableOpacity
          style={[styles.confirmButton, (!selectedDate || !selectedTime || !selectedType || loadingConfirm) && styles.disabledButton]}
          onPress={handleConfirmAppointment}
          disabled={!selectedDate || !selectedTime || !selectedType || loadingConfirm}
        >
          {loadingConfirm ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.confirmButtonText}>Randevuyu Onayla</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default AppointmentScreen;
// --- Stiller (Aynı) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.lightGray },
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { marginTop: 10, fontSize: 16, color: COLORS.darkGray },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: COLORS.primary,
  },
  optionButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.disabled,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectedOptionButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: { fontSize: 16, fontWeight: '500', color: COLORS.text },
  selectedOptionText: { fontSize: 16, fontWeight: '500', color: COLORS.white },
  optionSubText: { fontSize: 14, color: COLORS.darkGray },
  selectedOptionSubText: { fontSize: 14, color: COLORS.lightGray },
  
  timeSlotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  timeSlot: { 
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
    margin: 4,
  },
  availableTimeSlot: {
    borderColor: COLORS.success,
  },
  unavailableTimeSlot: {
    borderColor: COLORS.danger,
    backgroundColor: '#fff8f8', 
  },
  selectedTimeSlot: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  
  timeText: { 
    fontSize: 14,
    fontWeight: '600'
  },
  availableTimeText: {
    color: COLORS.success,
  },
  unavailableTimeText: {
    color: COLORS.danger,
    textDecorationLine: 'line-through' 
  },
  selectedTimeText: {
    color: COLORS.white,
  },
  
  infoText: {
    fontSize: 15,
    color: COLORS.darkGray,
    textAlign: 'center',
    margin: 10,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    marginHorizontal: 15,
    marginBottom: 10,
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: COLORS.success, 
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    marginBottom: 20,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: COLORS.darkGray,
  },
});