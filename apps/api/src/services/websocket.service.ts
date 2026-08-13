import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET, getAllowedOrigins, isCorsOriginAllowed } from '../config/security';
import type { JwtPayload } from '../middlewares/auth.middleware';

let io: SocketIOServer | null = null;

export interface StatusUpdatedPayload {
  id: string;
  code: string;
  name: string;
  status: string;
  monitoringStatus?: string;
  latencyMs?: number | null;
  ipAddress?: string | null;
  timestamp?: string;
  companyId: string;
}

/**
 * Inicializa o servidor Socket.io acoplado ao servidor HTTP do Express.
 */
export function initWebSocketServer(server: HTTPServer): SocketIOServer {
  const allowedOrigins = getAllowedOrigins();
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => {
        const allowed = isCorsOriginAllowed(origin, { allowedOrigins });
        callback(allowed ? null : new Error('Origem não permitida pelo CORS.'), allowed);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    maxHttpBufferSize: 1_000_000,
  });

  io.use((socket, next) => {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
    try {
      const user = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as JwtPayload;
      if (!user.userId || !user.companyId || !user.role) throw new Error('Payload inválido.');
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Não autorizado.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;
    socket.join(`user:${user.userId}`);
    if (user.role !== Role.USUARIO) {
      socket.join(`staff:${user.companyId}`);
    }
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
    io.to(`staff:${payload.companyId}`).emit('statusUpdated', data);
  } else {
    console.warn('[WebSocket] Tentativa de emitir evento statusUpdated antes do io ser inicializado.');
  }
}
