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
  | 'media_request';
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
  'text', 'thought', 'action', 'image', 'video', 'audio', 'voice_note', 'system', 'media_request',
]);
const deliveryStates = new Set<DeliveryState>(['sending', 'sent', 'delivered', 'seen', 'failed']);

export function normalizeHistoryMessage(message: HistoryMessage): ChatMessage {
  const kind = messageKinds.has(message.type as MessageKind) ? message.type as MessageKind : 'text';
  const delivery = deliveryStates.has(message.metadata?.status as DeliveryState)
    ? message.metadata!.status as DeliveryState
    : 'delivered';

  return {
    id: message.id,
    sender: message.senderType,
    kind,
    text: message.content ?? '',
    ...(message.metadata?.audioUrl || message.metadata?.mediaUrl
      ? { mediaUrl: message.metadata.audioUrl ?? message.metadata.mediaUrl }
      : {}),
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
