import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from './config/env';
import { OrganizationMember } from './models/OrganizationMember';
import { verifyAccessToken } from './utils/tokens';

interface SocketData {
  userId: string;
  orgId: string;
}

let io: Server | null = null;

/**
 * Tracks how many live sockets each user has open per organization, so we can
 * broadcast accurate presence (a user with two tabs counts once; they go
 * "offline" only when their last socket disconnects).
 */
const presence = new Map<string, Map<string, number>>(); // orgId -> (userId -> count)

function onlineUserIds(orgId: string): string[] {
  return [...(presence.get(orgId)?.keys() ?? [])];
}

function addPresence(orgId: string, userId: string) {
  const org = presence.get(orgId) ?? new Map<string, number>();
  org.set(userId, (org.get(userId) ?? 0) + 1);
  presence.set(orgId, org);
}

function removePresence(orgId: string, userId: string) {
  const org = presence.get(orgId);
  if (!org) return;
  const next = (org.get(userId) ?? 1) - 1;
  if (next <= 0) org.delete(userId);
  else org.set(userId, next);
}

const orgRoom = (orgId: string) => `org:${orgId}`;
const userRoom = (userId: string) => `user:${userId}`;

export function initRealtime(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: env.clientUrl.split(',').map((o) => o.trim()), credentials: true },
  });

  // Authenticate every socket from the access token + verify org membership.
  io.use(async (socket, next) => {
    try {
      const { token, orgId } = socket.handshake.auth as { token?: string; orgId?: string };
      if (!token || !orgId) return next(new Error('unauthorized'));
      const { sub: userId } = verifyAccessToken(token);
      const member = await OrganizationMember.exists({ organization: orgId, user: userId });
      if (!member) return next(new Error('forbidden'));
      (socket.data as SocketData) = { userId, orgId };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, orgId } = socket.data as SocketData;
    socket.join(orgRoom(orgId));
    socket.join(userRoom(userId));

    addPresence(orgId, userId);
    io!.to(orgRoom(orgId)).emit('presence:update', onlineUserIds(orgId));

    socket.on('disconnect', () => {
      removePresence(orgId, userId);
      io!.to(orgRoom(orgId)).emit('presence:update', onlineUserIds(orgId));
    });
  });

  console.log('[realtime] Socket.IO ready');
}

/** Broadcast an event to everyone currently viewing an organization. */
export function emitToOrg(orgId: string, event: string, payload?: unknown) {
  io?.to(orgRoom(orgId)).emit(event, payload);
}

/** Send an event to a single user across all their connected tabs. */
export function emitToUser(userId: string, event: string, payload?: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}
