import fetch from 'node-fetch';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Users/Lenovo/Desktop/Online Course/Google AI Studio Code/coursegen-ai/.env' });
const rawKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: rawKey.replace(/['"]/g, '').trim() });

async function checkAllModels() {
  console.log("=== FETCHING ALL AVAILABLE MODELS FROM GOOGLE ENPOINT ===");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${rawKey.replace(/['"]/g, '').trim()}`);
  const data = await res.json();
  const models = data.models.map(m => m.name.replace("models/", ""));
  
  console.log(`Found ${models.length} models to test...\\n`);
  
  let successfulModels = [];
  
  for (const model of models) {
     try {
         const response = await ai.models.generateContent({
             model: model,
             contents: "Say SUCCESS and nothing else."
         });
         console.log(`[${model}] -> ✅ SUCCEEDED (Tokens returned)`);
         successfulModels.push(model);
     } catch (err) {
         console.log(`[${model}] -> ❌ FAILED (${err.message.includes('429') ? '429 Quota Exceeded' : err.message})`);
     }
  }
  
  console.log(`\\n=== SCAN COMPLETE ===\\nModels with Active Quota:`);
  console.log(successfulModels.length > 0 ? successfulModels : "NONE. API KEY COMPLETELY EXHAUSTED.");
}

checkAllModels();
