import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator, // Yükleme göstergesi
  KeyboardAvoidingView, // Klavye için
  Platform, // iOS/Android tespiti
  SafeAreaView, // Ekran çentikleri için
  Image, // Logo için
  Alert, // Sadece 'Şifremi Unuttum' için
  ScrollView // <-- EKSİK OLAN BUYDU, ŞİMDİ EKLENDİ
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Hazırladığımız config'den 'auth'u import et
import { Ionicons } from '@expo/vector-icons'; // İkonlar

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

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // --- UI/UX State'leri ---
  const [loading, setLoading] = useState(false); // Giriş yap butonu yükleniyor
  const [error, setError] = useState(''); // Hata mesajı

  /**
   * Giriş Yapma Fonksiyonu
   */
  const handleLogin = async () => {
    if (email === '' || password === '') {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Firebase'e giriş yapmayı dene
      await signInWithEmailAndPassword(auth, email, password);
      // Başarılı girişten sonra App.js'teki onAuthStateChanged
      // 'user' state'ini güncelleyeceği için navigasyon otomatik olarak
      // AppStack'e (yani ClinicList'e) geçecek.
      console.log('Giriş başarılı:', email);
    } catch (err) {
      // Hata yönetimi
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-posta veya şifre hatalı.');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false); // Yüklemeyi bitir
    }
  };

  /**
   * Şifre Sıfırlama Fonksiyonu
   */
  const handlePasswordReset = () => {
    if (email === '') {
      setError('Şifre sıfırlama için lütfen e-posta adresinizi girin.');
      return;
    }
    setError('');
    
    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert(
          'E-posta Gönderildi',
          'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
        );
      })
      .catch((err) => {
        if (err.code === 'auth/user-not-found') {
          setError('Bu e-posta adresine kayıtlı bir kullanıcı bulunamadı.');
        } else {
          setError('Şifre sıfırlama e-postası gönderilemedi.');
        }
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* BU BİLEŞEN IMPORT EDİLMEMİŞTİ */}
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* Logo (Kendi logonuzu assets'ten ekleyebilirsiniz) */}
          <View style={styles.logoContainer}>
            <Ionicons name="medkit" size={80} color={COLORS.primary} />
            <Text style={styles.logoTitle}>Klinik Randevu</Text>
          </View>

          <Text style={styles.title}>Hasta Girişi</Text>

          {/* Hata Mesajı Alanı */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* E-posta Girişi */}
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

          {/* Şifre Girişi */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.darkGray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={COLORS.darkGray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry // Şifreyi gizler
            />
          </View>
          
          {/* Şifremi Unuttum Linki */}
          <TouchableOpacity onPress={handlePasswordReset}>
            <Text style={styles.forgotPassword}>Şifremi unuttum</Text>
          </TouchableOpacity>

          {/* Giriş Yap Butonu */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          {/* Kayıt Ol Linki */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={[styles.signupText, styles.signupLink]}>Kayıt Olun</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- UI/UX Cilası (Stiller) ---
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 20,
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
  forgotPassword: {
    color: COLORS.primary,
    fontSize: 14,
    textAlign: 'right',
    width: '100%',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3, // Android gölge
    shadowColor: '#000', // iOS gölge
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonDisabled: {
    backgroundColor: COLORS.darkGray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  signupText: {
    fontSize: 15,
    color: COLORS.darkGray,
  },
  signupLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default LoginScreen;