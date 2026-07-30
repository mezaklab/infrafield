import ping from 'ping';
import { prisma } from '../lib/prisma';
import { AssetStatus } from '@prisma/client';
import { emitAssetStatusUpdate } from './websocket.service';

/**
 * Worker de Monitoramento ICMP (Active Polling)
 * Consulta todos os ativos com IP/Hostname válidos, dispara teste de ping
 * e atualiza o status no banco de dados.
 */
export async function pollNetworkAssets(): Promise<void> {
  console.log('\n[NetworkPoller] 🔍 Iniciando varredura de ICMP Ping nos ativos...');

  try {
    // 1. Buscar todos os ativos que possuem IP ou Hostname cadastrado
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { ipAddress: { not: null } },
          { hostname: { not: null } }
        ]
      }
    });

    if (assets.length === 0) {
      console.log('[NetworkPoller] ℹ️ Nenhum ativo com IP ou Hostname encontrado para monitoramento.');
      return;
    }

    console.log(`[NetworkPoller] 📡 Disparando ping para ${assets.length} ativo(s)...`);

    // 2. Processar cada ativo
    let updatedCount = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    for (const asset of assets) {
      // Prioriza IP Address; se não houver ou for vazio, usa Hostname
      const target = (asset.ipAddress && asset.ipAddress.trim() !== '') 
        ? asset.ipAddress.trim() 
        : (asset.hostname && asset.hostname.trim() !== '' ? asset.hostname.trim() : null);

      if (!target) {
        continue;
      }

      try {
        // Dispara o ping com timeout curto (3 segundos)
        const res = await ping.promise.probe(target, {
          timeout: 3,
          min_reply: 1,
        });

        const isAlive = Boolean(res.alive);
        const newStatus: AssetStatus = isAlive ? AssetStatus.OPERATIONAL : AssetStatus.CRITICAL;

        if (isAlive) {
          onlineCount++;
          console.log(
            `[NetworkPoller] 🟢 [OPERACIONAL] Ativo "${asset.name}" (${asset.code}) em ${target} está ONLINE - Tempo: ${res.time}ms`
          );
        } else {
          offlineCount++;
          console.log(
            `[NetworkPoller] 🔴 [CRÍTICO] Ativo "${asset.name}" (${asset.code}) em ${target} está OFFLINE/INACESSÍVEL (Timeout)`
          );
        }

        // Atualizar status no banco se houver alteração
        if (asset.status !== newStatus) {
          await prisma.asset.update({
            where: { id: asset.id },
            data: { status: newStatus },
          });
          updatedCount++;
          console.log(`[NetworkPoller] 🔄 Status do ativo "${asset.name}" atualizado de ${asset.status} -> ${newStatus}`);

          // Cria notificação no banco de dados para rastreabilidade
          try {
            await prisma.notification.create({
              data: {
                title: newStatus === AssetStatus.CRITICAL 
                  ? `🚨 Alerta de Falha ICMP: ${asset.code}` 
                  : `🟢 Conectividade Restabelecida: ${asset.code}`,
                message: newStatus === AssetStatus.CRITICAL
                  ? `O equipamento ${asset.name} (${target}) parou de responder ao ping e entrou em estado CRÍTICO.`
                  : `O equipamento ${asset.name} (${target}) voltou a responder normalmente ao ping.`,
                type: newStatus === AssetStatus.CRITICAL ? 'ALERT' : 'SUCCESS',
                isRead: false,
                assetId: asset.id,
              },
            });
          } catch (notifErr) {
            console.warn('[NetworkPoller] Erro ao registrar notificação:', notifErr);
          }

          // Dispara o evento em tempo real via WebSockets (Socket.io)
          emitAssetStatusUpdate({
            id: asset.id,
            code: asset.code,
            name: asset.name,
            status: newStatus,
            ipAddress: target,
          });
        }
      } catch (pingErr) {
        console.error(`[NetworkPoller] ⚠️ Erro ao disparar ping para ${asset.name} (${target}):`, pingErr);
      }
    }

    console.log(
      `[NetworkPoller] ✅ Varredura finalizada. Total: ${assets.length} | Online: ${onlineCount} | Offline: ${offlineCount} | Status Alterados: ${updatedCount}\n`
    );
  } catch (error) {
    console.error('[NetworkPoller] ❌ Erro geral no ciclo de monitoramento:', error);
  }
}

let pollerInterval: NodeJS.Timeout | null = null;

/**
 * Inicializa o worker de monitoramento continuo a cada N milissegundos (padrão: 60s)
 */
export function startNetworkPoller(intervalMs: number = 60000): void {
  console.log(`\n🚀 [NetworkPoller] Serviço de Active Polling ICMP inicializado (Intervalo: ${intervalMs / 1000}s)`);

  // Executa uma varredura imediata na inicialização
  pollNetworkAssets();

  // Configura a execução recorrente
  if (pollerInterval) {
    clearInterval(pollerInterval);
  }

  pollerInterval = setInterval(() => {
    pollNetworkAssets();
  }, intervalMs);
}
