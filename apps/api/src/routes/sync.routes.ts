import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { VisitAssetStatus } from '@prisma/client';

export const syncRouter = Router();

const SyncItemSchema = z.object({
  id: z.string().optional(),
  visitId: z.string(),
  assetId: z.string(),
  status: z.nativeEnum(VisitAssetStatus),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  timestamp: z.number().optional(),
});

const BatchSyncSchema = z.object({
  items: z.array(SyncItemSchema),
});

// POST /api/sync/batch - Process offline sync queue
syncRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const parsed = BatchSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Fila de sincronização inválida', details: parsed.error.format() });
    }

    const { items } = parsed.data;
    let syncedCount = 0;
    const processedIds: string[] = [];

    for (const item of items) {
      try {
        let visitAsset = await prisma.visitAsset.findFirst({
          where: { visitId: item.visitId, assetId: item.assetId },
        });

        if (visitAsset) {
          await prisma.visitAsset.update({
            where: { id: visitAsset.id },
            data: {
              status: item.status,
              notes: item.notes || visitAsset.notes,
              photoUrl: item.photoUrl || visitAsset.photoUrl,
              checkedAt: new Date(item.timestamp || Date.now()),
            },
          });
        } else {
          await prisma.visitAsset.create({
            data: {
              visitId: item.visitId,
              assetId: item.assetId,
              status: item.status,
              notes: item.notes,
              photoUrl: item.photoUrl,
              checkedAt: new Date(item.timestamp || Date.now()),
            },
          });
        }

        syncedCount++;
        if (item.id) processedIds.push(item.id);
      } catch (err) {
        console.warn('Failed to process sync item:', item, err);
      }
    }

    return res.json({
      success: true,
      syncedCount,
      processedIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing batch sync:', error);
    return res.status(500).json({ error: 'Erro ao processar sincronização em lote' });
  }
});
