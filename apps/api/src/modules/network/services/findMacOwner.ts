import { prisma } from '../../../lib/prisma';

export interface MacOwner {
  id: string;
  code: string;
  name: string;
  kind: 'ASSET' | 'PERIPHERAL';
}

/** Prevents one physical network identity from being assigned across both inventories. */
export async function findMacOwner(macAddress: string, except?: { kind: MacOwner['kind']; id: string }): Promise<MacOwner | null> {
  const [asset, peripheral] = await Promise.all([
    prisma.asset.findUnique({ where: { macAddress }, select: { id: true, code: true, name: true } }),
    prisma.peripheral.findUnique({ where: { macAddress }, select: { id: true, code: true, name: true } }),
  ]);
  if (asset && !(except?.kind === 'ASSET' && except.id === asset.id)) return { ...asset, kind: 'ASSET' };
  if (peripheral && !(except?.kind === 'PERIPHERAL' && except.id === peripheral.id)) return { ...peripheral, kind: 'PERIPHERAL' };
  return null;
}
