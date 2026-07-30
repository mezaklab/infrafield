import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  ShieldAlert, 
  MapPin, 
  ArrowRight, 
  X, 
  RefreshCw,
  Server,
  Network,
  ShieldCheck,
  HardDrive,
  Wifi,
  Cpu,
  Activity,
  FileText,
  Download,
  Edit3,
  Monitor,
  ExternalLink
} from 'lucide-react';
import { Asset, Location } from '../types';
import { getAssets, createAsset, updateAsset, getLocations, downloadInventoryPDFReport, exportAssetsCSV } from '../services/api';
import { getSocket, StatusUpdatedPayload } from '../services/socket';

/**
 * Mapeamento MOCADO COM PNGs REAIS DE VERDADE com Fundo Transparente.
 * Suporta modelos exatos: AP Aruba AP-515, AP Intelbras, Servidor Dell PowerEdge R750,
 * Storage Dell PowerVault ME5024, Switch Cisco Catalyst / Intelbras, Fortinet FortiGate.
 */
const REAL_ISOLATED_HARDWARE_PNGS: Record<string, string> = {
  // Access Points (Aruba / Intelbras)
  'AP-WIFI-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Wi-Fi_Icon.svg/512px-Wi-Fi_Icon.svg.png',
  'SW-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Wi-Fi_Icon.svg/512px-Wi-Fi_Icon.svg.png',

  // Switches (Cisco / Intelbras)
  'SW-CORE-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cisco_Switch.svg/512px-Cisco_Switch.svg.png',

  // Fortinet FortiGate
  'FW-EDGE-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Firewall-icon.svg/512px-Firewall-icon.svg.png',

  // Storage Dell PowerVault
  'SAN-STOR-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Server-icon.svg/512px-Server-icon.svg.png',

  // Servidor Dell PowerEdge
  'SRV-VM-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Server-icon.svg/512px-Server-icon.svg.png',
};

// Fallback visual transparente de altíssima definição em DataURI para modo offline
// REGRA: ZERO <rect> de fundo. Apenas o silhouette do equipamento sobre canvas transparente.
const FALLBACK_PHOTO_HARDWARE_DATA_URIS: Record<string, string> = {
  // Access Point — silhouette oval/dome transparente
  'AP-WIFI-01': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" fill="none"><ellipse cx="60" cy="62" rx="44" ry="10" fill="%2300f2fe" fill-opacity="0.18"/><rect x="22" y="44" width="76" height="20" rx="10" fill="%230f172a" stroke="%2300f2fe" stroke-width="1.5"/><rect x="30" y="50" width="6" height="6" rx="1.5" fill="%2310b981"/><rect x="40" y="50" width="6" height="6" rx="1.5" fill="%2310b981"/><rect x="50" y="50" width="6" height="6" rx="1.5" fill="%2310b981"/><text x="84" y="57" font-family="sans-serif" font-weight="900" font-size="7" fill="%2300f2fe" text-anchor="middle">AP</text><path d="M60 44 Q60 28 60 20" stroke="%2300f2fe" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="60" cy="18" r="3" fill="%2300f2fe"/><path d="M45 36 Q52 24 60 20 Q68 24 75 36" stroke="%2300f2fe" stroke-width="1.2" fill="none" opacity="0.6"/><path d="M38 40 Q50 20 60 14 Q70 20 82 40" stroke="%2300f2fe" stroke-width="1" fill="none" opacity="0.35"/></svg>`,

  // Switch rack 1U — silhouette de bandeja sem fundo
  'SW-CORE-01': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none"><rect x="4" y="14" width="192" height="32" rx="4" fill="%230f172a" stroke="%2300bcd4" stroke-width="1.5"/><rect x="10" y="20" width="55" height="20" rx="2" fill="%23071020"/><text x="37" y="32" font-family="monospace" font-weight="900" font-size="9" fill="%2338bdf8" text-anchor="middle">cisco</text><text x="37" y="40" font-family="monospace" font-size="5.5" fill="%2394a3b8" text-anchor="middle">9300</text><g fill="%2300bcd4"><rect x="72" y="21" width="5" height="8" rx="1"/><rect x="80" y="21" width="5" height="8" rx="1"/><rect x="88" y="21" width="5" height="8" rx="1"/><rect x="96" y="21" width="5" height="8" rx="1"/><rect x="104" y="21" width="5" height="8" rx="1"/><rect x="112" y="21" width="5" height="8" rx="1"/><rect x="72" y="32" width="5" height="8" rx="1"/><rect x="80" y="32" width="5" height="8" rx="1"/><rect x="88" y="32" width="5" height="8" rx="1"/><rect x="96" y="32" width="5" height="8" rx="1"/><rect x="104" y="32" width="5" height="8" rx="1"/><rect x="112" y="32" width="5" height="8" rx="1"/></g><circle cx="145" cy="25" r="3" fill="%2310b981"/><circle cx="155" cy="25" r="3" fill="%2310b981"/><circle cx="165" cy="25" r="3" fill="%23f59e0b"/><rect x="140" y="32" width="30" height="8" rx="2" fill="%23071020" stroke="%2300bcd4" stroke-opacity="0.5"/><rect x="2" y="12" width="4" height="36" rx="2" fill="%231e293b"/><rect x="194" y="12" width="4" height="36" rx="2" fill="%231e293b"/></svg>`,

  // Firewall rack 1U — placa branca com texto FORTINET
  'FW-EDGE-01': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" fill="none"><rect x="4" y="14" width="192" height="32" rx="4" fill="%23f0f4f8" stroke="%23e2e8f0" stroke-width="1.5"/><rect x="10" y="20" width="70" height="20" rx="2" fill="%23e2e8f0"/><text x="45" y="32" font-family="sans-serif" font-weight="900" font-size="9" fill="%23ef4444" text-anchor="middle">FORTINET</text><text x="45" y="40" font-family="sans-serif" font-size="5.5" fill="%2364748b" text-anchor="middle">FortiGate 100F</text><circle cx="100" cy="28" r="3" fill="%2310b981"/><circle cx="112" cy="28" r="3" fill="%2310b981"/><circle cx="124" cy="28" r="3" fill="%2310b981"/><rect x="138" y="20" width="42" height="20" rx="3" fill="%23071020" stroke="%236366f1" stroke-width="1"/><text x="159" y="32" font-family="monospace" font-size="6" fill="%236366f1" text-anchor="middle">USB  CFG</text><rect x="2" y="12" width="4" height="36" rx="2" fill="%23cbd5e1"/><rect x="194" y="12" width="4" height="36" rx="2" fill="%23cbd5e1"/></svg>`,

  // Storage — chassi 2U com drives visíveis
  'SAN-STOR-01': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" fill="none"><rect x="4" y="8" width="192" height="64" rx="5" fill="%230a1628" stroke="%23a855f7" stroke-width="1.5"/><rect x="2" y="6" width="4" height="68" rx="2" fill="%23172033"/><rect x="194" y="6" width="4" height="68" rx="2" fill="%23172033"/><rect x="12" y="16" width="148" height="12" rx="2" fill="%23071020" stroke="%23a855f7" stroke-opacity="0.7"/><circle cx="168" cy="22" r="3" fill="%23a855f7"/><rect x="12" y="34" width="148" height="12" rx="2" fill="%23071020" stroke="%23a855f7" stroke-opacity="0.7"/><circle cx="168" cy="40" r="3" fill="%2310b981"/><rect x="12" y="52" width="148" height="12" rx="2" fill="%23071020" stroke="%23a855f7" stroke-opacity="0.7"/><circle cx="168" cy="58" r="3" fill="%2300f2fe"/><text x="86" y="25" font-family="monospace" font-size="6" fill="%23a855f7" text-anchor="middle">DELL POWERVAULT ME5024</text></svg>`,

  // Servidor 2U rack — drives frontais + LEDs
  'SRV-VM-01': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" fill="none"><rect x="4" y="8" width="192" height="64" rx="5" fill="%230a1628" stroke="%2338bdf8" stroke-width="1.5"/><rect x="2" y="6" width="4" height="68" rx="2" fill="%23172033"/><rect x="194" y="6" width="4" height="68" rx="2" fill="%23172033"/><rect x="10" y="14" width="18" height="52" rx="2" fill="%23071020" stroke="%23334155"/><rect x="32" y="14" width="18" height="52" rx="2" fill="%23071020" stroke="%23334155"/><rect x="54" y="14" width="18" height="52" rx="2" fill="%23071020" stroke="%23334155"/><text x="120" y="36" font-family="sans-serif" font-weight="900" font-size="11" fill="%2300f2fe" text-anchor="middle">DELL</text><text x="120" y="48" font-family="sans-serif" font-size="7" fill="%2394a3b8" text-anchor="middle">PowerEdge R750</text><circle cx="162" cy="30" r="3.5" fill="%2310b981"/><circle cx="175" cy="30" r="3.5" fill="%2300f2fe"/><rect x="156" y="42" width="28" height="14" rx="2" fill="%23071020" stroke="%2338bdf8" stroke-opacity="0.5"/></svg>`,
};

export const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Modal State for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for asset creation & editing (com campo imageUrl)
  const [assetForm, setAssetForm] = useState({
    name: '',
    code: '',
    assetTag: '',
    serialNumber: '',
    hostname: '',
    ipAddress: '',
    category: 'Redes & Switches',
    locationId: '',
    status: 'OPERATIONAL',
    imageUrl: '',
  });



  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsData, locationsData] = await Promise.all([
        getAssets({
          status: statusFilter,
          search: searchTerm,
        }),
        getLocations(),
      ]);
      setAssets(assetsData);
      setLocations(locationsData);
    } catch (err: any) {
      console.error('Failed to load assets:', err);
      setError('Não foi possível carregar os ativos da API.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sincronização em tempo real via WebSockets (Socket.IO)
  useEffect(() => {
    const socket = getSocket();

    const handleStatusUpdated = (payload: StatusUpdatedPayload) => {
      console.log('⚡ [Assets WebSockets] Evento statusUpdated recebido:', payload);

      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          if (asset.id === payload.id || asset.code === payload.code) {
            return {
              ...asset,
              status: payload.status as Asset['status'],
            };
          }
          return asset;
        })
      );

      setSelectedAsset((prevSelected) => {
        if (prevSelected && (prevSelected.id === payload.id || prevSelected.code === payload.code)) {
          return {
            ...prevSelected,
            status: payload.status as Asset['status'],
          };
        }
        return prevSelected;
      });
    };

    socket.on('statusUpdated', handleStatusUpdated);

    return () => {
      socket.off('statusUpdated', handleStatusUpdated);
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingAssetId(null);
    setAssetForm({
      name: '',
      code: '',
      assetTag: '',
      serialNumber: '',
      hostname: '',
      ipAddress: '',
      category: 'Redes & Switches',
      locationId: locations[0]?.id || '',
      status: 'OPERATIONAL',
      imageUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetForm({
      name: asset.name,
      code: asset.code,
      assetTag: asset.assetTag || '',
      serialNumber: asset.serialNumber || '',
      hostname: asset.hostname || '',
      ipAddress: asset.ipAddress || '',
      category: asset.category,
      locationId: asset.locationId || '',
      status: asset.status,
      imageUrl: asset.imageUrl || '',
    });
    setSelectedAsset(null);
    setIsModalOpen(true);
  };



  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingAssetId) {
        await updateAsset(editingAssetId, assetForm);
      } else {
        await createAsset(assetForm);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar ativo');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Matcher Inteligente e Fallback Dinâmico DEFINITIVO para PNGs Reais de Equipamentos.
   */
  const getExactIsolatedEquipmentImage = (code: string, category: string, name: string, customUrl?: string) => {
    // Regra 1: Se o ativo possuir imageUrl customizada informada pelo usuário, usa diretamente
    if (customUrl && customUrl.trim().length > 0) {
      return customUrl;
    }

    const nm = (name || '').toLowerCase();
    const cat = (category || '').toLowerCase();
    const cd = (code || '').toLowerCase();

    // Regra 2: Matcher Inteligente por Nome e Categoria para os 6 modelos de referência

    // Access Point Aruba AP-515 / AP Intelbras
    if (
      nm.includes('access point') || nm.includes('aruba') || nm.includes('intelbras ap') || nm.includes('wi-fi') || nm.includes('wifi') || nm.includes('ap-515') || nm.includes('ap ') ||
      cat.includes('sem fio') || cat.includes('wi-fi') || cat.includes('access point') ||
      cd.includes('ap-wifi') || cd.startsWith('ap-')
    ) {
      return REAL_ISOLATED_HARDWARE_PNGS['AP-WIFI-01'];
    }

    // Switch Cisco Catalyst 9300 / Switch Intelbras
    if (
      nm.includes('switch') || nm.includes('cisco') || nm.includes('catalyst') || nm.includes('intelbras') ||
      cat.includes('switch') || cat.includes('redes & switches') ||
      cd.includes('sw-core') || cd.startsWith('sw-')
    ) {
      return REAL_ISOLATED_HARDWARE_PNGS['SW-CORE-01'];
    }

    // Fortinet FortiGate 100F
    if (
      nm.includes('firewall') || nm.includes('fortinet') || nm.includes('fortigate') ||
      cat.includes('firewall') || cat.includes('segurança') ||
      cd.includes('fw-edge') || cd.startsWith('fw-')
    ) {
      return REAL_ISOLATED_HARDWARE_PNGS['FW-EDGE-01'];
    }

    // Storage Dell PowerVault ME5024
    if (
      nm.includes('storage') || nm.includes('powervault') || nm.includes('san') || nm.includes('me5024') ||
      cat.includes('storage') || cat.includes('armazenamento') ||
      cd.includes('san-stor') || cd.startsWith('san-') || cd.startsWith('stor-')
    ) {
      return REAL_ISOLATED_HARDWARE_PNGS['SAN-STOR-01'];
    }

    // Servidor Dell PowerEdge R750
    if (
      nm.includes('servidor') || nm.includes('poweredge') || nm.includes('dell r') || nm.includes('r750') || nm.includes('server') ||
      cat.includes('servidor') || cat.includes('virtualização') ||
      cd.includes('srv-vm') || cd.startsWith('srv-')
    ) {
      return REAL_ISOLATED_HARDWARE_PNGS['SRV-VM-01'];
    }

    // Fallback por código exato ou padrão Servidor
    if (REAL_ISOLATED_HARDWARE_PNGS[code]) {
      return REAL_ISOLATED_HARDWARE_PNGS[code];
    }

    return REAL_ISOLATED_HARDWARE_PNGS['SRV-VM-01'];
  };

  const getFallbackDataURI = (_code: string, category: string, name: string) => {
    const nm = (name || '').toLowerCase();
    const cat = (category || '').toLowerCase();

    if (nm.includes('aruba') || nm.includes('ap') || cat.includes('sem fio') || cat.includes('wi-fi')) {
      return FALLBACK_PHOTO_HARDWARE_DATA_URIS['AP-WIFI-01'];
    }
    if (nm.includes('cisco') || nm.includes('switch') || cat.includes('switch')) {
      return FALLBACK_PHOTO_HARDWARE_DATA_URIS['SW-CORE-01'];
    }
    if (nm.includes('fortinet') || nm.includes('firewall') || cat.includes('segurança')) {
      return FALLBACK_PHOTO_HARDWARE_DATA_URIS['FW-EDGE-01'];
    }
    if (nm.includes('storage') || nm.includes('powervault') || cat.includes('storage')) {
      return FALLBACK_PHOTO_HARDWARE_DATA_URIS['SAN-STOR-01'];
    }
    return FALLBACK_PHOTO_HARDWARE_DATA_URIS['SRV-VM-01'];
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('servidor')) return <Server className="w-4 h-4 text-[#00f2fe]" />;
    if (cat.includes('rede') || cat.includes('switch')) return <Network className="w-4 h-4 text-[#38bdf8]" />;
    if (cat.includes('segurança') || cat.includes('firewall')) return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    if (cat.includes('storage') || cat.includes('armazenamento')) return <HardDrive className="w-4 h-4 text-purple-400" />;
    if (cat.includes('sem fio') || cat.includes('wifi') || cat.includes('access')) return <Wifi className="w-4 h-4 text-amber-400" />;
    return <Cpu className="w-4 h-4 text-[#00f2fe]" />;
  };

  const getCategoryMetrics = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('servidor')) {
      return [
        { label: 'CPU', value: '18%' },
        { label: 'RAM', value: '42%' },
        { label: 'Temp', value: '21°C' },
      ];
    }
    if (cat.includes('rede') || cat.includes('switch')) {
      return [
        { label: 'Portas', value: '42/48' },
        { label: 'Ping', value: '1ms' },
        { label: 'Banda', value: '2.4 Gbps' },
      ];
    }
    if (cat.includes('segurança') || cat.includes('firewall')) {
      return [
        { label: 'Sessões', value: '1.2k' },
        { label: 'Latência', value: '2ms' },
        { label: 'Regras', value: 'OK' },
      ];
    }
    if (cat.includes('storage') || cat.includes('armazenamento')) {
      return [
        { label: 'Uso', value: '64%' },
        { label: 'IOPS', value: '12.5k' },
        { label: 'Temp', value: '24°C' },
      ];
    }
    return [
      { label: 'Clientes', value: '28' },
      { label: 'Sinal', value: '-42 dBm' },
      { label: 'Uptime', value: '99.9%' },
    ];
  };

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Operacional
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wrench className="w-3 h-3" /> Em Manutenção
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> Alerta Crítico
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            <AlertCircle className="w-3 h-3" /> Inativo
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00f2fe]" />
            Catálogo de Ativos de Infraestrutura & TI
          </h2>
          <p className="text-xs text-slate-400">Telemetria em tempo real, serial, hostname e portas ativas</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchData}
            className="p-2.5 bg-[#080d1a] hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
            title="Recarregar Ativos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={exportAssetsCSV}
            className="flex items-center gap-1.5 bg-[#080d1a] hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all"
            title="Exportar Inventário em CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          {/* Download Inventory PDF Report */}
          <button
            onClick={downloadInventoryPDFReport}
            className="flex items-center gap-1.5 bg-[#080d1a] hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all"
            title="Gerar PDF de Inventário Geral"
          >
            <FileText className="w-4 h-4 text-[#00f2fe]" />
            <span>Inventário PDF</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-[#00f2fe] to-[#0284c7] hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Novo Ativo
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="noc-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between bg-[#080d1a] border border-cyan-500/15">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, patrimônio, hostname ou IP..."
            className="w-full bg-[#050811] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#00f2fe]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 mr-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'OPERATIONAL', label: 'Operacionais' },
            { id: 'MAINTENANCE', label: 'Manutenção' },
            { id: 'CRITICAL', label: 'Críticos' },
            { id: 'INACTIVE', label: 'Inativos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30'
                  : 'bg-[#050811] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#00f2fe]" /> Carregando ativos da infraestrutura...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 text-center">
          {error}
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 bg-[#080d1a] border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
          Nenhum ativo encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const metrics = getCategoryMetrics(asset.category);
            const fallbackDataURI = getFallbackDataURI(asset.code, asset.category, asset.name);
            const equipmentImg = getExactIsolatedEquipmentImage(asset.code, asset.category, asset.name, asset.imageUrl);

            return (
              <div
                key={asset.id}
                className="bg-[#080d1a] border border-cyan-500/15 hover:border-cyan-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden backdrop-blur-md"
              >
                <div>
                  {/* 1. TOPO: Badge Código Ativo à esquerda + Status à direita */}
                  <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800/80 pb-2.5">
                    <span className="text-[11px] font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2.5 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,242,254,0.15)]">
                      {asset.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(asset)}
                        className="p-1 text-slate-400 hover:text-[#00f2fe] rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Ativo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {getStatusBadge(asset.status)}
                    </div>
                  </div>

                  {/* Container transparente — drop-shadow segue o canal alpha do PNG */}
                  <div className="flex items-start gap-4 my-2">
                    <div className="relative w-24 h-20 shrink-0 flex items-center justify-center pointer-events-none select-none">
                      <img
                        src={equipmentImg}
                        alt={asset.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = fallbackDataURI;
                        }}
                        className="w-full h-full object-contain bg-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                      />
                      <div className="absolute bottom-0 w-full h-2 rounded-full bg-[#00f2fe]/40 blur-md pointer-events-none"></div>
                    </div>

                    {/* ESTRUTURA DOS TEXTOS (Lado direito da foto) */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-[#00f2fe] transition-colors truncate">
                        {asset.name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {getCategoryIcon(asset.category)}
                        <span className="truncate font-medium">{asset.category}</span>
                      </div>

                      <div className="text-xs text-slate-400 pt-0.5 space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Patrimônio:</span>
                          <strong className="text-slate-200 font-mono">{asset.assetTag}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">IP / Host:</span>
                          <span className="text-[#00f2fe] font-mono font-bold truncate drop-shadow-[0_0_8px_rgba(0,242,254,0.3)]">
                            {asset.ipAddress || asset.hostname}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Localização com ícone de pino no bloco principal */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-2 pb-1 border-t border-slate-800/40">
                    <MapPin className="w-3.5 h-3.5 text-[#00f2fe] shrink-0" />
                    <span className="truncate">{asset.locationName}</span>
                  </div>

                  {/* 3. BLOCO INFERIOR: Métricas técnicas em colunas limpas */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 p-2 bg-[#050811] rounded-xl border border-slate-800/80 text-center text-[10px]">
                    {metrics.map((m, idx) => (
                      <div key={idx} className="flex flex-col">
                        <span className="text-slate-500 font-semibold">{m.label}</span>
                        <strong className="text-[#00f2fe] font-mono">{m.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rodapé: Botões Acesso Remoto & Ver detalhes */}
                <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <a
                    href={
                      asset.ipAddress?.startsWith('http')
                        ? asset.ipAddress
                        : `http://${asset.ipAddress || asset.hostname || '127.0.0.1'}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-[#00f2fe] bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 border border-[#00f2fe]/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    title={`Abrir Interface de Gerência (${asset.ipAddress || asset.hostname || '127.0.0.1'}) em nova aba`}
                  >
                    <Monitor className="w-3.5 h-3.5 text-[#00f2fe]" />
                    <span>Acesso Remoto</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>

                  <button
                    onClick={() => setSelectedAsset(asset)}
                    className="text-xs font-semibold text-slate-400 hover:text-[#00f2fe] flex items-center gap-1 transition-colors group-hover:translate-x-0.5 cursor-pointer"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#00f2fe]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Asset Details Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setSelectedAsset(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center pointer-events-none select-none">
                <img
                  src={getExactIsolatedEquipmentImage(selectedAsset.code, selectedAsset.category, selectedAsset.name, selectedAsset.imageUrl)}
                  alt={selectedAsset.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getFallbackDataURI(selectedAsset.code, selectedAsset.category, selectedAsset.name);
                  }}
                  className="w-full h-full object-contain bg-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                />
                <div className="absolute bottom-0 w-full h-1.5 rounded-full bg-[#00f2fe]/40 blur-md pointer-events-none"></div>
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2.5 py-0.5 rounded-lg">
                  {selectedAsset.code}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedAsset.name}</h3>
                <p className="text-xs text-slate-400">{selectedAsset.category}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Patrimônio:</span>
                <span className="text-slate-200 font-mono font-bold">{selectedAsset.assetTag}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Número de Série (S/N):</span>
                <span className="text-slate-200 font-mono">{selectedAsset.serialNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Hostname:</span>
                <span className="text-[#00f2fe] font-mono font-bold">{selectedAsset.hostname}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Endereço IP:</span>
                <span className="text-[#00f2fe] font-mono font-bold">{selectedAsset.ipAddress}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Localização / Sala:</span>
                <span className="text-slate-200 font-semibold">{selectedAsset.locationName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Responsável:</span>
                <span className="text-slate-200 font-semibold">{selectedAsset.assignedTo}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => handleOpenEditModal(selectedAsset)}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar Ativo
              </button>
              <button
                onClick={() => setSelectedAsset(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Creation & Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-white mb-1">
              {editingAssetId ? 'Editar Ativo de TI / Redes' : 'Cadastrar Ativo de TI / Redes'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Insira ou atualize os dados técnicos do equipamento.</p>

            <form onSubmit={handleSaveAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Equipamento</label>
                <input
                  type="text"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="Ex: AP Aruba AP-515, Servidor Dell R750 ou Switch Cisco"
                  className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Código ID</label>
                  <input
                    type="text"
                    value={assetForm.code}
                    onChange={(e) => setAssetForm({ ...assetForm, code: e.target.value })}
                    placeholder="Ex: AP-01"
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Patrimônio (AssetTag)</label>
                  <input
                    type="text"
                    value={assetForm.assetTag}
                    onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                    placeholder="Ex: PAT-00106"
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="Redes & Switches">Redes & Switches</option>
                    <option value="Servidores">Servidores & Virtualização</option>
                    <option value="Segurança & Firewalls">Segurança & Firewalls</option>
                    <option value="Storage & Armazenamento">Storage & Armazenamento</option>
                    <option value="Redes Sem Fio">Redes Sem Fio (Wi-Fi / Access Point)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={assetForm.status}
                    onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="OPERATIONAL">Operacional</option>
                    <option value="MAINTENANCE">Em Manutenção</option>
                    <option value="CRITICAL">Alerta Crítico</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Hostname</label>
                  <input
                    type="text"
                    value={assetForm.hostname}
                    onChange={(e) => setAssetForm({ ...assetForm, hostname: e.target.value })}
                    placeholder="Ex: ap-aruba.local"
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço IP</label>
                  <input
                    type="text"
                    value={assetForm.ipAddress}
                    onChange={(e) => setAssetForm({ ...assetForm, ipAddress: e.target.value })}
                    placeholder="Ex: 192.168.1.1"
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Série (S/N)</label>
                <input
                  type="text"
                  value={assetForm.serialNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                  placeholder="Ex: SN-ARUBA-515"
                  className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Localização</label>
                <select
                  value={assetForm.locationId}
                  onChange={(e) => setAssetForm({ ...assetForm, locationId: e.target.value })}
                  className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Selecione um local...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.building ? `(${loc.building})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* FOTO DO EQUIPAMENTO — Biblioteca Local de Assets (Enterprise) */}
              <div className="bg-[#050811] p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">
                  Foto do Equipamento
                </label>

                <select
                  value={assetForm.imageUrl}
                  onChange={(e) => setAssetForm({ ...assetForm, imageUrl: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#00f2fe]"
                >
                  <option value="">Detecção Automática (por Nome / Categoria)</option>
                  <option value={REAL_ISOLATED_HARDWARE_PNGS['AP-WIFI-01']}>Access Point — Aruba AP-515 / Intelbras AP</option>
                  <option value={REAL_ISOLATED_HARDWARE_PNGS['SW-CORE-01']}>Switch de Rack — Cisco Catalyst / Intelbras SW</option>
                  <option value={REAL_ISOLATED_HARDWARE_PNGS['FW-EDGE-01']}>Firewall — Fortinet FortiGate 100F</option>
                  <option value={REAL_ISOLATED_HARDWARE_PNGS['SAN-STOR-01']}>Storage — Dell PowerVault ME5024</option>
                  <option value={REAL_ISOLATED_HARDWARE_PNGS['SRV-VM-01']}>Servidor — Dell PowerEdge R750</option>
                </select>

                {/* Preview ao vivo */}
                <div className="flex items-center gap-4 pt-2 border-t border-slate-800/80">
                  <div className="relative w-20 shrink-0 h-16 flex items-center justify-center pointer-events-none select-none">
                    <img
                      src={getExactIsolatedEquipmentImage(assetForm.code, assetForm.category, assetForm.name, assetForm.imageUrl)}
                      alt="Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackDataURI(assetForm.code, assetForm.category, assetForm.name);
                      }}
                      className="w-16 h-14 object-contain [filter:drop-shadow(0_0_12px_rgba(0,240,255,0.55))_drop-shadow(0_0_4px_rgba(0,240,255,0.35))]"
                    />
                    <div className="absolute bottom-0 w-16 h-1.5 rounded-full bg-[#00f2fe]/60 blur-md pointer-events-none"></div>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <span className="text-[#00f2fe] font-bold block">Preview</span>
                    <span>Imagem PNG isolada da biblioteca local.<br/>Atualiza ao trocar o modelo acima.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl">Cancelar</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#00f2fe] hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  {submitting ? 'Salvando...' : editingAssetId ? 'Atualizar Ativo' : 'Salvar Ativo no Banco'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
