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
  StatusBar
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Firestore'a yazmak için
import { auth, db } from '../firebaseConfig'; // Sıfırdan kurduğumuz config
import { Ionicons } from '@expo/vector-icons';

// --- YENİ RENK PALETİ ---
const COLORS = {
  PRIMARY: '#00BFA6',     // Turkuaz (Ana renk)
  BACKGROUND: '#F5F9FC', // Çok hafif soğuk gri
  WHITE: '#FFFFFF',        // Kart Arkaplanı
  TEXT: '#2C3E50',         // Koyu Metin Rengi
  TEXT_LIGHT: '#5D6D7E',  // Açık Metin Rengi
  BORDER: '#EAECEE',      // Kenarlık Rengi
  DANGER: '#e74c3c',      // Hata Rengi
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
        birthPlace: "",
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
      // navigasyonu otomatik olarak AppStack'e (ClinicList) geçirecek.

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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Geri Butonu */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={28} color={COLORS.TEXT} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          <Text style={styles.title}>Yeni Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Devam etmek için bilgilerinizi girin.</Text>

          {/* Hata Mesajı Alanı */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Form Alanları */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="TC Kimlik Numarası"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              value={tcNo}
              onChangeText={setTcNo}
              keyboardType="numeric"
              maxLength={11}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Telefon (5xxxxxxxxx)"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-posta Adresi"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre (En az 6 karakter)"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor={COLORS.TEXT_LIGHT}
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
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <Text style={styles.buttonText}>Hesap Oluştur</Text>
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

// --- Stiller (LoginScreen ile çok benzer) ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  container: {
    flex: 1,
  },
  // Geri butonu (Header'ı kapattığımız için manuel ekledik)
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 20 : 50, // Android/iOS uyumu
    left: 20,
    zIndex: 10,
    padding: 5,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    paddingTop: 80, // Geri butonunun altına
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_LIGHT,
    marginBottom: 25,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.DANGER,
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 55,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: COLORS.TEXT,
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10, // Form ile buton arası boşluk
    elevation: 3,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: COLORS.TEXT_LIGHT,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  loginText: {
    fontSize: 15,
    color: COLORS.TEXT_LIGHT,
  },
  loginLink: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default SignUpScreen;