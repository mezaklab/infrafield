import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { startNetworkPoller, stopNetworkPoller } from './services/networkPoller.service';
import { initWebSocketServer } from './services/websocket.service';
import { prisma } from './lib/prisma';

dotenv.config();

const PORT = process.env.PORT || 3333;
const app = createApp();
const server = http.createServer(app);

// Inicializa o servidor WebSocket (Socket.io)
const io = initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 InfraField API Server running on port ${PORT}`);
  console.log(`📡 Health Check endpoint available at http://localhost:${PORT}/api/health`);
  console.log(`⚡ WebSocket Server active on ws://localhost:${PORT}`);
  
  // Inicia o serviço de monitoramento ativo ICMP (Active Polling) a cada 60s
  startNetworkPoller(60000);
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[API] Encerramento solicitado por ${signal}.`);

  stopNetworkPoller();
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
