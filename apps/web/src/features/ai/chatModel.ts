export type ConversationMode = 'chat' | 'roleplay';
export type MessageSender = 'user' | 'character' | 'system';
export type MessageKind =
  | 'text'
  | 'thought'
  | 'action'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice_note'
  | 'system'
  | 'media_request'
  | 'media_generating';
export type DeliveryState = 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';

export interface MessageReaction {
  actorType: 'user' | 'character';
  actorId: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  kind: MessageKind;
  text: string;
  mediaUrl?: string;
  /** Voice note duration in milliseconds (when kind === 'voice_note' | 'audio') */
  durationMs?: number;
  createdAt: string;
  delivery: DeliveryState;
  reactions: MessageReaction[];
  /** The real DB message ID for this message (used for reactions). When a response has
   * multiple parts, all parts share the same sourceMessageId pointing to the DB record. */
  sourceMessageId?: string;
  /** Media request metadata (when kind === 'media_request') */
  mediaRequestId?: string;
  estimatedCredits?: number;
  mediaPrompt?: string;
  mediaRequestType?: 'selfie' | 'image';
}

export interface HistoryMessage {
  id: string;
  senderType: MessageSender;
  type?: string;
  content?: string | null;
  createdAt?: string | Date;
  mediaUrl?: string | null;
  transcription?: string | null;
  durationMs?: number | null;
  metadata?: { audioUrl?: string; mediaUrl?: string; status?: string };
  reactions?: MessageReaction[];
}

export type ResponsePart = {
  type: 'speech' | 'action' | 'thought';
  content: string;
};

const responsePartTypes = new Set<ResponsePart['type']>(['speech', 'action', 'thought']);

export function parseAssistantResponse(content: string): ResponsePart[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  const json = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const value = JSON.parse(json);
    if (!Array.isArray(value)) throw new Error('Response is not an array');
    const parts = value.flatMap((part): ResponsePart[] => {
      if (!part || typeof part !== 'object') return [];
      if (!responsePartTypes.has(part.type) || typeof part.content !== 'string') return [];
      const partContent = part.content.trim();
      return partContent ? [{ type: part.type, content: partContent }] : [];
    });
    return parts.length > 0 ? parts : [{ type: 'speech', content: trimmed }];
  } catch {
    return [{ type: 'speech', content: trimmed }];
  }
}

const messageKinds = new Set<MessageKind>([
  'text', 'thought', 'action', 'image', 'video', 'audio', 'voice_note', 'system', 'media_request', 'media_generating',
]);
const deliveryStates = new Set<DeliveryState>(['sending', 'sent', 'delivered', 'seen', 'failed']);

/** Strip raw JSON artifacts from message text for cleaner display */
export function stripJsonContent(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Try full parse first
  try {
    const cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const value = JSON.parse(cleaned);
    if (Array.isArray(value)) {
      const parts: string[] = [];
      for (const p of value) {
        if (!p || typeof p !== 'object') continue;
        if ((p.type === 'speech' || p.type === 'action' || p.type === 'thought') && typeof p.content === 'string') {
          if (p.type === 'action') parts.push(`*${p.content}*`);
          else if (p.type === 'thought') parts.push(`_${p.content}_`);
          else parts.push(p.content);
        }
      }
      return parts.length > 0 ? parts.join('\n') : text;
    }
    if (value && typeof value === 'object' && typeof value.content === 'string') {
      return value.content;
    }
  } catch {
    // Not valid JSON — try to extract any partial JSON speech content
  }

  // Handle incomplete/streaming JSON by extracting speech blocks
  const speechMatches = trimmed.match(/\{"type":"speech","content":"((?:[^"\\]|\\.)*)"/g);
  if (speechMatches && speechMatches.length > 0) {
    const parts: string[] = [];
    for (const match of speechMatches) {
      try {
        const obj = JSON.parse(match);
        if (obj.content) parts.push(obj.content);
      } catch { /* skip malformed */ }
    }
    if (parts.length > 0) return parts.join('\n');
  }

  // Also try action/thought extraction
  const allMatches = trimmed.match(/\{"type":"(speech|action|thought)","content":"((?:[^"\\]|\\.)*)"/g);
  if (allMatches && allMatches.length > 0) {
    const parts: string[] = [];
    for (const match of allMatches) {
      try {
        const obj = JSON.parse(match);
        if (!obj.content) continue;
        if (obj.type === 'action') parts.push(`*${obj.content}*`);
        else if (obj.type === 'thought') parts.push(`_${obj.content}_`);
        else parts.push(obj.content);
      } catch { /* skip malformed */ }
    }
    if (parts.length > 0) return parts.join('\n');
  }

  // Strip leading JSON array bracket patterns
  let cleaned = trimmed;
  // Remove leading [{"type": patterns that look like raw JSON
  cleaned = cleaned.replace(/^\s*\[\s*\{/, '').replace(/\}\s*\]\s*$/, '');

  return cleaned === '' ? text : cleaned;
}

export function normalizeHistoryMessage(message: HistoryMessage): ChatMessage {
  const rawKind = message.type as MessageKind;
  const kind = messageKinds.has(rawKind) ? rawKind : 'text';
  const delivery = deliveryStates.has(message.metadata?.status as DeliveryState)
    ? message.metadata!.status as DeliveryState
    : 'delivered';

  // For image/video messages, the content field holds the media URL; use it as mediaUrl
  let mediaUrl: string | undefined;
  let displayText = message.content ?? '';

  if (kind === 'image' || kind === 'video') {
    // Content is the media URL for image/video messages
    mediaUrl = message.mediaUrl ?? message.metadata?.mediaUrl ?? (message.content || undefined);
    displayText = kind === 'image' ? '📸 Image' : '🎬 Video';
  } else if (kind === 'voice_note' || kind === 'audio') {
    // Durable server URL persisted on the message row
    mediaUrl = message.mediaUrl ?? message.metadata?.audioUrl ?? message.metadata?.mediaUrl ?? undefined;
    displayText = message.transcription || message.content || 'Voice note';
  } else if (message.metadata?.audioUrl) {
    mediaUrl = message.metadata.audioUrl;
  } else if (message.metadata?.mediaUrl) {
    mediaUrl = message.metadata.mediaUrl;
  }

  // Strip JSON artifacts from text content for non-character messages
  // (Character text messages are handled by parseAssistantResponse / responsePartsToMessages)
  if (kind === 'text' && message.senderType !== 'character' && typeof displayText === 'string') {
    const t = displayText.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      displayText = stripJsonContent(displayText);
    }
  }

  return {
    id: message.id,
    sender: message.senderType,
    kind,
    text: displayText,
    ...(mediaUrl ? { mediaUrl } : {}),
    ...(typeof message.durationMs === 'number' && message.durationMs > 0 ? { durationMs: message.durationMs } : {}),
    createdAt: message.createdAt instanceof Date
      ? message.createdAt.toISOString()
      : message.createdAt ?? new Date().toISOString(),
    delivery,
    reactions: message.reactions ?? [],
  };
}

function decoratePart(part: ResponsePart): Pick<ChatMessage, 'kind' | 'text'> {
  if (part.type === 'thought') return { kind: 'thought', text: `**${part.content}**` };
  if (part.type === 'action') return { kind: 'action', text: `*${part.content}*` };
  return { kind: 'text', text: part.content };
}

export function responsePartsToMessages(
  parts: ResponsePart[],
  mode: ConversationMode,
  characterId: string,
  sourceMessageId?: string,
): ChatMessage[] {
  const visibleParts = mode === 'chat' ? parts.filter((part) => part.type === 'speech') : parts;
  const createdAt = new Date().toISOString();

  return visibleParts.map((part, index) => ({
    id: sourceMessageId ? (index === 0 ? sourceMessageId : `${sourceMessageId}-${index}`) : `${characterId}-${createdAt}-${index}`,
    sender: 'character' as const,
    ...decoratePart(part),
    createdAt,
    delivery: 'delivered' as const,
    reactions: [],
    ...(sourceMessageId ? { sourceMessageId } : {}),
  }));
}
