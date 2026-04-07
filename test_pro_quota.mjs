import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/Lenovo/Desktop/Online Course/Google AI Studio Code/coursegen-ai/.env' });
const rawKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: rawKey.replace(/['"]/g, '').trim() });

async function testQuota(modelName) {
  try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: "Reply with the word 'SUCCESS'.",
      });
      console.log(`[${modelName}] -> ✅ QUOTA ACTIVE! Response: ${response.text}`);
  } catch(e) {
      console.log(`[${modelName}] -> ❌ FAILED: ${e.message}`);
  }
}

async function run() {
    console.log("=== CHECKING UNTOUCHED QUOTAS ===");
    await testQuota("gemini-2.5-pro");
    await testQuota("gemini-2.5-flash-lite");
    await testQuota("gemini-2.0-flash-lite");
    await testQuota("gemini-pro-latest");
}
run();
