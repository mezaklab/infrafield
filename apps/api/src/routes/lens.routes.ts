import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AssetRecognitionService } from '../modules/lens/recognition.service';
import { normalizeMacAddress } from '../modules/network/utils/macAddress';

export const lensRouter = Router();
const maxMb = Math.max(1, Math.min(20, Number(process.env.ASSET_LENS_MAX_IMAGE_MB || 8)));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxMb * 1024 * 1024, files: 2 } });
const service = new AssetRecognitionService();
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);

lensRouter.post('/recognize', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'labelImage', maxCount: 1 }]), async (req, res) => {
  const groups = req.files as Record<string, Express.Multer.File[]> | undefined;
  const files = [...(groups?.image || []), ...(groups?.labelImage || [])];
  if (!files.length) return res.status(400).json({ error: 'Envie ao menos uma imagem.' });
  if (files.some((file) => !allowedMime.has(file.mimetype))) return res.status(415).json({ error: 'Use imagens JPEG, PNG ou WebP.' });
  try {
    const images = await Promise.all(files.map(async (file) => {
      const metadata = await sharp(file.buffer).metadata();
      if (!metadata.width || !metadata.height) throw new Error('Imagem inválida');
      const purpose = file.fieldname === 'labelImage' ? 'label' as const : 'equipment' as const;
      const maxDimension = purpose === 'label' ? 3600 : 2200;
      const buffer = await sharp(file.buffer).rotate().resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: purpose === 'label' ? 96 : 90 }).toBuffer();
      return { buffer, mimeType: 'image/jpeg', purpose };
    }));
    const result = await service.analyze(images);
    return res.json({
      result: { ...result, rawText: process.env.NODE_ENV === 'production' ? '' : result.rawText },
      providers: { ocr: process.env.ASSET_OCR_PROVIDER || 'local-tesseract', barcode: 'local-zxing', vision: process.env.ASSET_VISION_PROVIDER || 'disabled' },
    });
  } catch (error) {
    console.error('[LENS] Falha ao analisar imagem:', error instanceof Error ? error.message : error);
    return res.status(422).json({ error: 'Não foi possível processar esta imagem.' });
  }
});

const DuplicateSchema = z.object({ serialNumber: z.string().trim().max(120).optional(), macAddress: z.string().trim().max(30).optional(), assetTag: z.string().trim().max(120).optional() });
lensRouter.post('/duplicates', async (req, res) => {
  const parsed = DuplicateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Identificadores inválidos.' });
  const { serialNumber, assetTag } = parsed.data;
  const macAddress = parsed.data.macAddress ? normalizeMacAddress(parsed.data.macAddress) : undefined;
  const assetOr: any[] = [];
  const peripheralOr: any[] = [];
  if (serialNumber) { assetOr.push({ serialNumber: { equals: serialNumber, mode: 'insensitive' } }); peripheralOr.push({ serialNumber: { equals: serialNumber, mode: 'insensitive' } }); }
  if (assetTag) { assetOr.push({ assetTag: { equals: assetTag, mode: 'insensitive' } }); peripheralOr.push({ assetTag: { equals: assetTag, mode: 'insensitive' } }); }
  if (macAddress) assetOr.push({ macAddress });
  if (!assetOr.length && !peripheralOr.length) return res.json([]);
  const companyId = req.user!.companyId;
  const [assets, peripherals] = await Promise.all([
    assetOr.length ? prisma.asset.findMany({ where: { companyId, OR: assetOr }, select: { id: true, name: true, code: true, assetTag: true } }) : [],
    peripheralOr.length ? prisma.peripheral.findMany({ where: { companyId, OR: peripheralOr }, select: { id: true, name: true, code: true, assetTag: true } }) : [],
  ]);
  return res.json([
    ...assets.map((item) => ({ ...item, entityType: 'ASSET' })),
    ...peripherals.map((item) => ({ ...item, entityType: 'PERIPHERAL' })),
  ]);
});
