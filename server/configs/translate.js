// Google Cloud Translate utility
import { v2 } from '@google-cloud/translate';
const translate = new v2.Translate({
  key: process.env.GOOGLE_CLOUD_API_KEY
});

/**
 * Translate text to a target language
 * @param {string} text - The text to translate
 * @param {string} target - The target language code (e.g., 'am' for Amharic)
 * @returns {Promise<string>} - The translated text
 */
export async function translateText(text, target) {
  if (!target || target === 'en') return text;
  // Google Translate API has a limit per request, so split long text into chunks
  const maxChunkLength = 4000;
  const chunks = [];
  let current = 0;
  while (current < text.length) {
    chunks.push(text.slice(current, current + maxChunkLength));
    current += maxChunkLength;
  }
  const translations = await Promise.all(
    chunks.map(chunk => translate.translate(chunk, target).then(([t]) => t))
  );
  return translations.join(' ');
}