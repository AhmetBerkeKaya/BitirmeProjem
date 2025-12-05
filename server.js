const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { getAgentPrompt } = require('./config/agentPrompts');

// Express uygulaması oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware'ler
app.use(cors());
app.use(express.json());

// Gemini istemcisi oluştur
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Test endpoint'i - Sunucunun çalıştığını kontrol etmek için
app.get('/', (req, res) => {
    res.json({ message: 'AgentHub Backend çalışıyor!' });
  });
  
// Bireysel mod endpoint
app.post('/api/agent', async (req, res) => {
  try {
    const { agentId, agentName, userMessage } = req.body;

    console.log(`📥 İstek alındı - Agent: ${agentName}, Mesaj: ${userMessage}`);

    const systemMessage = getAgentPrompt(agentId);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `${systemMessage}\n\nKullanıcı: ${userMessage}`;

    console.log('🤖 Gemini API çağrısı yapılıyor...');
    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text();

    console.log(`✅ Gemini cevabı: ${aiResponse.substring(0, 100)}...`);

    // ============ HAVA DURUMU AGENT (agentId === '1') ============
    if (agentId === '1' && aiResponse.includes('[WEATHER:')) {
      const cityMatch = aiResponse.match(/\[WEATHER:(.*?)\]/);
      if (cityMatch) {
        const city = cityMatch[1].trim();
        
        console.log(`🌤️ Hava durumu API'sine yönlendiriliyor: ${city}`);

        try {
          const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
          
          if (!WEATHER_API_KEY) {
            throw new Error('WEATHER_API_KEY tanımlı değil');
          }

          const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=tr`
          );

          const weatherData = weatherResponse.data;

          aiResponse = `
📍 **${weatherData.name}, ${weatherData.sys.country}**

🌡️ Sıcaklık: ${weatherData.main.temp}°C (Hissedilen: ${weatherData.main.feels_like}°C)
☁️ Durum: ${weatherData.weather[0].description}
💧 Nem: ${weatherData.main.humidity}%
💨 Rüzgar: ${weatherData.wind.speed} m/s
🌅 Gün doğumu: ${new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
🌇 Gün batımı: ${new Date(weatherData.sys.sunset * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          `.trim();

          console.log('✅ Hava durumu bilgisi başarıyla alındı');

        } catch (weatherError) {
          console.error('❌ Hava durumu hatası:', weatherError.message);
          
          if (weatherError.response?.status === 404) {
            aiResponse = `Üzgünüm, "${city}" şehri için hava durumu bilgisi bulunamadı.`;
          } else if (weatherError.response?.status === 401) {
            aiResponse = 'Hava durumu API anahtarı geçersiz.';
          } else {
            aiResponse = 'Üzgünüm, hava durumu bilgisi alınamadı.';
          }
        }
      }
    }

    // ============ HESAP MAKİNESİ AGENT (agentId === '2') ============
    if (agentId === '2') {
      console.log('✅ Hesap makinesi agentı yanıtı oluşturuldu.');
    }

    // ============ ÇEVİRİ AGENT (agentId === '3') ============
    if (agentId === '3' && aiResponse.includes('[TRANSLATE:')) {
      const match = aiResponse.match(/\[TRANSLATE:(.*?)\|(.*?)\|(.*?)\]/);
      if (!match) return;
    
      const translation = match[1].trim();
      const sourceLang = match[2].trim();
      const targetLang = match[3].trim();
    
      // Kullanıcıya hem çevrilmiş cümleyi hem de dil adlarını göster:
      aiResponse = `
    Çeviri (${sourceLang} → ${targetLang}):
    [${translation}]
      `.trim();
    
      console.log(`✅ Çeviri: ${sourceLang} → ${targetLang} | ${translation}`);
    } 

    // ============ HABER AGENT (agentId === '4') ============
    if (agentId === '4' && aiResponse.includes('[NEWS:')) {
      const match = aiResponse.match(/\[NEWS:(.*?)\|(.*?)\|(.*?)\]/);
      if (!match) return;
    
      const topic = match[1].trim();
      const language = match[2].trim();
      const country = match[3].trim();
    
      console.log(`📰 Haber isteği: ${topic} | Dil: ${language} | Ülke: ${country}`);
    
      try {
        const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
        if (!GNEWS_API_KEY) throw new Error('GNEWS_API_KEY tanımlı değil');
    
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&lang=${language}&country=${country}&max=3&apikey=${GNEWS_API_KEY}`;
        console.log(`📡 GNews API isteği: ${url}`);
    
        const response = await axios.get(url);
        const articles = response.data.articles || [];
    
        if (!articles.length) {
          console.log('⚠️ Haber bulunamadı');
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent(
            `Kullanıcı "${topic}" hakkında haber istedi ama bulunamadı. Dili: ${language}. Yanıtı, mesajın dilinde ve nezaketli şekilde ver.`
          );
          aiResponse = result.response.text();
        } else {
          let rawList = articles.map((a, i) =>
            `{
      "sıra": ${i + 1},
      "başlık": "${a.title}",
      "açıklama": "${a.description || '-'}",
      "kaynak": "${a.source.name}",
      "tarih": "${a.publishedAt}",
      "link": "${a.url}"
    }`
          ).join(',\n');
    
          const formatPrompt = `
          Kullanıcıya haber kartlarını aşağıdaki veriyle sunmalısın. Yanıtı, kullanıcının mesajındaki dilde (code: ${language}) üret.
          Her haber için;
          
          - 'Kaynak:', 'Tarih:', 'Haber linki:', gibi sabit etiket ve kelimeleri cevabın diline çevir.
          - Tarihi, kullanıcının dilinde doğal biçimde yaz (örneğin, İngilizce için: October 26, 2025; Almanca için: 26. Oktober 2025; Türkçe için: 26 Ekim 2025).
          - Tüm haber detaylarını aktar, isimleri, açıklamaları, linkleri ve siteleri aynen göster; gereksiz özet veya genelleme yapma.
          - Her kartta başlığı, açıklamayı, kaynağı, tarihi ve linki başında emojiyle sun (örn: 📰 1. ...).
          - Sonuçta kartları en doğal ve anlaşılır şekilde, mesajın dilinde gruplu ve okunaklı döndür.
          - Asla Türkçe etiket kullanma, sadece kullanıcının mesajında algılanan dilde geri döndür.
          - Gerekiyorsa tarih biçimini otomatik ayarla.
          
          Veri Listesi:
          [${rawList}]
          `;
    
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent(formatPrompt);
          aiResponse = result.response.text();
    
          console.log(`✅ ${articles.length} haber bulundu ve detaylı formatlandı`);
        }
      } catch (err) {
        console.error('❌ GNews Hatası:', err.message);
        aiResponse = 'Üzgünüm, haber servisine şu anda ulaşılamıyor.';
      }
    }

    // ============ WIKIPEDIA AGENT (agentId === '5') ============
    if (agentId === '5' && aiResponse.includes('[WIKI:')) {
      const match = aiResponse.match(/\[WIKI:(.*?)\|(.*?)\]/);
      if (!match) return;

      const topic = match[1].trim().replace(/\s+/g, '_');       // boşlukları _ yap
      const lang = match[2].trim().toLowerCase();

      // Wikipedia API'den özet çek
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
      console.log(`📡 Wikipedia API isteği: ${url}`);

      try {
        const { data: wikiData } = await axios.get(url);

        // En sade haliyle kullanıcıya gösterilecek metin:
        let wikiResponse = `📚 ${wikiData.title}\n`;
        if (wikiData.description) wikiResponse += `(${wikiData.description})\n\n`;
        wikiResponse += `${wikiData.extract}\n`;
        if (wikiData.content_urls && wikiData.content_urls.desktop)
          wikiResponse += `\n🔗 ${wikiData.content_urls.desktop.page}`;
        aiResponse = wikiResponse;

        console.log('✅ Wikipedia özeti döndürüldü');
      } catch (err) {
        aiResponse = lang === 'tr'
          ? 'Üzgünüm, istenen maddeyle ilgili Wikipedia özetine ulaşılamadı.'
          : 'Sorry, could not find a summary for this topic on Wikipedia.';
        console.error('❌ Wikipedia API hatası:', err.message);
      }
    }

    // ============ DÖVİZ KURU AGENT (agentId === '6') ============
    if (agentId === '6' && aiResponse.includes('[EXCHANGE:')) {
      const match = aiResponse.match(/\[EXCHANGE:(.*?)[\|_](.*?)\]/);
      if (!match) return;

      const fromCurrency = match[1].trim().toUpperCase();
      const toCurrency = match[2].trim().toUpperCase();

      console.log(`💱 Döviz kuru isteği: ${fromCurrency} → ${toCurrency}`);

      try {
        const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
        if (!EXCHANGE_RATE_API_KEY) throw new Error('EXCHANGE_RATE_API_KEY tanımlı değil');

        const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${fromCurrency}/${toCurrency}`;
        console.log(`📡 ExchangeRate API isteği: ${url}`);

        const response = await axios.get(url);

        if (response.data.result === 'success') {
          const rate = response.data.conversion_rate;
          const lastUpdate = new Date(response.data.time_last_update_unix * 1000).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          aiResponse = `
💱 **GÜNCEL DÖVİZ KURU**

${fromCurrency} → ${toCurrency}
**1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}**

📊 **Örnek Çevrimler:**
• 10 ${fromCurrency} = ${(rate * 10).toFixed(2)} ${toCurrency}
• 100 ${fromCurrency} = ${(rate * 100).toFixed(2)} ${toCurrency}
• 1000 ${fromCurrency} = ${(rate * 1000).toFixed(2)} ${toCurrency}

🕐 Son Güncelleme: ${lastUpdate}
          `.trim();

          console.log(`✅ Döviz kuru başarıyla alındı: 1 ${fromCurrency} = ${rate} ${toCurrency}`);

        } else {
          console.log('⚠️ Döviz kuru bulunamadı');
          aiResponse = `Üzgünüm, "${fromCurrency}" → "${toCurrency}" döviz kuru bilgisi bulunamadı. Lütfen para birimi kodlarını kontrol edin.`;
        }

      } catch (exchangeError) {
        console.error('❌ Döviz kuru hatası:', exchangeError.message);
        
        if (exchangeError.response?.status === 404) {
          aiResponse = `Üzgünüm, "${fromCurrency}" veya "${toCurrency}" para birimi tanınmıyor.`;
        } else if (exchangeError.response?.status === 401) {
          aiResponse = 'Döviz kuru API anahtarı geçersiz.';
        } else {
          aiResponse = 'Üzgünüm, döviz kuru bilgisi şu anda alınamıyor.';
        }
      }
    }    

    res.json({
      success: true,
      agentName: agentName,
      response: aiResponse,
    });
  } catch (error) {
    console.error('❌ HATA DETAYI:', error);
    console.error('Hata Mesajı:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Bir hata oluştu',
    });
  }
});

// Koordine mod endpoint
app.post('/api/coordinate', async (req, res) => {
  try {
    const { userMessage } = req.body;
    console.log(`\n📥 Koordine mod isteği: ${userMessage}`);

    const plannerPrompt = `Sen bir görev planlayıcısısın. Kullanıcının isteğini analiz et ve hangi agentların SIRAYLA çalışması gerektiğini belirle.

Mevcut agentlar:
- weather: Hava durumu bilgisi sağlar
- calculator: Matematiksel hesaplama yapar
- translator: Çeviri yapar (kaynak dil → hedef dil)
- news: Haber getirir (konu, dil, ülke)
- wikipedia: Wikipedia özeti getirir

Kullanıcı mesajı: "${userMessage}"

Yanıtı JSON formatında ver:
{
  "steps": [
    {
      "agent": "news",
      "task": "Fenerbahçe hakkında Türkçe haberler getir",
      "input": "Fenerbahçe haberleri"
    },
    {
      "agent": "translator",
      "task": "Önceki adımın çıktısını İngilizce'ye çevir",
      "input": "{{PREVIOUS_OUTPUT}}"
    }
  ],
  "explanation": "Önce Türkçe haberler alınacak, sonra İngilizce'ye çevrilecek"
}`;

    // ✅ JSON mode ile model oluştur
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const planResult = await model.generateContent(plannerPrompt);
    const planText = planResult.response.text();
    
    console.log('📄 Plan metni:', planText);
    
    const plan = JSON.parse(planText);
    console.log('🤖 Koordinatör planı:', JSON.stringify(plan, null, 2));

    // 2. Adımları sırayla çalıştır
    let previousOutput = null;
    const stepResults = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`\n🔄 Adım ${i + 1}/${plan.steps.length}: ${step.agent}`);

      // Eğer input {{PREVIOUS_OUTPUT}} ise, önceki adımın çıktısını kullan
      let taskInput = step.input;
      if (taskInput === '{{PREVIOUS_OUTPUT}}' && previousOutput) {
        taskInput = previousOutput;
      }

      // Agent ID'sini bul
      const agentId = {
        'weather': '1',
        'calculator': '2',
        'translator': '3',
        'news': '4',
        'wikipedia': '5'
      }[step.agent];

      if (!agentId) {
        console.log(`⚠️ Bilinmeyen agent: ${step.agent}`);
        continue;
      }

      // Agent çağrısı yap
      try {
        const agentResponse = await axios.post('http://localhost:3000/api/agent', {
          agentId,
          agentName: step.agent,
          userMessage: taskInput
        });

        previousOutput = agentResponse.data.response;
        stepResults.push({
          step: i + 1,
          agent: step.agent,
          task: step.task,
          output: previousOutput
        });

        console.log(`✅ Adım ${i + 1} tamamlandı`);
      } catch (error) {
        console.error(`❌ Adım ${i + 1} hatası:`, error.message);
        stepResults.push({
          step: i + 1,
          agent: step.agent,
          error: error.message
        });
      }
    }

    // 3. Sonuçları birleştir ve kullanıcıya sun
    let finalResponse = `🤝 **Koordinatör Sonucu**\n\n`;
    finalResponse += `📝 Plan: ${plan.explanation}\n\n`;
    finalResponse += `---\n\n`;

    // Sadece son adımın çıktısını göster (pipeline sonucu)
    if (stepResults.length > 0) {
      const lastStep = stepResults[stepResults.length - 1];
      if (lastStep.output) {
        finalResponse += `**Son Sonuç:**\n\n${lastStep.output}`;
      } else {
        finalResponse += `❌ İşlem tamamlanamadı: ${lastStep.error}`;
      }
    }

    res.json({
      success: true,
      response: finalResponse
    });

  } catch (error) {
    console.error('❌ Koordinatör hatası:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Sunucu port ${PORT} üzerinde çalışıyor`);
});

module.exports=app; 
