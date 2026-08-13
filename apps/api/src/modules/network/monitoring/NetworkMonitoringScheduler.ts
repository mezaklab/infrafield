import { DeviceMonitoringService } from './DeviceMonitoringService';

export class NetworkMonitoringScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly service: DeviceMonitoringService, private readonly intervalMs: number) {}

  start(): void {
    console.log(`[NETWORK] Scheduler ativo; intervalo=${this.intervalMs / 1000}s`);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) {
      console.warn('[NETWORK] Ciclo anterior ainda ativo; execução ignorada');
      return;
    }
    this.running = true;
    try {
      await this.service.runCycle();
    } catch (error) {
      console.error('[NETWORK] Falha no ciclo; API continuará disponível:', error);
    } finally {
      this.running = false;
    }
  }
}
