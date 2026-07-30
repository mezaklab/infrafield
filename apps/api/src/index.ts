import http from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { startNetworkPoller } from './services/networkPoller.service';
import { initWebSocketServer } from './services/websocket.service';

dotenv.config();

const PORT = process.env.PORT || 3333;
const app = createApp();
const server = http.createServer(app);

// Inicializa o servidor WebSocket (Socket.io)
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 InfraField API Server running on port ${PORT}`);
  console.log(`📡 Health Check endpoint available at http://localhost:${PORT}/api/health`);
  console.log(`⚡ WebSocket Server active on ws://localhost:${PORT}`);
  
  // Inicia o serviço de monitoramento ativo ICMP (Active Polling) a cada 60s
  startNetworkPoller(60000);
});


