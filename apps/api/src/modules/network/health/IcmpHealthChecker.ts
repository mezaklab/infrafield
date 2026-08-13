import { isIP } from 'node:net';
import ping from 'ping';
import { DeviceTarget, HealthChecker, HealthCheckResult } from './HealthChecker';

export class IcmpHealthChecker implements HealthChecker {
  constructor(private readonly timeoutSeconds = 3) {}

  async check(target: DeviceTarget): Promise<HealthCheckResult> {
    if (isIP(target.ipAddress) !== 4) return { reachable: false, latencyMs: null, error: 'IPv4 inválido' };
    console.log(`[HealthCheck] Pinging ${target.ipAddress}`);
    try {
      const result = await ping.promise.probe(target.ipAddress, { timeout: this.timeoutSeconds, min_reply: 1 });
      const latency = Number(result.time);
      const health = { reachable: Boolean(result.alive), latencyMs: Number.isFinite(latency) ? latency : null };
      console.log(`[HealthCheck] ${health.reachable ? 'ONLINE' : 'UNREACHABLE'} latency=${health.latencyMs ?? 'N/A'}ms`);
      return health;
    } catch (error) {
      return { reachable: false, latencyMs: null, error: error instanceof Error ? error.message : 'Falha ICMP' };
    }
  }
}
