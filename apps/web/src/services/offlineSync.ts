import { useState, useEffect } from 'react';
import { db } from './db';
import { api } from './api';
import { VisitAssetStatus } from '../types';

export const enqueueOfflineCheck = async (
  visitId: string,
  assetId: string,
  status: VisitAssetStatus,
  notes?: string,
  photoUrl?: string
) => {
  const queueId = `${visitId}-${assetId}`;
  
  // Check if item already in Dexie syncQueue
  const existing = await db.syncQueue.where('queueId').equals(queueId).first();
  
  if (existing && existing.id) {
    await db.syncQueue.update(existing.id, {
      status,
      notes: notes || existing.notes,
      photoUrl: photoUrl || existing.photoUrl,
      timestamp: Date.now(),
    });
  } else {
    await db.syncQueue.add({
      queueId,
      visitId,
      assetId,
      status,
      notes,
      photoUrl,
      timestamp: Date.now(),
    });
  }
};

export const syncDexieBatchQueue = async (): Promise<number> => {
  const items = await db.syncQueue.toArray();
  if (items.length === 0) return 0;

  try {
    const payload = {
      items: items.map((item) => ({
        id: item.queueId,
        visitId: item.visitId,
        assetId: item.assetId,
        status: item.status,
        notes: item.notes,
        photoUrl: item.photoUrl,
        timestamp: item.timestamp,
      })),
    };

    const response = await api.post('/sync/batch', payload);
    if (response.data.success) {
      // Clear Dexie syncQueue upon successful batch sync
      await db.syncQueue.clear();
      return response.data.syncedCount || items.length;
    }
    return 0;
  } catch (err) {
    console.warn('Batch sync failed, items retained in Dexie.js queue:', err);
    return 0;
  }
};

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updatePendingCount = async () => {
    const count = await db.syncQueue.count();
    setPendingCount(count);
  };

  useEffect(() => {
    updatePendingCount();

    const handleOnline = async () => {
      setIsOnline(true);
      console.log('🌐 Conexão reestabelecida! Iniciando batch sync Dexie.js -> POST /api/sync/batch');
      setIsSyncing(true);
      const synced = await syncDexieBatchQueue();
      setIsSyncing(false);
      await updatePendingCount();
      if (synced > 0) {
        console.log(`✅ ${synced} itens offline sincronizados com o backend.`);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.warn('📡 Dispositivo sem internet. Gravação redirecionada para o Dexie.js (IndexedDB).');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updatePendingCount, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    await syncDexieBatchQueue();
    setIsSyncing(false);
    await updatePendingCount();
  };

  return { isOnline, pendingCount, isSyncing, syncNow: triggerSync };
};
