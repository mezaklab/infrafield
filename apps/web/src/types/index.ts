export type TabType = 'dashboard' | 'assets' | 'visits' | 'issues' | 'peripherals' | 'tickets' | 'ticket-dashboard' | 'settings';
export type PeripheralsSubTab = 'TODOS' | 'COMPUTADOR' | 'MONITOR' | 'SOFTWARE' | 'REDE' | 'PERIFERICO';
export type AdminTabType = 'dashboard' | 'users' | 'roles' | 'audit-logs' | 'settings' | 'locations';

export interface AccessRole {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  protected: boolean;
  legacyRole?: SystemUser['role'];
  permissionKeys: string[];
  _count?: { users: number };
}

export interface PermissionDefinition { id: string; key: string; name: string; description?: string; category: string }

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER' | 'USUARIO';
  isActive?: boolean;
  accessRoleId?: string;
  accessRole?: { id: string; key: string; name: string };
  companyId: string;
  company?: { id: string; name: string };
  locationId?: string;
  location?: Location;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  user: string;
  role: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemSettingsData {
  maintenanceMode: string;
  sessionTimeoutMinutes: string;
  requireMfaForAdmins: string;
  icmpPingIntervalSeconds: string;
  alertEmailNotification: string;
  maxLoginAttempts: string;
  autoAuditLogRetentionDays: string;
  [key: string]: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalAssets: number;
  totalPeripherals: number;
  totalVisits: number;
  totalIssues: number;
  auditLogsCount: number;
  usersByRole: {
    SUPERADMIN: number;
    ADMIN: number;
    MANAGER: number;
    TECHNICIAN: number;
    VIEWER: number;
  };
  systemHealth: string;
  serverUptimeSeconds: number;
  environment: string;
  dbConnection: string;
}

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
  parentId?: string;
  parent_id?: string;
  parent?: { id: string; name: string };
  children?: { id: string; name: string }[];
}

export type PeripheralCategory = 'COMPUTADOR' | 'IMPRESSORA' | 'SCANNER' | 'MONITOR' | 'SOFTWARE' | 'SWITCH' | 'ROTEADOR' | 'AP' | 'NOBREAK' | 'NAS' | 'STORAGE' | 'THIN_CLIENT' | 'TELEFONE_IP' | 'CAMERA_IP' | 'IOT' | 'OUTRO';
export type PeripheralSubcategory = 'DESKTOP' | 'NOTEBOOK' | 'SERVIDOR';

export interface Peripheral {
  id: string;
  code: string;
  name: string;
  assetTag?: string;
  ownershipType?: string;
  rentalCompany?: string;
  rental_company?: string;
  serialNumber?: string;
  category: PeripheralCategory;
  subcategory?: PeripheralSubcategory;
  brand?: string;
  model?: string;
  ipAddress?: string;
  currentIp?: string;
  macAddress?: string;
  monitoringEnabled: boolean;
  monitoringStatus: 'ONLINE' | 'DEGRADED' | 'UNKNOWN' | 'OFFLINE';
  latencyMs?: number;
  consecutiveFailures: number;
  lastSeenAt?: string;
  lastCheckedAt?: string;
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
    SOFTWARE: number;
    SWITCH: number;
    ROTEADOR: number;
    AP: number;
    NOBREAK: number;
    OUTRO: number;
  };
  bySubcategory: {
    DESKTOP: number;
    NOTEBOOK: number;
    SERVIDOR: number;
  };
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  assetTag?: string;
  ownershipType?: string;
  rentalCompany?: string;
  rental_company?: string;
  serialNumber?: string;
  hostname?: string;
  ipAddress?: string;
  currentIp?: string;
  macAddress?: string;
  monitoringStatus: 'ONLINE' | 'DEGRADED' | 'UNKNOWN' | 'OFFLINE';
  monitoringEnabled: boolean;
  lastSeenAt?: string;
  lastCheckedAt?: string;
  latencyMs?: number;
  consecutiveFailures: number;
  ipHistory?: Array<{ id: string; ipAddress: string; detectedAt: string; lostAt?: string }>;
  category: string;
  locationId?: string;
  locationName?: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'INACTIVE';
  imageUrl?: string;
  wifiBands?: string;
  lastInspection?: string;
  assignedTo?: string;
}

export interface LensImportDraft {
  type: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  serviceTag: string;
  productNumber: string;
  macAddress: string;
  assetTag: string;
  imageFile?: File;
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
  category?: string;
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

export type TicketStatus = 'ABERTO' | 'EM_ATENDIMENTO' | 'AGUARDANDO_USUARIO' | 'RESOLVIDO' | 'CANCELADO';
export type TicketPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER' | 'USUARIO';
  };
  content: string;
  attachments?: string | null; // JSON string array
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  subject: string;
  description: string;
  category?: string;
  categoryId?: string | null;
  categoryRef?: { id: string; name: string } | null;
  status: TicketStatus;
  priority: TicketPriority;
  companyId: string;
  locationId?: string | null;
  location?: Location | null;
  sectorId?: string | null;
  sector?: {
    id: string;
    name: string;
  } | null;
  assetId?: string | null;
  asset?: {
    id: string;
    name: string;
    code: string;
    category?: string;
    assetTag?: string;
  } | null;
  authorId: string;
  author?: {
    id: string;
    name: string;
    email: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER' | 'USUARIO';
  };
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER' | 'USUARIO';
  } | null;
  messages?: TicketMessage[];
  _count?: {
    messages: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface HelpdeskDashboardData {
  kpis: {
    totalActive: number;
    overdueSla: number;
    resolvedMonth: number;
    avgResolutionTime: string;
  };
  charts: {
    evolution: { month: string; abertos: number; solucionados: number }[];
    sectorDistribution: { name: string; value: number; color: string }[];
    locationDistribution: { name: string; value: number; color: string }[];
    topIncidents: { equipment: string; count: number }[];
  };
}
