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
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  Keyboard // EKLENDİ: Klavye kontrolü için
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// --- GELECEĞİN SAĞLIĞI PALETİ ---
const COLORS = {
  BG_START: '#0F172A',
  BG_END: '#1E293B',

  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',

  GLASS_BG: 'rgba(30, 41, 59, 0.7)',
  INPUT_BG: 'rgba(15, 23, 42, 0.6)',

  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  BORDER: 'rgba(148, 163, 184, 0.2)',
  DANGER: '#FF4757',
};

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // DÜZELTME: Giriş butonuna basınca klavyeyi kapat
    Keyboard.dismiss();

    if (email === '' || password === '') {
      setError('E-posta ve şifre gereklidir.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Giriş başarısız. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = () => {
    Keyboard.dismiss(); // Şifre sıfırlarken de klavyeyi kapat
    if (email === '') {
      setError('Sıfırlama linki için e-posta girin.');
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => Alert.alert(
        'Sıfırlama Bağlantısı Gönderildi',
        'Lütfen e-posta kutunuzu kontrol edin. Gelen bağlantıya tıklayarak yeni şifrenizi oluşturabilirsiniz. (Spam/Gereksiz kutusunu kontrol etmeyi unutmayın.)',
        [{ text: 'Tamam' }]
      )).catch((error) => {
        // Firebase hata kodlarını daha anlaşılır hale getirebiliriz
        if (error.code === 'auth/user-not-found') {
          setError('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Geçersiz e-posta formatı.');
        } else {
          setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        }
      });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />

      <LinearGradient
        colors={[COLORS.BG_START, COLORS.BG_END]}
        style={styles.backgroundGradient}
      />

      <View style={styles.glowBlobTop} />
      <View style={styles.glowBlobBottom} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

          {/* HEADER ALANI */}
          <View style={styles.headerArea}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
                style={styles.logoGradient}
              >
                <Ionicons name="medical" size={42} color="#FFF" />
              </LinearGradient>
              <View style={styles.logoGlow} />
            </View>

            <Text style={styles.welcomeTitle}>RTM KLİNİK</Text>
            <Text style={styles.welcomeSub}>Geleceğin Sağlık Teknolojisi</Text>
          </View>

          {/* CAM KART (GLASS CARD) */}
          <View style={styles.glassCard}>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={18} color={COLORS.DANGER} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* INPUT: EMAIL */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-POSTA</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color={COLORS.ACCENT_START} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="ornek@mail.com"
                  placeholderTextColor={COLORS.TEXT_SEC}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next" // Klavyede "İleri" tuşu göster
                />
              </View>
            </View>

            {/* INPUT: PASSWORD */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>ŞİFRE</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key" size={20} color={COLORS.ACCENT_START} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.TEXT_SEC}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="go" // Klavyede "Git/Giriş" tuşu göster
                  onSubmitEditing={handleLogin} // DÜZELTME: Enter'a basınca giriş yap
                />
              </View>
            </View>

            {/* ŞİFREMİ UNUTTUM */}
            <TouchableOpacity onPress={handlePasswordReset} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Şifrenizi mi unuttunuz?</Text>
            </TouchableOpacity>

            {/* GİRİŞ BUTONU */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading}
              style={styles.loginBtnContainer}
            >
              <LinearGradient
                colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.loginBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.loginBtnText}>GİRİŞ YAP</Text>
                )}
              </LinearGradient>
              <View style={styles.btnGlow} />
            </TouchableOpacity>

          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Henüz hesabınız yok mu?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupText}> Kayıt Olun</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },

  glowBlobTop: {
    position: 'absolute', top: -100, right: -50,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.ACCENT_START, opacity: 0.15,
    transform: [{ scaleX: 1.5 }]
  },
  glowBlobBottom: {
    position: 'absolute', bottom: -100, left: -50,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: COLORS.ACCENT_END, opacity: 0.1,
    transform: [{ scaleY: 1.2 }]
  },

  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },

  headerArea: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { position: 'relative', marginBottom: 20 },
  logoGradient: {
    width: 90, height: 90, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  logoGlow: {
    position: 'absolute', top: 10, left: 10, right: 10, bottom: 10,
    backgroundColor: COLORS.ACCENT_START, borderRadius: 30, opacity: 0.6,
    zIndex: 1, transform: [{ scale: 1.2 }], blurRadius: 20
  },
  welcomeTitle: {
    fontSize: 32, fontWeight: '800', color: COLORS.TEXT_MAIN, letterSpacing: 2,
    textShadowColor: 'rgba(0, 242, 195, 0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10
  },
  welcomeSub: { fontSize: 14, color: COLORS.ACCENT_START, letterSpacing: 1, marginTop: 5, fontWeight: '600', opacity: 0.8 },

  glassCard: {
    backgroundColor: COLORS.GLASS_BG,
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: COLORS.BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 71, 87, 0.15)',
    padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.3)'
  },
  errorText: { color: '#FF6B6B', marginLeft: 8, fontSize: 13, fontWeight: '600' },

  inputContainer: { marginBottom: 20 },
  inputLabel: { color: COLORS.TEXT_SEC, fontSize: 12, fontWeight: 'bold', marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: 16, height: 56, paddingHorizontal: 16,
    borderWidth: 1, borderColor: COLORS.BORDER
  },
  input: { flex: 1, height: '100%', color: COLORS.TEXT_MAIN, fontSize: 16 },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 30, marginRight: 4 },
  forgotText: { color: COLORS.TEXT_SEC, fontSize: 13, textDecorationLine: 'underline' },

  loginBtnContainer: { position: 'relative', marginTop: 10 },
  loginBtn: {
    height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', zIndex: 2
  },
  btnGlow: {
    position: 'absolute', top: 5, left: 10, right: 10, bottom: -10,
    backgroundColor: COLORS.ACCENT_START, opacity: 0.4, borderRadius: 18, zIndex: 1,
    transform: [{ scaleY: 0.8 }]
  },
  loginBtnText: { color: '#0F172A', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, alignItems: 'center' },
  footerText: { color: COLORS.TEXT_SEC, fontSize: 14 },
  signupText: { color: COLORS.ACCENT_START, fontWeight: 'bold', fontSize: 14 },
});

export default LoginScreen;