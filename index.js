const express = require('express');
const app = express();
app.use(express.json());

// هذا هو الرمز السري الذي ستضعه في منصة ميتا لاحقاً
const VERIFY_TOKEN = "my_secret_token_123"; 
const PORT = process.env.PORT || 3000;

// 1. نقطة التحقق (Webhook Verification) - ميتا تستخدمها للتأكد من خادمك
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. نقطة استقبال الرسائل (Receiving Messages)
app.post('/webhook', (req, res) => {
    let body = req.body;

    // التأكد من أن الإشعار قادم من صفحة ميتا
    if (body.object === 'page' || body.object === 'whatsapp_business_account') {
        
        body.entry.forEach(function(entry) {
            // هنا يتم استخراج تفاصيل الرسالة
            let webhook_event = entry.messaging ? entry.messaging[0] : entry.changes[0].value.messages[0];
            console.log("تم استلام رسالة جديدة:");
            console.log(webhook_event);
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`البوت يعمل الآن على المنفذ ${PORT} ومستعد للربط`);
});

