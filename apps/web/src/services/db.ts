import Dexie, { Table } from 'dexie';
import { VisitAssetStatus } from '../types';

export interface SyncQueueItem {
  id?: number;
  queueId: string;
  visitId: string;
  assetId: string;
  status: VisitAssetStatus;
  notes?: string;
  photoUrl?: string;
  timestamp: number;
}

export interface CachedVisit {
  id: string;
  protocol: string;
  client: string;
  address: string;
  status: string;
  data: any;
  updatedAt: number;
}

export class InfraFieldDatabase extends Dexie {
  syncQueue!: Table<SyncQueueItem>;
  cachedVisits!: Table<CachedVisit>;

  constructor() {
    super('InfraFieldOfflineDB');
    this.version(1).stores({
      syncQueue: '++id, queueId, visitId, assetId, timestamp',
      cachedVisits: 'id, protocol, status',
    });
  }
}

export const db = new InfraFieldDatabase();
