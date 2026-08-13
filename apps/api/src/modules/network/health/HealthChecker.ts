export interface DeviceTarget { ipAddress: string; hostname?: string | null }
export interface HealthCheckResult { reachable: boolean; latencyMs: number | null; error?: string }

export interface HealthChecker {
  check(target: DeviceTarget): Promise<HealthCheckResult>;
}
