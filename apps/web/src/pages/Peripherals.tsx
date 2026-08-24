import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Cpu,
  Laptop,
  Printer,
  Scan,
  Monitor as MonitorIcon,
  Search,
  Plus,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Layers,
  UserCheck,
  Tag,
  Wifi,
  Network,
  HardDrive,
  Server,
  Package,
  Zap,
  SlidersHorizontal,
} from 'lucide-react';
import { LensImportDraft, Location, Peripheral, PeripheralCategory, PeripheralSubcategory } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  getPeripherals,
  createPeripheral,
  updatePeripheral,
  deletePeripheral,
  getLocations,
  downloadInventoryPDFReport,
} from '../services/api';
import { getSocket, StatusUpdatedPayload } from '../services/socket';
import { getLocationFullName } from '../utils/location';
import { ExportDropdown } from '../components/Layout/ExportDropdown';

// ─── Sub-module definitions ───────────────────────────────────────────────────

export type PeripheralsSubTab = 'TODOS' | 'COMPUTADOR' | 'MONITOR' | 'SOFTWARE' | 'REDE' | 'PERIFERICO';

interface SubModuleConfig {
  id: PeripheralsSubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accent: string;
  description: string;
  categories: PeripheralCategory[];
}

const SUB_MODULES: SubModuleConfig[] = [
  {
    id: 'TODOS',
    label: 'Todos os Ativos',
    icon: Layers,
    color: 'text-slate-300',
    accent: '#00f2fe',
    description: 'Inventário completo de todos os ativos de TI',
    categories: ['COMPUTADOR', 'IMPRESSORA', 'SCANNER', 'MONITOR', 'SOFTWARE', 'SWITCH', 'ROTEADOR', 'AP', 'NOBREAK', 'NAS', 'STORAGE', 'THIN_CLIENT', 'TELEFONE_IP', 'CAMERA_IP', 'IOT', 'OUTRO'],
  },
  {
    id: 'COMPUTADOR',
    label: 'Computadores',
    icon: Cpu,
    color: 'text-cyan-400',
    accent: '#00f2fe',
    description: 'Desktops, Notebooks e Servidores',
    categories: ['COMPUTADOR'],
  },
  {
    id: 'MONITOR',
    label: 'Monitores',
    icon: MonitorIcon,
    color: 'text-blue-400',
    accent: '#3b82f6',
    description: 'Telas e monitores profissionais',
    categories: ['MONITOR'],
  },
  {
    id: 'SOFTWARE',
    label: 'Softwares',
    icon: HardDrive,
    color: 'text-violet-400',
    accent: '#8b5cf6',
    description: 'Licenças e softwares instalados',
    categories: ['SOFTWARE'],
  },
  {
    id: 'REDE',
    label: 'Disp. de Rede',
    icon: Wifi,
    color: 'text-emerald-400',
    accent: '#10b981',
    description: 'Switches, Roteadores, APs e Nobreaks',
    categories: ['SWITCH', 'ROTEADOR', 'AP', 'NOBREAK', 'NAS', 'STORAGE', 'THIN_CLIENT', 'TELEFONE_IP', 'CAMERA_IP', 'IOT'],
  },
  {
    id: 'PERIFERICO',
    label: 'Periféricos / Outros',
    icon: Printer,
    color: 'text-amber-400',
    accent: '#f59e0b',
    description: 'Impressoras, Scanners e outros periféricos',
    categories: ['IMPRESSORA', 'SCANNER', 'OUTRO'],
  },
];

// ─── Category display helper ──────────────────────────────────────────────────

const getCategoryConfig = (cat: PeripheralCategory, sub?: PeripheralSubcategory) => {
  switch (cat) {
    case 'COMPUTADOR':
      if (sub === 'NOTEBOOK') return { label: 'Notebook', icon: Laptop, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
      if (sub === 'SERVIDOR') return { label: 'Servidor', icon: Server, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
      return { label: 'Desktop', icon: Cpu, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
    case 'IMPRESSORA': return { label: 'Impressora', icon: Printer, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    case 'SCANNER':    return { label: 'Scanner', icon: Scan, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    case 'MONITOR':    return { label: 'Monitor', icon: MonitorIcon, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    case 'SOFTWARE':   return { label: 'Software', icon: HardDrive, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' };
    case 'SWITCH':     return { label: 'Switch', icon: Network, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    case 'ROTEADOR':   return { label: 'Roteador', icon: Wifi, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' };
    case 'AP':         return { label: 'Access Point', icon: Wifi, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
    case 'NOBREAK':    return { label: 'Nobreak', icon: Zap, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    case 'NAS':         return { label: 'NAS', icon: HardDrive, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
    case 'STORAGE':     return { label: 'Storage', icon: HardDrive, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
    case 'THIN_CLIENT': return { label: 'Thin Client', icon: Cpu, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
    case 'TELEFONE_IP': return { label: 'Telefone IP', icon: Network, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' };
    case 'CAMERA_IP':   return { label: 'Câmera IP', icon: Scan, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
    case 'IOT':         return { label: 'IoT corporativo', icon: Wifi, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    default:           return { label: cat, icon: Package, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'OPERATIONAL':
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <CheckCircle2 className="w-3 h-3" /> Operacional
        </span>
      );
    case 'MAINTENANCE':
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Manutenção
        </span>
      );
    case 'CRITICAL':
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
          <XCircle className="w-3 h-3 text-rose-500" /> Crítico
        </span>
      );
    default:
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Inativo
        </span>
      );
  }
};

const getMonitoringBadge = (item: Peripheral) => {
  if (!item.monitoringEnabled) return <span className="text-[11px] font-semibold text-slate-500">Não monitorado</span>;
  const colors = { ONLINE: 'text-emerald-400', DEGRADED: 'text-amber-400', UNKNOWN: 'text-slate-400', OFFLINE: 'text-rose-400' };
  return <span className={`ui-badge text-[11px] font-bold ${colors[item.monitoringStatus]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{item.monitoringStatus}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface PeripheralsProps {
  defaultSubTab?: PeripheralsSubTab;
  onSubTabChange?: (sub: PeripheralsSubTab) => void;
  lensImport?: LensImportDraft | null;
  onLensImportConsumed?: () => void;
}

export const Peripherals: React.FC<PeripheralsProps> = ({ defaultSubTab = 'TODOS', onSubTabChange, lensImport, onLensImportConsumed }) => {
  const { isAdmin } = useAuth();

  const [activeSubTab, setActiveSubTabState] = useState<PeripheralsSubTab>(defaultSubTab);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [allPeripherals, setAllPeripherals] = useState<Peripheral[]>([]); // for counts
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Advanced filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Peripheral | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const tableRef = useRef<HTMLTableElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    assetTag: '',
    ownershipType: 'PROPRIO',
    rentalCompany: '',
    serialNumber: '',
    category: 'COMPUTADOR' as PeripheralCategory,
    subcategory: 'DESKTOP' as PeripheralSubcategory | '',
    brand: '',
    model: '',
    macAddress: '',
    monitoringEnabled: false,
    specifications: '',
    status: 'OPERATIONAL' as 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'INACTIVE',
    locationId: '',
  });

  useEffect(() => {
    if (!lensImport) return;
    const type = lensImport.type.toUpperCase();
    const category: PeripheralCategory = type === 'MONITOR' ? 'MONITOR' : type === 'IMPRESSORA' || type === 'MULTIFUNCIONAL' ? 'IMPRESSORA' : type === 'SCANNER' ? 'SCANNER' : 'COMPUTADOR';
    const subcategory: PeripheralSubcategory | '' = category === 'COMPUTADOR' ? (type === 'NOTEBOOK' ? 'NOTEBOOK' : 'DESKTOP') : '';
    setEditingItem(null);
    setFormData((current) => ({
      ...current,
      name: [lensImport.manufacturer, lensImport.model].filter(Boolean).join(' ') || 'Ativo identificado',
      code: `LENS-${Date.now().toString().slice(-6)}`,
      assetTag: lensImport.assetTag,
      serialNumber: lensImport.serviceTag || lensImport.serialNumber,
      category,
      subcategory,
      brand: lensImport.manufacturer,
      model: lensImport.model,
      macAddress: lensImport.macAddress,
      monitoringEnabled: Boolean(lensImport.macAddress),
      specifications: lensImport.productNumber ? `Product Number: ${lensImport.productNumber}` : '',
      locationId: locations[0]?.id || '',
    }));
    setIsModalOpen(true);
    onLensImportConsumed?.();
  }, [lensImport, locations, onLensImportConsumed]);

  const setActiveSubTab = (sub: PeripheralsSubTab) => {
    setActiveSubTabState(sub);
    setSelectedSubcategory('ALL');
    setSearchQuery('');
    onSubTabChange?.(sub);
  };

  const activeModule = SUB_MODULES.find((m) => m.id === activeSubTab) ?? SUB_MODULES[0];

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [periphData, locsData, allData] = await Promise.all([
        getPeripherals({
          locationId: selectedLocation !== 'ALL' ? selectedLocation : undefined,
        }),
        getLocations(),
        getPeripherals({}),
      ]);
      setAllPeripherals(allData);
      setLocations(locsData || []);
      setPeripherals(periphData);
    } catch (err: any) {
      console.error('Error loading peripherals:', err);
      setError('Não foi possível carregar a lista de ativos de TI.');
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time WebSocket
  useEffect(() => {
    const socket = getSocket();
    const handleStatusUpdated = (_payload: StatusUpdatedPayload) => { loadData(); };
    socket.on('statusUpdated', handleStatusUpdated);
    return () => { socket.off('statusUpdated', handleStatusUpdated); };
  }, [loadData]);

  // Re-fetch on focus/storage/onboarding
  useEffect(() => {
    const handleReFetch = () => { loadData(); };
    window.addEventListener('focus', handleReFetch);
    window.addEventListener('storage', handleReFetch);
    window.addEventListener('infrafield:assetOnboarded', handleReFetch);
    return () => {
      window.removeEventListener('focus', handleReFetch);
      window.removeEventListener('storage', handleReFetch);
      window.removeEventListener('infrafield:assetOnboarded', handleReFetch);
    };
  }, [loadData]);



  // ── Client-side filtering ──────────────────────────────────────────────────

  const filteredPeripherals = React.useMemo(() => {
    let result = peripherals;

    // Filter by sub-module categories
    if (activeSubTab !== 'TODOS') {
      result = result.filter((p) => activeModule.categories.includes(p.category));
    }

    // Filter by subcategory (Computers only)
    if (selectedSubcategory !== 'ALL' && activeSubTab === 'COMPUTADOR') {
      result = result.filter((p) => p.subcategory === selectedSubcategory);
    }

    // Filter by status
    if (selectedStatus !== 'ALL') {
      result = result.filter((p) => p.status === selectedStatus);
    }

    // Deep multi-field search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => {
        const fields = [
          p.name,
          p.brand,
          p.model,
          p.specifications,
          p.assetTag,
          p.serialNumber,
          p.code,
          p.locationName,
          p.locationDetails,
          p.ipAddress,
          p.assignedTo,
        ];
        return fields.some((f) => f && f.toLowerCase().includes(q));
      });
    }

    return result;
  }, [peripherals, activeSubTab, activeModule, selectedSubcategory, selectedStatus, searchQuery]);

  // ── Per-module counts ──────────────────────────────────────────────────────

  const moduleCounts = React.useMemo(() => {
    const counts: Record<PeripheralsSubTab, number> = {
      TODOS: allPeripherals.length,
      COMPUTADOR: allPeripherals.filter((p) => p.category === 'COMPUTADOR').length,
      MONITOR: allPeripherals.filter((p) => p.category === 'MONITOR').length,
      SOFTWARE: allPeripherals.filter((p) => p.category === 'SOFTWARE').length,
      REDE: allPeripherals.filter((p) => ['SWITCH', 'ROTEADOR', 'AP', 'NOBREAK', 'NAS', 'STORAGE', 'THIN_CLIENT', 'TELEFONE_IP', 'CAMERA_IP', 'IOT'].includes(p.category)).length,
      PERIFERICO: allPeripherals.filter((p) => ['IMPRESSORA', 'SCANNER', 'OUTRO'].includes(p.category)).length,
    };
    return counts;
  }, [allPeripherals]);

  // ── CRUD Handlers ──────────────────────────────────────────────────────────

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    const defaultCat: PeripheralCategory =
      activeSubTab === 'COMPUTADOR' ? 'COMPUTADOR'
      : activeSubTab === 'MONITOR' ? 'MONITOR'
      : activeSubTab === 'SOFTWARE' ? 'SOFTWARE'
      : activeSubTab === 'REDE' ? 'SWITCH'
      : activeSubTab === 'PERIFERICO' ? 'IMPRESSORA'
      : 'COMPUTADOR';
    setFormData({
      name: '',
      code: `PER-${Math.floor(1000 + Math.random() * 9000)}`,
      assetTag: '',
      ownershipType: 'PROPRIO',
      rentalCompany: '',
      serialNumber: '',
      category: defaultCat,
      subcategory: defaultCat === 'COMPUTADOR' ? 'DESKTOP' : '',
      brand: '',
      model: '',
      macAddress: '',
      monitoringEnabled: false,
      specifications: '',
      status: 'OPERATIONAL',
      locationId: locations[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Peripheral) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      assetTag: item.assetTag || '',
      ownershipType: item.ownershipType || 'PROPRIO',
      rentalCompany: item.rentalCompany || item.rental_company || '',
      serialNumber: item.serialNumber || '',
      category: item.category,
      subcategory: item.category === 'COMPUTADOR' ? (item.subcategory || 'DESKTOP') : '',
      brand: item.brand || '',
      model: item.model || '',
      macAddress: item.macAddress || '',
      monitoringEnabled: item.monitoringEnabled,
      specifications: item.specifications && item.specifications !== 'N/A' ? item.specifications : '',
      status: item.status,
      locationId: item.locationId || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      alert('Nome e Código são obrigatórios.');
      return;
    }
    if (formData.monitoringEnabled && !formData.macAddress.trim()) {
      alert('Informe um MAC Address para ativar o monitoramento automático.');
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = { ...formData };
      if (payload.category !== 'COMPUTADOR') payload.subcategory = undefined;
      if (editingItem) {
        await updatePeripheral(editingItem.id, payload);
      } else {
        await createPeripheral(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover "${name}"?`)) {
      try { await deletePeripheral(id); loadData(); }
      catch { alert('Erro ao excluir item.'); }
    }
  };

  // ── Export Handlers ────────────────────────────────────────────────────────

  const exportToCSV = (all = false) => {
    const data = all ? peripherals.filter((p) =>
      activeSubTab === 'TODOS' ? true : activeModule.categories.includes(p.category)
    ) : filteredPeripherals;

    const headers = ['Código', 'Patrimônio', 'Nome', 'Marca', 'Modelo', 'Categoria', 'Subcategoria', 'Nº Série', 'IP', 'Localidade', 'Responsável', 'Status', 'Especificações'];
    const rows = data.map((p) => [
      p.code,
      p.assetTag || '',
      p.name,
      p.brand || '',
      p.model || '',
      p.category,
      p.subcategory || '',
      p.serialNumber || '',
      p.ipAddress || '',
      p.locationName || '',
      p.assignedTo || '',
      p.status,
      (p.specifications || '').replace(/,/g, ';'),
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `infrafield_ativos_ti_${activeModule.label.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    link.remove();
    window.URL.revokeObjectURL(link.href);
  };

  const copyTableToClipboard = () => {
    const data = filteredPeripherals;
    const headers = 'Código\tNome\tMarca\tModelo\tCategoria\tIP\tLocalidade\tStatus';
    const rows = data.map((p) =>
      [p.code, p.name, p.brand || '-', p.model || '-', p.category, p.ipAddress || '-', p.locationName || '-', p.status].join('\t')
    );
    const text = [headers, ...rows].join('\n');
    return navigator.clipboard.writeText(text);
  };

  const exportToPDF = async () => {
    try {
      await downloadInventoryPDFReport();
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
    }
  };

  const hasActiveFilters = searchQuery || selectedSubcategory !== 'ALL' || selectedStatus !== 'ALL';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border shrink-0"
            style={{ backgroundColor: `${activeModule.accent}15`, borderColor: `${activeModule.accent}30`, boxShadow: `0 0 18px ${activeModule.accent}25` }}
          >
            <activeModule.icon className={`w-6 h-6 ${activeModule.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-white tracking-tight">Ativos de TI</h1>
              <span
                className="text-xs px-3 py-0.5 rounded-full font-mono font-bold border"
                style={{ backgroundColor: `${activeModule.accent}15`, color: activeModule.accent, borderColor: `${activeModule.accent}30` }}
              >
                {activeModule.label}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono">
                {filteredPeripherals.length} resultados
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{activeModule.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center h-10 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all gap-1.5 text-xs font-semibold shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Export Dropdown */}
          <ExportDropdown
            className="h-10"
            options={[
              {
                id: 'csv-filtered',
                label: 'Exportar página atual (CSV)',
                sublabel: `${filteredPeripherals.length} registros filtrados`,
                type: 'csv',
                onExport: () => exportToCSV(false),
              },
              {
                id: 'csv-all',
                label: 'Exportar todos em CSV',
                sublabel: `Módulo: ${activeModule.label}`,
                type: 'csv',
                onExport: () => exportToCSV(true),
              },
              {
                id: 'pdf-inventory',
                label: 'Relatório PDF',
                sublabel: 'Inventário completo em PDF',
                type: 'pdf',
                onExport: exportToPDF,
              },
              {
                id: 'copy-table',
                label: 'Copiar para área de transferência',
                sublabel: 'Formato tabular (TSV)',
                type: 'copy',
                onExport: copyTableToClipboard,
              },
            ]}
          />

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center h-10 gap-2 bg-[#00f2fe] hover:bg-cyan-400 text-slate-950 font-extrabold text-xs px-4 rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Ativo</span>
          </button>
        </div>
      </div>

      {/* ── Sub-Module Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {SUB_MODULES.map((mod) => {
          const isActive = activeSubTab === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveSubTab(mod.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                isActive
                  ? 'text-slate-950 shadow-lg'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800'
              }`}
              style={isActive ? {
                backgroundColor: mod.accent,
                borderColor: mod.accent,
                boxShadow: `0 0 14px ${mod.accent}40`,
              } : {}}
            >
              <mod.icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : mod.color}`} />
              <span>{mod.label}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                  isActive ? 'bg-black/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {moduleCounts[mod.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search & Filters ──────────────────────────────────────── */}
      <div className="surface-elevated bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-2.5">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={`Buscar em ${activeModule.label} — nome, marca, modelo, processador, patrimônio, S/N, localidade...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080d1a] border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-2.5 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-[#080d1a] border border-slate-800 focus:border-cyan-500 text-xs text-white rounded-xl px-3 py-2.5 outline-none transition-all cursor-pointer"
            >
              <option value="ALL">📍 Todas as Localidades</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.building ? `(${loc.building})` : ''}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-cyan-500/15 text-[#00f2fe] border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 animate-in fade-in slide-in-from-top-1">
            {/* Subcategory (Computers only) */}
            {activeSubTab === 'COMPUTADOR' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold shrink-0">Subcategoria:</span>
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'DESKTOP', label: '🖥️ Desktop' },
                  { id: 'NOTEBOOK', label: '💻 Notebook' },
                  { id: 'SERVIDOR', label: '🗄️ Servidor' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubcategory(sub.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                      selectedSubcategory === sub.id
                        ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                        : 'bg-[#080d1a] text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold shrink-0">Status:</span>
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'OPERATIONAL', label: '🟢 Operacional' },
                { id: 'MAINTENANCE', label: '🟡 Manutenção' },
                { id: 'CRITICAL', label: '🔴 Crítico' },
                { id: 'INACTIVE', label: '⚪ Inativo' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                    selectedStatus === s.id
                      ? 'bg-slate-800 text-white border-slate-600'
                      : 'bg-[#080d1a] text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubcategory('ALL');
                  setSelectedStatus('ALL');
                }}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table Content ─────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-12 text-center flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-[#00f2fe]" />
          <span className="text-xs text-slate-400">Carregando inventário de ativos de TI...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="px-3 py-1 bg-rose-500 text-white rounded-lg font-bold">Tentar novamente</button>
        </div>
      ) : filteredPeripherals.length === 0 ? (
        <div className="bg-[#080d1a] border border-slate-800 border-dashed rounded-3xl p-12 text-center space-y-3">
          <activeModule.icon className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {searchQuery || hasActiveFilters ? 'Nenhum resultado encontrado' : 'Nenhum ativo cadastrado'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || hasActiveFilters
              ? `Nenhum ativo em "${activeModule.label}" corresponde aos filtros aplicados.`
              : `Não há ativos cadastrados em "${activeModule.label}" ainda.`}
          </p>
          {!searchQuery && !hasActiveFilters && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-[#00f2fe] text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl mt-2 shadow-lg"
            >
              <Plus className="w-4 h-4" /> Cadastrar Ativo
            </button>
          )}
          {(searchQuery || hasActiveFilters) && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedSubcategory('ALL'); setSelectedStatus('ALL'); }}
              className="inline-flex items-center gap-2 bg-slate-800 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl mt-2 border border-slate-700"
            >
              <X className="w-4 h-4" /> Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#080d1a] border border-cyan-500/15 rounded-3xl overflow-hidden shadow-2xl">
          {/* Table toolbar summary */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-[#050811]">
            <span className="text-[11px] text-slate-400">
              Exibindo <strong className="text-white">{filteredPeripherals.length}</strong> de <strong className="text-white">{peripherals.filter(p => activeSubTab === 'TODOS' ? true : activeModule.categories.includes(p.category)).length}</strong> ativos
              {hasActiveFilters && <span className="text-[#00f2fe]"> (filtros ativos)</span>}
            </span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedSubcategory('ALL'); setSelectedStatus('ALL'); }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                >
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className="md:hidden p-3 space-y-3">{filteredPeripherals.map((item) => { const cfg = getCategoryConfig(item.category, item.subcategory); const Icon = cfg.icon; return <article key={item.id} className="mobile-data-card space-y-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="font-mono text-xs font-bold text-cyan-300">{item.code}</span><h3 className="font-bold text-white break-words">{item.name}</h3><p className="text-xs text-slate-400">{item.brand} {item.model}</p></div>{getMonitoringBadge(item)}</div><div className="flex items-center gap-2 text-xs"><Icon className={`w-4 h-4 ${cfg.color}`} /><span className="text-slate-300">{cfg.label}</span></div>{item.monitoringEnabled ? <dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">IP atual</dt><dd className="font-mono text-cyan-300 break-all">{item.currentIp || 'Aguardando descoberta'}</dd></div><div><dt className="text-slate-500">MAC</dt><dd className="font-mono text-slate-200 break-all">{item.macAddress}</dd></div><div><dt className="text-slate-500">Latência</dt><dd>{item.latencyMs ?? 'N/A'} ms</dd></div><div><dt className="text-slate-500">Falhas</dt><dd>{item.consecutiveFailures}</dd></div></dl> : <p className="text-xs text-slate-500">Monitoramento não disponível para este ativo.</p>}<button onClick={() => handleOpenEditModal(item)} className="min-h-11 w-full rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center gap-2"><Edit2 className="w-4 h-4" />Editar ativo</button></article>})}</div>
          <div className="hidden md:block overflow-x-auto" ref={tableRef as any}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#050811] text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Código / Patrimônio</th>
                  <th className="py-3.5 px-4">Equipamento & Especificações</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4">IP / Rede</th>
                  <th className="py-3.5 px-4">Local de Alocação</th>
                  <th className="py-3.5 px-4">Responsável</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#080d1a]">
                {filteredPeripherals.map((item) => {
                  const catCfg = getCategoryConfig(item.category, item.subcategory);
                  const CatIcon = catCfg.icon;

                  return (
                    <tr key={item.id} className="hover:bg-[#0b1326] transition-colors group">
                      {/* Código / Patrimônio */}
                      <td className="py-4 px-4">
                        <div className="font-mono font-bold text-[#00f2fe] text-xs">{item.code}</div>
                        {item.assetTag && item.assetTag !== 'N/A' && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Tag className="w-2.5 h-2.5 text-slate-500" /> {item.assetTag}
                          </div>
                        )}
                        {item.serialNumber && item.serialNumber !== 'N/A' && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">S/N: {item.serialNumber}</div>
                        )}
                      </td>

                      {/* Equipamento & Specs */}
                      <td className="py-4 px-4 max-w-[260px]">
                        <div className="font-bold text-white text-sm group-hover:text-[#00f2fe] transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                          {item.brand && item.brand !== 'N/A' && <span>Marca: <strong className="text-slate-300">{item.brand}</strong></span>}
                          {item.model && item.model !== 'N/A' && <span>Modelo: <strong className="text-slate-300">{item.model}</strong></span>}
                        </div>
                        {item.specifications && item.specifications !== 'N/A' && (
                          <div className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">{item.specifications}</div>
                        )}
                      </td>

                      {/* Categoria */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${catCfg.color}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                          {catCfg.label}
                        </span>
                        {item.subcategory && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{item.subcategory}</div>
                        )}
                      </td>

                      {/* IP */}
                      <td className="py-4 px-4">
                        {item.monitoringEnabled ? (
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-200 bg-[#050811] border border-slate-800 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                              <Wifi className="w-3.5 h-3.5 text-[#00f2fe] animate-pulse" />
                              {item.currentIp || 'Aguardando descoberta'}
                            </span>
                            {getMonitoringBadge(item)}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">Não monitorado</span>
                        )}
                      </td>

                      {/* Local */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#00f2fe] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block">{item.locationName || '—'}</span>
                            {item.locationDetails && (
                              <span className="text-[10px] text-slate-400 block">{item.locationDetails}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Responsável */}
                      <td className="py-4 px-4">
                        {item.assignedTo && item.assignedTo !== 'Não atribuído' ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-200">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{item.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">Não atribuído</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">{getStatusBadge(item.status)}</td>

                      {/* Ações */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────────────── */}
      {isModalOpen && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel bg-[#080d1a] border-cyan-500/30 max-w-xl space-y-5 custom-scrollbar max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#00f2fe]/10 text-[#00f2fe] rounded-2xl border border-[#00f2fe]/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingItem ? 'Editar Ativo de TI' : 'Cadastrar Novo Ativo de TI'}
                  </h3>
                  <p className="text-xs text-slate-400">Defina a categoria, localidade e dados técnicos</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-300 font-bold">Nome do Equipamento *</label>
                  <input
                    type="text" required
                    placeholder="Ex: Workstation Dell OptiPlex 7090, Impressora HP M528, Switch Cisco 24P..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Categoria Principal */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Categoria Principal *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value as PeripheralCategory;
                      setFormData({ ...formData, category: newCat, subcategory: newCat === 'COMPUTADOR' ? 'DESKTOP' : '' });
                    }}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                  >
                    <optgroup label="💻 Computadores">
                      <option value="COMPUTADOR">Computador (Desktop/Notebook/Servidor)</option>
                    </optgroup>
                    <optgroup label="🖥️ Display">
                      <option value="MONITOR">Monitor</option>
                    </optgroup>
                    <optgroup label="💿 Software">
                      <option value="SOFTWARE">Software / Licença</option>
                    </optgroup>
                    <optgroup label="🌐 Dispositivos de Rede">
                      <option value="SWITCH">Switch</option>
                      <option value="ROTEADOR">Roteador</option>
                      <option value="AP">Access Point (AP)</option>
                      <option value="NOBREAK">Nobreak / UPS</option>
                      <option value="NAS">NAS</option>
                      <option value="STORAGE">Storage</option>
                      <option value="THIN_CLIENT">Thin Client</option>
                      <option value="TELEFONE_IP">Telefone IP</option>
                      <option value="CAMERA_IP">Câmera IP</option>
                      <option value="IOT">IoT corporativo</option>
                    </optgroup>
                    <optgroup label="🖨️ Periféricos">
                      <option value="IMPRESSORA">Impressora</option>
                      <option value="SCANNER">Scanner</option>
                      <option value="OUTRO">Outro Periférico</option>
                    </optgroup>
                  </select>
                </div>

                {/* Subcategoria Computador */}
                {formData.category === 'COMPUTADOR' && (
                  <div className="space-y-1 bg-cyan-500/5 border border-cyan-500/20 p-2.5 rounded-xl">
                    <label className="text-[#00f2fe] font-bold block">Subcategoria *</label>
                    <select
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as PeripheralSubcategory })}
                      className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-1.5 outline-none cursor-pointer font-bold"
                    >
                      <option value="DESKTOP">🖥️ Desktop / Workstation</option>
                      <option value="NOTEBOOK">💻 Notebook / Laptop</option>
                      <option value="SERVIDOR">🗄️ Servidor / Rack</option>
                    </select>
                  </div>
                )}

                {/* Código */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Código de Identificação *</label>
                  <input
                    type="text" required
                    placeholder="Ex: PER-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white font-mono rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Patrimônio */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Nº de Patrimônio</label>
                  <input
                    type="text"
                    placeholder="Ex: PAT-2026-99"
                    value={formData.assetTag}
                    onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Tipo de Patrimônio */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Tipo de Patrimônio *</label>
                  <select
                    value={formData.ownershipType || 'PROPRIO'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, ownershipType: val, rentalCompany: val === 'PROPRIO' ? '' : formData.rentalCompany });
                    }}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none cursor-pointer font-bold"
                  >
                    <option value="PROPRIO">🏢 Próprio</option>
                    <option value="LOCADO">📑 Locado (Alugado)</option>
                  </select>
                </div>

                {/* Empresa Locadora */}
                {formData.ownershipType === 'LOCADO' && (
                  <div className="space-y-1 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl sm:col-span-2">
                    <label className="text-amber-300 font-bold block">Empresa Locadora *</label>
                    <input
                      type="text" required
                      placeholder="Ex: Simpress, Positivo, Locaweb..."
                      value={formData.rentalCompany}
                      onChange={(e) => setFormData({ ...formData, rentalCompany: e.target.value })}
                      className="w-full bg-[#050811] border border-amber-500/40 focus:border-amber-400 text-white rounded-xl px-3 py-2 outline-none font-medium"
                    />
                  </div>
                )}

                {/* Nº de Série */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Número de Série (S/N)</label>
                  <input
                    type="text"
                    placeholder="Ex: SN-88A99-X"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white font-mono rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Rede / monitoramento MAC-first */}
                <div className="space-y-1 sm:col-span-2 bg-[#050811] border border-slate-800 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-[#00f2fe]" />
                    <label className="text-slate-200 font-bold">MAC Address</label>
                  </div>
                  <input
                    type="text"
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={formData.macAddress}
                    onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-800 focus:border-cyan-500 text-white font-mono rounded-xl px-3 py-2 outline-none mt-1"
                  />
                  <label className="flex items-center gap-2 min-h-11 text-sm text-slate-200 cursor-pointer"><input type="checkbox" checked={formData.monitoringEnabled} onChange={(e) => setFormData({ ...formData, monitoringEnabled: e.target.checked })} /> Monitoramento automático</label>
                  <div className="rounded-xl bg-slate-900/70 px-3 py-2 text-xs"><span className="text-slate-500">IP atual</span><strong className="block text-cyan-300 font-mono">{editingItem?.currentIp || 'Será descoberto automaticamente'}</strong></div>
                  <p className="text-[10px] text-slate-400 mt-1">O InfraField localizará o equipamento pelo MAC, descobrirá o IP atual e verificará sua disponibilidade.</p>
                </div>

                {/* Marca */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Marca / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Dell, HP, Lenovo, Epson, Intelbras"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Modelo */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: ThinkPad X1 / OptiPlex 7090 / SG-1000"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Local */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Localidade / Sala *</label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                  >
                    <option value="">Selecione o Local...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {getLocationFullName(loc, locations)} {loc.room ? `(${loc.room})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Status Manual / Inicial</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                  >
                    <option value="OPERATIONAL">🟢 Operacional</option>
                    <option value="MAINTENANCE">🟡 Em Manutenção</option>
                    <option value="CRITICAL">🔴 Crítico</option>
                    <option value="INACTIVE">⚪ Inativo</option>
                  </select>
                </div>

                {/* Especificações */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-300 font-bold">Especificações Técnicas / Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: i7 12ª Gen, 32GB RAM, SSD 1TB NVMe — ou — Monocromática 45ppm, duplex automático — ou — Cisco SG250-26, 26 portas Gigabit..."
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl p-3 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl border border-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#00f2fe] hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Ativo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Peripherals;
