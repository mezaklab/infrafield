import ping from 'ping';
import { prisma } from '../lib/prisma';
import { AssetStatus } from '@prisma/client';
import { emitAssetStatusUpdate } from './websocket.service';

/**
 * Worker de Monitoramento ICMP (Active Polling)
 * Consulta todos os ativos principais e periféricos de informática com IP/Hostname válidos,
 * dispara teste de ping ICMP e atualiza o status no banco de dados em tempo real.
 */
export async function pollNetworkAssets(): Promise<void> {
  console.log('\n[NetworkPoller] 🔍 Iniciando varredura de ICMP Ping em ativos e periféricos...');

  try {
    // 1. Buscar ativos de rede principais com IP ou Hostname
    const assets = await prisma.asset.findMany({
      where: {
        OR: [
          { ipAddress: { not: null } },
          { hostname: { not: null } }
        ]
      }
    });

    // 2. Buscar periféricos / ativos de informática com IP cadastrado
    const peripherals = await prisma.peripheral.findMany({
      where: {
        ipAddress: { not: null }
      }
    });

    const totalMonitored = assets.length + peripherals.length;

    if (totalMonitored === 0) {
      console.log('[NetworkPoller] ℹ️ Nenhum ativo ou periférico com IP/Hostname encontrado para monitoramento.');
      return;
    }

    console.log(`[NetworkPoller] 📡 Disparando ping para ${assets.length} ativo(s) e ${peripherals.length} periférico(s)...`);

    let updatedCount = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    // A. Processar Ativos Principais
    for (const asset of assets) {
      const target = (asset.ipAddress && asset.ipAddress.trim() !== '') 
        ? asset.ipAddress.trim() 
        : (asset.hostname && asset.hostname.trim() !== '' ? asset.hostname.trim() : null);

      if (!target) continue;

      try {
        const res = await ping.promise.probe(target, { timeout: 3, min_reply: 1 });
        const isAlive = Boolean(res.alive);
        const newStatus: AssetStatus = isAlive ? AssetStatus.OPERATIONAL : AssetStatus.CRITICAL;

        if (isAlive) {
          onlineCount++;
          console.log(`[NetworkPoller] 🟢 [OPERACIONAL] Ativo "${asset.name}" (${asset.code}) em ${target} está ONLINE - ${res.time}ms`);
        } else {
          offlineCount++;
          console.log(`[NetworkPoller] 🔴 [CRÍTICO] Ativo "${asset.name}" (${asset.code}) em ${target} está OFFLINE/INACESSÍVEL`);
        }

        if (asset.status !== newStatus) {
          await prisma.asset.update({
            where: { id: asset.id },
            data: { status: newStatus },
          });
          updatedCount++;
          console.log(`[NetworkPoller] 🔄 Status do ativo "${asset.name}" atualizado de ${asset.status} -> ${newStatus}`);

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

          emitAssetStatusUpdate({
            id: asset.id,
            code: asset.code,
            name: asset.name,
            status: newStatus,
            ipAddress: target,
          });
        }
      } catch (pingErr) {
        console.error(`[NetworkPoller] ⚠️ Erro ao disparar ping para ativo ${asset.name} (${target}):`, pingErr);
      }
    }

    // B. Processar Periféricos / Ativos de Informática com IP
    for (const peripheral of peripherals) {
      const target = peripheral.ipAddress ? peripheral.ipAddress.trim() : null;
      if (!target || target === '') continue;

      try {
        const res = await ping.promise.probe(target, { timeout: 3, min_reply: 1 });
        const isAlive = Boolean(res.alive);
        const newStatus: AssetStatus = isAlive ? AssetStatus.OPERATIONAL : AssetStatus.CRITICAL;

        if (isAlive) {
          onlineCount++;
          console.log(`[NetworkPoller] 🟢 [OPERACIONAL] Periférico "${peripheral.name}" (${peripheral.code}) em ${target} está ONLINE - ${res.time}ms`);
        } else {
          offlineCount++;
          console.log(`[NetworkPoller] 🔴 [CRÍTICO] Periférico "${peripheral.name}" (${peripheral.code}) em ${target} está OFFLINE/INACESSÍVEL`);
        }

        if (peripheral.status !== newStatus) {
          await prisma.peripheral.update({
            where: { id: peripheral.id },
            data: { status: newStatus },
          });
          updatedCount++;
          console.log(`[NetworkPoller] 🔄 Status do periférico "${peripheral.name}" atualizado de ${peripheral.status} -> ${newStatus}`);

          try {
            await prisma.notification.create({
              data: {
                title: newStatus === AssetStatus.CRITICAL 
                  ? `🚨 Alerta ICMP Periférico: ${peripheral.code}` 
                  : `🟢 Periférico Reconectado: ${peripheral.code}`,
                message: newStatus === AssetStatus.CRITICAL
                  ? `O periférico/equipamento ${peripheral.name} (${target}) parou de responder ao ping e entrou em estado CRÍTICO.`
                  : `O periférico/equipamento ${peripheral.name} (${target}) voltou a responder normalmente ao ping.`,
                type: newStatus === AssetStatus.CRITICAL ? 'ALERT' : 'SUCCESS',
                isRead: false,
              },
            });
          } catch (notifErr) {
            console.warn('[NetworkPoller] Erro ao registrar notificação de periférico:', notifErr);
          }

          emitAssetStatusUpdate({
            id: peripheral.id,
            code: peripheral.code,
            name: peripheral.name,
            status: newStatus,
            ipAddress: target,
          });
        }
      } catch (pingErr) {
        console.error(`[NetworkPoller] ⚠️ Erro ao disparar ping para periférico ${peripheral.name} (${target}):`, pingErr);
      }
    }

    console.log(
      `[NetworkPoller] ✅ Varredura finalizada. Total: ${totalMonitored} (Ativos: ${assets.length}, Periféricos: ${peripherals.length}) | Online: ${onlineCount} | Offline: ${offlineCount} | Alterados: ${updatedCount}\n`
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

  pollNetworkAssets();

  if (pollerInterval) {
    clearInterval(pollerInterval);
  }

  pollerInterval = setInterval(() => {
    pollNetworkAssets();
  }, intervalMs);
}
