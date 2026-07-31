/**
 * Bulletproof parsing of chat-model structured output.
 *
 * The chat prompts ask the model for a JSON array of parts:
 *   [{"type":"speech","content":"..."}, {"type":"action","content":"..."}]
 * In practice models also emit: a single bare object, newline-delimited
 * objects, a `{parts:[...]}` wrapper, markdown-fenced JSON, or plain text.
 * This module normalizes every shape into a clean parts array and can render
 * a human-readable text representation for persistence.
 */

export type ChatPartType = 'speech' | 'action' | 'thought' | 'scene';

export interface ChatResponsePart {
  type: ChatPartType;
  content: string;
}

const PART_TYPES = new Set<ChatPartType>(['speech', 'action', 'thought', 'scene']);

const MEDIA_MARKER_RE = /\[SELFIE\]|\[IMAGE:\s*[^\]]*\]|\[VIDEO:\s*[^\]]*\]|\[VOICE:\s*[^\]]*\]/gi;

/** Remove markdown code fences anywhere in the text. */
function stripFences(text: string): string {
  return text.replace(/```(?:json)?/gi, '').trim();
}

/** Coerce an unknown value into a part, if it looks like one. */
function coercePart(value: unknown): ChatResponsePart | null {
  if (typeof value === 'string') {
    const content = value.trim();
    return content ? { type: 'speech', content } : null;
  }
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const rawContent = typeof obj.content === 'string' ? obj.content
    : typeof obj.text === 'string' ? obj.text
    : null;
  if (rawContent === null) return null;
  const content = rawContent.trim();
  if (!content) return null;
  const type = typeof obj.type === 'string' && PART_TYPES.has(obj.type as ChatPartType)
    ? obj.type as ChatPartType
    : 'speech';
  return { type, content };
}

function coerceMany(values: unknown[]): ChatResponsePart[] {
  return values.map(coercePart).filter((part): part is ChatResponsePart => part !== null);
}

function tryJsonValue(text: string): ChatResponsePart[] | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (Array.isArray(value)) {
    const parts = coerceMany(value);
    return parts.length > 0 ? parts : null;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.parts)) {
      const parts = coerceMany(obj.parts);
      if (parts.length > 0) return parts;
    }
    const single = coercePart(value);
    if (single) return [single];
  }
  if (typeof value === 'string' && value.trim()) {
    return [{ type: 'speech', content: value.trim() }];
  }
  return null;
}

/** Regex-based salvage: pull `{"type":"...","content":"..."}` fragments out of malformed text. */
function salvageParts(text: string): ChatResponsePart[] {
  const parts: ChatResponsePart[] = [];
  const re = /\{\s*"type"\s*:\s*"(speech|action|thought|scene)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    try {
      const content = String(JSON.parse(`"${match[2]}"`)).trim();
      if (content) parts.push({ type: match[1] as ChatPartType, content });
    } catch { /* skip malformed fragment */ }
  }
  // Also handle the reversed key order: {"content":"...","type":"..."}
  if (parts.length === 0) {
    const reReversed = /\{\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"type"\s*:\s*"(speech|action|thought|scene)"/g;
    while ((match = reReversed.exec(text)) !== null) {
      try {
        const content = String(JSON.parse(`"${match[1]}"`)).trim();
        if (content) parts.push({ type: match[2] as ChatPartType, content });
      } catch { /* skip malformed fragment */ }
    }
  }
  return parts;
}

/** Strip leftover JSON syntax so raw structure never reaches a reader. */
function stripJsonSyntax(text: string): string {
  return text
    .replace(/^[\s[{]+/, '')
    .replace(/[\s\]}]+$/, '')
    .replace(/"type"\s*:\s*"(?:speech|action|thought|scene)"\s*,?/g, '')
    .replace(/"content"\s*:\s*/g, '')
    .replace(/^"|"$/g, '')
    .trim();
}

/**
 * Parse raw model output into an ordered list of response parts.
 * Never throws; always returns at least one part for non-empty input.
 */
export function parseChatResponseParts(raw: string): ChatResponsePart[] {
  const trimmed = stripFences(raw ?? '');
  if (!trimmed) return [];

  // 1. Whole-string JSON (array, {parts:[...]}, single object, quoted string)
  const direct = tryJsonValue(trimmed);
  if (direct) return direct;

  // 2. Newline-delimited JSON objects / arrays
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((line) => line.startsWith('{') || line.startsWith('['))) {
    const parts = lines.flatMap((line) => tryJsonValue(line) ?? salvageParts(line));
    if (parts.length > 0) return parts;
  }

  // 3. Embedded JSON array somewhere in surrounding prose
  const arrayMatch = trimmed.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    const parts = tryJsonValue(arrayMatch[0]);
    if (parts) return parts;
  }

  // 4. Regex salvage of part-shaped fragments (also covers truncated JSON)
  const salvaged = salvageParts(trimmed);
  if (salvaged.length > 0) return salvaged;

  // 5. Plain text — strip any leftover JSON punctuation just in case
  const looksJsonish = /^[[{]/.test(trimmed) || /"type"\s*:/.test(trimmed);
  const content = looksJsonish ? stripJsonSyntax(trimmed) || trimmed : trimmed;
  return [{ type: 'speech', content }];
}

export interface ReadableTextOptions {
  /** Include thought parts as *italics* instead of omitting them. Default false. */
  includeThoughts?: boolean;
  /** Strip [SELFIE]/[IMAGE:]/[VIDEO:]/[VOICE:] markers. Default true. */
  stripMediaMarkers?: boolean;
}

/**
 * Render parts to a readable plain-text form for persistence/notifications:
 * speech as-is, actions and scenes as *asterisked* lines, thoughts omitted
 * (they are private) unless nothing else remains.
 */
export function partsToReadableText(parts: ChatResponsePart[], options: ReadableTextOptions = {}): string {
  const { includeThoughts = false, stripMediaMarkers = true } = options;

  const render = (withThoughts: boolean) => parts
    .filter((part) => withThoughts || part.type !== 'thought')
    .map((part) => {
      let content = part.content.trim();
      if (stripMediaMarkers) content = content.replace(MEDIA_MARKER_RE, '').replace(/\s{2,}/g, ' ').trim();
      if (!content) return '';
      if (part.type === 'speech') return content;
      return `*${content.replace(/^\*+|\*+$/g, '')}*`;
    })
    .filter(Boolean)
    .join('\n');

  const text = render(includeThoughts);
  if (text) return text;
  // Everything was a thought — fall back to including them so content is never empty.
  return render(true);
}
