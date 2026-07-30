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

// Language-specific common words (high frequency, short words)
const LANG_MARKERS: Record<string, RegExp[]> = {
  fi: [
    /\b(minä|sinä|hän|olen|olet|on|olemme|olette|ovat|hei|moi|kiitos|hyvää|mitä|kuuluu|hauska|tavata|mennä|tulla|tehdä|sanoa|nähdä|antaa|hyvin|huonosti|paljon|vähän|nyt|tänään|huomenna|eilen|koska|miksi|miten|kuka|missä|milloin|ensimmäinen|toinen|kolmas|joo|kyllä|ei|ehkä|totta|kai|ihan|kiva|koko|vain|vaan|mutta|että|niin|sitten|kuitenkin|myös|tässä|tuossa|siellä|täällä|meillä|teillä|heillä)\b/gi,
    /\b(minun|sinun|hänen|meidän|teidän|heidän|minulla|sinulla|hänellä|tämä|tuo|se|nämä|nuo|ne)\b/gi,
  ],
  sv: [
    /\b(jag|du|han|hon|den|det|vi|ni|de|är|var|har|hade|ska|skulle|kan|kunde|måste|hei|tack|bra|dålig|mycket|lite|nu|idag|imorgon|igår|varför|hur|vem|var|när|första|andra|tredje|ja|nej|kanske|roligt|trevligt|träffas|också|inte|men|att|så|därför|här|där|hemma|borta)\b/gi,
  ],
  de: [
    /\b(ich|du|er|sie|es|wir|ihr|bin|bist|ist|sind|seid|habe|hast|hat|haben|habt|hallo|danke|gut|schlecht|viel|wenig|jetzt|heute|morgen|gestern|warum|wie|wer|wo|wann|erste|zweite|dritte|ja|nein|vielleicht|schön|toll|freut|mich|auch|nicht|aber|dass|dann|doch|schon|noch|nur|immer|wieder|hier|dort|drüben)\b/gi,
    /(?:sch|ch|ck|tz|pf)\w+/gi,
  ],
  fr: [
    /\b(je|tu|il|elle|nous|vous|ils|elles|suis|es|est|sommes|êtes|sont|ai|as|a|avons|avez|ont|bonjour|merci|bien|mal|beaucoup|peu|maintenant|aujourd'hui|demain|hier|pourquoi|comment|qui|où|quand|premier|deuxième|troisième|oui|non|peut-être|beau|très|content|ravi|aussi|pas|mais|que|donc|alors|encore|toujours|ici|là|chez)\b/gi,
  ],
  ar: [], // handled by script detection below
  zh: [], // handled by script detection below
};

export function detectTextLanguage(text: string): string {
  if (!text || !text.trim()) return 'en';

  let arabicCount = 0;
  let cjkCount = 0;
  let cyrillicCount = 0;
  let totalLetters = 0;

  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // Arabic script range
    if ((code >= 0x0600 && code <= 0x06FF) ||
        (code >= 0x0750 && code <= 0x077F) ||
        (code >= 0xFB50 && code <= 0xFDFF) ||
        (code >= 0xFE70 && code <= 0xFEFF)) {
      arabicCount++;
      totalLetters++;
    }
    // CJK Unified Ideographs
    else if ((code >= 0x4E00 && code <= 0x9FFF) ||
             (code >= 0x3400 && code <= 0x4DBF) ||
             (code >= 0x3040 && code <= 0x30FF) || // Hiragana + Katakana
             (code >= 0xAC00 && code <= 0xD7AF)) { // Korean Hangul
      cjkCount++;
      totalLetters++;
    }
    // Cyrillic
    else if ((code >= 0x0400 && code <= 0x04FF)) {
      cyrillicCount++;
      totalLetters++;
    }
    // Latin letters
    else if ((code >= 0x0041 && code <= 0x005A) ||
             (code >= 0x0061 && code <= 0x007A) ||
             (code >= 0x00C0 && code <= 0x00FF)) {
      totalLetters++;
    }
  }

  if (totalLetters === 0) return 'en';

  const arabicRatio = arabicCount / totalLetters;
  const cjkRatio = cjkCount / totalLetters;
  const cyrillicRatio = cyrillicCount / totalLetters;

  if (arabicRatio > 0.3) return 'ar';
  if (cjkRatio > 0.2) return 'zh';
  if (cyrillicRatio > 0.2) return 'ru';

  // For Latin-script languages, use marker word scoring
  const scores: Record<string, number> = {};
  for (const lang of ['fi', 'sv', 'de', 'fr']) {
    scores[lang] = 0;
    const patterns = LANG_MARKERS[lang] || [];
    for (const pattern of patterns) {
      const matches = (text.match(pattern) || []).length;
      scores[lang] += matches;
    }
  }

  // Find the best Latin-script language match
  let bestLang = 'en';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  // Need significant confidence to override English (at least 2 marker hits)
  if (bestScore >= 2) return bestLang;

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
