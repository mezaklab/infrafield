import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') 
  : 'http://localhost:3333';

let socket: Socket | null = null;

export interface StatusUpdatedPayload {
  id: string;
  code: string;
  name: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'INACTIVE';
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
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('⚡ [WebSocket Client] Conectado com sucesso ao servidor NOC em tempo real. ID:', socket?.id);
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
