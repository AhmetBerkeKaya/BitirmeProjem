// utils/ChatbotBrain.js
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; 

// --- GENİŞLETİLMİŞ SEMPTOM EŞLEŞTİRME HARİTASI ---
// Bot, kullanıcının cümlesinde bu kelimeleri arar ve ilgili bölüme yönlendirir.
const SYMPTOM_MAP = {
  // NÖROLOJİ (Beyin ve Sinir)
  'baş ağrısı': 'Nöroloji',
  'baş dönmesi': 'Nöroloji',
  'migren': 'Nöroloji',
  'unutkanlık': 'Nöroloji',
  'uyuşma': 'Nöroloji',
  'karıncalanma': 'Nöroloji',
  'titreme': 'Nöroloji',
  'bayılma': 'Nöroloji',
  'denge kaybı': 'Nöroloji',
  'felç': 'Nöroloji',
  'nöbet': 'Nöroloji',
  'alzheimer': 'Nöroloji',

  // DAHİLİYE (İç Hastalıkları)
  'karın ağrısı': 'Dahiliye',
  'mide': 'Dahiliye',
  'bulantı': 'Dahiliye',
  'kusma': 'Dahiliye',
  'ishal': 'Dahiliye',
  'kabızlık': 'Dahiliye',
  'ateş': 'Dahiliye',
  'terleme': 'Dahiliye',
  'halsizlik': 'Dahiliye',
  'yorgunluk': 'Dahiliye',
  'tansiyon': 'Dahiliye',
  'şeker': 'Dahiliye',
  'diyabet': 'Dahiliye',
  'grip': 'Dahiliye',
  'nezle': 'Dahiliye',
  'soğuk algınlığı': 'Dahiliye',
  'öksürük': 'Dahiliye',
  'kansızlık': 'Dahiliye',
  'anemi': 'Dahiliye',
  'kolesterol': 'Dahiliye',
  'tiroid': 'Dahiliye',
  'guatr': 'Dahiliye',

  // KARDİYOLOJİ (Kalp)
  'göğüs ağrısı': 'Kardiyoloji',
  'kalp': 'Kardiyoloji',
  'çarpıntı': 'Kardiyoloji',
  'sıkışma': 'Kardiyoloji',
  'nefes darlığı': 'Kardiyoloji',
  'hipertansiyon': 'Kardiyoloji',
  'damar tıkanıklığı': 'Kardiyoloji',
  'kalp krizi': 'Kardiyoloji',

  // ORTOPEDİ (Kas ve İskelet)
  'kırık': 'Ortopedi',
  'çıkık': 'Ortopedi',
  'ezilme': 'Ortopedi',
  'burkulma': 'Ortopedi',
  'eklem ağrısı': 'Ortopedi',
  'diz ağrısı': 'Ortopedi',
  'bel ağrısı': 'Ortopedi',
  'boyun ağrısı': 'Ortopedi',
  'sırt ağrısı': 'Ortopedi',
  'menisküs': 'Ortopedi',
  'romatizma': 'Ortopedi',
  'kas ağrısı': 'Ortopedi',
  'kramp': 'Ortopedi',

  // DERMATOLOJİ (Cilt)
  'cilt': 'Dermatoloji',
  'deri': 'Dermatoloji',
  'kaşıntı': 'Dermatoloji',
  'kızarıklık': 'Dermatoloji',
  'döküntü': 'Dermatoloji',
  'sivilce': 'Dermatoloji',
  'akne': 'Dermatoloji',
  'egzama': 'Dermatoloji',
  'mantar': 'Dermatoloji',
  'ben': 'Dermatoloji',
  'leke': 'Dermatoloji',
  'saç dökülmesi': 'Dermatoloji',
  'tırnak': 'Dermatoloji',
  'sedef': 'Dermatoloji',

  // KBB (Kulak Burun Boğaz)
  'boğaz ağrısı': 'KBB',
  'yutkunma': 'KBB',
  'kulak ağrısı': 'KBB',
  'işitme': 'KBB',
  'çınlama': 'KBB',
  'burun tıkanıklığı': 'KBB',
  'geniz akıntısı': 'KBB',
  'horlama': 'KBB',
  'vertigo': 'KBB',
  'bademcik': 'KBB',

  // GÖZ HASTALIKLARI
  'göz': 'Göz Hastalıkları',
  'görme': 'Göz Hastalıkları',
  'bulanık': 'Göz Hastalıkları',
  'arpacık': 'Göz Hastalıkları',
  'miyop': 'Göz Hastalıkları',
  'astigmat': 'Göz Hastalıkları',
  'gözlük': 'Göz Hastalıkları',
  'katarakt': 'Göz Hastalıkları',

  // DİŞ HEKİMLİĞİ
  'diş': 'Diş Hekimliği',
  'ağız': 'Diş Hekimliği',
  'diş eti': 'Diş Hekimliği',
  'çürük': 'Diş Hekimliği',
  'dolgu': 'Diş Hekimliği',
  'kanal tedavisi': 'Diş Hekimliği',
  'yirmilik': 'Diş Hekimliği',
  'implant': 'Diş Hekimliği',

  // PSİKİYATRİ / PSİKOLOJİ
  'depresyon': 'Psikiyatri',
  'stres': 'Psikiyatri',
  'kaygı': 'Psikiyatri',
  'uyku bozukluğu': 'Psikiyatri',
  'panik atak': 'Psikiyatri',
  'mutsuzluk': 'Psikiyatri',
  'sinirlilik': 'Psikiyatri',
  'anksiyete': 'Psikiyatri',

  // ÜROLOJİ
  'idrar': 'Üroloji',
  'böbrek taşı': 'Üroloji',
  'prostat': 'Üroloji',
  'testis': 'Üroloji',
  'sancılı idrar': 'Üroloji',
  
  // KADIN HASTALIKLARI (Jinekoloji)
  'adet': 'Kadın Doğum',
  'regl': 'Kadın Doğum',
  'gebelik': 'Kadın Doğum',
  'hamile': 'Kadın Doğum',
  'vajinal': 'Kadın Doğum',
  'kadın doğum': 'Kadın Doğum',
  'yumurtalık': 'Kadın Doğum',

  // GENEL CERRAHİ
  'apandisit': 'Genel Cerrahi',
  'fıtık': 'Genel Cerrahi',
  'basur': 'Genel Cerrahi',
  'hemoroid': 'Genel Cerrahi',
  'memede kitle': 'Genel Cerrahi',
  'safra kesesi': 'Genel Cerrahi',
};

/**
 * Kullanıcının mesajını analiz eder ve yapılacak işlemi belirler.
 * @param {string} text - Kullanıcının yazdığı mesaj
 * @returns {object} - { type: 'ACTION_TYPE', payload: data, reply: 'Cevap metni' }
 */
export const analyzeUserMessage = async (text) => {
  if (!text) return { type: 'UNKNOWN', reply: 'Boş mesaj aldım.' };
  
  const lowerText = text.toLowerCase();
  
  // 0. SELAMLAŞMA
  if (['merhaba', 'selam', 'slm', 'günaydın', 'iyi günler', 'nasılsın'].some(w => lowerText.includes(w))) {
    return {
      type: 'INFO',
      reply: 'Merhaba! Ben RTM Asistan. Size nasıl yardımcı olabilirim? Şikayetinizi yazabilir (Örn: "Başım ağrıyor") veya randevularınızı sorabilirsiniz.'
    };
  }

  // 1. KONTROL: Kullanıcı Randevu Sorguluyor mu?
  if (lowerText.includes('randevu') || lowerText.includes('randevum') || lowerText.includes('ne zaman')) {
    // "Randevu al" veya "Yeni randevu" isteği mi?
    if (lowerText.includes('almak') || lowerText.includes('yeni') || lowerText.includes('alabilir miyim')) {
       return {
         type: 'NAVIGATE',
         target: 'ClinicListScreen', // Navigasyon ismi projendeki tanımla aynı olmalı
         reply: 'Yeni randevu oluşturmak için klinik seçimi sayfasına yönlendiriyorum.',
         options: [{ label: '🏥 Klinik Seç', value: 'navigate_clinic' }]
       };
    }
    // Yoksa mevcut randevuları mı soruyor?
    return await checkAppointments();
  }

  // 2. KONTROL: Semptom/Hastalık Belirtiyor mu?
  // Haritadaki anahtar kelimelerden EN UZUN olanı öncelikli bulmaya çalışalım.
  // Böylece "baş ağrısı" varken sadece "baş" kelimesine takılıp yanlış işlem yapmaz.
  const sortedKeywords = Object.keys(SYMPTOM_MAP).sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    if (lowerText.includes(keyword)) {
      const department = SYMPTOM_MAP[keyword];
      return await findDoctorsByDepartment(department, keyword);
    }
  }

  // 3. KONTROL: İletişim / Adres / Konum
  if (lowerText.includes('iletişim') || lowerText.includes('adres') || lowerText.includes('telefon') || lowerText.includes('yeriniz') || lowerText.includes('nerede') || lowerText.includes('konum')) {
    return {
      type: 'INFO',
      reply: '📍 RTM Klinik Genel Merkez\nAdres: İstanbul/Şişli Merkez Mah. Teknoloji Cad. No:1\n📞 Telefon: 444 0 444\n⏰ Çalışma Saatleri: 09:00 - 18:00'
    };
  }

  // 4. KONTROL: Reçete / İlaç
  if (lowerText.includes('reçete') || lowerText.includes('ilaç') || lowerText.includes('eczane')) {
    return {
      type: 'NAVIGATE',
      target: 'PrescriptionListScreen',
      reply: 'Reçetelerinizi ve ilaç geçmişinizi görüntülemek için "Reçetelerim" sayfasına gitmek ister misiniz?',
      options: [{ label: '💊 Reçetelere Git', value: 'navigate_prescription' }]
    };
  }
  
  // 5. KONTROL: Tahlil / Sonuç
  if (lowerText.includes('tahlil') || lowerText.includes('sonuç') || lowerText.includes('rapor') || lowerText.includes('test')) {
     return {
      type: 'INFO',
      reply: 'Laboratuvar sonuçlarınızı "Tedavilerim" sekmesinden veya ana ekrandaki "Raporlar" bölümünden detaylı görüntüleyebilirsiniz.'
    };
  }

  // Hiçbir şey bulamazsa (Fallback)
  return {
    type: 'UNKNOWN',
    reply: 'Bunu tam anlayamadım. Şikayetinizi biraz daha açık yazar mısınız? Hangi bölüme gitmeniz gerektiğini bulabilirim. (Örn: "Midem bulanıyor")',
    options: [
      { label: '📅 Randevularım', value: 'gecmis_randevu' },
      { label: '📞 İletişim', value: 'iletisim' }
    ]
  };
};

// --- YARDIMCI FONKSİYONLAR ---

// A) Randevu Kontrolü
const checkAppointments = async () => {
  const user = auth.currentUser;
  if (!user) return { type: 'ERROR', reply: 'Lütfen önce giriş yapın.' };

  try {
    // Önce hastayı bul
    const patientsRef = collection(db, 'patients');
    const qPatient = query(patientsRef, where('email', '==', user.email));
    const patientSnap = await getDocs(qPatient);
    
    if (patientSnap.empty) return { type: 'INFO', reply: 'Sistemde kayıtlı hasta profili bulunamadı.' };
    
    const patientId = patientSnap.docs[0].id;
    
    // Randevuları çek
    const appointmentsRef = collection(db, 'appointments');
    const qApp = query(
      appointmentsRef, 
      where('patientId', '==', patientId),
      orderBy('dateISO', 'desc'),
      limit(3)
    );
    const appSnap = await getDocs(qApp);

    if (appSnap.empty) {
      return {
        type: 'INFO',
        reply: 'Şu an aktif veya geçmiş randevunuz bulunmuyor. Yeni randevu almak ister misiniz?',
        options: [{ label: '📅 Yeni Randevu Al', value: 'yeni_randevu' }]
      };
    }

    let msg = '📋 İşte son randevularınız:\n';
    appSnap.forEach(doc => {
      const d = doc.data();
      const date = d.dateISO ? d.dateISO.split('T')[0] : 'Tarih yok';
      const time = d.startTime || '';
      const status = d.status === 'completed' ? '✅ Tamamlandı' : '⏳ Bekliyor';
      const docName = d.doctorName || 'Doktor';
      msg += `\n🗓 ${date} ${time}\n👨‍⚕️ ${docName}\nDurum: ${status}\n────────────────`;
    });

    return { type: 'INFO', reply: msg };

  } catch (error) {
    console.error(error);
    return { type: 'ERROR', reply: 'Randevuları kontrol ederken bir hata oluştu.' };
  }
};

// B) Bölüme Göre Doktor Önerme
const findDoctorsByDepartment = async (department, keyword) => {
  try {
    const doctorsRef = collection(db, 'doctors');
    // Not: Veritabanında 'specialization' alanı branş ismini tutmalı (Örn: 'Kardiyoloji')
    const q = query(doctorsRef, where('specialization', '==', department), limit(3));
    const docSnap = await getDocs(q);

    if (docSnap.empty) {
      return {
        type: 'INFO',
        reply: `"${keyword}" şikayeti için ${department} bölümüne bakmalısınız ancak şu an sistemde bu branşa ait uygun doktor bulunamadı.`
      };
    }

    let msg = `"${keyword}" şikayetiniz için ${department} bölümü uygun görünüyor. İşte önerilen uzmanlarımız:\n`;
    docSnap.forEach(doc => {
      const d = doc.data();
      msg += `\n👨‍⚕️ ${d.fullName || d.name}\n🏥 ${d.hospital || d.clinicName || 'Klinik'}\n`;
    });
    msg += '\nHemen randevu almak ister misiniz?';

    return {
      type: 'SUGGESTION',
      reply: msg,
      options: [{ label: '📅 Randevu Al', value: 'yeni_randevu' }]
    };

  } catch (error) {
    console.error("Doctor Search Error:", error);
    return { type: 'ERROR', reply: 'Doktorları ararken teknik bir hata oluştu.' };
  }
};