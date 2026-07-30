import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export interface StatusUpdatedPayload {
  id: string;
  code: string;
  name: string;
  status: string;
  ipAddress?: string | null;
  timestamp?: string;
}

/**
 * Inicializa o servidor Socket.io acoplado ao servidor HTTP do Express.
 */
export function initWebSocketServer(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [WebSocket] Novo cliente NOC conectado: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 [WebSocket] Cliente NOC desconectado: ${socket.id}`);
    });
  });

  console.log('⚡ [WebSocket] Servidor Socket.io ativo e pronto para eventos em tempo real.');
  return io;
}

/**
 * Retorna a instância ativa do SocketIOServer.
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emite o evento 'statusUpdated' via WebSocket para todos os clientes conectados.
 */
export function emitAssetStatusUpdate(payload: StatusUpdatedPayload): void {
  if (io) {
    const data = {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    console.log(`📡 [WebSocket] Emissao de evento 'statusUpdated' -> Ativo: ${payload.code} | Status: ${payload.status}`);
    io.emit('statusUpdated', data);
  } else {
    console.warn('[WebSocket] Tentativa de emitir evento statusUpdated antes do io ser inicializado.');
  }
}
