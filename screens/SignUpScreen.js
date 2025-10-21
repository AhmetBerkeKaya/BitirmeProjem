import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = () => {
    if (email.length === 0 || password.length === 0) {
      Alert.alert("Hata", "Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }
    const auth = getAuth();
    createUserWithEmailAndPassword(auth, email, password)
      .then(userCredentials => {
        Alert.alert("Başarılı", "Kayıt işlemi başarıyla tamamlandı!");
      })
      .catch(error => {
        let errorMessage = "Bir hata oluştu.";
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'Bu e-posta zaten kullanılıyor!';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Geçersiz e-posta adresi!';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Şifre en az 6 karakter olmalıdır!';
        }
        Alert.alert("Kayıt Başarısız", errorMessage);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kayıt Ol</Text>
      <TextInput
        placeholder="E-posta"
        value={email}
        onChangeText={text => setEmail(text)}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Şifre"
        value={password}
        onChangeText={text => setPassword(text)}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Kayıt Ol" onPress={handleSignUp} />
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Zaten hesabın var mı? Giriş Yap</Text>
      </TouchableOpacity>
    </View>
  );
};
export default SignUpScreen;
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '100%', height: 50, borderColor: 'gray', borderWidth: 1, borderRadius: 5, marginBottom: 15, paddingHorizontal: 10 },
  linkText: { marginTop: 20, color: 'blue' },
});