import React, { useEffect, useState, useCallback } from 'react';
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
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Layers,
  UserCheck,
  Tag,
  Wifi,
  Network,
  Activity
} from 'lucide-react';
import { Location, Peripheral, PeripheralCategory, PeripheralSubcategory } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  getPeripherals,
  createPeripheral,
  updatePeripheral,
  deletePeripheral,
  getLocations
} from '../services/api';
import { getSocket, StatusUpdatedPayload } from '../services/socket';
import { getLocationFullName } from '../utils/location';

export const Peripherals: React.FC = () => {
  const { isAdmin } = useAuth();

  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Peripheral | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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
    ipAddress: '',
    specifications: '',
    status: 'OPERATIONAL' as 'OPERATIONAL' | 'MAINTENANCE' | 'CRITICAL' | 'INACTIVE',
    locationId: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [periphData, locsData] = await Promise.all([
        getPeripherals({
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          subcategory: selectedSubcategory !== 'ALL' ? selectedSubcategory : undefined,
          locationId: selectedLocation !== 'ALL' ? selectedLocation : undefined,
          search: searchQuery.trim() || undefined,
        }),
        getLocations(),
      ]);
      setPeripherals(periphData);
      setLocations(locsData || []);
    } catch (err: any) {
      console.error('Error loading peripherals:', err);
      setError('Não foi possível carregar a lista de ativos de informática e periféricos.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSubcategory, selectedLocation, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSockets integration for network poller updates
  useEffect(() => {
    const socket = getSocket();
    const handleStatusUpdated = (_payload: StatusUpdatedPayload) => {
      loadData();
    };

    socket.on('statusUpdated', handleStatusUpdated);
    return () => {
      socket.off('statusUpdated', handleStatusUpdated);
    };
  }, [loadData]);

  // Auto re-fetch peripherals when tab receives focus, storage updates, or onboarding succeeds
  useEffect(() => {
    const handleReFetch = () => {
      loadData();
    };

    window.addEventListener('focus', handleReFetch);
    window.addEventListener('storage', handleReFetch);
    window.addEventListener('infrafield:assetOnboarded', handleReFetch);

    return () => {
      window.removeEventListener('focus', handleReFetch);
      window.removeEventListener('storage', handleReFetch);
      window.removeEventListener('infrafield:assetOnboarded', handleReFetch);
    };
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: `PER-${Math.floor(1000 + Math.random() * 9000)}`,
      assetTag: '',
      ownershipType: 'PROPRIO',
      rentalCompany: '',
      serialNumber: '',
      category: 'COMPUTADOR',
      subcategory: 'DESKTOP',
      brand: '',
      model: '',
      ipAddress: '',
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
      ipAddress: item.ipAddress && item.ipAddress !== 'N/A' ? item.ipAddress : '',
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

    setIsSaving(true);
    try {
      const payload: any = { ...formData };
      if (payload.category !== 'COMPUTADOR') {
        payload.subcategory = undefined;
      }

      if (editingItem) {
        await updatePeripheral(editingItem.id, payload);
      } else {
        await createPeripheral(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar periférico');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o periférico "${name}"?`)) {
      try {
        await deletePeripheral(id);
        loadData();
      } catch (err) {
        alert('Erro ao excluir item.');
      }
    }
  };

  // Helper for Category Configuration
  const getCategoryConfig = (cat: PeripheralCategory, sub?: PeripheralSubcategory) => {
    switch (cat) {
      case 'COMPUTADOR':
        if (sub === 'NOTEBOOK') {
          return { label: 'Computador (Notebook)', icon: Laptop, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
        }
        return { label: 'Computador (Desktop)', icon: Cpu, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'IMPRESSORA':
        return { label: 'Impressora', icon: Printer, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'SCANNER':
        return { label: 'Scanner', icon: Scan, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'MONITOR':
        return { label: 'Monitor', icon: MonitorIcon, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      default:
        return { label: cat, icon: Layers, color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
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
            <AlertTriangle className="w-3 h-3" /> Em Manutenção
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
            <XCircle className="w-3 h-3 text-rose-500" /> Crítico / Offline
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

  // Subcategory summary counters
  const categoryCounts = {
    ALL: peripherals.length,
    COMPUTADOR: peripherals.filter((p) => p.category === 'COMPUTADOR').length,
    DESKTOP: peripherals.filter((p) => p.category === 'COMPUTADOR' && p.subcategory === 'DESKTOP').length,
    NOTEBOOK: peripherals.filter((p) => p.category === 'COMPUTADOR' && p.subcategory === 'NOTEBOOK').length,
    IMPRESSORA: peripherals.filter((p) => p.category === 'IMPRESSORA').length,
    SCANNER: peripherals.filter((p) => p.category === 'SCANNER').length,
    MONITOR: peripherals.filter((p) => p.category === 'MONITOR').length,
    WITH_IP: peripherals.filter((p) => p.ipAddress && p.ipAddress !== 'N/A').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Header */}
      <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.2)] shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">Gestão de Ativos de TI</h1>
                <span className="text-xs bg-[#00f2fe]/15 text-[#00f2fe] border border-[#00f2fe]/30 px-3 py-0.5 rounded-full font-mono font-bold">
                  {peripherals.length} Ativos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Catálogo de computadores, impressoras, scanners e monitores com monitoramento de conectividade IP em tempo real via ICMP Poller
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-[#050811] hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
              <span>Sincronizar</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-[#00f2fe] hover:bg-cyan-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Periférico</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Mini-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#050811] border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Computadores</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{categoryCounts.COMPUTADOR}</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {categoryCounts.DESKTOP} Desktops / {categoryCounts.NOTEBOOK} Notebooks
              </span>
            </div>
          </div>

          <div className="bg-[#050811] border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Impressoras & Scanners</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-400">
                {categoryCounts.IMPRESSORA + categoryCounts.SCANNER}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {categoryCounts.IMPRESSORA} Imp. / {categoryCounts.SCANNER} Scanners
              </span>
            </div>
          </div>

          <div className="bg-[#050811] border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monitores</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-400">{categoryCounts.MONITOR}</span>
              <span className="text-[11px] text-slate-400">Telas Profissionais</span>
            </div>
          </div>

          <div className="bg-[#050811] border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Network className="w-3.5 h-3.5 text-[#00f2fe]" /> Monitorados por IP
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-[#00f2fe]">{categoryCounts.WITH_IP}</span>
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse" /> Network Poller ICMP
              </span>
            </div>
          </div>
        </div>

        {/* Category Tabs & Subcategory Selectors */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'ALL', label: 'Todas as Categorias', count: categoryCounts.ALL, icon: Layers },
              { id: 'COMPUTADOR', label: 'Computadores', count: categoryCounts.COMPUTADOR, icon: Cpu },
              { id: 'IMPRESSORA', label: 'Impressoras', count: categoryCounts.IMPRESSORA, icon: Printer },
              { id: 'SCANNER', label: 'Scanners', count: categoryCounts.SCANNER, icon: Scan },
              { id: 'MONITOR', label: 'Monitores', count: categoryCounts.MONITOR, icon: MonitorIcon },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    if (tab.id !== 'COMPUTADOR') {
                      setSelectedSubcategory('ALL');
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#00f2fe] text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.3)]'
                      : 'bg-[#050811] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                      isActive ? 'bg-slate-950 text-white font-bold' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subcategory Pills when COMPUTADOR is selected */}
          {(selectedCategory === 'COMPUTADOR' || selectedCategory === 'ALL') && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 font-medium">Subcategoria Computador:</span>
              {[
                { id: 'ALL', label: 'Todos os Computadores' },
                { id: 'DESKTOP', label: '🖥️ Desktop / Tower' },
                { id: 'NOTEBOOK', label: '💻 Notebook / Laptop' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    selectedSubcategory === sub.id
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40'
                      : 'bg-[#050811] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Filter Bar: Search & Location Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050811] border border-slate-800/80 p-3 rounded-2xl">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, código, patrimônio, S/N ou IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5 text-[#00f2fe]" />
                <span>Localidade:</span>
              </div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-[#080d1a] border border-slate-800 focus:border-cyan-500 text-xs text-white rounded-xl px-3 py-2 outline-none transition-all cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">Todas as Localidades Mapeadas</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.building ? `(${loc.building})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-[#00f2fe]" />
          <span>Carregando inventário de periféricos e ativos de informática...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="px-3 py-1 bg-rose-500 text-white rounded-lg font-bold">
            Tentar novamente
          </button>
        </div>
      ) : peripherals.length === 0 ? (
        <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-12 text-center border-dashed border-slate-800 space-y-3">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum equipamento encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não há periféricos ou computadores cadastrados para os filtros selecionados.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-[#00f2fe] text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl mt-2 cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" /> Cadastrar Novo Equipamento
          </button>
        </div>
      ) : (
        <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#050811] text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Código / Patrimônio</th>
                  <th className="py-3.5 px-4">Equipamento & Especificações</th>
                  <th className="py-3.5 px-4">Categoria / Subcategoria</th>
                  <th className="py-3.5 px-4">Endereço IP (Network Poller)</th>
                  <th className="py-3.5 px-4">Local de Alocação</th>
                  <th className="py-3.5 px-4">Responsável</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#080d1a]">
                {peripherals.map((item) => {
                  const catCfg = getCategoryConfig(item.category, item.subcategory);
                  const IconComp = catCfg.icon;

                  return (
                    <tr key={item.id} className="hover:bg-[#0b1326] transition-colors group">
                      {/* Código / Patrimônio */}
                      <td className="py-4 px-4">
                        <div className="font-mono font-bold text-[#00f2fe] text-xs">{item.code}</div>
                        {item.assetTag && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Tag className="w-2.5 h-2.5 text-slate-500" /> {item.assetTag}
                          </div>
                        )}
                      </td>

                      {/* Item & Specs */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm group-hover:text-[#00f2fe] transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                          {item.brand && item.brand !== 'N/A' && <span>Marca: <strong className="text-slate-300">{item.brand}</strong></span>}
                          {item.model && item.model !== 'N/A' && <span>Modelo: <strong className="text-slate-300">{item.model}</strong></span>}
                          {item.serialNumber && item.serialNumber !== 'N/A' && (
                            <span>S/N: <code className="text-slate-300 font-mono">{item.serialNumber}</code></span>
                          )}
                        </div>
                        {item.specifications && item.specifications !== 'N/A' && (
                          <div className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                            {item.specifications}
                          </div>
                        )}
                      </td>

                      {/* Categoria & Subcategoria */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${catCfg.color}`}>
                          <IconComp className="w-3.5 h-3.5" />
                          {catCfg.label}
                        </span>
                      </td>

                      {/* Endereço IP & Network Poller */}
                      <td className="py-4 px-4">
                        {item.ipAddress && item.ipAddress !== 'N/A' ? (
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-200 bg-[#050811] border border-slate-800 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                              <Wifi className="w-3.5 h-3.5 text-[#00f2fe] animate-pulse" />
                              {item.ipAddress}
                            </span>
                            <span className="text-[10px] text-emerald-400 block font-semibold">
                              ● Monitorado via ICMP Ping
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Sem IP (Local)</span>
                        )}
                      </td>

                      {/* Local */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-1.5 text-slate-200 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#00f2fe] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block">{item.locationName}</span>
                            {item.locationDetails && (
                              <span className="text-[10px] text-slate-400 block">{item.locationDetails}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Responsável */}
                      <td className="py-4 px-4 text-slate-300">
                        {item.assignedTo && item.assignedTo !== 'Não atribuído' ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-200">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{item.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Não atribuído</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
                            title="Editar Equipamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                              title="Excluir Equipamento"
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

      {/* Modal for Creating / Editing Peripherals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#080d1a] border border-cyan-500/30 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#00f2fe]/10 text-[#00f2fe] rounded-2xl border border-[#00f2fe]/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingItem ? 'Editar Periférico / Informática' : 'Cadastrar Periférico / Informática'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina a categoria principal, subcategoria e endereço IP para monitoramento automático
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
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
                    type="text"
                    required
                    placeholder="Ex: Workstation Dell OptiPlex 7090 ou Impressora HP M528"
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
                      setFormData({
                        ...formData,
                        category: newCat,
                        subcategory: newCat === 'COMPUTADOR' ? 'DESKTOP' : '',
                      });
                    }}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none cursor-pointer"
                  >
                    <option value="COMPUTADOR">💻 COMPUTADOR</option>
                    <option value="IMPRESSORA">🖨️ IMPRESSORA</option>
                    <option value="SCANNER">🖨️ SCANNER</option>
                    <option value="MONITOR">🖥️ MONITOR</option>
                  </select>
                </div>

                {/* Subcategoria (Exibida SOMENTE se a Categoria for COMPUTADOR) */}
                {formData.category === 'COMPUTADOR' && (
                  <div className="space-y-1 bg-cyan-500/5 border border-cyan-500/20 p-2.5 rounded-xl animate-fadeIn">
                    <label className="text-[#00f2fe] font-bold block">Subcategoria Computador *</label>
                    <select
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as PeripheralSubcategory })}
                      className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-1.5 outline-none cursor-pointer font-bold"
                    >
                      <option value="DESKTOP">🖥️ DESKTOP (Desktop / Workstation / Tower)</option>
                      <option value="NOTEBOOK">💻 NOTEBOOK (Notebook / Laptop / Ultrabook)</option>
                    </select>
                  </div>
                )}

                {/* Código */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Código de Identificação *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PER-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white font-mono rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Patrimônio (Asset Tag) */}
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
                      setFormData({
                        ...formData,
                        ownershipType: val,
                        rentalCompany: val === 'PROPRIO' ? '' : formData.rentalCompany,
                      });
                    }}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none cursor-pointer font-bold"
                  >
                    <option value="PROPRIO">🏢 Próprio</option>
                    <option value="LOCADO">📑 Locado (Alugado)</option>
                  </select>
                </div>

                {/* Empresa Locadora (Exibido dinamicamente apenas quando LOCADO) */}
                {formData.ownershipType === 'LOCADO' && (
                  <div className="space-y-1 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl animate-fadeIn sm:col-span-2">
                    <label className="text-amber-300 font-bold block">Empresa Locadora *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Simpress, Positivo, Locaweb, etc."
                      value={formData.rentalCompany}
                      onChange={(e) => setFormData({ ...formData, rentalCompany: e.target.value })}
                      className="w-full bg-[#050811] border border-amber-500/40 focus:border-amber-400 text-white rounded-xl px-3 py-2 outline-none font-medium"
                    />
                  </div>
                )}

                {/* Número de Série */}
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

                {/* Endereço IP para Network Poller */}
                <div className="space-y-1 sm:col-span-2 bg-[#050811] border border-slate-800 p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-[#00f2fe]" />
                    <label className="text-slate-200 font-bold">Endereço IP (Monitoramento ICMP Poller)</label>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: 192.168.1.150 ou 10.0.0.45"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-800 focus:border-cyan-500 text-white font-mono rounded-xl px-3 py-2 outline-none mt-1"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    💡 Equipamentos com IP cadastrado serão testados continuamente via ICMP Ping. Se responderem, o status será atualizado automaticamente para <strong className="text-emerald-400">OPERACIONAL</strong>.
                  </p>
                </div>

                {/* Marca */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Marca / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Dell, HP, Lenovo, Epson"
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
                    placeholder="Ex: ThinkPad X1 / OptiPlex 7090"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-[#050811] border border-slate-800 focus:border-cyan-500 text-white rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                {/* Local de Alocação */}
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

                {/* Especificações / Observações */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-slate-300 font-bold">Especificações Técnicas / Observações</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: i7 12ª Gen, 32GB RAM, SSD 1TB, Monocromática 45ppm..."
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
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl border border-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#00f2fe] hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Equipamento'}</span>
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
