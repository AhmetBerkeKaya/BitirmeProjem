import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Firestore'a yazmak için
import { auth, db } from '../firebaseConfig'; // Hazırladığımız config'den 'auth' VE 'db'yi import et
import { Ionicons } from '@expo/vector-icons';

// Renk paletimiz
const COLORS = {
  primary: '#007bff',
  lightGray: '#f8f9fa',
  darkGray: '#6c757d',
  white: '#ffffff',
  danger: '#dc3545',
  text: '#343a40',
  textLight: '#495057'
};

const SignUpScreen = ({ navigation }) => {
  // --- Form State'leri (Mimariye uygun) ---
  const [fullName, setFullName] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // --- UI/UX State'leri ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Kayıt Olma Fonksiyonu (Auth + Firestore)
   */
  const handleSignUp = async () => {
    setError(''); // Hataları temizle

    // --- 1. Validasyon (Form Doğrulama) ---
    if (!fullName || !tcNo || !phone || !email || !password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    if (tcNo.length !== 11 || !/^[0-9]+$/.test(tcNo)) {
      setError('Geçerli bir TC Kimlik Numarası girin (11 Hane).');
      return;
    }
    if (phone.length < 10 || !/^[0-9]+$/.test(phone)) {
        setError('Geçerli bir telefon numarası girin (Örn: 5xxxxxxxxx).');
        return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler uyuşmuyor.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      // --- 2. Adım: Firebase Authentication Kaydı ---
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('Auth kaydı başarılı:', user.uid);

      // --- 3. Adım: Firestore Veritabanı Kaydı (MİMARİNİN KALBİ) ---
      // 'patients' (Kaynak 15) koleksiyonuna yeni dokümanı Auth UID'si ile oluştur.
      const patientRef = doc(db, 'patients', user.uid);
      
      const patientData = {
        // Formdan gelen bilgiler
        fullName: fullName,
        tcNo: tcNo,
        phone: phone,
        email: email.toLowerCase(),
        
        // Şema (Kaynak 15) için varsayılan değerler
        clinicId: null, // Henüz bir klinik seçmedi
        birthDate: "",
        gender: "",
        address: "",
        status: "active",
        isAnamnezCompleted: false,
        createdAt: new Date().toISOString(), // Kayıt tarihi
        updatedAt: new Date().toISOString()
      };

      // Bilgiyi Firestore'a yaz
      await setDoc(patientRef, patientData);
      
      console.log('Firestore (patients) kaydı başarılı:', user.uid);
      
      // Başarılı kayıttan sonra App.js'teki onAuthStateChanged
      // 'user' state'ini güncelleyeceği için navigasyon otomatik olarak
      // AppStack'e (yani ClinicList'e) geçecek.
      // Bizim burada navigation.navigate dememize GEREK YOK.

    } catch (err) {
      // Hata yönetimi
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kullanılıyor.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Geçersiz bir e-posta adresi girdiniz.');
      } else {
        setError('Kayıt sırasında bir hata oluştu.');
        console.error("Kayıt hatası:", err);
      }
    } finally {
      setLoading(false); // Yüklemeyi bitir
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          <Text style={styles.title}>Yeni Hasta Kaydı</Text>
          <Text style={styles.subtitle}>Devam etmek için bilgilerinizi girin.</Text>

          {/* Hata Mesajı Alanı */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Form Alanları */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor={COLORS.darkGray}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="TC Kimlik Numarası"
              placeholderTextColor={COLORS.darkGray}
              value={tcNo}
              onChangeText={setTcNo}
              keyboardType="numeric"
              maxLength={11}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Telefon (5xxxxxxxxx)"
              placeholderTextColor={COLORS.darkGray}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-posta Adresi"
              placeholderTextColor={COLORS.darkGray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre (En az 6 karakter)"
              placeholderTextColor={COLORS.darkGray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor={COLORS.darkGray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
          
          {/* Kayıt Ol Butonu */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>

          {/* Giriş Yap Linki */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginText, styles.loginLink]}>Giriş Yapın</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Stiller ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30, // Üst boşluk
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 25,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10, // Form ile buton arası boşluk
  },
  buttonDisabled: {
    backgroundColor: COLORS.darkGray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    marginTop: 25,
  },
  loginText: {
    fontSize: 15,
    color: COLORS.darkGray,
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default SignUpScreen;
