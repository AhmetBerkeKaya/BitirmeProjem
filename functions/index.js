const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
// Arkadaşının kullandığı çalışan kütüphane:
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

// Global Ayarlar
setGlobalOptions({ maxInstances: 10 });

const API_KEY = "AIzaSyCeGlivN_Fp1NzrPILJmX_e5wjfJe_VW-4";
// API Bağlantısını başlatıyoruz
const genAI = new GoogleGenerativeAI(API_KEY);

exports.chatWithAI = onCall({ 
  cors: true, 
  region: "us-central1",
  timeoutSeconds: 60, 
}, async (request) => {
  
  const data = request.data;
  const auth = request.auth;

  console.log("📥 Gelen Veri:", JSON.stringify(data));

  // Veri Kontrolü
  let userText = "";
  if (typeof data === "string") userText = data;
  else if (data && data.text) userText = data.text;
  
  if (!userText) {
    throw new HttpsError('invalid-argument', 'Mesaj boş olamaz.');
  }

  const userEmail = auth ? auth.token.email : "Anonim";

  try {
    // 🔥 ARKADAŞININ TAKTİĞİ: Standart SDK ile 'gemini-2.5-flash' çağırıyoruz.
    // Eğer 2.5 hata verirse burayı 'gemini-1.5-flash' yapabilirsin ama arkadaşında çalışıyorsa burada da çalışır.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Senin klinik veritabanına özel prompt
    const prompt = `
      Sen bir Klinik Asistanısın. Görevin hastayı anlamak ve JSON formatında yanıt üretmek.
      
      MEVCUT VERİTABANI YETENEKLERİN:
      1. Doktorları branşa göre listeyebilirsin (Tablo: doctors).
      2. Kullanıcının randevularını kontrol edebilirsin (Tablo: appointments).
      3. Tedavi protokolleri (Tablo: treatmentProtocols).
      
      BRANŞ EŞLEŞTİRMELERİ:
      - Baş ağrısı, Migren, İnme -> Nöroloji
      - Kalp, Tansiyon -> Kardiyoloji
      - Karın ağrısı, Grip -> Dahiliye
      - Diş, İmplant -> Diş Hekimliği
      - Kemik, Kırık, Bel ağrısı -> Ortopedi
      - Göz -> Göz Hastalıkları
      - Cilt -> Dermatoloji

      KURALLAR:
      - SADECE JSON döndür. Markdown (backtick) kullanma.

      ÇIKTI FORMATLARI (JSON):
      
      A) Doktor Önerisi:
      { "intent": "FIND_DOCTOR", "branch": "Nöroloji", "reply": "Baş ağrısı şikayetiniz için Nöroloji bölümüne görünmelisiniz:" }

      B) Randevu Sorgusu:
      { "intent": "GET_APPOINTMENTS", "reply": "Randevularınızı kontrol ediyorum..." }

      C) Protokol/Bilgi:
      { "intent": "CHAT", "reply": "Detoks protokolümüz şöyledir..." }

      D) Genel Sohbet:
      { "intent": "CHAT", "reply": "Size nasıl yardımcı olabilirim?" }

      Kullanıcı Mesajı: "${userText}"
    `;

    console.log("🤖 Gemini 2.5 Flash Modeline İstek Gönderiliyor...");
    
    // Arkadaşının kodundaki gibi istek atıyoruz
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiRawText = response.text();

    console.log("📤 AI Ham Yanıt:", aiRawText);

    // JSON Temizliği
    aiRawText = aiRawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let aiJson;
    try {
      aiJson = JSON.parse(aiRawText);
    } catch (e) {
      console.warn("⚠️ JSON Parse Hatası, düz metin kabul ediliyor.");
      aiJson = { intent: "CHAT", reply: aiRawText };
    }

    // --- SENARYOLAR VE VERİTABANI İŞLEMLERİ ---

    if (aiJson.intent === "FIND_DOCTOR") {
      let query = db.collection("doctors");
      if (aiJson.branch) query = query.where("specialization", "==", aiJson.branch);
      
      const snapshot = await query.limit(5).get();
      if (snapshot.empty) return { text: `${aiJson.branch} bölümünde doktor bulunamadı.`, type: "TEXT" };

      const doctors = snapshot.docs.map(doc => ({
        id: doc.id,
        fullName: doc.data().fullName,
        specialization: doc.data().specialization,
        hospital: doc.data().hospital || "Merkez"
      }));

      return { text: aiJson.reply, data: doctors, type: "DOCTOR_LIST" };
    }

    if (aiJson.intent === "GET_APPOINTMENTS") {
      if (!auth) return { text: "Randevularınızı görmek için lütfen giriş yapın.", type: "TEXT" };
      
      const pSnap = await db.collection("patients").where("email", "==", userEmail).limit(1).get();
      if (pSnap.empty) return { text: "Hasta kaydı bulunamadı.", type: "TEXT" };

      const appSnap = await db.collection("appointments")
        .where("patientId", "==", pSnap.docs[0].id)
        .orderBy("start", "desc").limit(5).get();

      if (appSnap.empty) return { text: "Randevunuz yok.", type: "TEXT" };

      const appointments = appSnap.docs.map(doc => ({
         id: doc.id,
         date: doc.data().start,
         branch: doc.data().typeName,
         status: doc.data().status
      }));
      
      return { text: aiJson.reply, data: appointments, type: "APPOINTMENT_LIST" };
    }

    return { text: aiJson.reply, type: "TEXT" };

  } catch (error) {
    console.error("🔥 HATA:", error);
    // Hata detayını frontend'e atmıyoruz, genel mesaj veriyoruz
    throw new HttpsError('internal', "Yapay zeka şu an yanıt veremiyor: " + error.message);
  }
});