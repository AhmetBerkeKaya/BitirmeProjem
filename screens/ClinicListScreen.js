import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';

const ClinicListScreen = ({ navigation }) => {
  const [clinics, setClinics] = useState([]);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const fetchClinics = async () => {
      const clinicsCollection = collection(db, 'clinics');
      const clinicSnapshot = await getDocs(clinicsCollection);
      const clinicList = clinicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClinics(clinicList);
    };
    fetchClinics();
  }, []);

  const handleLogout = () => {
    signOut(auth).catch(error => console.error(error));
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={clinics}
        keyExtractor={item => item.id}
        ListHeaderComponent={<Text style={styles.header}>Lütfen Bir Klinik Seçin</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => navigation.navigate('DepartmentList', { clinicId: item.id, clinicName: item.name })}
          >
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSubtitle}>{item.location}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={styles.logoutButton}>
        <Button title="Çıkış Yap" onPress={handleLogout} color="red" />
      </View>
    </View>
  );
};
export default ClinicListScreen;
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0' },
    header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
    itemContainer: { backgroundColor: 'white', padding: 20, marginVertical: 8, marginHorizontal: 16, borderRadius: 10, elevation: 3 },
    itemTitle: { fontSize: 18, fontWeight: 'bold' },
    itemSubtitle: { fontSize: 14, color: 'gray', marginTop: 4 },
    logoutButton: { margin: 20 }
});