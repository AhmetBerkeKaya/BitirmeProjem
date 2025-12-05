// utils/ChatbotBrain.js
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; 

// --- SEMPTOM EŞLEŞTİRME HARİTASI ---
// Kullanıcı bunları yazarsa, bot hangi bölüme yönlendireceğini bilir.
const SYMPTOM_MAP = {
  'baş': 'Nöroloji',
  'migren': 'Nöroloji',
  'karın': 'Dahiliye',
  'mide': 'Dahiliye',
  'bulantı': 'Dahiliye',
  'diş': 'Diş Hekimliği',
  'dolgu': 'Diş Hekimliği',
  'kanal': 'Diş Hekimliği',
  'göz': 'Göz Hastalıkları',
  'görme': 'Göz Hastalıkları',
  'kalp': 'Kardiyoloji',
  'çarpıntı': 'Kardiyoloji',
  'cilt': 'Dermatoloji',
  'kaşıntı': 'Dermatoloji',
  'sivilce': 'Dermatoloji',
  'kırık': 'Ortopedi',
  'ağrı': 'Fizik Tedavi', // Genel ağrı
};

/**
 * Kullanıcının mesajını analiz eder ve yapılacak işlemi belirler.
 * @param {string} text - Kullanıcının yazdığı mesaj
 * @returns {object} - { type: 'ACTION_TYPE', payload: data, reply: 'Cevap metni' }
 */
export const analyzeUserMessage = async (text) => {
  const lowerText = text.toLowerCase();
  
  // 1. KONTROL: Kullanıcı Randevu Sorguluyor mu?
  if (lowerText.includes('randevum var mı') || lowerText.includes('geçmiş randevu') || lowerText.includes('ne zaman')) {
    return await checkAppointments();
  }

  // 2. KONTROL: Semptom/Hastalık Belirtiyor mu?
  // Kelime kelime tarıyoruz
  for (const [keyword, department] of Object.entries(SYMPTOM_MAP)) {
    if (lowerText.includes(keyword)) {
      return await findDoctorsByDepartment(department, keyword);
    }
  }

  // 3. KONTROL: İletişim
  if (lowerText.includes('iletişim') || lowerText.includes('adres') || lowerText.includes('telefon')) {
    return {
      type: 'INFO',
      reply: '📍 Adresimiz: İstanbul/Şişli Merkez Mah.\n📞 Telefon: 444 0 444\n⏰ Çalışma Saatleri: 09:00 - 18:00'
    };
  }

  // 4. KONTROL: Reçete
  if (lowerText.includes('reçete') || lowerText.includes('ilaç')) {
    return {
      type: 'NAVIGATE',
      target: 'PrescriptionList',
      reply: 'Reçetelerinizi görüntülemek için "Reçetelerim" sayfasına yönlendirebilirim. Gitmek ister misiniz?',
      options: [{ label: '💊 Reçetelere Git', value: 'navigate_prescription' }]
    };
  }

  // Hiçbir şey bulamazsa
  return {
    type: 'UNKNOWN',
    reply: 'Bunu tam anlayamadım. Şikayetinizi kısaca yazabilir misiniz? (Örn: "Başım ağrıyor" veya "Randevularım")',
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

    let msg = '📋 İşte randevularınız:\n';
    appSnap.forEach(doc => {
      const d = doc.data();
      const date = d.dateISO ? d.dateISO.split('T')[0] : '';
      const status = d.status === 'completed' ? '✅ Bitti' : '⏳ Bekliyor';
      msg += `\n🗓 ${date} - ${d.typeName || 'Genel'}\nDurum: ${status}\n`;
    });

    return { type: 'INFO', reply: msg };

  } catch (error) {
    console.error(error);
    return { type: 'ERROR', reply: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
  }
};

// B) Bölüme Göre Doktor Önerme
const findDoctorsByDepartment = async (department, keyword) => {
  try {
    // Doktorları 'department' alanına göre filtrele
    // NOT: Senin veritabanında department alanı 'specialization' da olabilir. Şemana göre 'specialization' kullanıyoruz.
    const doctorsRef = collection(db, 'doctors');
    const q = query(doctorsRef, where('specialization', '==', department), limit(3));
    const docSnap = await getDocs(q);

    if (docSnap.empty) {
      return {
        type: 'INFO',
        reply: `"${keyword}" şikayeti için ${department} bölümüne bakmalısınız ancak şu an uygun doktor bulamadım.`
      };
    }

    let msg = `"${keyword}" şikayetiniz için ${department} bölümü uygun görünüyor. İşte uzmanlarımız:\n`;
    docSnap.forEach(doc => {
      const d = doc.data();
      msg += `\n👨‍⚕️ ${d.fullName || d.name}\n`;
    });
    msg += '\nRandevu almak ister misiniz?';

    return {
      type: 'SUGGESTION',
      reply: msg,
      options: [{ label: '📅 Randevu Al', value: 'yeni_randevu' }]
    };

  } catch (error) {
    console.error("Doctor Search Error:", error);
    return { type: 'ERROR', reply: 'Doktorları ararken bir hata oluştu.' };
  }
};