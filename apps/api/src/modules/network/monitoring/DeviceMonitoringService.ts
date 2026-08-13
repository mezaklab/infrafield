import { AssetStatus, DeviceMonitoringStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { emitAssetStatusUpdate } from '../../../services/websocket.service';
import { NetworkDiscoveryProvider } from '../discovery/NetworkDiscoveryProvider';
import { HealthChecker } from '../health/HealthChecker';
import { normalizeMacAddress } from '../utils/macAddress';

export interface MonitoringOptions { offlineFailureThreshold: number; degradedLatencyMs: number }

export class DeviceMonitoringService {
  constructor(
    private readonly discovery: NetworkDiscoveryProvider,
    private readonly healthChecker: HealthChecker,
    private readonly options: MonitoringOptions,
  ) {}

  async runCycle(): Promise<void> {
    console.log('[NETWORK] Discovery started');
    const devices = await prisma.asset.findMany({
      where: { monitoringEnabled: true, macAddress: { not: null } },
    });
    const peripherals = await prisma.peripheral.findMany({
      where: { monitoringEnabled: true, macAddress: { not: null } },
    });
    if (devices.length === 0 && peripherals.length === 0) {
      console.log('[NETWORK] Nenhum ativo com MAC e monitoramento habilitado');
      return;
    }
    console.log(`[NetworkPoller] ${devices.length + peripherals.length} ativo(s) monitorável(is) encontrado(s) (${devices.length} infraestrutura, ${peripherals.length} TI).`);

    const targetMacs = [...devices, ...peripherals].map((device) => device.macAddress!);
    const discovered = new Map((await this.discovery.discover(targetMacs)).map((item) => [item.macAddress, item]));
    for (const device of devices) {
      console.log(`[NetworkPoller] Matching asset: MAC=${device.macAddress}`);
      const normalizedMac = normalizeMacAddress(device.macAddress!);
      const match = normalizedMac ? discovered.get(normalizedMac) : undefined;
      if (!match) {
        console.log(`[NetworkPoller] MAC ainda não localizado: ${device.macAddress}`);
        await this.recordFailure(device.id, device.consecutiveFailures, device.monitoringStatus);
        continue;
      }

      console.log(`[NetworkPoller] IP discovered: ${match.ipAddress}`);
      const health = await this.healthChecker.check({ ipAddress: match.ipAddress, hostname: device.hostname });
      if (!health.reachable) {
        await this.recordFailure(device.id, device.consecutiveFailures, device.monitoringStatus, match.ipAddress);
        continue;
      }

      const monitoringStatus = health.latencyMs !== null && health.latencyMs >= this.options.degradedLatencyMs
        ? DeviceMonitoringStatus.DEGRADED
        : DeviceMonitoringStatus.ONLINE;
      await this.recordSuccess(device, match.ipAddress, monitoringStatus, health.latencyMs);
      console.log(`[HEALTH] ${monitoringStatus} latency=${health.latencyMs ?? 'N/A'}ms`);
    }

    for (const peripheral of peripherals) {
      console.log(`[NetworkPoller] Matching TI asset: MAC=${peripheral.macAddress}`);
      const normalizedMac = normalizeMacAddress(peripheral.macAddress!);
      const match = normalizedMac ? discovered.get(normalizedMac) : undefined;
      if (!match) { await this.recordPeripheralFailure(peripheral.id, peripheral.consecutiveFailures); continue; }
      console.log(`[NetworkPoller] IP discovered for TI asset: ${match.ipAddress}`);
      const health = await this.healthChecker.check({ ipAddress: match.ipAddress });
      if (!health.reachable) { await this.recordPeripheralFailure(peripheral.id, peripheral.consecutiveFailures, match.ipAddress); continue; }
      const monitoringStatus = health.latencyMs !== null && health.latencyMs >= this.options.degradedLatencyMs ? DeviceMonitoringStatus.DEGRADED : DeviceMonitoringStatus.ONLINE;
      await this.recordPeripheralSuccess(peripheral, match.ipAddress, monitoringStatus, health.latencyMs);
    }
  }

  private async recordPeripheralSuccess(
    device: { id: string; name: string; code: string; companyId: string; currentIp: string | null; status: AssetStatus },
    newIp: string,
    monitoringStatus: DeviceMonitoringStatus,
    latencyMs: number | null,
  ): Promise<void> {
    const ipChanged = device.currentIp !== newIp;
    await prisma.$transaction(async (tx) => {
      if (ipChanged) {
        await tx.peripheralIpHistory.updateMany({ where: { peripheralId: device.id, lostAt: null }, data: { lostAt: new Date() } });
        await tx.peripheralIpHistory.create({ data: { peripheralId: device.id, ipAddress: newIp } });
      }
      await tx.peripheral.update({ where: { id: device.id }, data: {
        currentIp: newIp, ipAddress: newIp, monitoringStatus, lastSeenAt: new Date(), lastCheckedAt: new Date(), latencyMs, consecutiveFailures: 0,
      } });
    });
    emitAssetStatusUpdate({ id: device.id, code: device.code, name: device.name, status: device.status, monitoringStatus, latencyMs, ipAddress: newIp, companyId: device.companyId });
    console.log(`[HEALTH] TI asset ${monitoringStatus} latency=${latencyMs ?? 'N/A'}ms`);
  }

  private async recordPeripheralFailure(deviceId: string, previousFailures: number, currentIp?: string): Promise<void> {
    const failures = previousFailures + 1;
    const monitoringStatus = failures >= this.options.offlineFailureThreshold ? DeviceMonitoringStatus.OFFLINE : DeviceMonitoringStatus.UNKNOWN;
    const updated = await prisma.peripheral.update({ where: { id: deviceId }, data: {
      consecutiveFailures: { increment: 1 }, monitoringStatus, lastCheckedAt: new Date(), latencyMs: null,
    } });
    console.log(`[HEALTH] TI asset ${monitoringStatus} failures=${failures}${currentIp ? ` IP=${currentIp}` : ''}`);
    emitAssetStatusUpdate({ id: updated.id, code: updated.code, name: updated.name, status: updated.status, monitoringStatus, latencyMs: null, ipAddress: updated.currentIp, companyId: updated.companyId });
  }

  private async recordSuccess(
    device: { id: string; name: string; code: string; companyId: string; currentIp: string | null; ipAddress: string | null; status: AssetStatus },
    newIp: string,
    monitoringStatus: DeviceMonitoringStatus,
    latencyMs: number | null,
  ): Promise<void> {
    const ipChanged = device.currentIp !== newIp;
    await prisma.$transaction(async (tx) => {
      if (ipChanged) {
        await tx.deviceIpHistory.updateMany({ where: { deviceId: device.id, lostAt: null }, data: { lostAt: new Date() } });
        await tx.deviceIpHistory.create({ data: { deviceId: device.id, ipAddress: newIp } });
      }
      await tx.asset.update({
        where: { id: device.id },
        data: {
          currentIp: newIp,
          ipAddress: newIp, // compatibilidade temporária com integrações e telas legadas
          monitoringStatus,
          lastSeenAt: new Date(),
          lastCheckedAt: new Date(),
          latencyMs,
          consecutiveFailures: 0,
        },
      });
      if (ipChanged && device.currentIp) {
        await tx.notification.create({
          data: {
            title: `IP alterado: ${device.name}`,
            message: `${device.name} alterou seu endereço IP de ${device.currentIp} para ${newIp}.`,
            type: 'INFO',
            assetId: device.id,
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (ipChanged) console.log(`[IP_CHANGED] ${device.currentIp ?? 'não definido'} -> ${newIp}`);
    emitAssetStatusUpdate({ id: device.id, code: device.code, name: device.name, status: device.status, monitoringStatus, latencyMs, ipAddress: newIp, companyId: device.companyId });
  }

  private async recordFailure(
    deviceId: string,
    previousFailures: number,
    previousStatus: DeviceMonitoringStatus,
    currentIp?: string,
  ): Promise<void> {
    const failures = previousFailures + 1;
    const status = failures >= this.options.offlineFailureThreshold
      ? DeviceMonitoringStatus.OFFLINE
      : DeviceMonitoringStatus.UNKNOWN;
    const updated = await prisma.asset.update({
      where: { id: deviceId },
      data: {
        consecutiveFailures: { increment: 1 },
        monitoringStatus: status,
        lastCheckedAt: new Date(),
        latencyMs: null,
      },
    });
    console.log(`[HEALTH] ${status} failures=${failures}${currentIp ? ` IP=${currentIp}` : ''}`);
    emitAssetStatusUpdate({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      status: updated.status,
      monitoringStatus: status,
      latencyMs: null,
      ipAddress: updated.currentIp,
      companyId: updated.companyId,
    });
    if (status === DeviceMonitoringStatus.OFFLINE && previousStatus !== DeviceMonitoringStatus.OFFLINE) {
      await prisma.notification.create({
        data: { title: `Dispositivo offline: ${updated.name}`, message: `${updated.name} atingiu ${failures} falhas consecutivas.`, type: 'ALERT', assetId: updated.id },
      });
    }
  }
}
