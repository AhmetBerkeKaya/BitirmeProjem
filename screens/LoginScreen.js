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
  Alert, // 'Şifremi Unuttum' için gerekli
  StatusBar
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Sıfırdan kurduğumuz config
import { Ionicons } from '@expo/vector-icons'; // İkonlar için

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

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI/UX state'leri
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      await signInWithEmailAndPassword(auth, email, password);
      // Başarılı girişten sonra App.js'teki onAuthStateChanged
      // navigasyonu otomatik olarak AppStack'e (ClinicList) geçirecek.
      console.log('Giriş başarılı:', email);
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('E-posta veya şifre hatalı.');
      } else {
        setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
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
    setLoading(true); // Yüklemeyi başlat

    sendPasswordResetEmail(auth, email)
      .then(() => {
        setLoading(false);
        Alert.alert(
          'E-posta Gönderildi',
          'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
        );
      })
      .catch((err) => {
        setLoading(false);
        if (err.code === 'auth/user-not-found') {
          setError('Bu e-posta adresine kayıtlı bir kullanıcı bulunamadı.');
        } else {
          setError('Şifre sıfırlama e-postası gönderilemedi.');
        }
      });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="pulse-outline" size={80} color={COLORS.PRIMARY} />
          </View>

          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Lütfen hesabınıza giriş yapın.</Text>

          {/* Hata Mesajı Alanı */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* E-posta Girişi */}
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

          {/* Şifre Girişi */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.TEXT_LIGHT} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={COLORS.TEXT_LIGHT}
              value={password}
              onChangeText={setPassword}
              secureTextEntry // Şifreyi gizler
            />
          </View>
          
          {/* Şifremi Unuttum Linki */}
          <TouchableOpacity onPress={handlePasswordReset} style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
          </TouchableOpacity>

          {/* Giriş Yap Butonu */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
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

// --- YENİ UI/UX STİLLERİ ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND, // Arkaplan rengi App.js ile uyumlu
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5, // Hafif gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    height: 55, // Biraz daha yüksek
    backgroundColor: COLORS.WHITE, // İçi beyaz
    borderRadius: 12, // Daha yumuşak kenar
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1, // Kenarlık
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
  forgotPasswordButton: {
    alignSelf: 'flex-end', // Sağa yasla
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 30, // Tam yuvarlak kenar
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.PRIMARY, // Gölge ana renkte
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
  signupContainer: {
    flexDirection: 'row',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
  signupText: {
    fontSize: 15,
    color: COLORS.TEXT_LIGHT,
  },
  signupLink: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default LoginScreen;