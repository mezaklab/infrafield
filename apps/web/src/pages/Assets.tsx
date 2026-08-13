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
  Edit3,
  Trash2,
  Monitor,
  ExternalLink
} from 'lucide-react';
import { Asset, LensImportDraft, Location } from '../types';
import { getAssets, createAsset, updateAsset, deleteAsset, getLocations, downloadInventoryPDFReport, exportAssetsCSV } from '../services/api';
import { getSocket, StatusUpdatedPayload } from '../services/socket';
import { getLocationFullName } from '../utils/location';
import { ExportDropdown } from '../components/Layout/ExportDropdown';
import { getGenericAssetKind } from '../utils/assetPresentation';

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

const genericSvg = (label: string, kind: 'wireless' | 'network' | 'security' | 'storage' | 'server' | 'device') => {
  const symbols = {
    wireless: '<circle cx="80" cy="60" r="22"/><path d="M45 45 Q80 10 115 45 M56 55 Q80 30 104 55 M70 66 Q80 56 90 66"/><circle cx="80" cy="74" r="3" fill="%2300f2fe"/>',
    network: '<rect x="28" y="43" width="104" height="38" rx="8"/><g fill="%2300f2fe"><circle cx="48" cy="62" r="3"/><circle cx="62" cy="62" r="3"/><circle cx="76" cy="62" r="3"/><circle cx="90" cy="62" r="3"/></g><path d="M104 57h16v10h-16z"/>',
    security: '<path d="M80 18 122 34v30c0 27-20 42-42 50C58 106 38 91 38 64V34z"/><path d="m64 65 11 11 23-25"/>',
    storage: '<ellipse cx="80" cy="32" rx="42" ry="14"/><path d="M38 32v52c0 8 19 14 42 14s42-6 42-14V32 M38 58c0 8 19 14 42 14s42-6 42-14"/>',
    server: '<rect x="38" y="18" width="84" height="92" rx="8"/><path d="M50 38h60M50 62h60M50 86h60"/><g fill="%2300f2fe"><circle cx="102" cy="30" r="3"/><circle cx="102" cy="54" r="3"/><circle cx="102" cy="78" r="3"/></g>',
    device: '<rect x="34" y="24" width="92" height="68" rx="10"/><path d="M58 106h44M68 92v14M92 92v14"/>',
  };
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 130" fill="none" stroke="%2300f2fe" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${symbols[kind]}<text x="80" y="126" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="%2394a3b8" stroke="none">${label}</text></svg>`;
};

export const getGenericCategoryImage = (category: string): string => {
  const kind = getGenericAssetKind(category);
  const labels = { wireless: 'ACCESS POINT', network: 'REDE', security: 'FIREWALL', storage: 'STORAGE', server: 'SERVIDOR', device: 'ATIVO' };
  return genericSvg(labels[kind], kind);
};

interface AssetsProps { lensImport?: LensImportDraft | null; onLensImportConsumed?: () => void; }

export const Assets: React.FC<AssetsProps> = ({ lensImport, onLensImportConsumed }) => {
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
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for asset creation & editing (com campo imageUrl, ownershipType e rentalCompany)
  const [assetForm, setAssetForm] = useState({
    name: '',
    code: '',
    assetTag: '',
    ownershipType: 'PROPRIO',
    rentalCompany: '',
    serialNumber: '',
    hostname: '',
    ipAddress: '',
    macAddress: '',
    monitoringEnabled: true,
    category: 'Redes & Switches',
    locationId: '',
    status: 'OPERATIONAL',
    imageUrl: '',
    wifiBands: '',
  });

  useEffect(() => {
    if (!lensImport) return;
    const type = lensImport.type.toUpperCase();
    const category = type === 'ACCESS_POINT' ? 'Redes Sem Fio' : type === 'SERVIDOR' || type === 'STORAGE' ? 'Servidores & Storage' : type === 'FIREWALL' ? 'Segurança' : 'Redes & Switches';
    setEditingAssetId(null);
    setAssetForm((current) => ({
      ...current,
      name: [lensImport.manufacturer, lensImport.model].filter(Boolean).join(' ') || 'Ativo identificado',
      code: `LENS-${Date.now().toString().slice(-6)}`,
      assetTag: lensImport.assetTag,
      serialNumber: lensImport.serviceTag || lensImport.serialNumber,
      macAddress: lensImport.macAddress,
      category,
      monitoringEnabled: Boolean(lensImport.macAddress),
      locationId: '',
    }));
    setIsModalOpen(true);
    onLensImportConsumed?.();
  }, [lensImport, onLensImportConsumed]);

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

      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          if (asset.id === payload.id || asset.code === payload.code) {
            return {
              ...asset,
              status: payload.status as Asset['status'],
              monitoringStatus: payload.monitoringStatus || asset.monitoringStatus,
              currentIp: payload.ipAddress || asset.currentIp,
              latencyMs: payload.latencyMs ?? asset.latencyMs,
              consecutiveFailures: payload.monitoringStatus === 'ONLINE' ? 0 : asset.consecutiveFailures,
              lastCheckedAt: payload.timestamp || new Date().toISOString(),
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
            monitoringStatus: payload.monitoringStatus || prevSelected.monitoringStatus,
            currentIp: payload.ipAddress || prevSelected.currentIp,
            latencyMs: payload.latencyMs ?? prevSelected.latencyMs,
            lastCheckedAt: payload.timestamp || new Date().toISOString(),
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
    setFormError(null);
    setAssetForm({
      name: '',
      code: '',
      assetTag: '',
      ownershipType: 'PROPRIO',
      rentalCompany: '',
      serialNumber: '',
      hostname: '',
      ipAddress: '',
      macAddress: '',
      monitoringEnabled: true,
      category: 'Redes & Switches',
      locationId: '',
      status: 'OPERATIONAL',
      imageUrl: '',
      wifiBands: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setFormError(null);
    setAssetForm({
      name: asset.name,
      code: asset.code,
      assetTag: asset.assetTag || '',
      ownershipType: asset.ownershipType || 'PROPRIO',
      rentalCompany: asset.rentalCompany || asset.rental_company || '',
      serialNumber: asset.serialNumber || '',
      hostname: asset.hostname || '',
      ipAddress: asset.ipAddress || '',
      macAddress: asset.macAddress || '',
      monitoringEnabled: asset.monitoringEnabled,
      category: asset.category,
      locationId: asset.locationId || '',
      status: asset.status,
      imageUrl: asset.imageUrl || '',
      wifiBands: asset.wifiBands || '',
    });
    setSelectedAsset(null);
    setIsModalOpen(true);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (window.confirm(`Deseja realmente excluir o ativo de rede "${name}"?`)) {
      try {
        await deleteAsset(id);
        if (selectedAsset?.id === id) {
          setSelectedAsset(null);
        }
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Erro ao excluir ativo');
      }
    }
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (assetForm.locationId && !locations.some((location) => location.id === assetForm.locationId)) {
      setAssetForm((current) => ({ ...current, locationId: '' }));
      setFormError('A localização selecionada não existe mais. Selecione outra localização.');
      return;
    }
    setSubmitting(true);
    try {
      // currentIp belongs to network discovery; the regular form never writes it.
      const { ipAddress: _dynamicIp, ...editableFields } = assetForm;
      const payload = { ...editableFields, locationId: assetForm.locationId || null };
      if (editingAssetId) {
        await updateAsset(editingAssetId, payload);
      } else {
        await createAsset(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      const message = err.response?.data?.error || 'Não foi possível salvar o ativo. Verifique os dados e tente novamente.';
      setFormError(message);
      if (err.response?.data?.code === 'INVALID_LOCATION') {
        setAssetForm((current) => ({ ...current, locationId: '' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Matcher Inteligente e Fallback Dinâmico DEFINITIVO para PNGs Reais de Equipamentos.
   */
  const getExactIsolatedEquipmentImage = (code: string, category: string, name: string, customUrl?: string) => {
    // Foto real enviada/informada pelo usuário sempre tem prioridade.
    if (customUrl && customUrl.trim().length > 0) {
      return customUrl;
    }

    // Sem foto real, a categoria confirmada é a única fonte para o placeholder.
    // Nome, código, MAC, fabricante/OUI e descoberta de rede não classificam o ativo.
    return getGenericCategoryImage(category);

    /* Compatibilidade morta mantida temporariamente apenas para não migrar URLs históricas.
       Nenhum destes presets é selecionado para novos cards. */

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
    void name;
    return getGenericCategoryImage(category);
    /* Fallback legado inacessível: será removido quando URLs históricas forem migradas. */
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

  const getCategoryMetrics = (asset: Asset) => {
    if (asset.monitoringEnabled) {
      return [
        { label: 'Latência', value: asset.latencyMs !== undefined ? `${asset.latencyMs} ms` : 'N/A' },
        { label: 'Falhas', value: String(asset.consecutiveFailures) },
        { label: 'Monitoramento', value: asset.monitoringStatus },
      ];
    }
    const cat = (asset.category || '').toLowerCase();
    const name = (asset.name || '').toLowerCase();

    // Access Point / Wireless Asset
    if (cat.includes('sem fio') || cat.includes('wifi') || cat.includes('access') || name.includes('ap-') || name.includes('aruba ap') || asset.wifiBands) {
      const bands = asset.wifiBands || '2.4GHz / 5GHz';
      return [
        { label: 'Banda/Freq.', value: bands },
        { label: 'Clientes Wi-Fi', value: '28 Ativos' },
        { label: 'Sinal Rádio', value: '-42 dBm (4x4)' },
      ];
    }
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
        { label: 'Backbone', value: '10 Gbps' },
      ];
    }
    if (cat.includes('segurança') || cat.includes('firewall')) {
      return [
        { label: 'Sessões', value: '1.2k' },
        { label: 'Latência', value: '2ms' },
        { label: 'Regras IPS', value: 'OK' },
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
      { label: 'Conectividade', value: asset.ipAddress ? 'IP OK' : 'Local' },
      { label: 'Status', value: asset.status === 'OPERATIONAL' ? 'Online' : 'Atenção' },
      { label: 'Uptime', value: '99.9%' },
    ];
  };

  const getMonitoringBadge = (asset: Asset) => {
    if (!asset.monitoringEnabled) return getStatusBadge(asset.status);
    const styles = {
      ONLINE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      DEGRADED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      UNKNOWN: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      OFFLINE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
    return <span className={`ui-badge text-[11px] font-bold px-2.5 py-1 rounded-full border ${styles[asset.monitoringStatus]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{asset.monitoringStatus}</span>;
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00f2fe]" />
            Catálogo &amp; Monitoramento de Redes
          </h2>
          <p className="text-xs text-slate-400">Telemetria em tempo real, serial, hostname e portas ativas</p>
        </div>

        <div className="grid grid-cols-[44px_1fr_1fr] sm:flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 bg-[#080d1a] hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
            title="Recarregar Ativos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Reusable Export Dropdown */}
          <ExportDropdown
            options={[
              {
                id: 'csv-assets',
                label: 'Exportar Inventário de Redes (CSV)',
                sublabel: 'Download em planilha CSV',
                type: 'csv',
                onExport: exportAssetsCSV,
              },
              {
                id: 'pdf-assets',
                label: 'Relatório de Inventário (PDF)',
                sublabel: 'Documento oficial formatado',
                type: 'pdf',
                onExport: downloadInventoryPDFReport,
              },
            ]}
          />

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-[#00f2fe] to-[#0284c7] hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Novo Ativo
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
        <div className="noc-panel p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between bg-[#080d1a] border border-cyan-500/15">
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

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 snap-x">
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
              className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all snap-start ${
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
            const metrics = getCategoryMetrics(asset);
            const fallbackDataURI = getFallbackDataURI(asset.code, asset.category, asset.name);
            const equipmentImg = getExactIsolatedEquipmentImage(asset.code, asset.category, asset.name, asset.imageUrl);

            return (
              <div
                key={asset.id}
                className="surface-base bg-[#080d1a] border border-cyan-500/15 hover:border-cyan-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden backdrop-blur-md"
              >
                <div>
                  {/* 1. TOPO: Badge Código Ativo à esquerda + Status à direita */}
                  <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-800/80 pb-2.5">
                    <span className="text-[11px] font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2.5 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,242,254,0.15)]">
                      {asset.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(asset)}
                        className="p-1 text-slate-400 hover:text-[#00f2fe] rounded-lg hover:bg-slate-800 transition-colors"
                        title="Editar Ativo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id, asset.name)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Excluir Ativo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {getMonitoringBadge(asset)}
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
                        className="asset-visual w-full h-full object-contain bg-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                      />
                      <div className="asset-visual-glow absolute bottom-0 w-full h-2 rounded-full bg-[#00f2fe]/40 blur-md pointer-events-none"></div>
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
                          <span className="text-slate-500">IP atual:</span>
                          <span className="action-text font-mono font-bold truncate">
                            {asset.currentIp || asset.hostname || 'Aguardando descoberta'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">MAC:</span>
                          <strong className="text-slate-200 font-mono">{asset.macAddress || 'Não cadastrado'}</strong>
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
                  <div className="mt-3 grid grid-cols-1 min-[360px]:grid-cols-3 gap-1.5 p-2 bg-[#050811] rounded-xl border border-slate-800/80 text-center text-[11px]">
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
                    className="action-text text-[11px] font-semibold bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 border border-[#00f2fe]/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
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
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel bg-[#080d1a] border-cyan-500/20 max-w-lg relative">
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
                <span className="text-slate-400">IP atual:</span>
                <span className="text-[#00f2fe] font-mono font-bold">{selectedAsset.currentIp || 'Aguardando descoberta'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">MAC Address:</span>
                <span className="text-slate-200 font-mono font-bold">{selectedAsset.macAddress || 'Não cadastrado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Última verificação:</span>
                <span className="text-slate-200">{selectedAsset.lastCheckedAt ? new Date(selectedAsset.lastCheckedAt).toLocaleString('pt-BR') : 'Ainda não verificado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Última vez visto / Latência:</span>
                <span className="text-slate-200">{selectedAsset.lastSeenAt ? new Date(selectedAsset.lastSeenAt).toLocaleString('pt-BR') : 'N/A'} · {selectedAsset.latencyMs ?? 'N/A'} ms</span>
              </div>
              {(selectedAsset.wifiBands || selectedAsset.category === 'Redes Sem Fio') && (
                <div className="flex justify-between py-1 border-b border-slate-800 bg-amber-500/5 px-2 rounded-lg">
                  <span className="text-amber-400 font-semibold">Frequência / Banda Wi-Fi:</span>
                  <span className="text-amber-300 font-mono font-bold">{selectedAsset.wifiBands || '2.4GHz / 5GHz (Dual-Band)'}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Localização / Sala:</span>
                <span className="text-slate-200 font-semibold">{selectedAsset.locationName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Responsável:</span>
                <span className="text-slate-200 font-semibold">{selectedAsset.assignedTo}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const target = selectedAsset;
                  handleDeleteAsset(target.id, target.name);
                }}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(selectedAsset)}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
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
        </div>
      )}

      {/* Asset Creation & Editing Modal */}
      {isModalOpen && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel bg-[#080d1a] border-cyan-500/20 max-w-md relative">
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
              {formError && (
                <div role="alert" aria-live="assertive" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                  <AlertCircle className="inline w-4 h-4 mr-2" />
                  {formError}
                </div>
              )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Código ID *</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Patrimônio *</label>
                  <select
                    value={assetForm.ownershipType || 'PROPRIO'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssetForm({
                        ...assetForm,
                        ownershipType: val,
                        rentalCompany: val === 'PROPRIO' ? '' : assetForm.rentalCompany,
                      });
                    }}
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 cursor-pointer font-bold"
                  >
                    <option value="PROPRIO">🏢 Próprio</option>
                    <option value="LOCADO">📑 Locado (Alugado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Série (S/N)</label>
                  <input
                    type="text"
                    value={assetForm.serialNumber}
                    onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                    placeholder="Ex: SN-9988-X"
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Empresa Locadora (Exibido dinamicamente apenas quando LOCADO) */}
              {assetForm.ownershipType === 'LOCADO' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl animate-fadeIn">
                  <label className="block text-xs font-bold text-amber-300 mb-1">Empresa Locadora *</label>
                  <input
                    type="text"
                    required
                    value={assetForm.rentalCompany}
                    onChange={(e) => setAssetForm({ ...assetForm, rentalCompany: e.target.value })}
                    placeholder="Ex: Simpress, Positivo, Locaweb, etc."
                    className="w-full bg-[#050811] border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {assetForm.category === 'Redes Sem Fio' && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl space-y-1">
                  <label className="block text-xs font-bold text-amber-400">
                    Frequência e Banda Wi-Fi
                  </label>
                  <input
                    type="text"
                    value={assetForm.wifiBands}
                    onChange={(e) => setAssetForm({ ...assetForm, wifiBands: e.target.value })}
                    placeholder="Ex: 2.4GHz / 5GHz (Dual-Band Wi-Fi 6)"
                    className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-amber-400/80">Informação transmitida pela telemetria do Access Point</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">IP atual</label>
                  <div className="min-h-9 flex items-center rounded-xl border border-slate-800 bg-[#050811]/60 px-3 py-2 text-xs text-slate-400">
                    {editingAssetId && assetForm.ipAddress ? assetForm.ipAddress : 'Será descoberto automaticamente'}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Detectado pelo InfraField a partir do MAC Address.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                <div>
                  <label className="block text-xs font-bold text-cyan-300 mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={assetForm.macAddress}
                    onChange={(e) => setAssetForm({ ...assetForm, macAddress: e.target.value })}
                    placeholder="00:11:22:AA:BB:CC"
                    className="w-full bg-[#050811] border border-cyan-500/30 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 pt-5 cursor-pointer">
                  <input type="checkbox" checked={assetForm.monitoringEnabled} onChange={(e) => setAssetForm({ ...assetForm, monitoringEnabled: e.target.checked })} />
                  Monitoramento automático
                </label>
              </div>
              <p className="text-[11px] leading-relaxed text-cyan-200/80">
                O InfraField localizará o equipamento pelo MAC Address, descobrirá seu IP atual e verificará sua disponibilidade automaticamente.
              </p>

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
                  onChange={(e) => { setAssetForm({ ...assetForm, locationId: e.target.value }); setFormError(null); }}
                  className="w-full bg-[#050811] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Selecione um local...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {getLocationFullName(loc, locations)} {loc.room ? `(${loc.room})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">Opcional. Deixe em branco se o ativo ainda não tiver localização definida.</p>
              </div>

              {/* FOTO DO EQUIPAMENTO — Biblioteca Local de Assets (Enterprise) */}
              <div className="bg-[#050811] p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">
                  Foto do Equipamento
                </label>

                <input
                  type="url"
                  value={assetForm.imageUrl}
                  onChange={(e) => setAssetForm({ ...assetForm, imageUrl: e.target.value })}
                  placeholder="URL da foto real (opcional)"
                  className="w-full bg-[#080d1a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#00f2fe]"
                />
                <p className="text-[11px] text-slate-500">Sem foto real, o InfraField usa uma ilustração neutra da categoria selecionada.</p>

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
                    <span>{assetForm.imageUrl ? 'Foto real informada pelo usuário.' : 'Ilustração genérica baseada na categoria confirmada.'}</span>
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
