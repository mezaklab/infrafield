import { isIP } from 'node:net';

export interface ParsedSubnet { cidr: string; network: number; prefix: number; size: number }

export function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

export function numberToIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

export function parseSubnet(value: string, minimumPrefix = 22): ParsedSubnet | null {
  const match = value.trim().match(/^([^/]+)\/(\d{1,2})$/);
  if (!match || isIP(match[1]) !== 4) return null;
  const prefix = Number(match[2]);
  if (prefix < minimumPrefix || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ipv4ToNumber(match[1]) & mask;
  return { cidr: `${numberToIpv4(network)}/${prefix}`, network, prefix, size: 2 ** (32 - prefix) };
}

export function usableHosts(subnet: ParsedSubnet): string[] {
  if (subnet.prefix === 32) return [numberToIpv4(subnet.network)];
  if (subnet.prefix === 31) return [numberToIpv4(subnet.network), numberToIpv4(subnet.network + 1)];
  return Array.from({ length: subnet.size - 2 }, (_, index) => numberToIpv4(subnet.network + index + 1));
}
