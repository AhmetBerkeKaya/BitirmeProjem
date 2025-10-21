import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const AppointmentScreen = ({ route, navigation }) => {
  const { doctorId, doctorName } = route.params;
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const db = getFirestore();
  const auth = getAuth();

  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];

  const handleConfirmAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert("Hata", "Lütfen bir tarih ve saat seçin.");
      return;
    }
    const user = auth.currentUser;
    if (user) {
      try {
        await addDoc(collection(db, "appointments"), {
          patientId: user.uid,
          doctorId: doctorId,
          date: selectedDate,
          time: selectedTime,
          createdAt: serverTimestamp(),
          status: 'confirmed'
        });
        Alert.alert(
          "Başarılı",
          `Dr. ${doctorName} için ${selectedDate} ${selectedTime} tarihli randevunuz oluşturuldu.`,
          [{ text: "Tamam", onPress: () => navigation.popToTop() }]
        );
      } catch (e) {
        Alert.alert("Hata", "Randevu oluşturulurken bir sorun oluştu.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Dr. {doctorName} için Randevu</Text>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{ [selectedDate]: { selected: true, selectedColor: 'blue' } }}
        minDate={new Date().toISOString().split('T')[0]}
      />
      {selectedDate && (
        <View style={styles.timeContainer}>
          <Text style={styles.timeHeader}>Uygun Saatler</Text>
          <View style={styles.timeSlots}>
            {timeSlots.map(time => (
              <TouchableOpacity
                key={time}
                style={[styles.timeSlot, selectedTime === time && styles.selectedTimeSlot]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[styles.timeText, selectedTime === time && styles.selectedTimeText]}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <Button
          title="Randevuyu Onayla"
          onPress={handleConfirmAppointment}
          disabled={!selectedDate || !selectedTime}
        />
      </View>
    </View>
  );
};
export default AppointmentScreen;
const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: 'white' },
    header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
    timeContainer: { marginTop: 20 },
    timeHeader: { fontSize: 18, fontWeight: '600', marginBottom: 10, marginLeft: 5 },
    timeSlots: { flexDirection: 'row', flexWrap: 'wrap' },
    timeSlot: { padding: 10, borderWidth: 1, borderColor: 'blue', borderRadius: 5, margin: 5 },
    selectedTimeSlot: { backgroundColor: 'blue' },
    timeText: { color: 'blue' },
    selectedTimeText: { color: 'white' },
    buttonContainer: { marginTop: 'auto', marginBottom: 20 }
});