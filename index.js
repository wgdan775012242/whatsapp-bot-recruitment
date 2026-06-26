const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// المتغيرات التي ستسحبها الاستضافة
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // رمز سري جديد للتحقق من الويبهوك
const PORT = process.env.PORT || 3000;

// --- 1. دالة إرسال الرسائل ---
async function sendWhatsAppMessage(recipientNumber, messageText) {
    const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
    const data = {
        messaging_product: "whatsapp",
        to: recipientNumber,
        type: "text",
        text: { body: messageText }
    };
    const config = {
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    try {
        await axios.post(url, data, config);
        console.log("تم الرد بنجاح على:", recipientNumber);
    } catch (error) {
        console.error("خطأ في الإرسال:", error.response ? error.response.data : error.message);
    }
}

// --- 2. مسار التحقق من الويبهوك (تطلبه ميتا لربط البوت) ---
app.get('/webhook', (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("تم التحقق من الويبهوك بنجاح!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// --- 3. مسار استقبال الرسائل والرد عليها ---
app.post('/webhook', async (req, res) => {
    let body = req.body;

    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            
            // استخراج رقم المرسل ونص الرسالة الواردة
            let from = body.entry[0].changes[0].value.messages[0].from; 
            let msg_body = body.entry[0].changes[0].value.messages[0].text.body; 

            console.log(`رسالة واردة من ${from}: ${msg_body}`);

            // إرسال الرد التلقائي
            let replyMessage = `مرحباً بك! لقد استلمنا رسالتك: "${msg_body}". نحن في خدمتك لتسهيل حجوزاتك.`;
            await sendWhatsAppMessage(from, replyMessage);
        }
        res.sendStatus(200); // إخبار ميتا أن الرسالة استلمت بنجاح
    } else {
        res.sendStatus(404);
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log("البوت يعمل الآن على المنفذ:", PORT);
});
