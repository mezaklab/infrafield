import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  LifeBuoy, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Plus, 
  Building2, 
  Layers, 
  TrendingUp, 
  ShieldAlert, 
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { api } from '../services/api';
import { HelpdeskDashboardData } from '../types';
import { getSocket } from '../services/socket';
import { CreateTicketModal } from '../components/Tickets/CreateTicketModal';

interface TicketDashboardProps {
  onNavigateToTickets?: () => void;
}

export const TicketDashboard: React.FC<TicketDashboardProps> = ({ onNavigateToTickets }) => {
  const [data, setData] = useState<HelpdeskDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await api.get<HelpdeskDashboardData>('/tickets/dashboard');
      setData(res.data);
    } catch (err) {
      console.warn('Failed to load ticket dashboard data:', err);
      setData(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Realtime updates via WebSockets
  useEffect(() => {
    const socket = getSocket();

    const handleUpdate = () => {
      fetchDashboardData();
    };

    socket.on('ticketCreated', handleUpdate);
    socket.on('ticketUpdated', handleUpdate);
    socket.on('ticketMessageAdded', handleUpdate);

    return () => {
      socket.off('ticketCreated', handleUpdate);
      socket.off('ticketUpdated', handleUpdate);
      socket.off('ticketMessageAdded', handleUpdate);
    };
  }, [fetchDashboardData]);

  const kpis = data?.kpis || {
    totalActive: 0,
    overdueSla: 0,
    resolvedMonth: 0,
    avgResolutionTime: '0min',
  };

  const evolutionData = data?.charts?.evolution || [];
  const sectorData = data?.charts?.sectorDistribution || [];
  const topIncidentsData = data?.charts?.topIncidents || [];
  const ticketsWithSector = sectorData.reduce((total, sector) => total + sector.value, 0);

  return (
    <div className="space-y-6">
      {loadError && <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 danger-text text-sm">Não foi possível carregar os dados reais do Helpdesk.</div>}
      {/* Header Banner */}
      <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20 shrink-0">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">Dashboard &amp; Métricas Helpdesk</h2>
                <span className="text-xs bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30 px-3 py-0.5 rounded-full font-bold">
                  SLA &amp; Telemetria
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visão gráfica em tempo real de métricas, cumprimento de SLA e distribuição de incidentes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-3 bg-[#050811] hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
              title="Atualizar dados do gráfico"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00f2fe]' : ''}`} />
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-cyan-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Chamado</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 TOP EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Abertos / Em Atendimento */}
        <div className="bg-[#080d1a] border border-cyan-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abertos / Em Atendimento</span>
            <div className="p-2.5 bg-cyan-500/10 text-[#00f2fe] rounded-xl border border-cyan-500/20 shadow-[0_0_10px_rgba(0,242,254,0.15)]">
              <LifeBuoy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white tracking-tight group-hover:text-[#00f2fe] transition-colors">
              {loading ? '...' : kpis.totalActive}
            </span>
            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
              Fila Ativa
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Aguardando solução</span>
            {onNavigateToTickets && (
              <button onClick={onNavigateToTickets} className="text-cyan-400 hover:underline font-semibold flex items-center gap-0.5">
                Ver Fila <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* KPI 2: Críticos / Fora do SLA (Atrasados) */}
        <div className="bg-[#080d1a] border border-rose-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Críticos / Fora do SLA</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-400 tracking-tight">
              {loading ? '...' : kpis.overdueSla}
            </span>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
              Requer Atenção
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            Atrasados ou de prioridade crítica
          </div>
        </div>

        {/* KPI 3: Chamados Solucionados (Mês) */}
        <div className="bg-[#080d1a] border border-emerald-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Solucionados (Mês)</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400 tracking-tight">
              {loading ? '...' : kpis.resolvedMonth}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              Últimos 30d
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            Concluídos e validados pelo usuário
          </div>
        </div>

        {/* KPI 4: Tempo Médio de Resolução */}
        <div className="bg-[#080d1a] border border-purple-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Tempo Médio de Resolução</span>
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-300 tracking-tight">
              {loading ? '...' : kpis.avgResolutionTime}
            </span>
            <span className="text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
              Média SLA
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            Entre criação e encerramento
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: Evolução de Chamados (Area Chart - Abertos vs Solucionados) */}
        <div className="lg:col-span-2 bg-[#080d1a] border border-cyan-500/15 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00f2fe]" />
                <span>Evolução de Chamados (Últimos 6 Meses)</span>
              </h3>
              <p className="text-xs text-slate-400">Comparativo entre chamados abertos e chamados solucionados</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#00f2fe]">
                <span className="w-3 h-3 rounded-full bg-[#00f2fe]"></span> Abertos
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span> Solucionados
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAbertos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSolucionados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#050811',
                    borderColor: '#1e293b',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="abertos"
                  name="Abertos"
                  stroke="#00f2fe"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAbertos)"
                />
                <Area
                  type="monotone"
                  dataKey="solucionados"
                  name="Solucionados"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSolucionados)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Distribuição por Setor (Donut Chart) */}
        <div className="bg-[#080d1a] border border-cyan-500/15 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span>Distribuição por Setor</span>
            </h3>
            <p className="text-xs text-slate-400">Proporção de chamados por setor/unidade</p>

            {sectorData.length === 0 ? (
              <div className="h-56 grid place-items-center text-center text-sm text-slate-400">Nenhum chamado com setor associado.</div>
            ) : <div className="h-56 w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#080d1a" strokeWidth={3} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#050811',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Central Text inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{ticketsWithSector}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Chamados</span>
              </div>
            </div>}
          </div>

          {/* Custom Sector Legends */}
          {sectorData.length > 0 && <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            {sectorData.slice(0, 4).map((sec, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sec.color }}></span>
                  <span className="truncate">{sec.name}</span>
                </span>
                <span className="font-mono font-bold text-white shrink-0">{sec.value}</span>
              </div>
            ))}
          </div>}
        </div>

        {/* CHART 3: Top 5 Incidentes por Categoria / Ativos (Horizontal Bar Chart) */}
        <div className="lg:col-span-3 bg-[#080d1a] border border-cyan-500/15 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Chamados por Categoria</span>
              </h3>
              <p className="text-xs text-slate-400">Categorias selecionadas nos chamados registrados</p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-xl">
              Ranking de Incidentes
            </span>
          </div>

          {topIncidentsData.length === 0 ? <div className="h-32 grid place-items-center text-sm text-slate-400">Nenhum chamado disponível para classificar.</div> : <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topIncidentsData}
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="equipment" type="category" stroke="#cbd5e1" fontSize={11} tickLine={false} width={120} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#050811',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Incidentes" radius={[0, 8, 8, 0]}>
                  {topIncidentsData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#00f2fe' : index === 1 ? '#3b82f6' : index === 2 ? '#8b5cf6' : '#64748b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}
        </div>
      </div>

      {/* Modal Abertura Rápida de Chamado */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchDashboardData()}
      />
    </div>
  );
};
