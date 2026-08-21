import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
  : 'http://localhost:3333';

let socket: Socket | null = null;
const TOKEN_KEY = 'infrafield_token';

export interface StatusUpdatedPayload {
  id: string;
  code: string;
  name: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'INACTIVE';
  monitoringStatus?: 'ONLINE' | 'DEGRADED' | 'UNKNOWN' | 'OFFLINE';
  latencyMs?: number | null;
  ipAddress?: string | null;
  timestamp?: string;
}

/**
 * Retorna a instância única do cliente Socket.IO (Singleton).
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      auth: { token: localStorage.getItem(TOKEN_KEY) },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ [WebSocket Client] Desconectado do servidor NOC:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ [WebSocket Client] Erro na conexao Socket.IO:', err.message);
    });
  }

  return socket;
};

export const setSocketAuthToken = (token: string | null): void => {
  if (!socket) return;
  socket.auth = { token };
  socket.disconnect();
  if (token) socket.connect();
};
