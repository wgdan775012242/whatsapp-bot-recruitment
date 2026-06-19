const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = "my_secret_token_123"; // نفس التوكن في فيسبوك
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// صفحة تأكيد عمل الخادم
app.get('/', (req, res) => {
    res.send('<h1>Bot is running</h1>');
});

// التحقق من Webhook
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// استقبال الرسائل والرد عبر Gemini
app.post('/webhook', async (req, res) => {
    try {
        const entry = req.body.entry[0];
        const changes = entry.changes[0];
        const value = changes.value;

        if (value.messages) {
            const message = value.messages[0];
            const senderId = message.from;
            const userText = message.text.body;

            // إعداد Gemini
            const model = genAI.getGenerativeModel({ model: "model: "gemini-pro" });
            const prompt = `أنت مساعد ذكي متخصص في التوظيف والسفر للسعودية. أجب باختصار واحترافية على: ${userText}`;
            
            const result = await model.generateContent(prompt);
            const aiResponse = result.response.text();

            // إرسال الرد لواتساب
            await axios({
                method: 'POST',
                url: `https://graph.facebook.com/v25.0/YOUR_PHONE_NUMBER_ID/messages`,
                headers: { 'Authorization': `Bearer ${process.env.TOKEN}` },
                data: {
                    messaging_product: "whatsapp",
                    to: senderId,
                    text: { body: aiResponse },
                },
            });
        }
        res.sendStatus(200);
    } catch (error) {
        console.error("Error:", error);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
