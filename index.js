const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "my_secret_token_123"; 
const PORT = process.env.PORT || 3000;

// صفحة ويب بسيطة ليقبلها فيسبوك في خانة "سياسة الخصوصية"
app.get('/', (req, res) => {
    res.send('<h1>Privacy Policy</h1><p>We respect your privacy and data security.</p>');
});

// نقطة التحقق (Webhook) - هنا يتم ربط ميتا
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

app.post('/webhook', (req, res) => {
    console.log("تم استلام إشعار:", JSON.stringify(req.body, null, 2));
    res.status(200).send('EVENT_RECEIVED');
});

app.listen(PORT, () => console.log(`الخادم يعمل على المنفذ ${PORT}`));
