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
  createdAt: string;
  delivery: DeliveryState;
  reactions: MessageReaction[];
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
    // Partial JSON — try to extract speech content
    const speechMatch = trimmed.match(/\{"type":"speech","content":"([^"]*(?:\\.[^"]*)*)"/);
    if (speechMatch) {
      try { return JSON.parse(`"${speechMatch[1]}"`); } catch { /* fall through */ }
    }
  }
  return text;
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
    mediaUrl = message.metadata?.mediaUrl ?? (message.content || undefined);
    displayText = kind === 'image' ? '📸 Image' : '🎬 Video';
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
): ChatMessage[] {
  const visibleParts = mode === 'chat' ? parts.filter((part) => part.type === 'speech') : parts;
  const createdAt = new Date().toISOString();

  return visibleParts.map((part, index) => ({
    id: `${characterId}-${createdAt}-${index}`,
    sender: 'character',
    ...decoratePart(part),
    createdAt,
    delivery: 'delivered',
    reactions: [],
  }));
}
