const MAC_HEX_LENGTH = 12;

export function normalizeMacAddress(value: string): string | null {
  const hex = value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (hex.length !== MAC_HEX_LENGTH || !/^[0-9A-F]{12}$/.test(hex)) return null;
  if (hex === '000000000000' || hex === 'FFFFFFFFFFFF') return null;
  return hex.match(/.{2}/g)!.join(':');
}

export function isValidMacAddress(value: string): boolean {
  return normalizeMacAddress(value) !== null;
}
