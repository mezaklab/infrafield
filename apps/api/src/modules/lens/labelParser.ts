import { normalizeMacAddress } from '../network/utils/macAddress';
import { AssetRecognitionResult, EvidenceField } from './types';

const field = (value: string | undefined, confidence: number): EvidenceField | null =>
  value?.trim() ? { value: value.trim(), source: 'OCR', confidence } : null;

const cleanValue = (value: string): string => value
  .replace(/^[\s.:#=-]+/, '')
  .replace(/\s{2,}.*$/, '')
  .trim();

const valueAfterLabel = (lines: string[], labels: RegExp): string | undefined => {
  for (const line of lines) {
    const match = line.match(labels);
    if (match?.[1]) {
      const value = cleanValue(match[1]);
      if (value) return value;
    }
  }
  return undefined;
};

const manufacturers = [
  'Hewlett Packard', 'HP', 'Dell', 'Lenovo', 'LG', 'Samsung', 'Cisco', 'Intelbras',
  'TP-Link', 'Ubiquiti', 'Aruba', 'Fortinet', 'Epson', 'Brother', 'Canon', 'APC',
  'MikroTik', 'Huawei', 'Xerox', 'Lexmark', 'Acer', 'Asus', 'Apple', 'Positivo',
  'AOC', 'Philips', 'BenQ', 'ViewSonic', 'D-Link', 'Juniper', 'Zebra', 'Kyocera',
];

export function parseAssetLabel(rawText: string): AssetRecognitionResult {
  const text = rawText.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const macCandidates: string[] = [...(text.match(/(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}|[0-9A-Fa-f]{4}(?:\.[0-9A-Fa-f]{4}){2}|\b[0-9A-Fa-f]{12}\b/g) || [])];
  const mac = macCandidates.map(normalizeMacAddress).find(Boolean) || undefined;

  const manufacturer = manufacturers.find((name) => new RegExp(`\\b${name.replace('-', '[- ]?')}\\b`, 'i').test(text));
  const serial = valueAfterLabel(lines, /(?:^|\s)(?:serial(?:\s*(?:number|no\.?|n[ºo]))?|s[.\s\/]?n\.?|sn)\s*[:#.=\-]?\s*([A-Z0-9][A-Z0-9._\/-]{3,})/i);
  const serviceTag = valueAfterLabel(lines, /(?:^|\s)(?:service\s*tag|servicetag)\s*[:#.=\-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,})/i);
  const productNumber = valueAfterLabel(lines, /(?:^|\s)(?:product\s*(?:number|no\.?)|part\s*(?:number|no\.?)|p[.\s\/]?n\.?)\s*[:#.=\-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,})/i);
  const model = valueAfterLabel(lines, /(?:^|\s)(?:model(?:o)?(?:\s*no\.?)?|m[.\s\/]?n\.?)\s*[:#.=\-]?\s*([A-Z0-9][A-Z0-9 ._\/-]{2,})/i);
  const assetTag = valueAfterLabel(lines, /(?:^|\s)(?:asset\s*tag|patrim[oô]nio|pat)\s*[:#.=\-]?\s*([A-Z0-9][A-Z0-9._\/-]{2,})/i)
    || text.match(/\bPAT[- .]?[A-Z0-9]{3,}\b/i)?.[0];

  const lower = text.toLowerCase();
  const type = lower.match(/laserjet|officejet|impressora|printer|multifuncional/) ? 'IMPRESSORA'
    : lower.match(/latitude|thinkpad|notebook|laptop/) ? 'NOTEBOOK'
    : lower.match(/monitor|display/) ? 'MONITOR'
    : lower.match(/access point|\beap\d|unifi ap/) ? 'ACCESS_POINT'
    : lower.match(/firewall|fortigate/) ? 'FIREWALL'
    : lower.match(/switch/) ? 'SWITCH'
    : lower.match(/router|roteador/) ? 'ROTEADOR'
    : lower.match(/server|servidor|poweredge/) ? 'SERVIDOR'
    : lower.match(/desktop|optiplex|thinkcentre/) ? 'DESKTOP'
    : lower.match(/scanner/) ? 'SCANNER'
    : null;

  const result: AssetRecognitionResult = {
    type: field(type || undefined, 0.76),
    manufacturer: field(manufacturer, 0.9),
    model: field(model, 0.88),
    serialNumber: field(serial, 0.9),
    serviceTag: field(serviceTag, 0.94),
    productNumber: field(productNumber, 0.9),
    macAddress: field(mac, 0.98),
    possibleAssetTag: field(assetTag, 0.7),
    rawText: text,
    barcodes: [],
    confidence: 0,
  };
  const values = Object.values(result).filter((item): item is EvidenceField => Boolean(item && typeof item === 'object' && 'confidence' in item));
  result.confidence = values.length ? values.reduce((sum, item) => sum + item.confidence, 0) / values.length : 0;
  return result;
}
