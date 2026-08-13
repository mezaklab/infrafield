import { EvidenceField } from './types';

const sourcePriority = { BARCODE: 5, OCR: 4, DATABASE: 3, VISION: 2, USER: 6 } as const;

const valid = (evidence: EvidenceField | null | undefined): EvidenceField | null =>
  evidence?.value?.trim() ? { ...evidence, value: evidence.value.trim() } : null;

/** Campos vazios nunca substituem evidências válidas. */
export function selectEvidence(a: EvidenceField | null | undefined, b: EvidenceField | null | undefined): EvidenceField | null {
  const current = valid(a);
  const incoming = valid(b);
  if (!current) return incoming;
  if (!incoming) return current;
  const currentScore = sourcePriority[current.source] + current.confidence;
  const incomingScore = sourcePriority[incoming.source] + incoming.confidence;
  return incomingScore > currentScore ? incoming : current;
}
