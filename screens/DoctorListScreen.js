import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const DoctorListScreen = ({ route, navigation }) => {
  const { departmentId, departmentName } = route.params;
  const [doctors, setDoctors] = useState([]);
  const db = getFirestore();

  useEffect(() => {
    navigation.setOptions({ title: departmentName });
    const fetchDoctors = async () => {
      const q = query(collection(db, 'doctors'), where('departmentId', '==', departmentId));
      const querySnapshot = await getDocs(q);
      const doctorList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDoctors(doctorList);
    };
    fetchDoctors();
  }, [departmentId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={doctors}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.itemContainer}
            onPress={() => navigation.navigate('Appointment', { doctorId: item.id, doctorName: item.name })}
          >
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.specialty}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
export default DoctorListScreen;
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0' },
    itemContainer: { backgroundColor: 'white', padding: 20, marginVertical: 8, marginHorizontal: 16, borderRadius: 10, elevation: 3 },
    itemTitle: { fontSize: 18, fontWeight: 'bold' },
    itemSubtitle: { fontSize: 14, color: 'gray', marginTop: 4 },
});