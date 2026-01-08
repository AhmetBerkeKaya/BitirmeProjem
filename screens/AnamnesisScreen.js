import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Switch, Modal, StatusBar, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

// --- RENK PALETİ ---
const COLORS = {
  BG_START: '#0F172A',
  BG_END: '#1E293B',
  ACCENT_START: '#00F2C3',
  ACCENT_END: '#0063F2',
  GLASS_BG: 'rgba(30, 41, 59, 0.6)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.1)',
  INPUT_BG: 'rgba(15, 23, 42, 0.6)',
  TEXT_MAIN: '#F1F5F9',
  TEXT_SEC: '#94A3B8',
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  DANGER: '#EF4444',
};

// --- SABİT VERİLER ---
const SYSTEM_DESCRIPTIONS = {
  'Dermatolojik Sistem': 'Cilt, deri, saç ve tırnak ile ilgili rahatsızlıklar.',
  'Solunum Sistemi': 'Akciğerler, nefes darlığı, öksürük ve burun rahatsızlıkları.',
  'Kas – İskelet Sistemi': 'Kemik, kas, eklem ağrıları ve hareket kısıtlılıkları.',
  'Santral Sinir Sistemi': 'Beyin, sinirler, baş ağrısı, denge ve hafıza durumları.',
  'Gastrointestinal Sistem': 'Mide, bağırsak, sindirim ve hazımsızlık sorunları.',
  'Kardiyovasküler Sistem': 'Kalp, damar, tansiyon ve dolaşım sistemi sorunları.',
  'Psikolojik Değerlendirme': 'Ruh hali, stres, kaygı, uyku ve psikolojik durumlar.',
  'Ürogental Sistem Hastalıkları': 'Böbrek, idrar yolları ve üreme organları sorunları.',
  'Endokrin Sistem': 'Hormonlar, tiroid, diyabet ve metabolizma durumları.',
  'Meridyen Tarama': 'Vücut enerji akışını ölçen ağrısız tarama yöntemi.',
  'Termal Tarama': 'Vücut ısısı haritası ile iltihap ve dolaşım analizi.',
  'Toksisite Ölçümü': 'Ağır metal ve toksin yükü analizi.'
};

const DIAGNOSIS_SYSTEMS = [
  'Dermatolojik Sistem', 'Solunum Sistemi', 'Kas – İskelet Sistemi',
  'Santral Sinir Sistemi', 'Gastrointestinal Sistem', 'Kardiyovasküler Sistem',
  'Psikolojik Değerlendirme', 'Ürogental Sistem Hastalıkları', 'Endokrin Sistem'
];

const DIAGNOSIS_SPECIFIC_QUESTIONS = {
  'Dermatolojik Sistem': { label: 'Dermatolojik Sistem', questions: ['Göz / Ciltte Kızarıklıklar ve Döküntü', 'Alerji', 'Saçlı Deride Kabuklanma', 'Tırnaklarda Deformasyon'] },
  'Solunum Sistemi': { label: 'Solunum Sistemi', questions: ['Tekrarlayan Akciğer Enfeksiyonu', 'Ateş ve Huzursuzluk', 'Dispne', 'Hırıltılı Solunum', 'Geniz Akıntısı', 'Horlama'] },
  'Kas – İskelet Sistemi': { label: 'Kas – İskelet Sistemi', questions: ['Güçsüzlük', 'Kas Ağrıları', 'Eklem Ağrısı', 'Eklem Hareket Kısıtlılığı', 'Sabah Tutukluğu'] },
  'Santral Sinir Sistemi': { label: 'Santral Sinir Sistemi', questions: ['Güç Kaybı', 'Yürüme Bozukluğu', 'Uyuşma / Karıncalanma', 'Baş Dönmesi', 'Unutkanlık'] },
  'Gastrointestinal Sistem': { label: 'Gastrointestinal Sistem', questions: ['Karın Ağrısı', 'Bulantı / Kusma', 'Kabızlık', 'İshal', 'Reflü / Mide Yanması'] },
  'Kardiyovasküler Sistem': { label: 'Kardiyovasküler Sistem', questions: ['Çarpıntı', 'Göğüs Ağrısı', 'Nefes Darlığı', 'Ödem'] },
  'Psikolojik Değerlendirme': { label: 'Psikolojik Değerlendirme', questions: ['Uyku Bozukluğu', 'Stres / Kaygı', 'Depresif Duygudurum', 'Sinirlilik'] },
  'Ürogental Sistem Hastalıkları': { label: 'Ürogental Sistem Hastalıkları', questions: ['Sık İdrara Çıkma', 'İdrarda Yanma', 'İdrar Kaçırma', 'Adet Düzensizliği'] },
  'Endokrin Sistem': { label: 'Endokrin Sistem', questions: ['Aşırı Terleme', 'Kilo Değişimi', 'Sıcağa/Soğuğa Tahammülsüzlük', 'Tüylenme Artışı'] }
};

const SYMPTOM_QUESTIONS = [
  { key: 'uykuHali', label: 'Uyku Hali' }, { key: 'gozdeUcusmalar', label: 'Gözde Uçuşmalar' },
  { key: 'carpinti', label: 'Çarpıntı' }, { key: 'siskinlik', label: 'Şişkinlik' },
  { key: 'adetDuzensizligi', label: 'Adet Düzensizliği' }, { key: 'dengeKaybi', label: 'Denge Kaybı' },
  { key: 'yayginKasAgrisi', label: 'Yaygın Kas Ağrısı' }, { key: 'nefesAlmadaGucluk', label: 'Nefes Almada Güçlük' },
  { key: 'ustume', label: 'Üşüme' }, { key: 'terleme', label: 'Terleme' },
  { key: 'stres', label: 'Stres' }, { key: 'agriliAdet', label: 'Ağrılı Adet' },
  { key: 'uykuDuzensizligi', label: 'Uyku Düzensizliği' }, { key: 'oksuruk', label: 'Öksürük' },
  { key: 'balgam', label: 'Balgam' }, { key: 'kasilmaVeKramplar', label: 'Kasılma ve Kramplar' },
  { key: 'elAyakUyusmalari', label: 'El Ayak Uyuşmaları' }, { key: 'unutkanlik', label: 'Unutkanlık' },
  { key: 'kasinti', label: 'Kaşıntı' }, { key: 'idrarKacirma', label: 'İdrar Kaçırma' },
  { key: 'idrardaYanma', label: 'İdrarda Yanma' }, { key: 'geceIdraraKalkma', label: 'Gece İdrara Kalkma' },
  { key: 'kesikKesikIdrar', label: 'Kesik Kesik İdrar' }, { key: 'kabizlik', label: 'Kabızlık' },
  { key: 'karindaGaz', label: 'Karında Gaz' }, { key: 'belAgrisi', label: 'Bel Ağrısı' },
  { key: 'ishal', label: 'İshal' }, { key: 'boyunAgrisi', label: 'Boyun Ağrısı' },
  { key: 'yayginOdem', label: 'Yaygın Ödem' }, { key: 'basur', label: 'Basur' },
  { key: 'eklemAgrilari', label: 'Eklem Ağrıları' }, { key: 'algiBozuklugu', label: 'Algı Bozukluğu' },
  { key: 'halsizlikYorgunluk', label: 'Halsizlik / Yorgunluk' }, { key: 'yorgunUyanma', label: 'Yorgun Uyanma' },
  { key: 'basDonmesi', label: 'Baş Dönmesi' }, { key: 'basAgrisi', label: 'Baş Ağrısı' },
  { key: 'mideAgisi', label: 'Mide Ağrısı' }, { key: 'mideYanmasi', label: 'Mide Yanması' }
];

// --- DIŞ BİLEŞENLER (RENDER PERFORMANSI İÇİN) ---
const RatingRow = ({ label, value, onChange }) => (
  <LinearGradient colors={[COLORS.GLASS_BG, 'rgba(15, 23, 42, 0.4)']} style={styles.ratingCard}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <Text style={[styles.ratingVal, { color: value > 0 ? COLORS.ACCENT_START : COLORS.TEXT_SEC }]}>{value || 0}</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}
          style={[
            styles.rateBox,
            value === n && styles.rateBoxSel,
            value === n && { borderColor: n <= 3 ? COLORS.SUCCESS : n <= 7 ? COLORS.WARNING : COLORS.DANGER }
          ]}>
          <LinearGradient
            colors={value === n
              ? (n <= 3 ? [COLORS.SUCCESS, '#2ecc71'] : n <= 7 ? [COLORS.WARNING, '#f1c40f'] : [COLORS.DANGER, '#e74c3c'])
              : ['transparent', 'transparent']}
            style={styles.rateGradient}
          >
            <Text style={[styles.rateTxt, value === n && { color: '#FFF', fontWeight: 'bold' }]}>{n}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </LinearGradient>
);

const CustomInput = ({ placeholder, value, onChangeText, multiline, keyboardType }) => (
  <View style={[styles.inputWrapper, multiline && { height: 80 }]}>
    <TextInput
      style={[styles.input, multiline && { textAlignVertical: 'top' }]}
      placeholder={placeholder}
      placeholderTextColor={COLORS.TEXT_SEC}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      keyboardType={keyboardType}
      blurOnSubmit={!multiline} 
    />
  </View>
);

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
    <View style={styles.sectionLine} />
  </View>
);

export default function AnamnesisScreen({ route, navigation }) {
  const { appointmentId, clinicId, patientName } = route.params;

  const [step, setStep] = useState(1);
  const scrollViewRef = useRef();

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState({ title: '', desc: '' });

  const [formData, setFormData] = useState({
    selectedDiagnosisSystems: [],
    complaintDetails: '',
    pastMedicalHistory: '',
    familyHistory: '',
    hasSurgery: 'yok',
    surgicalHistory: '',
    allergies: '',
    medications: '',
    vitalSigns: { bloodPressure: '', pulse: '', temperature: '', weight: '', height: '' },
    symptomRatings: {},
    diagnosisResponses: {},
    additionalQuestions: {
      education: '', profession: '', exerciseFrequency: '', dailySleepHours: '',
      dailyWaterConsumption: '', smokingFrequency: '', alcoholFrequency: '',
      monthlyVegetableConsumption: '', monthlyRedMeatConsumption: '', monthlyChickenConsumption: ''
    },
    conventionalTreatment: { currentMedications: '', otherTreatments: '' },
    optionalScans: {
      meridianScan: { enabled: false, fileUrl: '' },
      thermalScan: { enabled: false, fileUrl: '' },
      toxicityScan: { enabled: false, fileUrl: '' }
    }
  });

  const updateState = (key, value) => setFormData(p => ({ ...p, [key]: value }));
  const updateNestedState = (parent, key, value) => setFormData(p => ({ ...p, [parent]: { ...p[parent], [key]: value } }));

  const showInfo = (title) => {
    setSelectedInfo({ title: title, desc: SYSTEM_DESCRIPTIONS[title] || 'Bilgi bulunamadı.' });
    setInfoModalVisible(true);
  };

  const calculateToxicity = () => {
    const toxicityKeys = ['halsizlikYorgunluk', 'dengeKaybi', 'unutkanlik', 'kasinti', 'carpinti', 'uykuDuzensizligi', 'gozdeUcusmalar', 'oksuruk', 'yorgunUyanma', 'kabizlik'];
    let totalScore = 0;
    let ratedCount = 0;
    const scores = {};
    toxicityKeys.forEach(key => {
      const val = formData.symptomRatings[key] || 0;
      scores[key] = val;
      totalScore += val;
      if (val > 0) ratedCount++;
    });
    return { totalScore, ratedSymptomsCount: ratedCount, hasToxicity: ratedCount >= 5, toxicityScores: scores };
  };

  const handleSubmit = async () => {
    try {
      const user = auth.currentUser;
      const toxicityResult = calculateToxicity();
      const payload = {
        patientId: user.uid,
        patientName: patientName || "Bilinmeyen Hasta",
        clinicId, appointmentId, ...formData,
        toxicityAssessment: {
          totalScore: toxicityResult.totalScore,
          ratedSymptomsCount: toxicityResult.ratedSymptomsCount,
          hasToxicity: toxicityResult.hasToxicity,
          toxicityScores: toxicityResult.toxicityScores
        },
        status: 'completed', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        source: 'mobile_app', physicalExamination: '', systemsReview: {}, customQuestions: []
      };
      await addDoc(collection(db, 'anamrezRecords'), payload);
      await updateDoc(doc(db, 'appointments', appointmentId), { hasAnamnesis: true });
      await updateDoc(doc(db, 'patients', user.uid), { isAnamnezCompleted: true, updatedAt: new Date().toISOString() });
      Alert.alert("Başarılı", "Form gönderildi.", [{ text: "Tamam", onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <SectionHeader title="1. TANI SİSTEMLERİ" />
            <Text style={styles.helperText}>Şikayetiniz olan sistemleri seçin:</Text>
            <View style={styles.chipGrid}>
              {DIAGNOSIS_SYSTEMS.map(sys => {
                const isSelected = formData.selectedDiagnosisSystems.includes(sys);
                return (
                  <View key={sys} style={styles.chipWrapper}>
                    <TouchableOpacity
                      style={[styles.chip, isSelected && styles.chipSel]}
                      onPress={() => {
                        const list = isSelected ? formData.selectedDiagnosisSystems.filter(s => s !== sys) : [...formData.selectedDiagnosisSystems, sys];
                        updateState('selectedDiagnosisSystems', list);
                      }}>
                      <Text style={[styles.chipTxt, isSelected && { color: '#000', fontWeight: 'bold' }]}>{sys}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.infoBtn} onPress={() => showInfo(sys)}>
                      <Ionicons name="information-circle" size={20} color={COLORS.TEXT_SEC} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <SectionHeader title="ŞİKAYET DETAYI" />
            <CustomInput placeholder="Şikayetinizi detaylı yazınız..." multiline value={formData.complaintDetails} onChangeText={t => updateState('complaintDetails', t)} />
            <SectionHeader title="VİTAL BULGULAR" />
            <View style={styles.row}>
              <CustomInput placeholder="Boy (cm)" keyboardType="numeric" value={formData.vitalSigns.height} onChangeText={t => updateNestedState('vitalSigns', 'height', t)} />
              <View style={{ width: 10 }} />
              <CustomInput placeholder="Kilo (kg)" keyboardType="numeric" value={formData.vitalSigns.weight} onChangeText={t => updateNestedState('vitalSigns', 'weight', t)} />
            </View>
            <View style={styles.row}>
              <CustomInput placeholder="Tansiyon" value={formData.vitalSigns.bloodPressure} onChangeText={t => updateNestedState('vitalSigns', 'bloodPressure', t)} />
              <View style={{ width: 10 }} />
              <CustomInput placeholder="Nabız" keyboardType="numeric" value={formData.vitalSigns.pulse} onChangeText={t => updateNestedState('vitalSigns', 'pulse', t)} />
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <SectionHeader title="2. TIBBİ GEÇMİŞ" />
            <CustomInput placeholder="Geçmiş Hastalıklar" value={formData.pastMedicalHistory} onChangeText={t => updateState('pastMedicalHistory', t)} />
            <CustomInput placeholder="Aile Hastalıkları" value={formData.familyHistory} onChangeText={t => updateState('familyHistory', t)} />
            <CustomInput placeholder="Alerjiler" value={formData.allergies} onChangeText={t => updateState('allergies', t)} />
            <Text style={styles.label}>Ameliyat Geçmişi</Text>
            <View style={styles.row}>
              {['var', 'yok'].map(o => (
                <TouchableOpacity key={o} style={[styles.radio, formData.hasSurgery === o && styles.radioSel]} onPress={() => updateState('hasSurgery', o)}>
                  <LinearGradient colors={formData.hasSurgery === o ? [COLORS.ACCENT_START, COLORS.ACCENT_END] : ['transparent', 'transparent']} style={styles.radioGradient}>
                    <Text style={formData.hasSurgery === o ? { color: '#000', fontWeight: 'bold' } : { color: COLORS.TEXT_SEC }}>{o.toUpperCase()}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            {formData.hasSurgery === 'var' && (
              <CustomInput placeholder="Ameliyat Detayları" value={formData.surgicalHistory} onChangeText={t => updateState('surgicalHistory', t)} />
            )}
          </View>
        );
      case 3:
        return (
          <View>
            <SectionHeader title="3. SEMPTOM PUANLAMA" />
            <Text style={styles.subTitle}>1 = Çok Az, 10 = Çok Şiddetli</Text>
            {SYMPTOM_QUESTIONS.map(q => (
              <RatingRow key={q.key} label={q.label} value={formData.symptomRatings[q.key]} onChange={(v) => updateNestedState('symptomRatings', q.key, v)} />
            ))}
          </View>
        );
      case 4:
        return (
          <View>
            <SectionHeader title="4. SİSTEM ÖZEL SORULARI" />
            {formData.selectedDiagnosisSystems.length === 0 ? (
              <Text style={{ textAlign: 'center', color: COLORS.DANGER, marginTop: 20 }}>Lütfen 1. adımda en az bir sistem seçiniz.</Text>
            ) : (
              formData.selectedDiagnosisSystems.map(sys => {
                const data = DIAGNOSIS_SPECIFIC_QUESTIONS[sys];
                if (!data) return null;
                return (
                  <View key={sys} style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: 'bold', color: COLORS.ACCENT_START, marginBottom: 10, fontSize: 16 }}>{sys.toUpperCase()}</Text>
                    {data.questions.map(q => (
                      <RatingRow key={q} label={q} value={formData.diagnosisResponses[sys]?.[q]} onChange={(v) => {
                        setFormData(prev => ({ ...prev, diagnosisResponses: { ...prev.diagnosisResponses, [sys]: { ...(prev.diagnosisResponses[sys] || {}), [q]: v } } }));
                      }} />
                    ))}
                  </View>
                );
              })
            )}
          </View>
        );
      case 5:
        return (
          <View>
            <SectionHeader title="5. YAŞAM TARZI" />
            <CustomInput placeholder="Meslek" value={formData.additionalQuestions.profession} onChangeText={t => updateNestedState('additionalQuestions', 'profession', t)} />
            <CustomInput placeholder="Eğitim Durumu" value={formData.additionalQuestions.education} onChangeText={t => updateNestedState('additionalQuestions', 'education', t)} />
            <Text style={styles.label}>Alışkanlıklar</Text>
            <CustomInput placeholder="Sigara (Günde?)" value={formData.additionalQuestions.smokingFrequency} onChangeText={t => updateNestedState('additionalQuestions', 'smokingFrequency', t)} />
            <CustomInput placeholder="Alkol (Sıklık?)" value={formData.additionalQuestions.alcoholFrequency} onChangeText={t => updateNestedState('additionalQuestions', 'alcoholFrequency', t)} />
            <View style={styles.row}>
              <CustomInput placeholder="Su (Lt)" value={formData.additionalQuestions.dailyWaterConsumption} onChangeText={t => updateNestedState('additionalQuestions', 'dailyWaterConsumption', t)} />
              <View style={{ width: 10 }} />
              <CustomInput placeholder="Uyku (Saat)" value={formData.additionalQuestions.dailySleepHours} onChangeText={t => updateNestedState('additionalQuestions', 'dailySleepHours', t)} />
            </View>
            <Text style={styles.label}>Beslenme</Text>
            <CustomInput placeholder="Kırmızı Et" value={formData.additionalQuestions.monthlyRedMeatConsumption} onChangeText={t => updateNestedState('additionalQuestions', 'monthlyRedMeatConsumption', t)} />
            <CustomInput placeholder="Tavuk" value={formData.additionalQuestions.monthlyChickenConsumption} onChangeText={t => updateNestedState('additionalQuestions', 'monthlyChickenConsumption', t)} />
            <CustomInput placeholder="Sebze" value={formData.additionalQuestions.monthlyVegetableConsumption} onChangeText={t => updateNestedState('additionalQuestions', 'monthlyVegetableConsumption', t)} />
          </View>
        );
      case 6:
        return (
          <View>
            <SectionHeader title="6. TEDAVİ & TARAMALAR" />
            <Text style={styles.label}>İlaçlar</Text>
            <CustomInput placeholder="Kullandığınız ilaçlar..." multiline value={formData.conventionalTreatment.currentMedications} onChangeText={t => updateNestedState('conventionalTreatment', 'currentMedications', t)} />
            <CustomInput placeholder="Diğer tedaviler..." multiline value={formData.conventionalTreatment.otherTreatments} onChangeText={t => updateNestedState('conventionalTreatment', 'otherTreatments', t)} />
            <Text style={[styles.label, { marginTop: 20 }]}>Opsiyonel Taramalar</Text>
            {[
              { key: 'meridianScan', label: 'Meridyen Tarama' },
              { key: 'thermalScan', label: 'Termal Tarama' },
              { key: 'toxicityScan', label: 'Toksisite Ölçümü' }
            ].map(scan => (
              <LinearGradient key={scan.key} colors={[COLORS.GLASS_BG, 'rgba(15,23,42,0.4)']} style={styles.switchRow}>
                <View style={{ flex: 1, padding: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: COLORS.TEXT_MAIN, fontSize: 16, fontWeight: 'bold' }}>{scan.label}</Text>
                    <Switch
                      trackColor={{ false: "#767577", true: COLORS.ACCENT_START }}
                      thumbColor={formData.optionalScans[scan.key].enabled ? "#f4f3f4" : "#f4f3f4"}
                      value={formData.optionalScans[scan.key].enabled}
                      onValueChange={v => setFormData(p => ({ ...p, optionalScans: { ...p.optionalScans, [scan.key]: { enabled: v, fileUrl: '' } } }))}
                    />
                  </View>
                </View>
              </LinearGradient>
            ))}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BG_START} />
      <LinearGradient colors={[COLORS.BG_START, COLORS.BG_END]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ANAMNEZ FORMU</Text>
          <Text style={styles.headerStep}>ADIM {step} / 6</Text>
        </View>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <View style={styles.progressBarBg}>
        <LinearGradient colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressBarFill, { width: `${(step / 6) * 100}%` }]} />
      </View>

      {/* DÜZELTME: keyboardVerticalOffset = 0 (Eski davranış için) */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          ref={scrollViewRef} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderContent()}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.btnSec} onPress={() => { setStep(s => s - 1); scrollViewRef.current?.scrollTo({ y: 0 }) }}>
              <Text style={styles.btnSecText}>GERİ</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnPri} onPress={() => { if (step < 6) { setStep(s => s + 1); scrollViewRef.current?.scrollTo({ y: 0 }) } else handleSubmit(); }}>
            {/* DÜZELTME: Buton stilini basitleştirdik, yazı artık görünecek */}
            <LinearGradient colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]} style={styles.btnGradient}>
              <Text style={styles.btnPriText}>{step === 6 ? 'KAYDET VE BİTİR' : 'İLERİ'}</Text>
              <Ionicons name={step === 6 ? "checkmark" : "arrow-forward"} size={20} color="#FFF" style={{ marginLeft: 5 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal animationType="fade" transparent={true} visible={infoModalVisible} onRequestClose={() => setInfoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={[COLORS.BG_END, COLORS.BG_START]} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedInfo.title}</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT_SEC} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Ionicons name="medical" size={40} color={COLORS.ACCENT_START} style={{ marginBottom: 15 }} />
              <Text style={styles.modalDesc}>{selectedInfo.desc}</Text>
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setInfoModalVisible(false)}>
              <LinearGradient colors={[COLORS.ACCENT_START, COLORS.ACCENT_END]} style={styles.modalBtnGrad}>
                <Text style={styles.modalBtnText}>ANLADIM</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_START },
  glowTop: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.ACCENT_START, opacity: 0.1, transform: [{ scale: 1.2 }] },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.TEXT_MAIN, letterSpacing: 1 },
  headerStep: { fontSize: 12, color: COLORS.ACCENT_START, fontWeight: 'bold', marginTop: 2 },
  progressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%' },
  progressBarFill: { height: '100%' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionHeader: { marginBottom: 15, marginTop: 10 },
  sectionHeaderText: { fontSize: 18, fontWeight: '800', color: COLORS.TEXT_MAIN, letterSpacing: 0.5 },
  sectionLine: { width: 40, height: 3, backgroundColor: COLORS.ACCENT_START, marginTop: 5, borderRadius: 2 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.TEXT_SEC, marginBottom: 8, textTransform: 'uppercase' },
  helperText: { fontSize: 13, color: COLORS.TEXT_SEC, marginBottom: 15, fontStyle: 'italic' },
  subTitle: { fontSize: 12, color: COLORS.ACCENT_START, marginBottom: 15, fontWeight: '600' },
  inputWrapper: { backgroundColor: COLORS.INPUT_BG, borderRadius: 12, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, marginBottom: 15 },
  input: { padding: 15, color: COLORS.TEXT_MAIN, fontSize: 15 },
  row: { flexDirection: 'row', flex: 1 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chipWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.GLASS_BG, borderRadius: 10, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, overflow: 'hidden' },
  chip: { paddingHorizontal: 12, paddingVertical: 10 },
  chipSel: { backgroundColor: COLORS.ACCENT_START },
  chipTxt: { color: COLORS.TEXT_SEC, fontSize: 13, fontWeight: '600' },
  infoBtn: { padding: 10, borderLeftWidth: 1, borderLeftColor: COLORS.GLASS_BORDER },
  ratingCard: { borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORS.GLASS_BORDER },
  ratingLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.TEXT_MAIN, flex: 1 },
  ratingVal: { fontWeight: '900', fontSize: 16 },
  rateBox: { width: 36, height: 36, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, overflow: 'hidden' },
  rateBoxSel: { borderColor: 'transparent', transform: [{ scale: 1.1 }] },
  rateGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rateTxt: { fontSize: 12, color: COLORS.TEXT_SEC, fontWeight: '600' },
  radio: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.INPUT_BG, borderWidth: 1, borderColor: COLORS.GLASS_BORDER },
  radioSel: { borderColor: COLORS.ACCENT_START },
  radioGradient: { padding: 12, alignItems: 'center' },
  switchRow: { borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, overflow: 'hidden' },
  footer: { flexDirection: 'row', padding: 20, gap: 15, borderTopWidth: 1, borderTopColor: COLORS.GLASS_BORDER, backgroundColor: 'rgba(15,23,42,0.95)' },
  btnSec: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: COLORS.GLASS_BORDER, height: 50 },
  btnSecText: { color: COLORS.TEXT_SEC, fontWeight: 'bold' },
  btnPri: { flex: 2, borderRadius: 14, overflow: 'hidden', height: 50 },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnPriText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: COLORS.GLASS_BORDER },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.TEXT_MAIN },
  modalBody: { alignItems: 'center', marginBottom: 25 },
  modalDesc: { fontSize: 15, color: COLORS.TEXT_SEC, textAlign: 'center', lineHeight: 22 },
  modalBtn: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  modalBtnGrad: { padding: 14, alignItems: 'center' },
  modalBtnText: { color: '#000', fontWeight: 'bold' }
});