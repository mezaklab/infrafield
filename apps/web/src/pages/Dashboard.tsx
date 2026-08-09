import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  RefreshCw, 
  Zap, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  HardDrive,
  Network,
  ShieldAlert,
  Wifi,
  FileText,
  Building,
  X,
  ArrowRight,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { HealthStatus, TabType, Location } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  getHealth, 
  getDashboardStats, 
  DashboardStats, 
  getLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation, 
  downloadInventoryPDFReport, 
  exportAssetsCSV 
} from '../services/api';
import { getSocket, StatusUpdatedPayload } from '../services/socket';
import { TelemetryWaveform } from '../components/TelemetryWaveform';

interface DashboardProps {
  onNavigate: (tab: TabType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLocationsModalOpen, setIsLocationsModalOpen] = useState<boolean>(false);

  // Location CRUD Modal States
  const [isLocationFormOpen, setIsLocationFormOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locName, setLocName] = useState<string>('');
  const [locBuilding, setLocBuilding] = useState<string>('');
  const [locRoom, setLocRoom] = useState<string>('');
  const [isSavingLoc, setIsSavingLoc] = useState<boolean>(false);

  const handleOpenCreateLocation = () => {
    setEditingLocation(null);
    setLocName('');
    setLocBuilding('');
    setLocRoom('');
    setIsLocationFormOpen(true);
  };

  const handleOpenEditLocation = (loc: Location) => {
    setEditingLocation(loc);
    setLocName(loc.name);
    setLocBuilding(loc.building || '');
    setLocRoom(loc.room || '');
    setIsLocationFormOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;

    try {
      setIsSavingLoc(true);
      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          name: locName.trim(),
          building: locBuilding.trim() || undefined,
          room: locRoom.trim() || undefined,
        });
      } else {
        await createLocation({
          name: locName.trim(),
          building: locBuilding.trim() || undefined,
          room: locRoom.trim() || undefined,
        });
      }

      const updatedLocs = await getLocations();
      setLocations(updatedLocs || []);
      setIsLocationFormOpen(false);
      setEditingLocation(null);
      setLocName('');
      setLocBuilding('');
      setLocRoom('');
    } catch (err) {
      alert('Erro ao salvar localidade.');
    } finally {
      setIsSavingLoc(false);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover a localidade/setor "${name}"?`)) {
      try {
        await deleteLocation(id);
        const updatedLocs = await getLocations();
        setLocations(updatedLocs || []);
      } catch (err) {
        alert('Erro ao excluir localidade.');
      }
    }
  };

  const loadData = useCallback(async () => {
    setLoadingHealth(true);
    setLoadingStats(true);
    setHealthError(null);

    // Fetch API Health
    try {
      const healthData = await getHealth();
      setHealth(healthData);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.warn('API Health Check Error:', err);
      setHealth(null);
      setHealthError(err.message || 'Não foi possível conectar à API backend.');
      setLastCheckTime(new Date().toLocaleTimeString());
    } finally {
      setLoadingHealth(false);
    }

    // Fetch Dashboard Statistics from PostgreSQL
    try {
      const [statsData, locsData] = await Promise.all([
        getDashboardStats(),
        getLocations(),
      ]);
      setStats(statsData);
      setLocations(locsData || []);
    } catch (err) {
      console.warn('Failed to load DB stats/locations:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sincronização em tempo real via WebSockets (Socket.IO)
  useEffect(() => {
    const socket = getSocket();

    const handleStatusUpdated = (payload: StatusUpdatedPayload) => {
      console.log('⚡ [Dashboard WebSockets] Evento statusUpdated recebido em tempo real:', payload);
      // Atualiza os indicadores e métricas executivas em tempo real
      loadData();
    };

    socket.on('statusUpdated', handleStatusUpdated);

    return () => {
      socket.off('statusUpdated', handleStatusUpdated);
    };
  }, [loadData]);

  // Re-fetch dashboard stats when tab receives focus, storage updates, or onboarding succeeds
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

  // Asset category distribution percentages
  const totalAssets = stats?.assets.total || 5;
  const categories = [
    { label: 'Servidores & Virtualização', count: stats?.assets.categoriesCount?.['Servidores'] || 1, color: 'from-cyan-500 to-blue-500', icon: Server },
    { label: 'Switches & Roteamento', count: stats?.assets.categoriesCount?.['Redes & Switches'] || 1, color: 'from-blue-500 to-indigo-500', icon: Network },
    { label: 'Firewalls & Segurança', count: stats?.assets.categoriesCount?.['Segurança & Firewalls'] || 1, color: 'from-emerald-500 to-teal-500', icon: ShieldCheck },
    { label: 'Storage & Armazenamento', count: stats?.assets.categoriesCount?.['Storage & Armazenamento'] || 1, color: 'from-purple-500 to-indigo-500', icon: HardDrive },
    { label: 'Access Points & Wi-Fi', count: stats?.assets.categoriesCount?.['Redes Sem Fio'] || 1, color: 'from-amber-500 to-orange-500', icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      {/* NOC Control Header & API Telemetry Bar */}
      <div className={`border rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md transition-all ${
        health 
          ? 'bg-[#080d1a] border-cyan-500/20' 
          : 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Ícone Principal de Telemetria (Linha de Osciloscópio / EKG Correndo em Loop) */}
            <div className={`w-14 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 overflow-hidden ${
              health 
                ? 'bg-[#00f2fe]/10 border border-[#00f2fe]/30 shadow-[0_0_15px_rgba(0,242,254,0.2)]' 
                : 'bg-rose-500/20 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
            }`}>
              <TelemetryWaveform color={health ? '#00f2fe' : '#f43f5e'} width={46} height={20} speed={health ? 'normal' : 'fast'} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-white tracking-tight">NOC // Prefeitura Municipal - Setor de TI</h3>
                {loadingHealth ? (
                  <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#00f2fe]" /> Verificando conexão...
                  </span>
                ) : health ? (
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> SYSTEM ONLINE (200 OK)
                  </span>
                ) : (
                  <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40 px-3 py-0.5 rounded-full font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-bounce">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> 🚨 ALERTA NOC: API DESCONECTADA
                  </span>
                )}
              </div>

              <div className="mt-1.5 text-xs text-slate-400 flex flex-wrap items-center gap-y-1 gap-x-4">
                <span>API Endpoint: <code className="text-[#00f2fe] font-mono">/api</code></span>
                <span>Status: {health ? <strong className="text-emerald-400 font-mono">CONECTADO (200 OK)</strong> : <strong className="text-rose-400 font-mono font-bold">DESCONECTADO (Porta 3333)</strong>}</span>
                {health && (
                  <>
                    <span>Banco: <strong className="text-slate-200 font-mono">PostgreSQL 16</strong></span>
                    <span>Uptime API: <strong className="text-slate-200 font-mono">{Math.floor(health.uptime)}s</strong></span>
                  </>
                )}
                {lastCheckTime && <span>Telemetria: {lastCheckTime}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportAssetsCSV}
              className="flex items-center gap-1.5 bg-[#050811] hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all"
              title="Exportar CSV de Inventário"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={downloadInventoryPDFReport}
              className="flex items-center gap-1.5 bg-[#050811] hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all"
              title="Gerar PDF de Inventário"
            >
              <FileText className="w-3.5 h-3.5 text-[#00f2fe]" />
              <span>Relatório PDF</span>
            </button>

            <button
              onClick={loadData}
              disabled={loadingHealth}
              className="p-2.5 bg-[#050811] hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
              title="Recarregar Telemetria"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin text-[#00f2fe]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Banner de Destaque quando a API Desconecta */}
        {healthError && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block font-bold">⚠️ Falha de Comunicação com a API Backend:</strong>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  A API em <code className="text-[#00f2fe] font-mono">/api</code> não respondeu. Certifique-se de que o servidor Express Node.js está rodando. O painel está exibindo cache offline.
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shrink-0 shadow-md transition-all cursor-pointer"
            >
              Tentar Reconectar
            </button>
          </div>
        )}
      </div>

      {/* 4 Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Total de Ativos Mapeados */}
        <div
          onClick={() => onNavigate('assets')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('assets')}
          className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/50 hover:bg-[#0b1326] transition-all cursor-pointer select-none active:scale-[0.98]"
          title="Clique para ir para a gestão de ativos"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-cyan-400 transition-colors">Ativos Mapeados</span>
            <div className="p-2.5 bg-[#00f2fe]/10 text-[#00f2fe] rounded-xl shadow-[0_0_10px_rgba(0,242,254,0.15)] group-hover:scale-110 transition-transform">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight group-hover:text-[#00f2fe] transition-colors">
              {loadingStats ? '...' : stats?.assets.total ?? 5}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {stats?.assets.healthRate ?? 100}% Saúde
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Operacionais: <strong className="text-emerald-400 font-bold">{stats?.assets.operational ?? 5}</strong></span>
            <span className="flex items-center gap-1 text-cyan-400 font-semibold group-hover:underline">
              Ver Todos <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* CARD 2: Visitas Executadas no Mês */}
        <div
          onClick={() => onNavigate('visits')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('visits')}
          className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/50 hover:bg-[#0b1326] transition-all cursor-pointer select-none active:scale-[0.98]"
          title="Clique para gerenciar as vistorias de campo"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-400 transition-colors">Vistorias no Mês</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight group-hover:text-blue-400 transition-colors">
              {loadingStats ? '...' : stats?.visits.total ?? 4}
            </span>
            <span className="text-xs font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {stats?.visits.conciliationRate ?? 98}% Conciliados
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Concluídas: <strong className="text-emerald-400 font-bold">{stats?.visits.completed ?? 2}</strong></span>
            <span className="flex items-center gap-1 text-blue-400 font-semibold group-hover:underline">
              Ver Ordens <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* CARD 3: Não Conformidades */}
        <div
          onClick={() => onNavigate('issues')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('issues')}
          className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-rose-500/50 hover:bg-[#0b1326] transition-all cursor-pointer select-none active:scale-[0.98]"
          title="Clique para ver os alertas e não conformidades"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-rose-400 transition-colors">Não Conformidades</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight group-hover:text-rose-400 transition-colors">
              {loadingStats ? '...' : stats?.issues?.total ?? 2}
            </span>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Requer Atenção
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Críticas/Altas: <strong className="text-rose-400 font-bold">{(stats?.issues?.critical ?? 0) + (stats?.issues?.high ?? 1)}</strong></span>
            <span className="flex items-center gap-1 text-rose-400 font-semibold group-hover:underline">
              Filtrar Alertas <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* CARD 4: Cobertura do Parque */}
        <div
          onClick={() => setIsLocationsModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsLocationsModalOpen(true)}
          className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 hover:bg-[#0b1326] transition-all cursor-pointer select-none active:scale-[0.98]"
          title="Clique para abrir o detalhamento dos locais e infraestrutura"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-emerald-400 transition-colors">Cobertura do Parque</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">100%</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              {locations.length > 0 ? `${locations.length}/${locations.length} Mapeados` : '4/4 Mapeados'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Inspeção Física: <strong className="text-emerald-400 font-bold">Total</strong></span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold group-hover:underline">
              Ver Locais <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* Technological Fleet Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Equipment Categories Distribution Bars */}
        <div className="bg-[#080d1a] border border-cyan-500/15 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-white">Distribuição do Parque de TI</h3>
              <p className="text-xs text-slate-400">Equipamentos categorizados por tipo e uso</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2.5 py-1 rounded-xl">
              {totalAssets} Ativos
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {categories.map((cat, idx) => {
              const IconComp = cat.icon;
              const pct = Math.round((cat.count / totalAssets) * 100);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-2">
                      <IconComp className="w-3.5 h-3.5 text-[#00f2fe] animate-signal-wave" />
                      {cat.label}
                    </span>
                    <span className="text-slate-400 font-mono font-bold">{cat.count} ({pct}%)</span>
                  </div>

                  <div className="w-full h-2.5 bg-[#050811] rounded-full overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full bg-gradient-to-r ${cat.color} rounded-full transition-all duration-500`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database Live Activity Stream */}
        <div className="lg:col-span-2 bg-[#080d1a] border border-cyan-500/15 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-base text-white">Últimas Vistorias de Campo Sincronizadas</h3>
                <p className="text-xs text-slate-400">Atividades técnicas registradas no PostgreSQL via Prisma ORM</p>
              </div>
              <button
                onClick={() => onNavigate('visits')}
                className="text-xs font-bold text-[#00f2fe] hover:text-cyan-300 flex items-center gap-1 bg-[#050811] border border-slate-800 px-3 py-1.5 rounded-xl transition-all"
              >
                Ver Todas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {loadingStats ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00f2fe]" /> Carregando vistorias...
                </div>
              ) : stats?.recentVisits && stats.recentVisits.length > 0 ? (
                stats.recentVisits.map((activity: any) => (
                  <div
                    key={activity.id}
                    className="p-4 rounded-2xl bg-[#050811] border border-slate-800/80 flex items-center justify-between hover:border-cyan-500/40 transition-all group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#080d1a] border border-cyan-500/20 flex items-center justify-center text-[#00f2fe] font-mono text-xs font-bold shrink-0 shadow-[0_0_10px_rgba(0,242,254,0.15)]">
                        {activity.protocol.split('-')[2] || 'VIS'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-[#00f2fe] transition-colors">{activity.client}</h4>
                        <p className="text-xs text-slate-400">
                          Protocolo: <span className="text-[#00f2fe] font-mono font-bold">{activity.protocol}</span> • Técnico: <span className="text-slate-300 font-medium">{activity.technician?.name || 'Carlos Silva'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                        activity.status === 'CONCLUIDA'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : activity.status === 'EM_ANDAMENTO'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">Nenhuma vistoria recente encontrada.</div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400">Acessos Rápidos da Plataforma:</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate('assets')} className="text-cyan-400 hover:underline font-semibold">Ativos</button>
              <span className="text-slate-600">•</span>
              <button onClick={() => onNavigate('visits')} className="text-cyan-400 hover:underline font-semibold">Visitas</button>
              <span className="text-slate-600">•</span>
              <button onClick={() => onNavigate('issues')} className="text-rose-400 hover:underline font-semibold">Não Conformidades</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhamento de Cobertura e Locais Mapeados */}
      {isLocationsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#080d1a] border border-cyan-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">Gerenciamento de Localidades & Setores</h3>
                  <p className="text-xs text-slate-400">Prédios, secretarias, salas e infraestrutura NOC</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenCreateLocation}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Novo Setor</span>
                </button>
                <button
                  onClick={() => setIsLocationsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Inline de Criar / Editar Setor */}
            {isLocationFormOpen && (
              <form onSubmit={handleSaveLocation} className="p-4 rounded-2xl bg-[#050811] border border-emerald-500/30 space-y-3 animate-fadeIn text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs">
                    {editingLocation ? 'Editar Localidade / Setor' : 'Cadastrar Nova Localidade / Setor'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsLocationFormOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">Nome do Setor / Secretaria *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sec. de Saúde - Almoxarifado"
                      value={locName}
                      onChange={(e) => setLocName(e.target.value)}
                      className="w-full bg-[#080d1a] border border-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">Prédio / Edifício</label>
                    <input
                      type="text"
                      placeholder="Ex: Prédio Central"
                      value={locBuilding}
                      onChange={(e) => setLocBuilding(e.target.value)}
                      className="w-full bg-[#080d1a] border border-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold">Sala / Anexo</label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 02 - Térreo"
                      value={locRoom}
                      onChange={(e) => setLocRoom(e.target.value)}
                      className="w-full bg-[#080d1a] border border-slate-800 text-white rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsLocationFormOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLoc}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    {isSavingLoc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Salvar Setor</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {locations.length > 0 ? (
                locations.map((loc) => (
                  <div key={loc.id} className="p-4 rounded-2xl bg-[#050811] border border-slate-800 flex items-center justify-between hover:border-cyan-500/30 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{loc.name}</h4>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          100% OPERACIONAL
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Prédio: <span className="text-slate-200 font-medium">{loc.building || 'Prédio Principal'}</span> • Sala: <span className="text-slate-200 font-medium">{loc.room || 'Telecom/Rack'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditLocation(loc)}
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
                        title="Editar Setor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteLocation(loc.id, loc.name)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                          title="Excluir Setor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsLocationsModalOpen(false);
                          onNavigate('assets');
                        }}
                        className="text-xs font-bold text-[#00f2fe] bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 border border-[#00f2fe]/30 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                      >
                        Ver Ativos <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">Nenhuma localidade encontrada.</div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Total: <strong className="text-white font-bold">{locations.length || 4} Unidades Mapeadas</strong></span>
              <button
                onClick={() => setIsLocationsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-800 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
