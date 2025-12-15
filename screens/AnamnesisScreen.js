import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Switch, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

// --- SABİTLER ---
const COLORS = {
  PRIMARY: '#00BFA6',
  SECONDARY: '#F5F9FC',
  TEXT: '#2C3E50',
  TEXT_LIGHT: '#7F8C8D',
  BORDER: '#BDC3C7',
  WHITE: '#FFFFFF',
  SUCCESS: '#27AE60',
  WARNING: '#F39C12',
  DANGER: '#E74C3C',
  INFO: '#3498DB'
};

// --- AÇIKLAMALAR (Halk Dili) ---
const SYSTEM_DESCRIPTIONS = {
  // Tanı Sistemleri
  'Dermatolojik Sistem': 'Cilt, deri, saç ve tırnak ile ilgili rahatsızlıklar.',
  'Solunum Sistemi': 'Akciğerler, nefes darlığı, öksürük ve burun ile ilgili rahatsızlıklar.',
  'Kas – İskelet Sistemi': 'Kemik, kas, eklem ağrıları ve hareket kısıtlılıkları.',
  'Santral Sinir Sistemi': 'Beyin, sinirler, baş ağrısı, denge ve hafıza ile ilgili durumlar.',
  'Gastrointestinal Sistem': 'Mide, bağırsak, sindirim ve hazımsızlık ile ilgili rahatsızlıklar.',
  'Kardiyovasküler Sistem': 'Kalp, damar, tansiyon ve dolaşım sistemi ile ilgili rahatsızlıklar.',
  'Psikolojik Değerlendirme': 'Ruh hali, stres, kaygı, uyku ve psikolojik durumlar.',
  'Ürogental Sistem Hastalıkları': 'Böbrek, idrar yolları ve üreme organları ile ilgili rahatsızlıklar.',
  'Endokrin Sistem': 'Hormonlar, tiroid, diyabet (şeker) ve metabolizma ile ilgili durumlar.',
  
  // Opsiyonel Taramalar (YENİ EKLENDİ)
  'Meridyen Tarama': 'Vücudunuzdaki enerji akışını ölçerek, hangi organlarda enerji düşüklüğü veya blokaj olduğunu gösteren ağrısız bir tarama yöntemidir.',
  'Termal Tarama': 'Vücut ısısı haritasını çıkararak, gözle görülmeyen iltihaplanma, dolaşım bozukluğu veya sinir sıkışmalarını tespit eden görüntüleme yöntemidir.',
  'Toksisite Ölçümü': 'Vücudunuzda birikmiş olan ağır metalleri, mineral eksikliklerini ve toksin yükünü analiz eden ölçüm yöntemidir.'
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

export default function AnamnesisScreen({ route, navigation }) {
  const { appointmentId, doctorName, clinicId, patientName } = route.params;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  // Bilgi Modalı State'i
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

  // --- INFO MODAL GÖSTER ---
  const showInfo = (title) => {
    setSelectedInfo({
      title: title,
      desc: SYSTEM_DESCRIPTIONS[title] || 'Bilgi bulunamadı.'
    });
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

    return { 
      totalScore, 
      ratedSymptomsCount: ratedCount, 
      hasToxicity: ratedCount >= 5,
      toxicityScores: scores 
    };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const toxicityResult = calculateToxicity();

      const payload = {
        patientId: user.uid,
        patientName: patientName || "Bilinmeyen Hasta",
        clinicId: clinicId,
        appointmentId: appointmentId,
        ...formData,
        toxicityAssessment: {
          totalScore: toxicityResult.totalScore,
          ratedSymptomsCount: toxicityResult.ratedSymptomsCount,
          hasToxicity: toxicityResult.hasToxicity,
          toxicityScores: toxicityResult.toxicityScores
        },
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'mobile_app',
        physicalExamination: '', 
        systemsReview: {}, 
        customQuestions: []
      };

      await addDoc(collection(db, 'anamrezRecords'), payload);
      await updateDoc(doc(db, 'appointments', appointmentId), { hasAnamnesis: true });
      await updateDoc(doc(db, 'patients', user.uid), { 
        isAnamnezCompleted: true, 
        updatedAt: new Date().toISOString() 
      });

      Alert.alert("Başarılı", "Anamnez formu doktora iletildi.", [{ text: "Tamam", onPress: () => navigation.goBack() }]);

    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "Kayıt başarısız: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const RatingRow = ({ label, value, onChange }) => (
    <View style={styles.ratingContainer}>
      <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:8}}>
        <Text style={styles.ratingLabel}>{label}</Text>
        <Text style={[styles.ratingVal, {color: value>0?COLORS.PRIMARY:'#CCC'}]}>{value || 0}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)}
            style={[styles.rateBox, value === n && styles.rateBoxSel, 
              value===n && {backgroundColor: n<=3?COLORS.SUCCESS : n<=7?COLORS.WARNING : COLORS.DANGER}
            ]}>
            <Text style={[styles.rateTxt, value===n && {color:'#FFF'}]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const SectionHeader = ({ title }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderContent = () => {
    switch(step) {
      case 1: 
        return (
          <View>
            <SectionHeader title="1. Tanı Sistemleri & Vital Bulgular" />
            <Text style={styles.label}>Şikayet Sistemleri (Çoklu Seçim)</Text>
            <Text style={styles.helperText}>Lütfen şikayetinizin olduğu sistemleri seçiniz.</Text>
            
            <View style={styles.chipRow}>
              {DIAGNOSIS_SYSTEMS.map(sys => {
                const isSelected = formData.selectedDiagnosisSystems.includes(sys);
                return (
                  <View key={sys} style={styles.chipWrapper}>
                    <TouchableOpacity 
                      style={[styles.chip, isSelected && styles.chipSel]}
                      onPress={() => {
                        const list = isSelected 
                          ? formData.selectedDiagnosisSystems.filter(s=>s!==sys) 
                          : [...formData.selectedDiagnosisSystems, sys];
                        updateState('selectedDiagnosisSystems', list);
                      }}>
                      <Text style={[styles.chipTxt, isSelected && {color:'#FFF'}]}>{sys}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.infoBtn} onPress={() => showInfo(sys)}>
                      <Ionicons name="information-circle" size={22} color={COLORS.INFO} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.label, {marginTop:20}]}>Ana Şikayet Detayı *</Text>
            <TextInput style={[styles.input, {height:80}]} multiline value={formData.complaintDetails}
              onChangeText={t => updateState('complaintDetails', t)} placeholder="Şikayetinizi detaylı yazınız..." />

            <Text style={[styles.label, {marginTop:15}]}>Vital Bulgular (Opsiyonel)</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, {flex:1}]} placeholder="Boy (cm)" keyboardType="numeric"
                value={formData.vitalSigns.height} onChangeText={t => updateNestedState('vitalSigns', 'height', t)} />
              <TextInput style={[styles.input, {flex:1}]} placeholder="Kilo (kg)" keyboardType="numeric"
                value={formData.vitalSigns.weight} onChangeText={t => updateNestedState('vitalSigns', 'weight', t)} />
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, {flex:1}]} placeholder="Tansiyon (120/80)"
                value={formData.vitalSigns.bloodPressure} onChangeText={t => updateNestedState('vitalSigns', 'bloodPressure', t)} />
              <TextInput style={[styles.input, {flex:1}]} placeholder="Nabız" keyboardType="numeric"
                value={formData.vitalSigns.pulse} onChangeText={t => updateNestedState('vitalSigns', 'pulse', t)} />
            </View>
          </View>
        );

      case 2:
        return (
          <View>
            <SectionHeader title="2. Tıbbi Geçmiş" />
            <TextInput style={styles.input} placeholder="Geçmiş Hastalıklar" value={formData.pastMedicalHistory} onChangeText={t=>updateState('pastMedicalHistory', t)} />
            <TextInput style={styles.input} placeholder="Aile Hastalıkları (Soy Geçmişi)" value={formData.familyHistory} onChangeText={t=>updateState('familyHistory', t)} />
            <TextInput style={styles.input} placeholder="Alerjiler" value={formData.allergies} onChangeText={t=>updateState('allergies', t)} />
            
            <Text style={styles.label}>Ameliyat Geçmişi</Text>
            <View style={styles.row}>
              {['var', 'yok'].map(o => (
                <TouchableOpacity key={o} style={[styles.radio, formData.hasSurgery===o && styles.radioSel]} onPress={()=>updateState('hasSurgery', o)}>
                  <Text style={formData.hasSurgery===o?{color:'#FFF'}:{color:'#555'}}>{o.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {formData.hasSurgery === 'var' && (
              <TextInput style={styles.input} placeholder="Ameliyat Detayları" value={formData.surgicalHistory} onChangeText={t=>updateState('surgicalHistory', t)} />
            )}
          </View>
        );

      case 3:
        return (
          <View>
            <SectionHeader title="3. Semptom Değerlendirmesi (1-10)" />
            <Text style={styles.subTitle}>1 = Çok Az, 10 = Çok Şiddetli</Text>
            {SYMPTOM_QUESTIONS.map(q => (
              <RatingRow key={q.key} label={q.label} 
                value={formData.symptomRatings[q.key]} 
                onChange={(v) => updateNestedState('symptomRatings', q.key, v)} />
            ))}
          </View>
        );

      case 4:
        return (
          <View>
            <SectionHeader title="4. Sistem Özel Soruları" />
            {formData.selectedDiagnosisSystems.length === 0 ? (
              <Text style={{textAlign:'center', color:COLORS.DANGER, marginTop:20}}>Lütfen 1. adımda en az bir tanı sistemi seçiniz.</Text>
            ) : (
              formData.selectedDiagnosisSystems.map(sys => {
                const data = DIAGNOSIS_SPECIFIC_QUESTIONS[sys];
                if (!data) return null;
                return (
                  <View key={sys} style={{marginBottom:20}}>
                    <Text style={{fontWeight:'bold', color:COLORS.PRIMARY, marginBottom:10, fontSize:16}}>{sys}</Text>
                    {data.questions.map(q => (
                      <RatingRow key={q} label={q} 
                        value={formData.diagnosisResponses[sys]?.[q]}
                        onChange={(v) => {
                          setFormData(prev => ({
                            ...prev,
                            diagnosisResponses: {
                              ...prev.diagnosisResponses,
                              [sys]: { ...(prev.diagnosisResponses[sys]||{}), [q]: v }
                            }
                          }));
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
            <SectionHeader title="5. Yaşam Tarzı ve Alışkanlıklar" />
            <TextInput style={styles.input} placeholder="Meslek" value={formData.additionalQuestions.profession} onChangeText={t=>updateNestedState('additionalQuestions', 'profession', t)} />
            <TextInput style={styles.input} placeholder="Eğitim Durumu" value={formData.additionalQuestions.education} onChangeText={t=>updateNestedState('additionalQuestions', 'education', t)} />
            
            <Text style={styles.label}>Sigara Kullanımı</Text>
            <TextInput style={styles.input} placeholder="Örn: Günde 1 paket" value={formData.additionalQuestions.smokingFrequency} onChangeText={t=>updateNestedState('additionalQuestions', 'smokingFrequency', t)} />
            
            <Text style={styles.label}>Alkol Kullanımı</Text>
            <TextInput style={styles.input} placeholder="Örn: Sosyal / Hiç" value={formData.additionalQuestions.alcoholFrequency} onChangeText={t=>updateNestedState('additionalQuestions', 'alcoholFrequency', t)} />
            
            <Text style={styles.label}>Su ve Uyku</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, {flex:1}]} placeholder="Su (Litre)" value={formData.additionalQuestions.dailyWaterConsumption} onChangeText={t=>updateNestedState('additionalQuestions', 'dailyWaterConsumption', t)} />
              <TextInput style={[styles.input, {flex:1}]} placeholder="Uyku (Saat)" value={formData.additionalQuestions.dailySleepHours} onChangeText={t=>updateNestedState('additionalQuestions', 'dailySleepHours', t)} />
            </View>

            <Text style={styles.label}>Beslenme (Haftalık/Aylık Tüketim)</Text>
            <TextInput style={styles.input} placeholder="Kırmızı Et (Örn: Haftada 2)" value={formData.additionalQuestions.monthlyRedMeatConsumption} onChangeText={t=>updateNestedState('additionalQuestions', 'monthlyRedMeatConsumption', t)} />
            <TextInput style={styles.input} placeholder="Tavuk (Örn: Haftada 1)" value={formData.additionalQuestions.monthlyChickenConsumption} onChangeText={t=>updateNestedState('additionalQuestions', 'monthlyChickenConsumption', t)} />
            <TextInput style={styles.input} placeholder="Sebze (Örn: Her gün)" value={formData.additionalQuestions.monthlyVegetableConsumption} onChangeText={t=>updateNestedState('additionalQuestions', 'monthlyVegetableConsumption', t)} />
          </View>
        );

      case 6:
        return (
          <View>
            <SectionHeader title="6. Tedavi & Taramalar" />
            
            <Text style={styles.label}>Konvansiyonel Tedavi (İlaçlar)</Text>
            <TextInput style={[styles.input, {height:80}]} multiline placeholder="Kullandığınız ilaçlar ve dozları..."
              value={formData.conventionalTreatment.currentMedications} onChangeText={t=>updateNestedState('conventionalTreatment', 'currentMedications', t)} />
            
            <TextInput style={[styles.input, {height:60}]} multiline placeholder="Diğer tedaviler..."
              value={formData.conventionalTreatment.otherTreatments} onChangeText={t=>updateNestedState('conventionalTreatment', 'otherTreatments', t)} />

            <Text style={[styles.label, {marginTop:20}]}>Opsiyonel Taramalar</Text>
            {[
              {key:'meridianScan', label:'Meridyen Tarama'},
              {key:'thermalScan', label:'Termal Tarama'},
              {key:'toxicityScan', label:'Toksisite Ölçümü'}
            ].map(scan => (
              <View key={scan.key} style={styles.switchRow}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1}}>
                  <Text style={{fontSize:16, flex:1}}>{scan.label}</Text>
                  
                  {/* 🔥 YENİ EKLENEN INFO BUTONU */}
                  <TouchableOpacity style={styles.infoBtn} onPress={() => showInfo(scan.label)}>
                    <Ionicons name="information-circle" size={22} color={COLORS.INFO} />
                  </TouchableOpacity>
                </View>

                <Switch 
                  value={formData.optionalScans[scan.key].enabled}
                  onValueChange={v => setFormData(p => ({
                    ...p, optionalScans: { ...p.optionalScans, [scan.key]: { enabled: v, fileUrl: '' } }
                  }))}
                />
              </View>
            ))}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
        <Text style={styles.headerTitle}>Anamnez Formu ({step}/6)</Text>
        <View style={{width:24}}/>
      </View>
      <View style={{height:4, backgroundColor:'#EEE'}}><View style={{height:'100%', width:`${(step/6)*100}%`, backgroundColor:COLORS.PRIMARY}}/></View>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
          {renderContent()}
        </ScrollView>

        <View style={styles.footer}>
          {step>1 && (
            <TouchableOpacity style={styles.btnSec} onPress={()=>{setStep(s=>s-1); scrollViewRef.current?.scrollTo({y:0})}}>
              <Text style={{color:'#333'}}>Geri</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnPri} onPress={()=>{
            if(step<6) { setStep(s=>s+1); scrollViewRef.current?.scrollTo({y:0}) }
            else handleSubmit();
          }}>
            <Text style={{color:'#FFF', fontWeight:'bold'}}>{step===6 ? 'Kaydet ve Bitir' : 'İleri'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* --- INFO MODAL --- */}
      <Modal animationType="fade" transparent={true} visible={infoModalVisible} onRequestClose={() => setInfoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedInfo.title}</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Ionicons name="medical" size={40} color={COLORS.PRIMARY} style={{marginBottom:15}} />
              <Text style={styles.modalDesc}>{selectedInfo.desc}</Text>
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setInfoModalVisible(false)}>
              <Text style={styles.modalBtnText}>Anladım</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.SECONDARY },
  header: { flexDirection: 'row', alignItems:'center', justifyContent:'space-between', padding:16, backgroundColor:'#FFF', borderBottomWidth:1, borderColor:'#EEE'},
  headerTitle: { fontSize:18, fontWeight:'bold', color:COLORS.TEXT },
  scrollContent: { padding:20, paddingBottom:50 },
  sectionHeader: { marginBottom:20, borderBottomWidth:1, borderBottomColor:COLORS.PRIMARY, paddingBottom:5 },
  sectionHeaderText: { fontSize:18, fontWeight:'bold', color:COLORS.PRIMARY },
  label: { fontSize:14, fontWeight:'600', color:COLORS.TEXT, marginBottom:8 },
  helperText: { fontSize:12, color:COLORS.TEXT_LIGHT, marginBottom:10, fontStyle:'italic' },
  subTitle: { fontSize:13, color:COLORS.TEXT_LIGHT, marginBottom:15 },
  input: { backgroundColor:'#FFF', borderWidth:1, borderColor:COLORS.BORDER, borderRadius:8, padding:12, marginBottom:15, fontSize:15 },
  
  // Chip & Info
  chipRow: { flexDirection:'column', gap:10 },
  chipWrapper: { flexDirection:'row', alignItems:'center', gap:10 },
  chip: { flex:1, paddingHorizontal:15, paddingVertical:12, borderRadius:12, backgroundColor:'#FFF', borderWidth:1, borderColor:COLORS.BORDER },
  chipSel: { backgroundColor:COLORS.PRIMARY, borderColor:COLORS.PRIMARY },
  chipTxt: { color:COLORS.TEXT, fontSize:14 },
  infoBtn: { padding:5 },

  // Rating
  ratingContainer: { backgroundColor:'#FFF', padding:10, borderRadius:10, marginBottom:12, borderWidth:1, borderColor:'#EEE' },
  ratingLabel: { fontSize:14, fontWeight:'600', color:'#444', flex:1 },
  ratingVal: { fontWeight:'bold', fontSize:14 },
  rateBox: { width:32, height:32, borderRadius:16, backgroundColor:'#F0F0F0', justifyContent:'center', alignItems:'center', marginRight:6 },
  rateBoxSel: { transform:[{scale:1.1}] },
  rateTxt: { fontSize:11, color:'#555' },

  // Radio & Switch
  row: { flexDirection:'row', gap:10, marginBottom:15 },
  radio: { flex:1, padding:12, alignItems:'center', backgroundColor:'#FFF', borderRadius:8, borderWidth:1, borderColor:COLORS.BORDER },
  radioSel: { backgroundColor:COLORS.PRIMARY, borderColor:COLORS.PRIMARY },
  switchRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'#FFF', padding:15, borderRadius:10, marginBottom:10, borderWidth:1, borderColor:'#EEE' },
  
  // Footer
  footer: { flexDirection:'row', padding:15, backgroundColor:'#FFF', gap:10, borderTopWidth:1, borderColor:'#EEE' },
  btnPri: { flex:2, backgroundColor:COLORS.PRIMARY, padding:15, borderRadius:10, alignItems:'center' },
  btnSec: { flex:1, backgroundColor:'#EEE', padding:15, borderRadius:10, alignItems:'center' },

  // Modal Stilleri
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center', padding:20 },
  modalContent: { backgroundColor:'#FFF', width:'100%', borderRadius:15, padding:20, elevation:5 },
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15 },
  modalTitle: { fontSize:18, fontWeight:'bold', color:COLORS.TEXT },
  modalBody: { alignItems:'center', marginBottom:20 },
  modalDesc: { fontSize:16, color:'#555', textAlign:'center', lineHeight:24 },
  modalBtn: { backgroundColor:COLORS.PRIMARY, padding:12, borderRadius:10, alignItems:'center' },
  modalBtnText: { color:'#FFF', fontWeight:'bold', fontSize:16 }
});