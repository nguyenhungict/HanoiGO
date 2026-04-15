require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testKey() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Testing Key:', key ? key.substring(0, 8) + '...' : 'MISSING');
  
  if (!key) return;

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent("Hi");
    console.log('Response:', result.response.text());
    console.log('STATUS: OK');
  } catch (err) {
    console.error('STATUS: FAILED');
    console.error('Error Code:', err.status || 'N/A');
    console.error('Error Message:', err.message);
  }
}

testKey();
