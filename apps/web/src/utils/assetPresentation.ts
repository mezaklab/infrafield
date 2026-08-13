export type GenericAssetKind = 'wireless' | 'network' | 'security' | 'storage' | 'server' | 'device';

/** Classificação exclusivamente de apresentação, baseada na categoria persistida/confirmada. */
export function getGenericAssetKind(category: string): GenericAssetKind {
  const normalized = category.trim().toLowerCase();
  if (normalized.includes('sem fio') || normalized.includes('wi-fi') || normalized.includes('wifi') || normalized.includes('access point')) return 'wireless';
  if (normalized.includes('segurança') || normalized.includes('firewall')) return 'security';
  if (normalized.includes('storage') || normalized.includes('armazenamento') || normalized.includes('nas')) return 'storage';
  if (normalized.includes('servidor') || normalized.includes('virtualização')) return 'server';
  if (normalized.includes('switch') || normalized.includes('rede') || normalized.includes('roteador')) return 'network';
  return 'device';
}
