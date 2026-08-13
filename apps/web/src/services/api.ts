import axios from 'axios';
import { 
  HealthStatus, 
  Asset, 
  Peripheral,
  PeripheralCategory,
  PeripheralStats,
  Visit, 
  Location, 
  VisitAssetStatus, 
  AuditSummary,
  ChecklistTemplate,
  ChecklistResponse,
  Issue,
  IssueSeverity,
  IssueStatus,
  NotificationItem
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'infrafield_token';
const USER_KEY  = 'infrafield_user';

const initialToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    ...(initialToken ? { Authorization: `Bearer ${initialToken}` } : {}),
  },
});

/**
 * Response interceptor — tratamento global de token expirado / inválido.
 *
 * Quando a API retorna HTTP 401 ou uma mensagem de token inválido/expirado:
 *  1. Remove token e dados do usuário do localStorage.
 *  2. Remove o header Authorization do cliente Axios.
 *  3. Emite o evento customizado `auth:unauthorized` para que o AuthContext
 *     possa reagir e redirecionar o usuário para a tela de login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error?.response?.status;
    const message: string = error?.response?.data?.message ?? error?.response?.data?.error ?? '';

    const isTokenError =
      status === 401 ||
      /token\s*(inv[áa]lido|expirado|expired|invalid)/i.test(message);

    if (isTokenError) {
      // Limpa sessão
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      delete api.defaults.headers.common['Authorization'];

      // Notifica o AuthContext via evento customizado para evitar
      // dependência circular entre api.ts e AuthContext.tsx
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export interface DashboardStats {
  assets: {
    total: number;
    operational: number;
    maintenance: number;
    critical: number;
    healthRate: number;
    categoriesCount: Record<string, number>;
    monitoring: { online: number; degraded: number; unknown: number; offline: number };
  };
  visits: {
    total: number;
    scheduled: number;
    inProgress: number;
    completed: number;
    conciliationRate: number;
  };
  issues: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentVisits: any[];
  technicians: { id: string; name: string; email: string }[];
}

export const getHealth = async (): Promise<HealthStatus> => {
  const response = await api.get<HealthStatus>('/health', { timeout: 4000 });
  return response.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<DashboardStats>('/stats/dashboard');
  return response.data;
};

export const getLocations = async (): Promise<Location[]> => {
  const response = await api.get<Location[]>('/locations');
  return response.data;
};

export const createLocation = async (data: {
  name: string;
  building?: string;
  floor?: string;
  room?: string;
  parentId?: string | null;
  parent_id?: string | null;
}): Promise<Location> => {
  const response = await api.post('/locations', data);
  return response.data;
};

export const updateLocation = async (
  id: string,
  data: Partial<{ name: string; building: string; floor: string; room: string; parentId: string | null; parent_id: string | null }>
): Promise<Location> => {
  const response = await api.patch(`/locations/${id}`, data);
  return response.data;
};

export const deleteLocation = async (id: string): Promise<void> => {
  await api.delete(`/locations/${id}`);
};

export const getAssets = async (filters?: { status?: string; category?: string; locationId?: string; search?: string }): Promise<Asset[]> => {
  const response = await api.get<any[]>('/assets', { params: filters });
  return response.data.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    assetTag: item.assetTag || 'N/A',
    serialNumber: item.serialNumber || 'N/A',
    hostname: item.hostname || 'N/A',
    ipAddress: item.currentIp || item.ipAddress || undefined,
    currentIp: item.currentIp || undefined,
    macAddress: item.macAddress || undefined,
    monitoringEnabled: item.monitoringEnabled || false,
    monitoringStatus: item.monitoringStatus || 'UNKNOWN',
    latencyMs: item.latencyMs ?? undefined,
    consecutiveFailures: item.consecutiveFailures || 0,
    lastSeenAt: item.lastSeenAt || undefined,
    lastCheckedAt: item.lastCheckedAt || undefined,
    ipHistory: item.ipHistory || [],
    category: item.category,
    locationId: item.locationId,
    locationName: item.location ? item.location.name : 'Não especificado',
    status: item.status,
    imageUrl: item.imageUrl || item.photoUrl,
    wifiBands: item.wifiBands || undefined,
    lastInspection: item.updatedAt ? new Date(item.updatedAt).toISOString().split('T')[0] : 'N/A',
    assignedTo: item.assignedTo ? item.assignedTo.name : 'Não atribuído',
  }));
};

export const createAsset = async (data: {
  name: string;
  code: string;
  assetTag?: string;
  serialNumber?: string;
  hostname?: string;
  macAddress?: string;
  monitoringEnabled?: boolean;
  category: string;
  locationId?: string | null;
  status?: string;
  imageUrl?: string;
  wifiBands?: string;
}): Promise<any> => {
  const response = await api.post('/assets', data);
  return response.data;
};

export const updateAsset = async (id: string, data: Partial<{
  name: string;
  code: string;
  assetTag: string;
  serialNumber: string;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  monitoringEnabled: boolean;
  category: string;
  locationId: string | null;
  status: string;
  imageUrl: string;
  wifiBands: string;
}>): Promise<any> => {
  const response = await api.patch(`/assets/${id}`, data);
  return response.data;
};

export const deleteAsset = async (id: string): Promise<void> => {
  await api.delete(`/assets/${id}`);
};

export const searchAssetImages = async (query: string): Promise<Array<{ title: string; url: string; thumbnailUrl?: string; source: string }>> => {
  const response = await api.get('/assets/search-images', { params: { q: query } });
  return response.data;
};

export const autoFetchAssetImage = async (id: string): Promise<any> => {
  const response = await api.post(`/assets/${id}/auto-image`);
  return response.data;
};

export const getVisits = async (filters?: { status?: string; priority?: string; search?: string }): Promise<Visit[]> => {
  const response = await api.get<any[]>('/visits', { params: filters });
  return response.data.map((item) => ({
    id: item.id,
    protocol: item.protocol,
    client: item.client,
    address: item.address,
    locationId: item.locationId,
    locationName: item.location ? item.location.name : 'Vários Locais',
    technician: item.technician ? item.technician.name : 'Não atribuído',
    date: item.scheduledDate ? new Date(item.scheduledDate).toISOString().split('T')[0] : 'N/A',
    time: item.scheduledTime || '09:00 - 12:00',
    status: item.status,
    priority: item.priority,
    type: item.type,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    notes: item.notes,
    visitAssets: item.visitAssets,
  }));
};

export const getVisitDetails = async (id: string): Promise<Visit> => {
  const response = await api.get<any>(`/visits/${id}`);
  const item = response.data;
  return {
    id: item.id,
    protocol: item.protocol,
    client: item.client,
    address: item.address,
    locationId: item.locationId,
    locationName: item.location ? item.location.name : 'Vários Locais',
    technician: item.technician ? item.technician.name : 'Não atribuído',
    date: item.scheduledDate ? new Date(item.scheduledDate).toISOString().split('T')[0] : 'N/A',
    time: item.scheduledTime || '09:00 - 12:00',
    status: item.status,
    priority: item.priority,
    type: item.type,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    notes: item.notes,
    visitAssets: item.visitAssets,
  };
};

export const createVisit = async (data: {
  client: string;
  address: string;
  locationId?: string;
  priority?: string;
  type?: string;
  scheduledDate: string;
  scheduledTime?: string;
  notes?: string;
}): Promise<any> => {
  const response = await api.post('/visits', data);
  return response.data;
};

export const startVisit = async (visitId: string): Promise<Visit> => {
  const response = await api.post(`/visits/${visitId}/start`);
  return response.data;
};

export const completeVisit = async (visitId: string): Promise<Visit> => {
  const response = await api.post(`/visits/${visitId}/complete`);
  return response.data;
};

export const checkVisitAsset = async (
  visitId: string,
  assetId: string,
  status: VisitAssetStatus,
  notes?: string,
  photoUrl?: string
): Promise<any> => {
  const response = await api.post(`/visits/${visitId}/assets/${assetId}/check`, { status, notes, photoUrl });
  return response.data;
};

export const getAuditSummary = async (visitId: string): Promise<AuditSummary> => {
  const response = await api.get<AuditSummary>(`/visits/${visitId}/summary`);
  return response.data;
};

/* --- CHECKLISTS --- */

export const getChecklistTemplates = async (): Promise<ChecklistTemplate[]> => {
  const response = await api.get<ChecklistTemplate[]>('/checklists/templates');
  return response.data;
};

export const getVisitChecklistResponses = async (visitId: string): Promise<ChecklistResponse[]> => {
  const response = await api.get<ChecklistResponse[]>(`/checklists/visits/${visitId}/checklists`);
  return response.data;
};

export const saveVisitChecklistResponses = async (
  visitId: string,
  responses: Array<{ checklistItemId: string; assetId?: string; value: string; notes?: string }>
): Promise<any> => {
  const response = await api.post(`/checklists/visits/${visitId}/checklists`, { responses });
  return response.data;
};

/* --- ISSUES / NÃO CONFORMIDADES --- */

export const getIssues = async (filters?: {
  status?: string;
  severity?: string;
  visitId?: string;
  assetId?: string;
  search?: string;
}): Promise<Issue[]> => {
  const response = await api.get<any[]>('/issues', { params: filters });
  return response.data.map((item) => ({
    id: item.id,
    protocol: item.protocol || 'INC-000',
    title: item.title,
    description: item.description,
    severity: item.severity,
    status: item.status,
    recommendation: item.recommendation,
    visitId: item.visitId,
    visitProtocol: item.visit ? item.visit.protocol : undefined,
    assetId: item.assetId,
    assetName: item.asset ? item.asset.name : undefined,
    locationId: item.locationId,
    locationName: item.location ? item.location.name : undefined,
    reportedBy: item.reportedBy ? item.reportedBy.name : 'Técnico Campo',
    createdAt: new Date(item.createdAt).toISOString().split('T')[0],
  }));
};

export const createIssue = async (data: {
  title: string;
  description: string;
  severity?: IssueSeverity;
  status?: IssueStatus;
  recommendation?: string;
  visitId?: string;
  assetId?: string;
  locationId?: string;
}): Promise<Issue> => {
  const response = await api.post('/issues', data);
  return response.data;
};

export const updateIssue = async (
  id: string,
  data: {
    status?: IssueStatus;
    severity?: IssueSeverity;
    recommendation?: string;
    description?: string;
  }
): Promise<Issue> => {
  const response = await api.patch(`/issues/${id}`, data);
  return response.data;
};

/* --- REPORT GENERATION & EXPORTS --- */

const downloadBlobFile = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadVisitPDFReport = async (visitId: string): Promise<void> => {
  try {
    const response = await api.get(`/reports/visits/${visitId}/pdf`, {
      responseType: 'blob',
    });
    downloadBlobFile(new Blob([response.data], { type: 'application/pdf' }), `relatorio_vistoria_${visitId}.pdf`);
  } catch (error: any) {
    console.error('Erro ao baixar relatório PDF da visita:', error);
    alert('Não foi possível gerar ou baixar o relatório PDF. Verifique se sua sessão é válida e tente novamente.');
    throw error;
  }
};

export const downloadInventoryPDFReport = async (): Promise<void> => {
  try {
    const response = await api.get('/reports/inventory/pdf', {
      responseType: 'blob',
    });
    downloadBlobFile(new Blob([response.data], { type: 'application/pdf' }), `relatorio_inventario_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error: any) {
    console.error('Erro ao baixar relatório PDF do inventário:', error);
    alert('Não foi possível gerar ou baixar o relatório PDF. Verifique se sua sessão é válida e tente novamente.');
    throw error;
  }
};

export const exportAssetsCSV = async (): Promise<void> => {
  try {
    const response = await api.get('/reports/assets/export', {
      responseType: 'blob',
    });
    downloadBlobFile(new Blob([response.data], { type: 'text/csv' }), `exportacao_ativos_${new Date().toISOString().split('T')[0]}.csv`);
  } catch (error: any) {
    console.error('Erro ao exportar CSV:', error);
    alert('Não foi possível exportar os dados em CSV. Tente novamente.');
    throw error;
  }
};

/* --- NOTIFICATION APIS --- */

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationsAsRead = async (): Promise<NotificationItem[]> => {
  const response = await api.patch('/notifications/mark-as-read');
  return response.data.notifications || response.data;
};

/* --- PERIPHERAL / IT ASSETS APIS --- */

export const getPeripherals = async (filters?: {
  status?: string;
  category?: string;
  subcategory?: string;
  locationId?: string;
  search?: string;
}): Promise<Peripheral[]> => {
  const response = await api.get<any[]>('/peripherals', { params: filters });
  return response.data.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    assetTag: item.assetTag || 'N/A',
    serialNumber: item.serialNumber || 'N/A',
    category: item.category as PeripheralCategory,
    subcategory: item.subcategory as any,
    brand: item.brand || 'N/A',
    model: item.model || 'N/A',
    ipAddress: item.currentIp || item.ipAddress || undefined,
    currentIp: item.currentIp || undefined,
    macAddress: item.macAddress || undefined,
    monitoringEnabled: item.monitoringEnabled || false,
    monitoringStatus: item.monitoringStatus || 'UNKNOWN',
    latencyMs: item.latencyMs ?? undefined,
    consecutiveFailures: item.consecutiveFailures || 0,
    lastSeenAt: item.lastSeenAt || undefined,
    lastCheckedAt: item.lastCheckedAt || undefined,
    specifications: item.specifications || 'N/A',
    status: item.status,
    imageUrl: item.imageUrl,
    locationId: item.locationId,
    locationName: item.location ? item.location.name : 'Não alocado',
    locationDetails: item.location ? [item.location.building, item.location.room].filter(Boolean).join(' - ') : '',
    assignedTo: item.assignedTo ? item.assignedTo.name : 'Não atribuído',
    assignedToEmail: item.assignedTo ? item.assignedTo.email : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

export const getPeripheralStats = async (): Promise<PeripheralStats> => {
  const response = await api.get<PeripheralStats>('/peripherals/stats');
  return response.data;
};

export const createPeripheral = async (data: {
  name: string;
  code: string;
  assetTag?: string;
  serialNumber?: string;
  category: PeripheralCategory;
  subcategory?: string;
  brand?: string;
  model?: string;
  macAddress?: string;
  monitoringEnabled?: boolean;
  specifications?: string;
  status?: string;
  locationId?: string;
  assignedToId?: string;
  imageUrl?: string;
}): Promise<Peripheral> => {
  const response = await api.post('/peripherals', data);
  return response.data;
};

export const updatePeripheral = async (
  id: string,
  data: Partial<{
    name: string;
    code: string;
    assetTag: string;
    serialNumber: string;
    category: PeripheralCategory;
    subcategory: string;
    brand: string;
    model: string;
    macAddress: string;
    monitoringEnabled: boolean;
    specifications: string;
    status: string;
    locationId: string;
    assignedToId: string;
    imageUrl: string;
  }>
): Promise<Peripheral> => {
  const response = await api.patch(`/peripherals/${id}`, data);
  return response.data;
};

export const deletePeripheral = async (id: string): Promise<void> => {
  await api.delete(`/peripherals/${id}`);
};
