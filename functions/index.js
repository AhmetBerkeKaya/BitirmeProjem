const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

// 🔥 API KEY BURAYA
const API_KEY = "AIzaSyDoZXS2dvyfxG7IquzITEygprSvzzulDno"; 


const genAI = new GoogleGenerativeAI(API_KEY);

const VALID_BRANCHES = [
  "Nöroloji", "Dahiliye", "Kardiyoloji", "Diş Hekimliği", 
  "Göz Hastalıkları", "Ortopedi", "Dermatoloji", "Genel Cerrahi", "Psikiyatri", 
  "Çocuk Sağlığı", "Kadın Doğum"
];

exports.chatWithAI = onCall({ 
  cors: true, 
  region: "us-central1",
  timeoutSeconds: 60, 
}, async (request) => {
  
  const data = request.data;
  const auth = request.auth;
  let userText = typeof data === "string" ? data : (data.text || "");
  
  if (!userText) throw new HttpsError('invalid-argument', 'Mesaj boş olamaz.');

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Protokolleri hazırla
    const protocolSnap = await db.collection("treatmentProtocols").limit(30).get();
    const protocolList = protocolSnap.docs.map(doc => {
      const d = doc.data();
      let treatmentDesc = "Detay yok.";
      try { treatmentDesc = Object.values(d.phases.mainTreatments)[0].description; } catch(e){}
      return { name: d.name, details: treatmentDesc };
    });

    const prompt = `
      Sen RTM Klinik Asistanısın.

      MEVCUT TEDAVİLER: ${JSON.stringify(protocolList)}
      BRANŞLAR: ${JSON.stringify(VALID_BRANCHES)}

      GÖREVLER VE KURALLAR:
      1. KULLANICI SADECE "RANDEVU AL" DERSE:
         - Hangi bölüm veya doktor olduğunu bilmiyorsun. ASLA "NAVIGATE" döndürme.
         - Bunun yerine Intent: ASK_BRANCH yap ve kullanıcıya bölüm sor.
      
      2. KULLANICI "NÖROLOJİ DOKTORU BUL" DERSE (Intent: FIND_DOCTOR):
         - Doktorları listele.
      
      3. YÖNLENDİRME (Intent: NAVIGATE_TO_APPOINTMENT):
         - BU INTENT'I ASLA TEK BAŞINA KULLANMA.
         - Kullanıcı ancak BİR DOKTOR SEÇTİKTEN SONRA (Frontend'deki butona basınca) bu işlem gerçekleşir.
         - Eğer kullanıcı "X doktorundan randevu al" derse ve sen veritabanından o doktoru bulabilirsen bu intenti kullan. Bulamazsan yine FIND_DOCTOR yap.

      ÇIKTI FORMATI (JSON):
      {
        "intent": "CHAT" | "FIND_DOCTOR" | "ASK_BRANCH" | "NAVIGATE_TO_APPOINTMENT" | "GET_PROTOCOL_INFO",
        "branch": "Branş Adı",
        "reply": "Cevap metni",
        "options": [ { "label": "Buton", "action": "Komut" } ]
      }

      Kullanıcı Mesajı: "${userText}"
    `;

    const result = await model.generateContent(prompt);
    let aiRawText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let aiJson;
    try { aiJson = JSON.parse(aiRawText); } 
    catch (e) { return { text: aiRawText, type: "TEXT", options: [{ label: "Ana Menü", action: "Merhaba" }] }; }

    const defaultOptions = aiJson.options || [{ label: "Ana Menü", action: "Merhaba" }];

    // --- SENARYOLAR ---

    // 1. BRANŞ SORMA (Belirsiz Randevu İsteği)
    if (aiJson.intent === "ASK_BRANCH") {
       return {
         text: "Hangi bölümden randevu almak istersiniz?",
         type: "TEXT",
         options: [
           { label: "🧠 Nöroloji", action: "Nöroloji doktorlarını listele" },
           { label: "🩺 Dahiliye", action: "Dahiliye doktorlarını listele" },
           { label: "🦴 Ortopedi", action: "Ortopedi doktorlarını listele" },
           { label: "Tüm Bölümler", action: "Tüm branşları listele" }
         ]
       };
    }

    // 2. DOKTOR LİSTELEME
    if (aiJson.intent === "FIND_DOCTOR") {
      if (!aiJson.branch) return { text: "Bölüm seçiniz:", type: "TEXT", options: [{label:"Bölüm Seç", action:"Randevu al"}] };

      let query = db.collection("doctors").where("specialization", "==", aiJson.branch);
      const snapshot = await query.limit(10).get();
      
      if (snapshot.empty) {
        return { 
           text: `${aiJson.branch} bölümünde doktorumuz yok.`, 
           type: "TEXT", 
           options: [{label:"Diğer Branşlar", action:"Randevu al"}] 
        };
      }

      let doctors = snapshot.docs.map(doc => ({
        id: doc.id, 
        clinicId: doc.data().clinicId,
        fullName: doc.data().fullName,
        specialization: doc.data().specialization,
        hospital: doc.data().hospital || "Merkez Klinik"
      }));

      // 🔥 ÖNEMLİ: Burada "Randevu Al" butonu artık genel bir navigasyon değil,
      // Kullanıcıyı "Hangi doktor?" sorusundan kurtarmak için ilk doktora yönlendirebilir 
      // VEYA sadece listeyi gösterip karttan seçmesini bekleyebiliriz.
      // En güvenlisi: Kartlardan seçmesini beklemek.

      return { 
        text: aiJson.reply, 
        data: doctors, 
        type: "DOCTOR_LIST",
        // Genel "Randevu Al" butonunu kaldırdım, kullanıcı karttaki butona basmalı.
        options: [{ label: "Ana Menü", action: "Merhaba" }] 
      };
    }

    // 3. YÖNLENDİRME (Sadece çok spesifik durumlarda)
    if (aiJson.intent === "NAVIGATE_TO_APPOINTMENT") {
       // Eğer kullanıcı "Dr. Ahmet'ten randevu al" dediyse ve biz ID'yi bilmiyorsak,
       // bu intent TEHLİKELİDİR. O yüzden burada güvenli moda geçiyoruz.
       
       return {
         text: "Lütfen listeden randevu almak istediğiniz doktoru seçin.",
         type: "TEXT", // Navigation DEĞİL, Text döndürüyoruz.
         options: [{ label: "Doktorları Listele", action: `${aiJson.branch || 'Dahiliye'} doktorlarını listele` }]
       };
    }

    // Diğer (Protokol, Sohbet vs. aynı kalabilir)
    // ... (Protokol kodu aynı kalacak) ...

    return { text: aiJson.reply, type: "TEXT", options: defaultOptions };

  } catch (error) {
    console.error("AI Error:", error);
    return { text: "Bir sorun oluştu.", type: "TEXT", options: [{label: "Tekrar Dene", action: userText}] };
  }
});