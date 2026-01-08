import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// --- 1. KLİNİK VERİLERİ (Branş Listeleri Güncellendi) ---
const SAMPLE_CLINICS = [
  {
    name: "Ege Life Tıp Merkezi",
    description: "Ege bölgesinin en kapsamlı sağlıklı yaşam merkezi.",
    address: "Alsancak \\ İzmir",
    phone: "+902324445511",
    email: "info@egelife.com",
    adminEmail: "admin@egelife.com",
    isActive: true,
    // Bu liste sadece bilgi amaçlıdır, asıl branşlar doktorlardan gelir.
    specialties: ["Kardiyoloji", "Dahiliye", "Nöroloji", "Dermatoloji", "Beslenme ve Diyet"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Anadolu Şifa Polikliniği",
    description: "Geleneksel tıp ve modern cerrahi bir arada.",
    address: "Selçuklu \\ Konya",
    phone: "+903323334455",
    email: "iletisim@anadolusifa.com",
    adminEmail: "admin@anadolusifa.com",
    isActive: true,
    specialties: ["Genel Cerrahi", "Ortopedi", "Fizik Tedavi", "Çocuk Sağlığı"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: "Boğaziçi Sağlık Grubu",
    description: "İstanbul'un kalbinde uzman psikolojik ve fiziksel destek.",
    address: "Şişli \\ İstanbul",
    phone: "+902122223344",
    email: "info@bogazicisaglik.com",
    adminEmail: "admin@bogazici.com",
    isActive: true,
    specialties: ["Göz Hastalıkları", "Diş Hekimliği", "Psikiyatri", "KBB", "Estetik Cerrahi"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// --- 2. DOKTOR ŞABLONLARI (Branş Çeşitliliği Artırıldı) ---
const DOCTOR_TEMPLATES = {
  'Ege Life Tıp Merkezi': [
    { fullName: "Prof. Dr. Mehmet Öz", dept: "Kardiyoloji", exp: "20 Yıl", edu: "Ege Üniversitesi" },
    { fullName: "Uzm. Dr. Ayşe Yılmaz", dept: "Dahiliye", exp: "8 Yıl", edu: "Dokuz Eylül Üni." },
    { fullName: "Dr. Ali Vural", dept: "Nöroloji", exp: "12 Yıl", edu: "Hacettepe Tıp" },
    { fullName: "Uzm. Dr. Zeynep Su", dept: "Dermatoloji", exp: "6 Yıl", edu: "Cerrahpaşa Tıp" },
    { fullName: "Dyt. Elif Fit", dept: "Beslenme ve Diyet", exp: "4 Yıl", edu: "Başkent Üni." } // Yeni Branş
  ],
  'Anadolu Şifa Polikliniği': [
    { fullName: "Op. Dr. Burak Can", dept: "Genel Cerrahi", exp: "15 Yıl", edu: "Selçuk Üniversitesi" },
    { fullName: "Dr. Fatma Çelik", dept: "Dahiliye", exp: "5 Yıl", edu: "Meram Tıp" },
    { fullName: "Uzm. Dr. Kemal Taş", dept: "Ortopedi", exp: "10 Yıl", edu: "Ankara Tıp" },
    { fullName: "Fzt. Ahmet Güçlü", dept: "Fizik Tedavi", exp: "7 Yıl", edu: "Gazi Üni." }, // Yeni Branş
    { fullName: "Uzm. Dr. Neşe Şen", dept: "Çocuk Sağlığı", exp: "11 Yıl", edu: "Ege Tıp" } // Yeni Branş
  ],
  'Boğaziçi Sağlık Grubu': [
    { fullName: "Prof. Dr. Berna Göz", dept: "Göz Hastalıkları", exp: "18 Yıl", edu: "İstanbul Üniversitesi" },
    { fullName: "Dt. Caner Dişçi", dept: "Diş Hekimliği", exp: "7 Yıl", edu: "Marmara Diş" },
    { fullName: "Uzm. Dr. Selin Ruh", dept: "Psikiyatri", exp: "9 Yıl", edu: "Koç Üniversitesi" }, // Yeni Branş
    { fullName: "Op. Dr. Tarık Burun", dept: "KBB", exp: "14 Yıl", edu: "Çapa Tıp" },
    { fullName: "Op. Dr. Estetisyen Can", dept: "Estetik Cerrahi", exp: "6 Yıl", edu: "Akdeniz Tıp" } // Yeni Branş
  ]
};

// --- 3. TEDAVİ PROTOKOLLERİ ---
const SAMPLE_PROTOCOLS = [
  {
    name: "Migren Destek Protokolü",
    diagnosisSystem: "Nörolojik Sistem",
    clinicId: "", 
    ageGroup: "18-65",
    conditionsLogic: "any",
    control: "AYDA 1 KONTROL",
    frequency: "Haftalık",
    priority: 1,
    symptomConditions: [
      { symptomKey: "basAgrisi", symptomLabel: "Baş Ağrısı", threshold: 6, toxicityRequired: false },
      { symptomKey: "isikHassasiyeti", symptomLabel: "Işık Hassasiyeti", threshold: 4, toxicityRequired: false }
    ],
    phases: {
      mainTreatments: [
        { treatment: "Magnezyum IV", description: "Damar yoluyla magnezyum desteği." },
        { treatment: "Akupunktur", description: "Baş bölgesine nöral terapi." }
      ]
    },
    regeneration2: { treatment: "Ozon Terapi", dosage: "10 Seans" },
    remember: { treatment: "Su Tüketimi", dosage: "Günde 3 Lt" },
    createdAt: new Date().toISOString(),
    createdBy: "auto-script"
  },
  {
    name: "Bel Fıtığı Rehabilitasyon",
    diagnosisSystem: "Kas – İskelet Sistemi",
    clinicId: "",
    ageGroup: "Genel",
    conditionsLogic: "all",
    control: "HAFTADA 1",
    frequency: "Günlük",
    priority: 2,
    symptomConditions: [
      { symptomKey: "belAgrisi", symptomLabel: "Bel Ağrısı", threshold: 7, toxicityRequired: false },
      { symptomKey: "uyusma", symptomLabel: "Bacakta Uyuşma", threshold: 5, toxicityRequired: false }
    ],
    phases: {
      mainTreatments: [
        { treatment: "Manuel Terapi", description: "Omurga mobilizasyonu." },
        { treatment: "Kuru İğneleme", description: "Kas spazmı için." }
      ]
    },
    regeneration2: { treatment: "Klinik Pilates", dosage: "Haftada 2 Gün" },
    remember: { treatment: "Dik Duruş", dosage: "Sürekli" },
    createdAt: new Date().toISOString(),
    createdBy: "auto-script"
  }
];

// --- ANA YÜKLEME FONKSİYONU ---
export const seedDatabase = async () => {
  console.log("🚀 Veri yükleme işlemi başladı...");

  try {
    for (const clinicData of SAMPLE_CLINICS) {
      // 1. Kliniği Ekle
      const clinicRef = await addDoc(collection(db, "clinics"), clinicData);
      const clinicId = clinicRef.id;
      const clinicName = clinicData.name;
      console.log(`✅ Klinik Eklendi: ${clinicName} (ID: ${clinicId})`);

      // 2. Bu Kliniğe Ait Doktorları Ekle (Branşlar Buradan Oluşur)
      const doctors = DOCTOR_TEMPLATES[clinicName] || [];
      for (const docTemplate of doctors) {
        await addDoc(collection(db, "doctors"), {
          clinicId: clinicId,
          hospital: clinicName,
          fullName: docTemplate.fullName,
          specialization: docTemplate.dept, // !!! BRANŞ LİSTESİ BURADAN ÇEKİLİR !!!
          department: docTemplate.dept,
          experience: docTemplate.exp,
          education: docTemplate.edu,
          email: `doktor${Math.floor(Math.random()*10000)}@${clinicName.split(' ')[0].toLowerCase()}.com`,
          phone: "+90555" + Math.floor(1000000 + Math.random() * 9000000),
          tcNo: "1" + Math.floor(1000000000 + Math.random() * 9000000000),
          licenseNumber: "DR-" + Math.floor(10000 + Math.random() * 90000),
          userType: "doctor",
          isClinicOwner: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      console.log(`   └─ ${doctors.length} doktor (ve branş) eklendi.`);

      // 3. Protokol Ekle
      const protocol = SAMPLE_PROTOCOLS[SAMPLE_CLINICS.indexOf(clinicData) % SAMPLE_PROTOCOLS.length];
      if (protocol) {
        const protocolData = { ...protocol, clinicId: clinicId };
        await addDoc(collection(db, "treatmentProtocols"), protocolData);
        console.log(`   └─ Protokol tanımlandı: ${protocol.name}`);
      }
    }

    console.log("🎉 TÜM VERİLER VE BRANŞLAR BAŞARIYLA YÜKLENDİ!");
    alert("Klinikler, Doktorlar ve Branşlar eklendi. Uygulamayı yenileyin.");

  } catch (error) {
    console.error("❌ Veri yükleme hatası:", error);
    alert("Bir hata oluştu: " + error.message);
  }
};