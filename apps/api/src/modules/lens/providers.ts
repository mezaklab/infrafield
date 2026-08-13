import { recognize } from 'tesseract.js';
import sharp from 'sharp';
import {
  BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource,
} from '@zxing/library';
import { AssetVisionProvider, BarcodeProvider, OcrProvider, RecognitionEvidence } from './types';
import { z } from 'zod';

const VisionResponseSchema = z.object({
  type: z.object({ value: z.string().max(120), confidence: z.number().min(0).max(1) }).nullable().optional(),
  manufacturer: z.object({ value: z.string().max(200), confidence: z.number().min(0).max(1) }).nullable().optional(),
  model: z.object({ value: z.string().max(200), confidence: z.number().min(0).max(1) }).nullable().optional(),
  serialNumber: z.object({ value: z.string().max(200), confidence: z.number().min(0).max(1) }).nullable().optional(),
  serviceTag: z.object({ value: z.string().max(200), confidence: z.number().min(0).max(1) }).nullable().optional(),
  productNumber: z.object({ value: z.string().max(200), confidence: z.number().min(0).max(1) }).nullable().optional(),
  macAddress: z.object({ value: z.string().max(30), confidence: z.number().min(0).max(1) }).nullable().optional(),
  possibleAssetTag: z.object({ value: z.string().max(200), confidence: z.number().min(0).max(1) }).nullable().optional(),
});

export class LocalTesseractOcrProvider implements OcrProvider {
  readonly name = 'local-tesseract';
  async recognize(image: Buffer, purpose: 'equipment' | 'label' = 'equipment'): Promise<string> {
    if (process.env.ASSET_OCR_PROVIDER === 'disabled') return '';
    const languages = process.env.ASSET_OCR_LANGUAGES || 'eng';
    // Etiquetas têm caracteres pequenos: realce local sem reduzir a resolução.
    const ocrImage = purpose === 'label'
      ? await sharp(image).greyscale().normalize().sharpen({ sigma: 1.1 }).jpeg({ quality: 96 }).toBuffer()
      : image;
    const result = await recognize(ocrImage, languages);
    return result.data.text || '';
  }
}

export class LocalZxingBarcodeProvider implements BarcodeProvider {
  readonly name = 'local-zxing';
  async scan(image: Buffer): Promise<Array<{ value: string; format: string }>> {
    const { data, info } = await sharp(image).greyscale().raw().toBuffer({ resolveWithObject: true });
    const source = new RGBLuminanceSource(Uint8ClampedArray.from(data), info.width, info.height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const reader = new MultiFormatReader();
    reader.setHints(new Map([[DecodeHintType.POSSIBLE_FORMATS, Object.values(BarcodeFormat).filter((v) => typeof v === 'number')]]));
    try {
      const result = reader.decode(bitmap);
      return [{ value: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()] || 'UNKNOWN' }];
    } catch {
      return [];
    }
  }
}

export class DisabledVisionProvider implements AssetVisionProvider {
  readonly name = 'disabled';
  async analyze(): Promise<RecognitionEvidence> { return {}; }
}

export class HttpAssetVisionProvider implements AssetVisionProvider {
  readonly name = 'http';
  constructor(private readonly endpoint: string, private readonly apiKey?: string) {}
  async analyze(image: Buffer, mimeType: string): Promise<RecognitionEvidence> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify({ image: image.toString('base64'), mimeType }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Vision provider respondeu ${response.status}`);
    const parsed = VisionResponseSchema.parse(await response.json());
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, item ? { ...item, source: 'VISION' as const } : null])) as RecognitionEvidence;
  }
}

export function createVisionProvider(): AssetVisionProvider {
  if (process.env.ASSET_VISION_PROVIDER === 'http' && process.env.ASSET_VISION_ENDPOINT) {
    return new HttpAssetVisionProvider(process.env.ASSET_VISION_ENDPOINT, process.env.ASSET_VISION_API_KEY);
  }
  return new DisabledVisionProvider();
}
