// ─────────────────────────────────────────────────────────────
// src/ai.js — Unified wrapper for Gemini, Groq, and OpenAI
// Includes automatic provider detection based on API key prefix.
// ─────────────────────────────────────────────────────────────

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const OpenAI = require('openai');

/**
 * Detects the AI provider based on the API key prefix.
 * 
 * @param {string} apiKey 
 * @returns {string} - 'gemini', 'groq', or 'openai'
 */
function detectProvider(apiKey) {
  if (!apiKey) return 'gemini';
  const key = apiKey.trim();
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('AIza')) return 'gemini';
  if (key.startsWith('sk-')) return 'openai';
  return 'gemini'; // default fallback if prefix is unknown
}

/**
 * Sends a prompt to the selected AI provider.
 * 
 * @param {Object} params
 * @param {string} [params.provider] - 'gemini', 'groq', 'openai', or 'auto'
 * @param {string} params.apiKey     - API key for the selected provider
 * @param {string} params.prompt     - The prompt to send
 * @param {string} [params.model]    - Optional specific model name
 * @returns {Promise<string>}        - Generated text response
 */
async function generateText({ provider, apiKey, prompt, model }) {
  let prov = (provider || 'auto').toLowerCase();

  // auto-detect provider if set to auto, or if the key overrides the selection
  if (prov === 'auto' || apiKey) {
    prov = detectProvider(apiKey);
  }

  if (prov === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = model || 'gemini-1.5-flash';
    const aiModel = genAI.getGenerativeModel({ model: modelName });
    const result = await aiModel.generateContent(prompt);
    return result.response.text();

  } else if (prov === 'groq') {
    const groq = new Groq({ apiKey });
    const modelName = model || 'llama-3.3-70b-specdec';
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
      temperature: 0.1,
    });
    return chatCompletion.choices[0].message.content;

  } else if (prov === 'openai') {
    const openai = new OpenAI({ apiKey });
    const modelName = model || 'gpt-4o-mini';
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: modelName,
      temperature: 0.1,
    });
    return response.choices[0].message.content;

  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

module.exports = { generateText, detectProvider };
