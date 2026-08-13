export interface DiscoveredDevice {
  macAddress: string;
  ipAddress: string;
  subnet: string;
}

export interface NetworkDiscoveryProvider {
  discover(targetMacAddresses?: readonly string[]): Promise<DiscoveredDevice[]>;
}
