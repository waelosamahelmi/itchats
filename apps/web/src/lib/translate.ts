/**
 * Post translation service — calls backend AI translate endpoint,
 * caches results in localStorage for performance.
 */

import { apiFetch } from './api';

// ── Simple hash for cache keys ─────────────────────────────────────

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ── Cache ──────────────────────────────────────────────────────────

const CACHE_PREFIX = 'tr_';

function getCacheKey(text: string, targetLanguage: string): string {
  return `${CACHE_PREFIX}${simpleHash(text)}_${targetLanguage}`;
}

function getCachedTranslation(text: string, targetLanguage: string): string | null {
  try {
    const key = getCacheKey(text, targetLanguage);
    const cached = localStorage.getItem(key);
    if (cached) return cached;
  } catch {}
  return null;
}

function setCachedTranslation(text: string, targetLanguage: string, translation: string): void {
  try {
    const key = getCacheKey(text, targetLanguage);
    localStorage.setItem(key, translation);
  } catch {
    // localStorage might be full — silently ignore
  }
}

// ── Language detection ─────────────────────────────────────────────

export function detectTextLanguage(text: string): string {
  if (!text || !text.trim()) return 'en';

  let arabicCount = 0;
  let chineseCount = 0;
  let totalLetters = 0;

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // Arabic script range (0600–06FF) + Arabic supplement + Arabic presentation forms
    if ((code >= 0x0600 && code <= 0x06FF) ||
        (code >= 0x0750 && code <= 0x077F) ||
        (code >= 0xFB50 && code <= 0xFDFF) ||
        (code >= 0xFE70 && code <= 0xFEFF)) {
      arabicCount++;
      totalLetters++;
    }
    // CJK Unified Ideographs
    else if ((code >= 0x4E00 && code <= 0x9FFF) ||
             (code >= 0x3400 && code <= 0x4DBF)) {
      chineseCount++;
      totalLetters++;
    }
    // Latin letters (English, Finnish, Swedish, German, French)
    else if ((code >= 0x0041 && code <= 0x005A) || // A-Z
             (code >= 0x0061 && code <= 0x007A) || // a-z
             (code >= 0x00C0 && code <= 0x00FF)) { // Latin-1 supplement (accented chars for fi/sv/de/fr)
      totalLetters++;
    }
    // Non-BMP (emoji etc) — skip
  }

  if (totalLetters === 0) return 'en';

  const arabicRatio = arabicCount / totalLetters;
  const chineseRatio = chineseCount / totalLetters;

  if (arabicRatio > 0.3) return 'ar';
  if (chineseRatio > 0.2) return 'zh';

  // Detect Finnish-specific patterns
  if (/\b(minä|sinä|olen|hei|moi|kiitos|hyvää|mitä|kuuluu|hauska|tavata)\b/gi.test(text)) return 'fi';
  // Detect Swedish-specific patterns
  if (/\b(jag|du|är|hej|tack|bra|vad|hur|roligt|trevligt|träffas)\b/gi.test(text)) return 'sv';
  // Detect German-specific patterns
  if (/\b(ich|du|bin|hallo|danke|gut|was|wie|schön|toll|freut|mich)\b/gi.test(text)) return 'de';
  // Detect French-specific patterns
  if (/\b(je|tu|suis|bonjour|merci|bien|quoi|comment|beau|très|content|ravi)\b/gi.test(text)) return 'fr';

  return 'en';
}

// ── Language name for display ──────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ar: 'العربية',
  fi: 'Suomi',
  sv: 'Svenska',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
};

export function getLanguageDisplayName(code: string): string {
  return LANG_NAMES[code] || code;
}

// ── Translate API ──────────────────────────────────────────────────

export interface TranslateResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

export async function translateText(
  text: string,
  targetLanguage: string,
): Promise<TranslateResult> {
  if (!text.trim()) return { translatedText: text };

  // Check cache first
  const cached = getCachedTranslation(text, targetLanguage);
  if (cached) {
    return {
      translatedText: cached,
      detectedSourceLanguage: detectTextLanguage(text),
    };
  }

  // Call backend translate endpoint
  const result = await apiFetch<TranslateResult>('/ai/translate', {
    method: 'POST',
    body: JSON.stringify({ text, targetLanguage }),
  });

  // Cache the result
  if (result.translatedText) {
    setCachedTranslation(text, targetLanguage, result.translatedText);
  }

  return result;
}

// ── Auto-translate preference ──────────────────────────────────────

const AUTO_TRANSLATE_KEY = 'itchats-auto-translate';

export function getAutoTranslateSetting(): boolean {
  try {
    return localStorage.getItem(AUTO_TRANSLATE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoTranslateSetting(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_TRANSLATE_KEY, String(enabled));
  } catch {}
}

// ── Conversation cooldown ──────────────────────────────────────────

const COOLDOWN_KEY_PREFIX = 'itchats-cooldown-';

export function getCharacterCooldown(characterId: string): Date | null {
  try {
    const ts = localStorage.getItem(`${COOLDOWN_KEY_PREFIX}${characterId}`);
    if (ts) {
      const date = new Date(Number(ts));
      if (date > new Date()) return date;
    }
  } catch {}
  return null;
}

export function setCharacterCooldown(characterId: string, durationMinutes: number): void {
  try {
    const expiry = Date.now() + durationMinutes * 60 * 1000;
    localStorage.setItem(`${COOLDOWN_KEY_PREFIX}${characterId}`, String(expiry));
  } catch {}
}

export function clearCharacterCooldown(characterId: string): void {
  try {
    localStorage.removeItem(`${COOLDOWN_KEY_PREFIX}${characterId}`);
  } catch {}
}
