import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getDb } from '@itchats/database';
import { messages, conversations, conversationParticipants } from '@itchats/database/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import jwt from "jsonwebtoken";
import { getConfig } from '@itchats/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN ?? 'https://itchats.ai' : 'http://localhost:3090' },
  namespace: '/ws',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: AuthenticatedSocket) {
    const token = client.handshake.query.token as string;
    if (!token) { client.disconnect(); return; }

    try {
      const config = getConfig();
      const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string; email: string; role: string };
      client.userId = decoded.sub;
      if (!this.userSockets.has(decoded.sub)) this.userSockets.set(decoded.sub, new Set());
      this.userSockets.get(decoded.sub)!.add(client.id);
    } catch {
      client.disconnect();
      return;
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.userSockets.get(client.userId)?.delete(client.id);
      if (this.userSockets.get(client.userId)?.size === 0) this.userSockets.delete(client.userId);
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string },
  ) {
    if (!client.userId) return { error: 'Not authenticated' };

    const db = getDb();
    const clientKey = randomUUID();

    // Verify participant
    const [participant] = await db.select().from(conversationParticipants)
      .where(and(
        eq(conversationParticipants.conversationId, data.conversationId),
        eq(conversationParticipants.userId, client.userId),
      )).limit(1);

    if (!participant) return { error: 'Not a participant' };

    // Persist
    const [msg] = await db.insert(messages).values({
      conversationId: data.conversationId,
      senderType: 'user',
      senderUserId: client.userId,
      type: (data.type as any) ?? 'text',
      content: data.content,
      clientIdempotencyKey: clientKey,
    }).returning();

    // Update conversation
    await db.update(conversations).set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, data.conversationId));

    // Emit to all participants in the room
    const eventData = {
      id: msg!.id,
      conversationId: data.conversationId,
      senderUserId: client.userId,
      type: 'text',
      content: data.content,
      createdAt: new Date().toISOString(),
    };

    this.server.to(`conv:${data.conversationId}`).emit('message:new', eventData);

    // Also emit to the sender for confirmation
    client.emit('message:sent', { clientKey, serverId: msg!.id });

    return { success: true, messageId: msg!.id };
  }

  @SubscribeMessage('conversation:join')
  handleJoinRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { conversationId: string }) {
    if (!client.userId) return;
    client.join(`conv:${data.conversationId}`);
    client.emit('conversation:joined', { conversationId: data.conversationId });
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { conversationId: string }) {
    client.leave(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { conversationId: string }) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('typing:start', { userId: client.userId, conversationId: data.conversationId });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { conversationId: string }) {
    if (!client.userId) return;
    client.to(`conv:${data.conversationId}`).emit('typing:stop', { userId: client.userId, conversationId: data.conversationId });
  }

  /** Send a message to a specific user (used by AI responses, system notifications) */
  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
