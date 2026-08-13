export type RecognitionSource = 'OCR' | 'BARCODE' | 'VISION' | 'USER' | 'DATABASE';

export interface EvidenceField {
  value: string;
  source: RecognitionSource;
  confidence: number;
}

export interface AssetRecognitionResult {
  type: EvidenceField | null;
  manufacturer: EvidenceField | null;
  model: EvidenceField | null;
  serialNumber: EvidenceField | null;
  serviceTag: EvidenceField | null;
  productNumber: EvidenceField | null;
  macAddress: EvidenceField | null;
  possibleAssetTag: EvidenceField | null;
  rawText: string;
  barcodes: Array<{ value: string; format: string }>;
  confidence: number;
}

export interface RecognitionEvidence extends Partial<Omit<AssetRecognitionResult, 'confidence'>> {}

export interface AssetVisionProvider {
  readonly name: string;
  analyze(image: Buffer, mimeType: string): Promise<RecognitionEvidence>;
}

export interface OcrProvider {
  readonly name: string;
  recognize(image: Buffer, purpose?: 'equipment' | 'label'): Promise<string>;
}

export interface BarcodeProvider {
  readonly name: string;
  scan(image: Buffer): Promise<Array<{ value: string; format: string }>>;
}
