import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Calendar, Clock, User, Plus, Filter, CheckCircle2, AlertTriangle, Search, X, RefreshCw, ShieldCheck, FileText } from 'lucide-react';
import { Visit, Location } from '../types';
import { getVisits, createVisit, getLocations, downloadVisitPDFReport, downloadInventoryPDFReport, exportAssetsCSV } from '../services/api';
import { InspectionMode } from '../components/Visits/InspectionMode';
import { ExportDropdown } from '../components/Layout/ExportDropdown';

export const Visits: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected visit ID for Inspection Mode
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);

  // New Visit form state
  const [newVisit, setNewVisit] = useState({
    client: '',
    address: '',
    locationId: '',
    priority: 'MEDIA',
    type: 'INSPECAO',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '09:00 - 12:00',
    notes: '',
  });

  const fetchVisitsAndLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [visitsData, locationsData] = await Promise.all([
        getVisits({
          status: statusFilter,
          search: searchTerm,
        }),
        getLocations(),
      ]);
      setVisits(visitsData);
      setLocations(locationsData);
    } catch (err) {
      console.error('Failed to load visits:', err);
      setError('Não foi possível carregar as visitas técnicas da API.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchVisitsAndLocations();
  }, [fetchVisitsAndLocations]);

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createVisit(newVisit);
      setIsModalOpen(false);
      setNewVisit({
        client: '',
        address: '',
        locationId: '',
        priority: 'MEDIA',
        type: 'INSPECAO',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00 - 12:00',
        notes: '',
      });
      fetchVisitsAndLocations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao agendar visita');
    } finally {
      setSubmitting(false);
    }
  };

  if (activeInspectionId) {
    return (
      <InspectionMode
        visitId={activeInspectionId}
        onBack={() => {
          setActiveInspectionId(null);
          fetchVisitsAndLocations();
        }}
      />
    );
  }

  const getStatusBadge = (status: Visit['status']) => {
    switch (status) {
      case 'PLANEJADA':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3 h-3" /> Planejada
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock className="w-3 h-3 animate-spin" /> Em Vistoria
          </span>
        );
      case 'CONCLUIDA':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Concluída
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: Visit['priority']) => {
    switch (priority) {
      case 'CRITICA':
        return <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">CRÍTICA</span>;
      case 'ALTA':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">ALTA</span>;
      case 'MEDIA':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">MÉDIA</span>;
      case 'BAIXA':
        return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">BAIXA</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Visitas Técnicas & Modo Vistoria</h2>
          <p className="text-xs text-slate-400">Agendamento, inventário de ativos e conciliação em campo</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchVisitsAndLocations}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
            title="Recarregar Visitas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <ExportDropdown
            options={[
              {
                id: 'pdf-inventory',
                label: 'Relatório de Inventário Geral (PDF)',
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Nova Visita Técnica
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por protocolo, cliente ou endereço..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 mr-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PLANEJADA', label: 'Planejadas' },
            { id: 'EM_ANDAMENTO', label: 'Em Vistoria' },
            { id: 'CONCLUIDA', label: 'Concluídas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Carregando visitas da API...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 text-center">
          {error}
        </div>
      ) : visits.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
          Nenhuma visita encontrada para os filtros aplicados.
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg">
                    {visit.protocol}
                  </span>
                  {getStatusBadge(visit.status)}
                  {getPriorityBadge(visit.priority)}
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg">
                    {visit.type}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{visit.client}</h3>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {visit.address} ({visit.locationName})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Técnico: <strong className="text-slate-200 font-semibold">{visit.technician}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Data: {visit.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Horário: {visit.time}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Mobile & Desktop */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                <button
                  onClick={() => downloadVisitPDFReport(visit.id)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-2.5 rounded-xl transition-all"
                  title="Baixar Relatório Técnico de Visita em PDF"
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => setActiveInspectionId(visit.id)}
                  className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2.5 rounded-xl shadow-md transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Modo Vistoria</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Visit Modal */}
      {isModalOpen && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel max-w-md relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-white mb-1">Agendar Nova Visita Técnica</h3>
            <p className="text-xs text-slate-400 mb-4">Selecione o local para mapear automaticamente os ativos de inventário.</p>

            <form onSubmit={handleCreateVisit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cliente / Razão Social</label>
                <input
                  type="text"
                  value={newVisit.client}
                  onChange={(e) => setNewVisit({ ...newVisit, client: e.target.value })}
                  placeholder="Ex: TechCorp Infraestrutura"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço da Visita</label>
                <input
                  type="text"
                  value={newVisit.address}
                  onChange={(e) => setNewVisit({ ...newVisit, address: e.target.value })}
                  placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Localização Principal (Vínculo de Ativos)</label>
                <select
                  value={newVisit.locationId}
                  onChange={(e) => setNewVisit({ ...newVisit, locationId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Selecione um local...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.building ? `(${loc.building})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
                  <select
                    value={newVisit.type}
                    onChange={(e) => setNewVisit({ ...newVisit, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="INSPECAO">Inspeção</option>
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="INSTALACAO">Instalação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={newVisit.priority}
                    onChange={(e) => setNewVisit({ ...newVisit, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data Agendada</label>
                <input
                  type="date"
                  value={newVisit.scheduledDate}
                  onChange={(e) => setNewVisit({ ...newVisit, scheduledDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl">Cancelar</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-xs font-semibold text-white rounded-xl"
                >
                  {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
