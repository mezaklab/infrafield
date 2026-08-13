import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NetworkDiscoveryProvider, DiscoveredDevice } from './NetworkDiscoveryProvider';
import { normalizeMacAddress } from '../utils/macAddress';
import { parseSubnet, usableHosts } from '../utils/ipv4';

const execFileAsync = promisify(execFile);

export class LocalNetworkDiscoveryProvider implements NetworkDiscoveryProvider {
  constructor(
    private readonly subnets: string[],
    private readonly sweepConcurrency = 32,
    private readonly pingTimeoutSeconds = 1,
  ) {}

  async discover(targetMacAddresses: readonly string[] = []): Promise<DiscoveredDevice[]> {
    console.log('[NetworkDiscovery] Starting local discovery');
    const discovered = new Map<string, DiscoveredDevice>();
    for (const configuredSubnet of this.subnets) {
      const subnet = parseSubnet(configuredSubnet);
      if (!subnet) {
        console.warn(`[NETWORK] Subnet ignorada (CIDR inválido ou maior que /22): ${configuredSubnet}`);
        continue;
      }
      console.log(`[NetworkDiscovery] Subnet: ${subnet.cidr}`);

      // Caminho rápido: aproveita imediatamente vizinhos já conhecidos pelo kernel.
      const currentNeighbors = await this.readNeighborTable(subnet.cidr);
      for (const device of currentNeighbors) {
        discovered.set(device.macAddress, device);
        console.log(`[NetworkDiscovery] Found: ${device.macAddress} -> ${device.ipAddress}`);
      }

      // Fallback ativo somente quando a tabela ainda não contém descoberta útil.
      const targetSet = new Set(targetMacAddresses.map(normalizeMacAddress).filter((mac): mac is string => Boolean(mac)));
      const missingTarget = targetSet.size > 0 && [...targetSet].some((mac) => !discovered.has(mac));
      if (currentNeighbors.length === 0 || missingTarget) {
        console.log(`[NetworkDiscovery] ${currentNeighbors.length === 0 ? 'Neighbor table empty' : 'Target MAC missing'}; active sweep started for ${subnet.cidr}`);
        await this.pingSweep(usableHosts(subnet));
        for (const device of await this.readNeighborTable(subnet.cidr)) {
          discovered.set(device.macAddress, device);
          console.log(`[NetworkDiscovery] Found after sweep: ${device.macAddress} -> ${device.ipAddress}`);
        }
      }
      console.log(`[NetworkDiscovery] ${discovered.size} host(s) with MAC discovered`);
    }
    return [...discovered.values()];
  }

  private async pingSweep(hosts: string[]): Promise<void> {
    let cursor = 0;
    const worker = async () => {
      while (cursor < hosts.length) {
        const ip = hosts[cursor++];
        try {
          await execFileAsync('ping', ['-n', '-c', '1', '-W', String(this.pingTimeoutSeconds), ip], { timeout: (this.pingTimeoutSeconds + 1) * 1000 });
        } catch { /* A falha é esperada; o objetivo é alimentar a neighbor table. */ }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.sweepConcurrency, hosts.length) }, worker));
  }

  async readNeighborTable(subnet: string): Promise<DiscoveredDevice[]> {
    try {
      const { stdout } = await execFileAsync('ip', ['neigh', 'show', 'to', subnet], { timeout: 10_000 });
      return parseIpNeighborOutput(stdout, subnet);
    } catch (error) {
      console.warn(`[NETWORK] Não foi possível consultar vizinhos de ${subnet}:`, error instanceof Error ? error.message : error);
      return [];
    }
  }
}

export function parseIpNeighborOutput(stdout: string, subnet: string): DiscoveredDevice[] {
  return stdout.split('\n').flatMap((line) => {
    if (/\b(FAILED|INCOMPLETE)\b/i.test(line)) return [];
    const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+.*\blladdr\s+([0-9a-fA-F:.-]+)\s+(REACHABLE|STALE|DELAY|PROBE|PERMANENT|NOARP)\b/i);
    if (!match) return [];
    const macAddress = normalizeMacAddress(match[2]);
    return macAddress ? [{ ipAddress: match[1], macAddress, subnet }] : [];
  });
}
