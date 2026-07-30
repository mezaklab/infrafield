import axios from 'axios';
import { 
  HealthStatus, 
  Asset, 
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface DashboardStats {
  assets: {
    total: number;
    operational: number;
    maintenance: number;
    critical: number;
    healthRate: number;
    categoriesCount: Record<string, number>;
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
  const response = await axios.get<HealthStatus>('http://localhost:3333/api/health', { timeout: 4000 });
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

export const getAssets = async (filters?: { status?: string; category?: string; locationId?: string; search?: string }): Promise<Asset[]> => {
  const response = await api.get<any[]>('/assets', { params: filters });
  return response.data.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    assetTag: item.assetTag || 'N/A',
    serialNumber: item.serialNumber || 'N/A',
    hostname: item.hostname || 'N/A',
    ipAddress: item.ipAddress || 'N/A',
    category: item.category,
    locationId: item.locationId,
    locationName: item.location ? item.location.name : 'Não especificado',
    status: item.status,
    imageUrl: item.imageUrl || item.photoUrl,
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
  ipAddress?: string;
  category: string;
  locationId?: string;
  status?: string;
  imageUrl?: string;
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
  category: string;
  locationId: string;
  status: string;
  imageUrl: string;
}>): Promise<any> => {
  const response = await api.patch(`/assets/${id}`, data);
  return response.data;
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
    technician: item.technician ? item.technician.name : 'Carlos Silva (Técnico)',
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
    technician: item.technician ? item.technician.name : 'Carlos Silva (Técnico)',
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

export const downloadVisitPDFReport = (visitId: string) => {
  const url = `${API_BASE_URL}/reports/visits/${visitId}/pdf`;
  window.open(url, '_blank');
};

export const downloadInventoryPDFReport = () => {
  const url = `${API_BASE_URL}/reports/inventory/pdf`;
  window.open(url, '_blank');
};

export const exportAssetsCSV = () => {
  const url = `${API_BASE_URL}/reports/assets/export`;
  window.open(url, '_blank');
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

