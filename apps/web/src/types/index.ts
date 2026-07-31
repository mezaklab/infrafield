export type TabType = 'dashboard' | 'assets' | 'visits' | 'issues' | 'peripherals';

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

export interface Location {
  id: string;
  name: string;
  building?: string;
  floor?: string;
  room?: string;
}

export type PeripheralCategory = 'COMPUTADOR' | 'IMPRESSORA' | 'SCANNER' | 'MONITOR';
export type PeripheralSubcategory = 'DESKTOP' | 'NOTEBOOK';

export interface Peripheral {
  id: string;
  code: string;
  name: string;
  assetTag?: string;
  serialNumber?: string;
  category: PeripheralCategory;
  subcategory?: PeripheralSubcategory;
  brand?: string;
  model?: string;
  ipAddress?: string;
  specifications?: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'INACTIVE';
  imageUrl?: string;
  locationId?: string;
  locationName?: string;
  locationDetails?: string;
  assignedTo?: string;
  assignedToEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PeripheralStats {
  total: number;
  operational: number;
  byCategory: {
    COMPUTADOR: number;
    IMPRESSORA: number;
    SCANNER: number;
    MONITOR: number;
  };
  bySubcategory: {
    DESKTOP: number;
    NOTEBOOK: number;
  };
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  assetTag?: string;
  serialNumber?: string;
  hostname?: string;
  ipAddress?: string;
  category: string;
  locationId?: string;
  locationName?: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'INACTIVE';
  imageUrl?: string;
  wifiBands?: string;
  lastInspection?: string;
  assignedTo?: string;
}

export type VisitAssetStatus = 'ESPERADO' | 'ENCONTRADO' | 'AUSENTE' | 'NOVO';

export interface VisitAsset {
  id: string;
  visitId: string;
  assetId?: string;
  asset?: Asset;
  status: VisitAssetStatus;
  notes?: string;
  photoUrl?: string;
  checkedAt?: string;
}

export type VisitStatus = 'PLANEJADA' | 'EM_ANDAMENTO' | 'PAUSADA' | 'CONCLUIDA' | 'CANCELADA';

export interface Visit {
  id: string;
  protocol: string;
  client: string;
  address: string;
  locationId?: string;
  locationName?: string;
  technician?: string;
  date: string;
  time: string;
  status: VisitStatus;
  priority: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  type: 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'INSPECAO';
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  visitAssets?: VisitAsset[];
}

export interface AuditSummary {
  visitId: string;
  protocol: string;
  status: VisitStatus;
  startedAt?: string;
  completedAt?: string;
  totals: {
    totalAssets: number;
    esperados: number;
    encontrados: number;
    ausentes: number;
    novos: number;
    conciliationRate: number;
  };
  visitAssets: VisitAsset[];
}

export type ChecklistFieldType = 'YES_NO' | 'TEXT' | 'NUMBER' | 'SELECT' | 'PHOTO';

export interface ChecklistItem {
  id: string;
  templateId: string;
  label: string;
  fieldType: ChecklistFieldType;
  isRequired: boolean;
  options?: string;
  order: number;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  items: ChecklistItem[];
}

export interface ChecklistResponse {
  id: string;
  visitId: string;
  checklistItemId: string;
  assetId?: string;
  value: string;
  notes?: string;
}

export type IssueSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'IN_ANALYSIS' | 'IN_PROGRESS' | 'RESOLVED';

export interface Issue {
  id: string;
  protocol?: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  recommendation?: string;
  companyId?: string;
  visitId?: string;
  visitProtocol?: string;
  assetId?: string;
  assetName?: string;
  locationId?: string;
  locationName?: string;
  reportedBy?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'ALERT' | 'WARNING' | 'SUCCESS' | 'INFO';
  isRead: boolean;
  assetId?: string;
  createdAt: string;
}

