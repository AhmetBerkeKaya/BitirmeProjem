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
  Alert
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// --- GELECEĞİN SAĞLIĞI PALETİ (Login ile Aynı) ---
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

const SignUpScreen = ({ navigation }) => {
  // Form State'leri
  const [fullName, setFullName] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (fullName === '' || tcNo === '' || phone === '' || email === '' || password === '') {
      setError('Lütfen tüm alanları eksiksiz doldurun.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Firebase Auth ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Firestore'a ek bilgilerle kaydet
      await setDoc(doc(db, 'patients', user.uid), {
        uid: user.uid,
        fullName: fullName,
        tcNo: tcNo,
        phone: phone,
        email: email,
        role: 'patient',
        createdAt: new Date().toISOString()
      });

      // Başarılı
      Alert.alert('Tebrikler!', 'Hesabınız başarıyla oluşturuldu.', [
        { text: 'Giriş Yap', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message.includes('email-already-in-use') 
        ? 'Bu e-posta adresi zaten kullanımda.' 
        : 'Kayıt olurken bir hata oluştu. Lütfen bilgileri kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      
      {/* 1. KATMAN: ZEMİN GRADIENT */}
      <LinearGradient
        colors={[COLORS.BG_START, COLORS.BG_END]}
        style={styles.backgroundGradient}
      />

      {/* 2. KATMAN: DEKORATİF GLOW BLOBLARI (Farklı pozisyonlar) */}
      <View style={styles.glowBlobTopLeft} />
      <View style={styles.glowBlobBottomRight} />

      {/* 3. KATMAN: İÇERİK */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* GERİ BUTONU */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_MAIN} />
          </TouchableOpacity>

          {/* HEADER */}
          <View style={styles.headerArea}>
            <Text style={styles.headerTitle}>RTM AİLESİ</Text>
            <Text style={styles.headerSub}>Sağlık yolculuğunuza başlayın</Text>
          </View>

          {/* CAM KART (FORM) */}
          <View style={styles.glassCard}>
            
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={18} color={COLORS.DANGER} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* AD SOYAD */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>AD SOYAD</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={18} color={COLORS.ACCENT_START} style={{marginRight: 10}} />
                <TextInput
                  style={styles.input}
                  placeholder="Adınızı giriniz"
                  placeholderTextColor={COLORS.TEXT_SEC}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* TC KİMLİK & TELEFON (YAN YANA) */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, {flex: 1, marginRight: 8}]}>
                <Text style={styles.inputLabel}>TC KİMLİK</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card" size={18} color={COLORS.ACCENT_START} style={{marginRight: 10}} />
                  <TextInput
                    style={styles.input}
                    placeholder="11 Haneli"
                    placeholderTextColor={COLORS.TEXT_SEC}
                    value={tcNo}
                    onChangeText={setTcNo}
                    keyboardType="numeric"
                    maxLength={11}
                  />
                </View>
              </View>
              
              <View style={[styles.inputContainer, {flex: 1, marginLeft: 8}]}>
                <Text style={styles.inputLabel}>TELEFON</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call" size={18} color={COLORS.ACCENT_START} style={{marginRight: 10}} />
                  <TextInput
                    style={styles.input}
                    placeholder="5XX..."
                    placeholderTextColor={COLORS.TEXT_SEC}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* E-POSTA */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-POSTA</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={18} color={COLORS.ACCENT_START} style={{marginRight: 10}} />
                <TextInput
                  style={styles.input}
                  placeholder="ornek@mail.com"
                  placeholderTextColor={COLORS.TEXT_SEC}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* ŞİFRE */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>ŞİFRE</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key" size={18} color={COLORS.ACCENT_START} style={{marginRight: 10}} />
                <TextInput
                  style={styles.input}
                  placeholder="En az 6 karakter"
                  placeholderTextColor={COLORS.TEXT_SEC}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* KAYIT BUTONU */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleSignUp}
              disabled={loading}
              style={styles.signupBtnContainer}
            >
              <LinearGradient
                colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.signupBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.signupBtnText}>HESAP OLUŞTUR</Text>
                )}
              </LinearGradient>
              <View style={styles.btnGlow} />
            </TouchableOpacity>

          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Zaten hesabınız var mı?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}> Giriş Yapın</Text>
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

  // DEKORATİF IŞILTILAR
  glowBlobTopLeft: {
    position: 'absolute', top: -100, left: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.ACCENT_START, opacity: 0.15,
  },
  glowBlobBottomRight: {
    position: 'absolute', bottom: -50, right: -50,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: COLORS.ACCENT_END, opacity: 0.1,
  },

  scrollContainer: { flexGrow: 1, padding: 24, paddingTop: 50 },
  
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20
  },

  headerArea: { marginBottom: 30 },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: COLORS.TEXT_MAIN, letterSpacing: 1,
    textShadowColor: 'rgba(0, 242, 195, 0.3)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 10
  },
  headerSub: { fontSize: 14, color: COLORS.TEXT_SEC, marginTop: 5 },

  // GLASS CARD
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
  errorText: { color: '#FF6B6B', marginLeft: 8, fontSize: 13, fontWeight: '600', flex: 1 },

  inputContainer: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  inputLabel: { color: COLORS.TEXT_SEC, fontSize: 11, fontWeight: 'bold', marginBottom: 6, marginLeft: 4, letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: 16, height: 50, paddingHorizontal: 16,
    borderWidth: 1, borderColor: COLORS.BORDER
  },
  input: { flex: 1, height: '100%', color: COLORS.TEXT_MAIN, fontSize: 15 },

  signupBtnContainer: { position: 'relative', marginTop: 10 },
  signupBtn: {
    height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', zIndex: 2
  },
  btnGlow: {
    position: 'absolute', top: 5, left: 10, right: 10, bottom: -10,
    backgroundColor: COLORS.ACCENT_START, opacity: 0.4, borderRadius: 18, zIndex: 1,
    transform: [{ scaleY: 0.8 }]
  },
  signupBtnText: { color: '#0F172A', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30, alignItems: 'center', marginBottom: 20 },
  footerText: { color: COLORS.TEXT_SEC, fontSize: 14 },
  loginLinkText: { color: COLORS.ACCENT_START, fontWeight: 'bold', fontSize: 14 },
});

export default SignUpScreen;