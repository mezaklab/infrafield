import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  ShieldAlert, 
  RefreshCw, 
  X, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Issue, IssueSeverity, IssueStatus } from '../types';
import { getIssues, createIssue, updateIssue, downloadInventoryPDFReport, exportAssetsCSV } from '../services/api';
import { ExportDropdown } from '../components/Layout/ExportDropdown';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const Issues: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM' as IssueSeverity,
    recommendation: '',
  });

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIssues({
        severity: severityFilter,
        status: statusFilter,
        search: searchTerm,
      });
      setIssues(data);
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError('Não foi possível carregar as não conformidades da API.');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createIssue(newIssue);
      setIsModalOpen(false);
      setNewIssue({ title: '', description: '', severity: 'MEDIUM', recommendation: '' });
      fetchIssues();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao registrar não conformidade.');
    } finally {
      setSubmitting(false);
    }
  };

  useEscapeKey(() => setIsModalOpen(false), isModalOpen);

  const handleStatusTransition = async (issueId: string, currentStatus: IssueStatus) => {
    let nextStatus: IssueStatus;
    if (currentStatus === 'OPEN') nextStatus = 'IN_ANALYSIS';
    else if (currentStatus === 'IN_ANALYSIS') nextStatus = 'IN_PROGRESS';
    else if (currentStatus === 'IN_PROGRESS') nextStatus = 'RESOLVED';
    else nextStatus = 'OPEN';

    try {
      await updateIssue(issueId, { status: nextStatus });
      fetchIssues();
    } catch (err) {
      alert('Erro ao atualizar status da não conformidade.');
    }
  };

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> CRÍTICA
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" /> ALTA
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <AlertCircle className="w-3 h-3" /> MÉDIA
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            BAIXA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
            <HelpCircle className="w-3 h-3" /> INFO
          </span>
        );
    }
  };

  const getStatusBadge = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            ABERTO
          </span>
        );
      case 'IN_ANALYSIS':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            EM ANÁLISE
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            EM ANDAMENTO
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            RESOLVIDO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Gestão de Não Conformidades & Problemas</h2>
          <p className="text-xs text-slate-400">Acompanhamento e resolução de falhas técnicas identificadas em campo</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIssues}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white"
            title="Recarregar Problemas"
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
            className="if-button-critical min-h-10 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Registrar Não Conformidade
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
            placeholder="Buscar por protocolo, título ou descrição..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todas Gravidades</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Todos Status</option>
            <option value="OPEN">Aberto</option>
            <option value="IN_ANALYSIS">Em Análise</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="RESOLVED">Resolvido</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Carregando não conformidades da API...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 text-center">
          {error}
        </div>
      ) : issues.length === 0 ? (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
          Nenhuma não conformidade cadastrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                issue.severity === 'CRITICAL'
                  ? 'border-rose-500/40 bg-rose-950/10'
                  : issue.severity === 'HIGH'
                  ? 'border-amber-500/30'
                  : 'border-slate-800'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-lg">
                    {issue.protocol}
                  </span>
                  {getSeverityBadge(issue.severity)}
                  {getStatusBadge(issue.status)}
                </div>

                <h3 className="text-base font-bold text-white">{issue.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-2">{issue.description}</p>

                {issue.recommendation && (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-400">
                    <strong className="text-cyan-400">Recomendação Técnica:</strong> {issue.recommendation}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 pt-1">
                  {issue.assetName && (
                    <span>Ativo: <strong className="text-slate-200">{issue.assetName}</strong></span>
                  )}
                  {issue.locationName && (
                    <span>Local: <strong className="text-slate-200">{issue.locationName}</strong></span>
                  )}
                  <span>Relatado por: <strong className="text-slate-300">{issue.reportedBy}</strong></span>
                  <span>Data: {issue.createdAt}</span>
                </div>
              </div>

              {/* Status Transition Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                <button
                  onClick={() => handleStatusTransition(issue.id, issue.status)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 px-3.5 py-2 rounded-xl transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Avançar Status</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Issue Modal */}
      {isModalOpen && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel max-w-md relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-white mb-1">Registrar Não Conformidade / Ocorrência</h3>
            <p className="text-xs text-slate-400 mb-4">Insira o problema identificado durante a inspeção de campo.</p>

            <form onSubmit={handleCreateIssue} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título da Ocorrência</label>
                <input
                  type="text"
                  value={newIssue.title}
                  onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                  placeholder="Ex: Vibração e ruído crítico no exaustor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Gravidade / Criticidade</label>
                <select
                  value={newIssue.severity}
                  onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value as IssueSeverity })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição Detalhada do Problema</label>
                <textarea
                  rows={3}
                  value={newIssue.description}
                  onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  placeholder="Descreva as características técnicas do problema encontrado..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Recomendação de Ação Corretiva</label>
                <input
                  type="text"
                  value={newIssue.recommendation}
                  onChange={(e) => setNewIssue({ ...newIssue, recommendation: e.target.value })}
                  placeholder="Ex: Substituir o cooler e recalibrar o duto"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl">Cancelar</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-xs font-semibold text-white rounded-xl"
                >
                  {submitting ? 'Registrando...' : 'Salvar Ocorrência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
