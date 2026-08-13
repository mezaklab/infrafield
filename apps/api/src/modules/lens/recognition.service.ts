import { normalizeMacAddress } from '../network/utils/macAddress';
import { parseAssetLabel } from './labelParser';
import { createVisionProvider, LocalTesseractOcrProvider, LocalZxingBarcodeProvider } from './providers';
import { AssetRecognitionResult, EvidenceField, RecognitionEvidence } from './types';
import { selectEvidence } from './consolidation';

export class AssetRecognitionService {
  private readonly ocr = new LocalTesseractOcrProvider();
  private readonly barcode = new LocalZxingBarcodeProvider();
  private readonly vision = createVisionProvider();

  async analyze(images: Array<{ buffer: Buffer; mimeType: string; purpose: 'equipment' | 'label' }>): Promise<AssetRecognitionResult> {
    let consolidated = parseAssetLabel('');
    for (const image of images) {
      const [ocrText, barcodes, vision] = await Promise.all([
        this.ocr.recognize(image.buffer, image.purpose).catch((error) => { console.warn('[LENS] OCR indisponível:', error.message); return ''; }),
        this.barcode.scan(image.buffer).catch(() => []),
        this.vision.analyze(image.buffer, image.mimeType).catch((error) => { console.warn('[LENS] Vision provider indisponível:', error.message); return {}; }),
      ]);
      if (process.env.NODE_ENV !== 'production') console.log(`[LENS:OCR] Texto bruto reconhecido (${image.purpose}):\n${ocrText || '(vazio)'}`);
      const parsed = parseAssetLabel(ocrText);
      if (process.env.NODE_ENV !== 'production') console.log('[LENS:PARSER]', {
        fabricante: parsed.manufacturer?.value || null,
        modelo: parsed.model?.value || null,
        serial: parsed.serialNumber?.value || null,
        serviceTag: parsed.serviceTag?.value || null,
        productNumber: parsed.productNumber?.value || null,
        mac: parsed.macAddress?.value || null,
      });
      parsed.barcodes = barcodes;
      const barcodeParsed = parseAssetLabel(barcodes.map((code) => code.value).join('\n'));
      for (const key of ['type', 'manufacturer', 'model', 'serialNumber', 'serviceTag', 'productNumber', 'macAddress', 'possibleAssetTag'] as const) {
        if (barcodeParsed[key]) barcodeParsed[key] = { ...barcodeParsed[key]!, source: 'BARCODE', confidence: Math.max(.92, barcodeParsed[key]!.confidence) };
      }
      consolidated = this.merge(consolidated, parsed, {});
      consolidated = this.merge(consolidated, barcodeParsed, vision);
    }
    const evidence = [consolidated.type, consolidated.manufacturer, consolidated.model, consolidated.serialNumber,
      consolidated.serviceTag, consolidated.productNumber, consolidated.macAddress].filter(Boolean) as EvidenceField[];
    consolidated.confidence = evidence.length ? evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length : 0;
    if (process.env.NODE_ENV !== 'production') console.log('[LENS:RESULT] Resultado consolidado:', {
      type: consolidated.type,
      manufacturer: consolidated.manufacturer,
      model: consolidated.model,
      serialNumber: consolidated.serialNumber,
      serviceTag: consolidated.serviceTag,
      productNumber: consolidated.productNumber,
      macAddress: consolidated.macAddress,
      confidence: consolidated.confidence,
    });
    return consolidated;
  }

  private merge(base: AssetRecognitionResult, parsed: AssetRecognitionResult, vision: RecognitionEvidence): AssetRecognitionResult {
    const keys = ['type', 'manufacturer', 'model', 'serialNumber', 'serviceTag', 'productNumber', 'macAddress', 'possibleAssetTag'] as const;
    const merged = { ...base, rawText: [base.rawText, parsed.rawText].filter(Boolean).join('\n'), barcodes: [...base.barcodes, ...parsed.barcodes] };
    for (const key of keys) merged[key] = selectEvidence(selectEvidence(base[key], parsed[key]), vision[key]);
    if (merged.macAddress) {
      const normalized = normalizeMacAddress(merged.macAddress.value);
      merged.macAddress = normalized ? { ...merged.macAddress, value: normalized } : null;
    }
    return merged;
  }
}
