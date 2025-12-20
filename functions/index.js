const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10, timeoutSeconds: 60, region: "us-central1" });

const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

// --- AKILLI SÖZLÜK ---
const MEDICAL_DICTIONARY = {
  "PROLOTEPARİ": "Proloterapi (Eklem ve Bağ Güçlendirme Tedavisi)",
  "ENJEKTE OZON": "Ozon Tedavisi (Bağışıklık ve Hücre Yenileme)",
  "HACAMAT": "Hacamat (Kupa Terapisi ile Toksin Atılımı)",
  "ARDZ - REM": "Remember (Hücresel Hafıza Destekleyici)",
  "DVD-REG": "Regeneration 1 (Hücre Yenileme Desteği)",
  "ISY-REG": "Regeneration 2 (Bağışıklık Dengeleyici)",
  "DTX 19": "Detoks Takviyesi (Toksin Atıcı)",
  "Beloc ZOK": "Kalp Ritmi Düzenleyici",
  "Coraspin": "Kan Sulandırıcı",
  "Parol": "Ağrı Kesici"
};

const VALID_BRANCHES = [
  "Nöroloji", "Dahiliye", "Kardiyoloji", "Diş Hekimliği", 
  "Göz Hastalıkları", "Ortopedi", "Dermatoloji", "Genel Cerrahi", 
  "Psikiyatri", "Çocuk Sağlığı", "Kadın Doğum", "Fizik Tedavi"
];

const getFriendlyName = (term) => {
  if (!term) return "Belirtilmemiş İşlem";
  const key = Object.keys(MEDICAL_DICTIONARY).find(k => term.includes(k));
  return key ? MEDICAL_DICTIONARY[key] : term;
};

exports.chatWithAI = onCall({ cors: true }, async (request) => {
  const data = request.data;
  const auth = request.auth;
  let userText = typeof data === "string" ? data : (data.text || "");

  if (!userText) throw new HttpsError('invalid-argument', 'Mesaj boş olamaz.');
  const userId = auth ? auth.uid : null;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // --- 1. INTENT ANALİZİ (GÜNCELLENDİ) ---
    const prompt = `
      ROLE: Sen RTM Klinik Asistanısın. JSON formatında cevap ver.
      
      MEVCUT BRANŞLARIMIZ: ${VALID_BRANCHES.join(", ")}.

      GÖREV: Kullanıcı mesajını analiz et.

      INTENTLER:
      1. "ANALYZE_SYMPTOMS": Kullanıcı bir şikayetinden, ağrıdan veya hastalıktan bahsediyorsa.
      2. "FIND_DOCTOR": Açıkça "Doktor bul", "Nöroloji var mı" diyorsa.
      3. "GET_APPOINTMENTS": Randevularını soruyorsa.
      4. "GET_MEDICATIONS": İlaçlarını soruyorsa.
      5. "GET_TREATMENT_PLAN": Tedavi planını soruyorsa.
      6. "LIST_BRANCHES": Bölümleri soruyorsa.
      7. "NAVIGATE_TO_APPOINTMENT": "Randevu al" derse.
      8. "CHAT": Selamlaşma.

      KURALLAR (ANALYZE_SYMPTOMS İÇİN):
      - Kullanıcının şikayetine göre MEVCUT BRANŞLARIMIZ listesinden en uygun branşı seç ve "branch" alanına yaz.
      - "reply" kısmında: Şikayetin olası basit sebebini söyle (stres, yorgunluk, mevsimsel vb.), evde yapabileceği basit bir öneri ver (su iç, dinlen vb.) AMA mutlaka "branch" alanındaki doktora görünmesini öner.
      - Şuna benzer bir ton kullan: "Baş ağrınız stresten olabilir ama Nöroloji doktorumuza görünmeniz sağlıklı olacaktır. Başka belirtiniz var mı?"

      ÇIKTI FORMATI (JSON):
      {
        "intent": "INTENT_ADI",
        "branch": "Branş Adı veya null",
        "reply": "Kullanıcıya gösterilecek Türkçe cevap"
      }

      KULLANICI MESAJI: "${userText}"
    `;

    const result = await model.generateContent(prompt);
    let aiRawText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    let aiJson;
    try { aiJson = JSON.parse(aiRawText); } catch(e) { aiJson = { intent: "CHAT", reply: "Anlaşılamadı." }; }

    // --- 2. İŞLEMLER ---

    // 🔥 YENİ: SEMPTOM ANALİZİ VE DOKTOR ÖNERİSİ
    if (aiJson.intent === "ANALYZE_SYMPTOMS") {
        let doctors = [];
        let replyText = aiJson.reply;
        let suggestedBranch = aiJson.branch;

        // Eğer AI bir branş önerdiyse, o branştaki doktorları çek
        if (suggestedBranch && VALID_BRANCHES.includes(suggestedBranch)) {
            const dSnapshot = await db.collection("doctors")
                .where("specialization", "==", suggestedBranch)
                .limit(3) // Çok kalabalık olmasın diye 3 tane
                .get();

            if (!dSnapshot.empty) {
                doctors = await Promise.all(dSnapshot.docs.map(async (doc) => {
                    const d = doc.data();
                    let cName = "Merkez Klinik";
                    if(d.clinicId) { try { const c = await db.collection("clinics").doc(d.clinicId).get(); if(c.exists) cName = c.data().name; } catch(e){} }
                    return {
                        id: doc.id,
                        fullName: d.fullName,
                        specialization: d.specialization,
                        clinicId: d.clinicId,
                        hospital: cName
                    };
                }));
            } else {
                // Branş var ama doktor yoksa
                replyText += ` (Şu an ${suggestedBranch} için uygun doktorumuz görünmüyor ancak randevu oluşturabilirsiniz.)`;
            }
        }

        return {
            text: replyText,
            type: doctors.length > 0 ? "DOCTOR_LIST" : "TEXT",
            data: doctors.length > 0 ? doctors : null,
            options: [
                { label: "📅 Randevu Al", action: "Randevu al" },
                { label: "Diğer Belirtiler", action: "Başka şikayetlerim de var" }
            ]
        };
    }

    // === MEVCUT FONKSİYONLAR (DEĞİŞMEDİ) ===
    
    // 1. İLAÇLAR
    if (aiJson.intent === "GET_MEDICATIONS") {
        if (!userId) return { text: "Giriş yapmalısınız.", type: "TEXT", options: [] };
        const pDoc = await db.collection("patients").doc(userId).get();
        if (!pDoc.exists) return { text: "Kayıt bulunamadı.", type: "TEXT", options: [] };
        const items = pDoc.data().pharmacySoldItems || [];
        if (items.length === 0) return { text: "İlaç kaydı yok.", type: "TEXT", options: [] };
        
        const meds = items.map((item, i) => ({
            id: i, name: item.name, dosage: item.dosage, description: getFriendlyName(item.name), type: item.type || "İlaç"
        }));
        return { text: "İlaçlarınız:", type: "MEDICATION_LIST", data: meds, options: [] };
    }

    // 2. TEDAVİLER
    if (aiJson.intent === "GET_TREATMENT_PLAN") {
        if (!userId) return { text: "Giriş yapmalısınız.", type: "TEXT", options: [] };
        const pDoc = await db.collection("patients").doc(userId).get();
        const pData = pDoc.data();
        const protocol = pData.selectedProtocol || pData.customizedProtocol;
        if (!protocol?.treatmentSequence?.length) return { text: "Aktif protokol yok.", type: "TEXT", options: [] };

        const treats = protocol.treatmentSequence.sort((a,b)=>a.order-b.order).map((item, i) => ({
            id: i, name: item.treatment, phase: item.phase, description: getFriendlyName(item.treatment)
        }));
        return { text: `Protokol: ${protocol.name}`, type: "TREATMENT_LIST", data: treats, options: [] };
    }

    // 3. RANDEVULAR (GLOBAL)
    if (aiJson.intent === "GET_APPOINTMENTS") {
        if (!userId) return { text: "Giriş yapmalısınız.", type: "TEXT", options: [] };
        const snap = await db.collection("appointments").where("patientId", "==", userId).get();
        if (snap.empty) return { text: "Randevunuz yok.", type: "TEXT", options: [{label:"Randevu Al", action:"Randevu al"}] };
        
        let raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        raw.sort((a,b)=>new Date(b.dateISO)-new Date(a.dateISO));
        
        const apps = await Promise.all(raw.slice(0,5).map(async d => {
            let cName = "Merkez Klinik";
            if(d.clinicId) { try{ const c=await db.collection("clinics").doc(d.clinicId).get(); if(c.exists) cName=c.data().name; }catch(e){} }
            return { id: d.id, date: `${d.dateISO} ${d.start||''}`, branch: d.typeName||"Genel", doctor: d.doctorName, clinic: cName, status: d.status };
        }));
        return { text: "Randevularınız:", type: "APPOINTMENT_LIST", data: apps, options: [] };
    }

    // 4. DOKTOR BUL (İsimden/Branştan)
    if (aiJson.intent === "FIND_DOCTOR") {
        if (!aiJson.branch || aiJson.branch.toLowerCase().includes("tüm")) {
            return { text: "Bölüm seçin:", type: "TEXT", options: VALID_BRANCHES.slice(0,4).map(b=>({label:b, action:b})) };
        }
        const snap = await db.collection("doctors").where("specialization", "==", aiJson.branch).limit(10).get();
        if (snap.empty) return { text: "Doktor bulunamadı.", type: "TEXT", options: [] };
        
        const docs = await Promise.all(snap.docs.map(async d => {
            let cName="Merkez"; if(d.data().clinicId){ try{const c=await db.collection("clinics").doc(d.data().clinicId).get(); cName=c.data().name;}catch(e){}}
            return { id: d.id, fullName: d.data().fullName, specialization: d.data().specialization, clinicId: d.data().clinicId, hospital: cName };
        }));
        return { text: "Doktorlarımız:", type: "DOCTOR_LIST", data: docs, options: [] };
    }

    // 5. GENEL
    if (aiJson.intent === "LIST_BRANCHES") return { text: "Bölümler:", type: "TEXT", options: VALID_BRANCHES.map(b=>({label:b, action:b})) };
    if (aiJson.intent === "NAVIGATE_TO_APPOINTMENT") return { text: "Bölüm seçin:", type: "TEXT", options: [{label:"Dahiliye", action:"Dahiliye"}, {label:"Nöroloji", action:"Nöroloji"}] };

    return {
        text: aiJson.reply,
        type: "TEXT",
        options: [
            { label: "📅 Randevularım", action: "Randevularımı getir" },
            { label: "👨‍⚕️ Doktor Bul", action: "Doktor bul" }
        ]
    };

  } catch (error) {
    console.error("AI Error:", error);
    return { text: "Bir hata oluştu.", type: "TEXT", options: [] };
  }
});