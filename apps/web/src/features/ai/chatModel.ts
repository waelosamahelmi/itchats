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
  | 'system';
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

const messageKinds = new Set<MessageKind>([
  'text', 'thought', 'action', 'image', 'video', 'audio', 'voice_note', 'system',
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
