const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY); // يستخدم المفتاح الذي وضعته في Environment

app.post('/webhook', async (req, res) => {
  const incomingMessage = req.body.entry[0].changes[0].value.messages[0];
  const userText = incomingMessage.text.body;
  const senderId = incomingMessage.from;

  // إعداد نموذج Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // إرسال النص لـ Gemini
  const result = await model.generateContent(`أنت مساعد ذكي متخصص في خدمات السفر والتوظيف بالسعودية. أجب على: ${userText}`);
  const responseText = result.response.text();

  // الآن نرسل الرد لواتساب (عن طريق API الخاص بـ Meta)
  await axios({
    method: 'POST',
    url: `https://graph.facebook.com/v25.0/YOUR_PHONE_NUMBER_ID/messages`,
    headers: { 'Authorization': `Bearer ${process.env.TOKEN}` },
    data: {
      messaging_product: "whatsapp",
      to: senderId,
      text: { body: responseText },
    },
  });

  res.sendStatus(200);
});
