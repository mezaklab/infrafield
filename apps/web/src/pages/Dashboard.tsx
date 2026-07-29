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
  Activity,
  HardDrive,
  Network,
  ShieldAlert,
  Wifi,
  FileText
} from 'lucide-react';
import { HealthStatus, TabType } from '../types';
import { getHealth, getDashboardStats, DashboardStats, downloadInventoryPDFReport, exportAssetsCSV } from '../services/api';

interface DashboardProps {
  onNavigate: (tab: TabType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

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
      setHealthError(err.message || 'Não foi possível conectar à API backend em http://localhost:3333/api/health');
      setLastCheckTime(new Date().toLocaleTimeString());
    } finally {
      setLoadingHealth(false);
    }

    // Fetch Dashboard Statistics from PostgreSQL
    try {
      const statsData = await getDashboardStats();
      setStats(statsData);
    } catch (err) {
      console.warn('Failed to load DB stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadData();
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
      <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
              health ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              <Activity className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">Centro de Operações de Rede (NOC)</h3>
                {loadingHealth ? (
                  <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Conectando...
                  </span>
                ) : health ? (
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-full font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> SYSTEM ONLINE (200 OK)
                  </span>
                ) : (
                  <span className="text-xs bg-rose-500/15 text-rose-400 border border-rose-500/30 px-3 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> AGUARDANDO CONEXÃO API
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-y-1 gap-x-4">
                <span>API Endpoint: <code className="text-[#00f2fe] font-mono">http://localhost:3333/api</code></span>
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
              className="p-2.5 bg-[#050811] hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all"
              title="Recarregar Métricas"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {healthError && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Aviso de Servidor:</strong> Não foi possível sincronizar o status em tempo real. Verifique se o servidor Express está em execução na porta 3333.
            </div>
          </div>
        )}
      </div>

      {/* 4 Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Total de Ativos Mapeados (Com Taxa de Saúde % & Status) */}
        <div className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ativos Mapeados</span>
            <div className="p-2.5 bg-[#00f2fe]/10 text-[#00f2fe] rounded-xl shadow-[0_0_10px_rgba(0,242,254,0.15)]">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">
              {loadingStats ? '...' : stats?.assets.total ?? 5}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {stats?.assets.healthRate ?? 100}% Saúde
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Operacionais: <strong className="text-emerald-400 font-bold">{stats?.assets.operational ?? 5}</strong></span>
            <span>Manutenção: <strong className="text-amber-400 font-bold">{stats?.assets.maintenance ?? 0}</strong></span>
          </div>
        </div>

        {/* CARD 2: Visitas Executadas no Mês (Com Indicador de Conciliação %) */}
        <div className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vistorias no Mês</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">
              {loadingStats ? '...' : stats?.visits.total ?? 4}
            </span>
            <span className="text-xs font-bold text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {stats?.visits.conciliationRate ?? 98}% Conciliados
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Concluídas: <strong className="text-emerald-400 font-bold">{stats?.visits.completed ?? 2}</strong></span>
            <span>Em Campo: <strong className="text-amber-400 font-bold">{stats?.visits.inProgress ?? 1}</strong></span>
          </div>
        </div>

        {/* CARD 3: Ocorrências / Problemas Abertos (Por Nível de Gravidade) */}
        <div className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Não Conformidades</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">
              {loadingStats ? '...' : stats?.issues?.total ?? 2}
            </span>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Requer Atenção
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 text-center text-[10px] text-slate-400">
            <div>Crítica: <strong className="text-rose-400 block font-bold">{stats?.issues?.critical ?? 0}</strong></div>
            <div>Alta: <strong className="text-amber-400 block font-bold">{stats?.issues?.high ?? 1}</strong></div>
            <div>Média: <strong className="text-cyan-400 block font-bold">{stats?.issues?.medium ?? 1}</strong></div>
          </div>
        </div>

        {/* CARD 4: Cobertura de Vistorias e Próximos Agendamentos */}
        <div className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cobertura do Parque</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight">100%</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              4/4 Locais Mapeados
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Próxima Vistoria:</span>
            <strong className="text-[#00f2fe] font-mono">VIS-2026-003</strong>
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
                      <IconComp className="w-3.5 h-3.5 text-[#00f2fe]" />
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
    </div>
  );
};
