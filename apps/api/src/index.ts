import http from 'http';
import './config/env';
import { createApp } from './app';
import { startNetworkPoller, stopNetworkPoller } from './services/networkPoller.service';
import { initWebSocketServer } from './services/websocket.service';
import { prisma } from './lib/prisma';
import { createNetworkMonitoringScheduler } from './modules/network';

const PORT = process.env.PORT || 3333;
const app = createApp();
const server = http.createServer(app);
const networkMonitoringScheduler = createNetworkMonitoringScheduler();

// Inicializa o servidor WebSocket (Socket.io)
const io = initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 InfraField API Server running on port ${PORT}`);
  console.log(`📡 Health Check endpoint available at http://localhost:${PORT}/api/health`);
  console.log(`⚡ WebSocket Server active on ws://localhost:${PORT}`);
  
  // Compatibilidade: ativos sem monitoramento por MAC continuam no poller legado.
  if (process.env.LEGACY_IP_POLLER_ENABLED !== 'false') {
    startNetworkPoller(Number(process.env.LEGACY_IP_POLLER_INTERVAL_SECONDS || 60) * 1000);
  }
  networkMonitoringScheduler?.start();
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[API] Encerramento solicitado por ${signal}.`);

  stopNetworkPoller();
  networkMonitoringScheduler?.stop();
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
