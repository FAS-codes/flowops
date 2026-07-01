import { io, Socket } from 'socket.io-client';
import { getAccessToken, getActiveOrg } from './api';

/**
 * Socket.IO connects straight to the backend origin (not through the Vite proxy,
 * which doesn't forward websockets). In prod we derive it from VITE_API_URL by
 * stripping the trailing `/api`.
 */
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
export const SOCKET_URL = apiUrl
  ? apiUrl.replace(/\/api\/?$/, '')
  : 'http://localhost:4000';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    // Function form → reconnects pick up the latest token/org automatically.
    auth: (cb) => cb({ token: getAccessToken(), orgId: getActiveOrg() }),
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
