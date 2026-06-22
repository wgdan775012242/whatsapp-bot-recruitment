const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const http = require('http'); // 🟢 إضافة مهمة لمنصة Render

// 🟢 خادم وهمي لإرضاء منصة Render وإبقاء البوت يعمل 24 ساعة
http.createServer((req, res) => {
    res.write('Bot is running smoothly!');
    res.end();
}).listen(process.env.PORT || 8080);

// ⚠️ ضع رقم هاتفك هنا مع مفتاح الدولة (بدون علامة + أو أصفار)
const phoneNumber = "967737044480"; 

const randomDelay = () => {
    const min = 3000;
    const max = 7000;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // 🟢 زيادة وقت الانتظار حتى يكتمل الاتصال قبل طلب الكود
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n========================================`);
                console.log(`📱 كود الربط الخاص بك هو: ${code}`);
                console.log(`========================================\n`);
                console.log(`خطوات الربط:`);
                console.log(`1. افتح واتساب في هاتفك.`);
                console.log(`2. اذهب إلى (الأجهزة المرتبطة).`);
                console.log(`3. اضغط (ربط جهاز) ثم اختر (الربط برقم هاتف بدلاً من ذلك).`);
                console.log(`4. أدخل الكود الموضح بالأعلى.`);
            } catch (error) {
                console.log("حدث خطأ بسيط في جلب الكود، سيتم المحاولة مرة أخرى...");
            }
        }, 6000); // 6 ثواني لضمان استقرار الاتصال
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            if (shouldReconnect) {
                // 🟢 تأخير إعادة المحاولة لتجنب التكرار السريع في الشاشة
                setTimeout(startBot, 4000); 
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح! البوت يعمل الآن ومستعد للرد.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (textMessage) {
            console.log(`تم استلام رسالة من ${sender}: ${textMessage}`);

            await randomDelay();

            const replyText = "مرحباً بك في خدمات الحداد للسفر والسياحة! ✈️\nلقد استلمنا رسالتك وسنرد عليك في أقرب وقت.\n\nمع تحيات:\nأبو مجد الحداد وجميع موظفيه";

            await sock.sendMessage(sender, { text: replyText }, { quoted: msg });
        }
    });
}

startBot();
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
