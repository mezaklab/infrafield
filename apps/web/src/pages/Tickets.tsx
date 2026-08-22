import React, { useState, useEffect, useCallback } from 'react';
import { 
  LifeBuoy, 
  Plus, 
  Search, 
  RefreshCw, 
  MessageSquare, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight,
  CircleDot,
  Zap,
  XCircle
} from 'lucide-react';
import { api, downloadInventoryPDFReport, exportAssetsCSV } from '../services/api';
import { Ticket, TicketStatus, TicketPriority, Location, SystemUser } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import { CreateTicketModal } from '../components/Tickets/CreateTicketModal';
import { TicketDetailModal } from '../components/Tickets/TicketDetailModal';
import { ExportDropdown } from '../components/Layout/ExportDropdown';

interface TicketsProps {
  isCreateOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const Tickets: React.FC<TicketsProps> = ({ isCreateOpen = false, onCloseCreateModal }) => {
  const { isFinalUser } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [technicians, setTechnicians] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateOpen) {
      setIsCreateModalOpen(true);
    }
  }, [isCreateOpen]);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const fetchTicketsData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (locationFilter !== 'ALL') params.locationId = locationFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (assignedFilter !== 'ALL') params.assignedToId = assignedFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get<Ticket[]>('/tickets', { params });
      setTickets(res.data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, locationFilter, priorityFilter, assignedFilter]);

  // Inline update & toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  const fetchAuxiliaryData = useCallback(async () => {
    try {
      if (!isFinalUser) {
        const [locRes, techRes] = await Promise.all([
          api.get<Location[]>('/locations').catch(() => ({ data: [] })),
          api.get<SystemUser[]>('/tickets/technicians').catch(() =>
            api.get<SystemUser[]>('/admin/users').catch(() => ({ data: [] }))
          ),
        ]);
        setLocations(locRes.data || []);
        setTechnicians(techRes.data || []);
      }
    } catch (err) {
      console.warn('Error fetching auxiliary ticket data:', err);
    }
  }, [isFinalUser]);

  const handleInlineAssignTechnician = async (
    ticketId: string,
    techId: string,
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    e.stopPropagation();
    try {
      setUpdatingTicketId(ticketId);
      await api.patch(`/tickets/${ticketId}`, { assignedToId: techId || null });

      const tech = technicians.find((t) => t.id === techId);
      const msg = techId && tech
        ? `Técnico "${tech.name}" atribuído com sucesso!`
        : 'Vínculo de técnico responsável removido.';

      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3500);

      await fetchTicketsData();
    } catch (err) {
      alert('Erro ao atribuir técnico responsável.');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  useEffect(() => {
    fetchTicketsData();
  }, [fetchTicketsData]);

  useEffect(() => {
    fetchAuxiliaryData();
  }, [fetchAuxiliaryData]);

  // Real-time socket updates for tickets
  useEffect(() => {
    const socket = getSocket();
    const handleTicketCreated = () => fetchTicketsData();
    const handleTicketUpdated = () => fetchTicketsData();

    socket.on('ticketCreated', handleTicketCreated);
    socket.on('ticketUpdated', handleTicketUpdated);

    return () => {
      socket.off('ticketCreated', handleTicketCreated);
      socket.off('ticketUpdated', handleTicketUpdated);
    };
  }, [fetchTicketsData]);

  // Computed metrics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === 'ABERTO').length;
  const inProgressTickets = tickets.filter((t) => t.status === 'EM_ATENDIMENTO' || t.status === 'AGUARDANDO_USUARIO').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVIDO' || t.status === 'CANCELADO').length;

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'ABERTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 w-fit overflow-hidden whitespace-nowrap animate-pulse">
            <CircleDot className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>ABERTO</span>
          </span>
        );
      case 'EM_ATENDIMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 w-fit overflow-hidden whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>EM ATENDIMENTO</span>
          </span>
        );
      case 'AGUARDANDO_USUARIO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 w-fit overflow-hidden whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>AGUARDANDO USUÁRIO</span>
          </span>
        );
      case 'RESOLVIDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 w-fit overflow-hidden whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>RESOLVIDO</span>
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-500/20 text-slate-400 border border-slate-500/40 w-fit overflow-hidden whitespace-nowrap">
            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>CANCELADO</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'CRITICA':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40">CRÍTICA</span>;
      case 'ALTA':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">ALTA</span>;
      case 'MEDIA':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/40">MÉDIA</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/20 text-slate-400 border border-slate-500/40">BAIXA</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header Banner */}
      <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20 shrink-0">
              <LifeBuoy className="w-7 h-7 animate-spin-slow" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {isFinalUser ? 'Meus Chamados de Suporte' : 'Central de Chamados & Helpdesk'}
                </h2>
                <span className="text-xs md:text-sm bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/30 px-3 py-1 rounded-full font-bold flex items-center justify-center whitespace-nowrap">
                  {isFinalUser ? 'USUÁRIO' : 'NOC // Suporte Ativo'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isFinalUser
                  ? 'Acompanhe o andamento das suas solicitações e abra novos chamados para a equipe de TI'
                  : 'Abertura de tickets, atendimento em tempo real e conciliação por setores'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <ExportDropdown
              options={[
                {
                  id: 'pdf-inventory',
                  label: 'Relatório de Inventário (PDF)',
                  sublabel: 'Documento oficial formatado',
                  type: 'pdf',
                  onExport: downloadInventoryPDFReport,
                },
                {
                  id: 'csv-inventory',
                  label: 'Exportar Inventário (CSV)',
                  sublabel: 'Planilha em formato CSV',
                  type: 'csv',
                  onExport: exportAssetsCSV,
                },
              ]}
            />

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-cyan-500/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> <span>Abrir Novo Chamado</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {isFinalUser ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Abertos */}
          <div className="bg-[#080d1a] border border-rose-500/20 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Abertos</span>
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-rose-400 tracking-tight">{loading ? '...' : openTickets}</div>
            <div className="mt-2 text-[11px] text-rose-300/80">Aguardando atendimento inicial</div>
          </div>

          {/* Card 2: Em Atendimento */}
          <div className="bg-[#080d1a] border border-cyan-500/20 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Em Atendimento</span>
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-cyan-400 tracking-tight">{loading ? '...' : inProgressTickets}</div>
            <div className="mt-2 text-[11px] text-cyan-300/80">Em triagem / com técnico</div>
          </div>

          {/* Card 3: Encerrados */}
          <div className="bg-[#080d1a] border border-emerald-500/20 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Encerrados</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-400 tracking-tight">{loading ? '...' : resolvedTickets}</div>
            <div className="mt-2 text-[11px] text-emerald-300/80">Solucionados ou concluídos</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Chamados</span>
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <LifeBuoy className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-white tracking-tight">{loading ? '...' : totalTickets}</div>
            <div className="mt-2 text-[11px] text-slate-400">Registrados na plataforma</div>
          </div>

          <div className="bg-[#080d1a] border border-rose-500/20 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Chamados Abertos</span>
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-rose-400 tracking-tight">{loading ? '...' : openTickets}</div>
            <div className="mt-2 text-[11px] text-rose-300/80">Aguardando atendimento inicial</div>
          </div>

          <div className="bg-[#080d1a] border border-cyan-500/20 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Em Atendimento</span>
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-cyan-400 tracking-tight">{loading ? '...' : inProgressTickets}</div>
            <div className="mt-2 text-[11px] text-cyan-300/80">Em triagem / com técnico</div>
          </div>

          <div className="bg-[#080d1a] border border-emerald-500/20 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Resolvidos</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-400 tracking-tight">{loading ? '...' : resolvedTickets}</div>
            <div className="mt-2 text-[11px] text-emerald-300/80">Concluídos com sucesso</div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="surface-elevated bg-[#080d1a] border border-cyan-500/15 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isFinalUser ? "Buscar por Código ou Assunto..." : "Buscar por Código (TK-1001), Assunto ou Solicitante..."}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Status: Todos</option>
            <option value="ABERTO">🔴 Aberto</option>
            <option value="EM_ATENDIMENTO">⚡ Em Atendimento</option>
            <option value="AGUARDANDO_USUARIO">⏳ Aguardando Usuário</option>
            <option value="RESOLVIDO">✅ Resolvido</option>
            <option value="CANCELADO">⚪ Cancelado</option>
          </select>

          {!isFinalUser && (
            <>
              {/* Location Filter */}
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Setor: Todos</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Prioridade: Todas</option>
                <option value="BAIXA">🟢 Baixa</option>
                <option value="MEDIA">🟡 Média</option>
                <option value="ALTA">🟠 Alta</option>
                <option value="CRITICA">🔴 Crítica</option>
              </select>

              {/* Assigned Technician Filter */}
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Técnico: Todos</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </>
          )}

          <button
            onClick={fetchTicketsData}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold hover:text-white transition-all cursor-pointer ${
              isFinalUser ? 'col-span-1' : ''
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="bg-[#080d1a] border border-cyan-500/15 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-cyan-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#00f2fe]" />
            <span>Carregando lista de chamados...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <LifeBuoy className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-xs text-slate-400">
              {isFinalUser
                ? 'Você ainda não abriu nenhum chamado. Clique em "Abrir Novo Chamado" para solicitar suporte.'
                : 'Nenhum chamado localizado com os filtros aplicados.'}
            </p>
          </div>
        ) : (
          <>
          <div className="md:hidden p-3 space-y-3">{tickets.map((tk) => <button key={tk.id} onClick={() => setSelectedTicketId(tk.id)} className="mobile-data-card w-full text-left space-y-3 active:border-cyan-500/40">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="font-mono font-black text-cyan-300">{tk.code}</span><h3 className="font-bold text-white break-words mt-1">{tk.subject}</h3></div>{getStatusBadge(tk.status)}</div>
            <p className="text-sm text-slate-400 line-clamp-2">{tk.description}</p>
            <div className="grid grid-cols-2 gap-3 text-xs"><div><span className="block text-slate-500">Prioridade</span>{getPriorityBadge(tk.priority)}</div><div><span className="block text-slate-500">Setor</span><span className="text-slate-200 break-words">{tk.sector?.name || tk.location?.name || 'Não especificado'}</span></div><div className="col-span-2"><span className="block text-slate-500">Técnico</span><span className="text-slate-200">{tk.assignedTo?.name || 'Não atribuído'}</span></div></div>
            <span className="min-h-11 w-full rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center gap-2 font-bold"><MessageSquare className="w-4 h-4" />Abrir atendimento</span>
          </button>)}</div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Código / Assunto</th>
                  {isFinalUser && <th className="px-6 py-4">Data de Abertura</th>}
                  <th className="px-6 py-4">Status</th>
                  {!isFinalUser && <th className="px-6 py-4">Prioridade</th>}
                  {!isFinalUser && <th className="px-6 py-4">Solicitante (Autor)</th>}
                  {!isFinalUser && <th className="px-6 py-4">Setor / Localidade</th>}
                  <th className="px-6 py-4">Técnico Responsável</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {tickets.map((tk) => (
                  <tr
                    key={tk.id}
                    onClick={() => setSelectedTicketId(tk.id)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/20 px-2.5 py-1 rounded-xl group-hover:scale-105 transition-transform">
                          {tk.code}
                        </span>
                        <div>
                          <div className="font-bold text-white group-hover:text-[#00f2fe] transition-colors">{tk.subject}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{tk.description}</div>
                        </div>
                      </div>
                    </td>

                    {isFinalUser && (
                      <td className="px-6 py-4 text-slate-300 font-mono text-[11px]">
                        {new Date(tk.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    )}

                    <td className="px-6 py-4">{getStatusBadge(tk.status)}</td>

                    {!isFinalUser && <td className="px-6 py-4">{getPriorityBadge(tk.priority)}</td>}

                    {!isFinalUser && (
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{tk.author?.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{tk.author?.email}</div>
                      </td>
                    )}

                    {!isFinalUser && (
                      <td className="px-6 py-4 text-cyan-300 font-medium">
                        {tk.sector?.name || tk.location?.name || 'Não Especificado'}
                      </td>
                    )}

                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {isFinalUser ? (
                        tk.assignedTo ? (
                          <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                            {tk.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Aguardando atribuição</span>
                        )
                      ) : (
                        <select
                          value={tk.assignedToId || ''}
                          disabled={updatingTicketId === tk.id}
                          onChange={(e) => handleInlineAssignTechnician(tk.id, e.target.value, e)}
                          className="bg-[#050811] border border-purple-500/30 hover:border-purple-400 text-purple-300 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-purple-500/40"
                        >
                          <option value="">👤 Nenhum (Atribuir Técnico)</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicketId(tk.id);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#00f2fe] font-bold text-xs border border-slate-800 flex items-center gap-1 ml-auto transition-all group-hover:border-cyan-500/40"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Ver Chat</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></>
        )}
      </div>

      {/* Modal Abertura de Chamado */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={() => fetchTicketsData()}
      />

      {/* Modal Chat / Atendimento do Chamado */}
      <TicketDetailModal
        ticketId={selectedTicketId}
        isOpen={!!selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
        onTicketUpdated={() => fetchTicketsData()}
      />

      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
