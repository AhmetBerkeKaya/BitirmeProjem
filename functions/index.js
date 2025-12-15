const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// Timeout ve Region ayarları
setGlobalOptions({ maxInstances: 10, timeoutSeconds: 60, region: "us-central1" });

const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

// --- 🧠 AKILLI SÖZLÜK (Teknik Terim -> Halk Dili) ---
// Veritabanındaki kodların hastaya nasıl görüneceğini buradan yönetirsin.
const MEDICAL_DICTIONARY = {
  // Tedaviler
  "PROLOTEPARİ": "Proloterapi (Eklem ve Bağ Güçlendirme Tedavisi)",
  "ENJEKTE OZON": "Ozon Tedavisi (Bağışıklık ve Hücre Yenileme)",
  "HACAMAT": "Hacamat (Kupa Terapisi ile Toksin Atılımı)",
  
  // İlaçlar ve Takviyeler (Veritabanındaki kodlara göre)
  "ARDZ - REM": "Remember (Hücresel Hafıza Destekleyici)",
  "DVD-REG": "Regeneration 1 (Hücre Yenileme Desteği)",
  "ISY-REG": "Regeneration 2 (Bağışıklık Dengeleyici)",
  "DTX 19": "Detoks Takviyesi (Toksin Atıcı)",
  "Beloc ZOK": "Kalp Ritmi Düzenleyici",
  "Coraspin": "Kan Sulandırıcı (Pıhtılaşma Önleyici)",
  "Parol": "Ağrı Kesici ve Ateş Düşürücü"
};

const VALID_BRANCHES = [
  "Nöroloji", "Dahiliye", "Kardiyoloji", "Diş Hekimliği", 
  "Göz Hastalıkları", "Ortopedi", "Dermatoloji", "Genel Cerrahi", 
  "Psikiyatri", "Çocuk Sağlığı", "Kadın Doğum", "Fizik Tedavi"
];

// Yardımcı Fonksiyon: Terim Açıklayıcı
const getFriendlyName = (term) => {
  if (!term) return "Belirtilmemiş İşlem";
  // Tam eşleşme var mı?
  if (MEDICAL_DICTIONARY[term]) return MEDICAL_DICTIONARY[term];
  // Kısmi eşleşme var mı? (Örn: "DTX 19 Şurup" içinde "DTX 19" geçiyor mu?)
  const key = Object.keys(MEDICAL_DICTIONARY).find(k => term.includes(k));
  return key ? MEDICAL_DICTIONARY[key] : term; // Bulamazsa orijinalini döndür
};

exports.chatWithAI = onCall({ cors: true }, async (request) => {
  const data = request.data;
  const auth = request.auth;
  let userText = typeof data === "string" ? data : (data.text || "");

  if (!userText) throw new HttpsError('invalid-argument', 'Mesaj boş olamaz.');
  
  const userId = auth ? auth.uid : null;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // --- 1. INTENT ANALİZİ (Yapay Zeka Karar Mekanizması) ---
    const prompt = `
      ROLE: Sen bir JSON API motorusun. Asla sohbet etme, sadece JSON döndür.
      
      GÖREV: Kullanıcı mesajını analiz et ve en uygun INTENT'i belirle.

      INTENT LİSTESİ:
      1. "FIND_DOCTOR": Doktor arama, branş sorma. ("branch" parametresini doldur).
      2. "GET_APPOINTMENTS": Randevuları sorma, ne zaman gelmeliyim?
      3. "GET_MEDICATIONS": İlaçlar, reçeteler, eczane, takviyeler.
      4. "GET_TREATMENT_PLAN": Tedavi planı, protokol, yapılacak işlemler.
      5. "LIST_BRANCHES": Hangi bölümler var?
      6. "NAVIGATE_TO_APPOINTMENT": Sadece "Randevu al" derse.
      7. "CHAT": Selamlaşma veya genel sohbet.

      ÇIKTI FORMATI (JSON):
      {
        "intent": "INTENT_ADI",
        "branch": "Branş Adı veya null",
        "reply": "Kullanıcıya gösterilecek kısa, nazik Türkçe cevap"
      }

      KULLANICI MESAJI: "${userText}"
    `;

    const result = await model.generateContent(prompt);
    let aiRawText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    let aiJson;
    try { aiJson = JSON.parse(aiRawText); } catch(e) { aiJson = { intent: "CHAT", reply: "Anlaşılamadı." }; }

    // --- 2. VERİTABANI İŞLEMLERİ VE YANIT ÜRETME ---

    // === İLAÇLARI / REÇETELERİ GETİR ===
    if (aiJson.intent === "GET_MEDICATIONS") {
        if (!userId) return { text: "Giriş yapmalısınız.", type: "TEXT", options: [] };

        const patientDoc = await db.collection("patients").doc(userId).get();
        if (!patientDoc.exists) return { text: "Hasta kaydı bulunamadı.", type: "TEXT", options: [] };

        const pData = patientDoc.data();
        const items = pData.pharmacySoldItems || [];

        if (items.length === 0) {
            return {
                text: "Sistemde kayıtlı ilaç veya takviye satışınız görünmüyor.",
                type: "TEXT",
                options: [{ label: "Tedavilerim", action: "Tedavi planımı göster" }]
            };
        }

        // Veriyi işle ve zenginleştir
        const medications = items.map((item, index) => ({
            id: index,
            name: item.name, // Örn: ARDZ - REM
            dosage: item.dosage, // Örn: 3X1 T
            description: getFriendlyName(item.name), // Örn: Remember (Hücresel Hafıza...)
            type: item.type || "İlaç/Takviye"
        }));

        return {
            text: "Kullanmanız gereken ilaçlar ve takviyeler:",
            type: "MEDICATION_LIST",
            data: medications,
            options: [{ label: "Tedavi Planım", action: "Tedavi planımı göster" }]
        };
    }

    // === TEDAVİ PLANINI GETİR ===
    if (aiJson.intent === "GET_TREATMENT_PLAN") {
        if (!userId) return { text: "Giriş yapmalısınız.", type: "TEXT", options: [] };

        const patientDoc = await db.collection("patients").doc(userId).get();
        if (!patientDoc.exists) return { text: "Hasta kaydı bulunamadı.", type: "TEXT", options: [] };

        const pData = patientDoc.data();
        // Veritabanındaki yapıya göre öncelik: selectedProtocol > customizedProtocol
        const protocol = pData.selectedProtocol || pData.customizedProtocol;

        if (!protocol || !protocol.treatmentSequence || protocol.treatmentSequence.length === 0) {
            return {
                text: "Henüz size atanmış aktif bir tedavi protokolü bulunmuyor.",
                type: "TEXT",
                options: [{ label: "Randevu Al", action: "Randevu al" }]
            };
        }

        // Tedavileri işle ve zenginleştir
        const treatments = protocol.treatmentSequence
            .sort((a, b) => (a.order || 0) - (b.order || 0)) // Sıraya diz
            .map((item, index) => ({
                id: index,
                name: item.treatment, // Örn: PROLOTEPARİ
                phase: item.phase, // Örn: Main Treatment
                description: getFriendlyName(item.treatment) || item.description // Sözlükten açıklama
            }));

        return {
            text: `Mevcut Protokolünüz: ${protocol.name || 'Kişisel Tedavi Planı'}`,
            type: "TREATMENT_LIST",
            data: treatments,
            options: [{ label: "İlaçlarım", action: "İlaçlarımı göster" }]
        };
    }

    // === RANDEVULARI GETİR (Global Arama - Index Hatasız) ===
    if (aiJson.intent === "GET_APPOINTMENTS") {
        if (!userId) return { text: "Giriş yapmalısınız.", type: "TEXT", options: [] };
        
        // orderBy kullanmıyoruz, index hatasını önlemek için JS ile sıralayacağız.
        const apptSnapshot = await db.collection("appointments").where("patientId", "==", userId).get();
        
        if (apptSnapshot.empty) {
            return { 
                text: "Sistemde kayıtlı randevunuz bulunmuyor.", 
                type: "TEXT", 
                options: [{label:"Randevu Al", action:"Randevu al"}] 
            };
        }

        let rawData = apptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // JS ile Tarihe Göre Sıralama (Yeniden Eskiye)
        rawData.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
        // İlk 5 tanesini al
        rawData = rawData.slice(0, 5);

        // Klinik isimlerini çek (Promise.all ile hızlıca)
        const appointments = await Promise.all(rawData.map(async (d) => {
            let clinicName = "Merkez Klinik";
            if (d.clinicId) {
                try {
                    const cDoc = await db.collection("clinics").doc(d.clinicId).get();
                    if (cDoc.exists) clinicName = cDoc.data().name || "Merkez Klinik";
                } catch(e){}
            }
            return {
                id: d.id,
                date: `${d.dateISO} ${d.start || ''}`,
                branch: d.typeName || d.department || "Genel",
                doctor: d.doctorName || "Belirtilmemiş",
                clinic: clinicName,
                status: d.status
            };
        }));

        return {
            text: "Randevularınız:",
            type: "APPOINTMENT_LIST",
            data: appointments,
            options: [{ label: "Ana Menü", action: "Merhaba" }]
        };
    }

    // === DOKTOR BULMA ===
    if (aiJson.intent === "FIND_DOCTOR") {
        if (!aiJson.branch || aiJson.branch.toLowerCase().includes("tüm")) {
            return {
                text: "Hangi bölümden doktor arıyorsunuz?",
                type: "TEXT",
                options: VALID_BRANCHES.slice(0, 4).map(b => ({ label: b, action: b }))
            };
        }

        const dSnapshot = await db.collection("doctors").where("specialization", "==", aiJson.branch).limit(10).get();
        if (dSnapshot.empty) return { text: `${aiJson.branch} bölümünde doktor bulamadım.`, type: "TEXT", options: [] };

        const doctors = await Promise.all(dSnapshot.docs.map(async (doc) => {
            const d = doc.data();
            let cName = "Merkez Klinik";
            if(d.clinicId) {
                try { const c = await db.collection("clinics").doc(d.clinicId).get(); if(c.exists) cName = c.data().name; } catch(e){}
            }
            return {
                id: doc.id,
                fullName: d.fullName,
                specialization: d.specialization,
                clinicId: d.clinicId,
                hospital: cName
            };
        }));

        return {
            text: `${aiJson.branch} doktorları:`,
            type: "DOCTOR_LIST",
            data: doctors,
            options: [{ label: "Randevu Al", action: "Randevu al" }]
        };
    }

    // === BRANŞ LİSTELEME ===
    if (aiJson.intent === "LIST_BRANCHES") {
        return {
            text: "Hizmet verdiğimiz bölümler:",
            type: "TEXT",
            options: VALID_BRANCHES.slice(0, 6).map(b => ({ label: b, action: `${b} doktorları` }))
        };
    }

    // === GENEL NAVİGASYON ===
    if (aiJson.intent === "NAVIGATE_TO_APPOINTMENT") {
       return {
         text: "Lütfen bir bölüm seçiniz:",
         type: "TEXT",
         options: [{label:"Dahiliye", action:"Dahiliye"}, {label:"Nöroloji", action:"Nöroloji"}]
       };
    }

    // === VARSAYILAN SOHBET ===
    return {
        text: aiJson.reply,
        type: "TEXT",
        options: [
            { label: "💊 İlaçlarım", action: "İlaçlarımı göster" },
            { label: "📋 Tedavilerim", action: "Tedavi planımı göster" },
            { label: "📅 Randevularım", action: "Randevularımı getir" }
        ]
    };

  } catch (error) {
    console.error("AI Error:", error);
    return { text: "Bir hata oluştu, lütfen tekrar deneyin.", type: "TEXT", options: [] };
  }
});