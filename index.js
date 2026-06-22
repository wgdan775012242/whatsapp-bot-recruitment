const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// جلب المتغيرات من منصة Render كما أضفتها في الصورة
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; 
const GEMINI_API_KEY = process.env.API_KEY; 
const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN; 
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// تهيئة الذكاء الاصطناعي
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 1. صفحة فحص السيرفر
app.get('/', (req, res) => {
    res.send('<h1>Bot is running successfully!</h1>');
});

// 2. التحقق من Webhook الخاص بواتساب
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("تم التحقق من Webhook بنجاح!");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 3. استقبال الرسائل والرد عليها
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;

            // التأكد من وجود رسالة جديدة
            if (value?.messages && value?.messages[0]) {
                const message = value.messages[0];
                const senderId = message.from; // رقم المرسل

                // معالجة الرسائل النصية فقط لتجنب الأخطاء
                if (message.type === 'text') {
                    const userText = message.text.body;
                    console.log(`رسالة جديدة من ${senderId}: ${userText}`);

                    // إعداد Gemini وتوجيهه ليرد باسم مكتبك
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    const prompt = `أنت مساعد ذكي واحترافي يعمل لدى "أبو مجد الحداد لخدمات السفر والتوظيف". أجب باختصار، وبطريقة محترمة ومفيدة على هذا الاستفسار من العميل: ${userText}`;
                    
                    const result = await model.generateContent(prompt);
                    const aiResponse = result.response.text();

                    // إرسال الرد للعميل عبر WhatsApp API
                    await axios({
                        method: 'POST',
                        url: `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
                        headers: { 
                            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                            'Content-Type': 'application/json'
                        },
                        data: {
                            messaging_product: "whatsapp",
                            to: senderId,
                            text: { body: aiResponse },
                        },
                    });
                    
                    console.log("تم إرسال الرد بنجاح!");
                } else {
                    console.log("الرسالة ليست نصية (صورة/صوت). تم التجاهل لتجنب الخطأ.");
                }
            }
        }
        // إرسال 200 لواتساب ليتمكن من معرفة أن الرسالة وصلتنا
        res.sendStatus(200);
    } catch (error) {
        console.error("حدث خطأ أثناء معالجة الرسالة:", error?.response?.data || error.message);
        res.sendStatus(500);
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`الخادم يعمل الآن ومستعد لاستقبال الرسائل على المنفذ ${PORT}`);
});
