import { LocalNetworkDiscoveryProvider } from './discovery/LocalNetworkDiscoveryProvider';
import { IcmpHealthChecker } from './health/IcmpHealthChecker';
import { DeviceMonitoringService } from './monitoring/DeviceMonitoringService';
import { NetworkMonitoringScheduler } from './monitoring/NetworkMonitoringScheduler';

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createNetworkMonitoringScheduler(): NetworkMonitoringScheduler | null {
  const mode = (process.env.NETWORK_DISCOVERY_MODE || 'disabled').toLowerCase();
  if (mode === 'disabled') {
    console.log('[NETWORK] Monitoramento por MAC desabilitado');
    return null;
  }
  if (mode !== 'local') {
    console.warn(`[NETWORK] Modo "${mode}" ainda não implementado; API seguirá sem scanner`);
    return null;
  }
  const subnets = (process.env.DISCOVERY_SUBNETS || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (subnets.length === 0) {
    console.warn('[NETWORK] DISCOVERY_SUBNETS vazio; scanner local não iniciado');
    return null;
  }
  const provider = new LocalNetworkDiscoveryProvider(subnets, positiveInteger(process.env.DISCOVERY_SWEEP_CONCURRENCY, 32));
  const checker = new IcmpHealthChecker(positiveInteger(process.env.HEALTH_CHECK_TIMEOUT_SECONDS, 3));
  const service = new DeviceMonitoringService(provider, checker, {
    offlineFailureThreshold: positiveInteger(process.env.OFFLINE_FAILURE_THRESHOLD, 3),
    degradedLatencyMs: positiveInteger(process.env.DEGRADED_LATENCY_MS, 150),
  });
  // Descoberta e health check formam um ciclo atômico nesta versão; o intervalo
  // de discovery prevalece e HEALTH_CHECK_INTERVAL_SECONDS é um alias compatível.
  const cycleSeconds = positiveInteger(
    process.env.DISCOVERY_INTERVAL_SECONDS || process.env.HEALTH_CHECK_INTERVAL_SECONDS,
    30,
  );
  return new NetworkMonitoringScheduler(service, cycleSeconds * 1000);
}
