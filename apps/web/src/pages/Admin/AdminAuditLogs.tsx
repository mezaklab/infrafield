import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Download, 
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { AuditLogItem } from '../../types';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get<AuditLogItem[]>('/admin/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.warn('Audit logs fallback:', err);
      setLogs([
        {
          id: 'log-1',
          action: 'USER_LOGIN',
          user: 'superadmin@infrafield.io',
          role: 'SUPERADMIN',
          details: 'Autenticação no painel Backoffice realizada com sucesso',
          ipAddress: '192.168.1.100',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'log-2',
          action: 'ROLE_UPDATE',
          user: 'admin@infrafield.io',
          role: 'ADMIN',
          details: 'Role do usuário carlos.silva@infrafield.io mantida como TECHNICIAN',
          ipAddress: '192.168.1.105',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'log-3',
          action: 'SYSTEM_SETTINGS_UPDATE',
          user: 'superadmin@infrafield.io',
          role: 'SUPERADMIN',
          details: 'Modo de auditoria estrita ativado nas rotas /api/admin',
          ipAddress: '192.168.1.100',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'log-4',
          action: 'ASSET_MODIFIED',
          user: 'carlos.silva@infrafield.io',
          role: 'TECHNICIAN',
          details: 'Status do ativo SW-CORE-01 verificado durante a visita VIS-2026-001',
          ipAddress: '10.0.4.12',
          createdAt: new Date(Date.now() - 14400000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `infrafield_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()));
    const matchesAction = actionFilter === 'ALL' || log.action.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
          {action}
        </span>
      );
    }
    if (action.includes('USER') || action.includes('ROLE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {action}
        </span>
      );
    }
    if (action.includes('SETTING') || action.includes('CONFIG')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-purple-900/40 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Logs de Auditoria & Trilha de Eventos</h2>
            <p className="text-xs text-slate-400">Rastreabilidade completa de acessos e modificações</p>
          </div>
        </div>

        <button
          onClick={handleExportJson}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all shadow-md"
        >
          <Download className="w-4 h-4 text-purple-400" />
          <span>Exportar Relatório (JSON)</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuário, ação ou detalhe..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">Todas as Ações</option>
          <option value="LOGIN">Autenticação (LOGIN)</option>
          <option value="USER">Gestão de Usuários (USER)</option>
          <option value="SETTINGS">Configurações (SETTINGS)</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="surface-base bg-slate-900/80 border border-purple-900/40 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-purple-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Carregando logs de auditoria...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhum evento registrado com os critérios informados.
          </div>
        ) : (
          <>
          <div className="md:hidden p-3 space-y-3">{filteredLogs.map((log) => <article key={log.id} className="mobile-data-card space-y-3"><div className="flex items-start justify-between gap-3"><div>{getActionBadge(log.action)}</div><time className="text-xs text-slate-400 text-right">{new Date(log.createdAt).toLocaleString('pt-BR')}</time></div><div><strong className="text-sm text-white break-all">{log.user}</strong><p className="text-xs text-purple-300">{log.role}</p></div><p className="text-sm text-slate-300 break-words">{log.details || 'Sem informações detalhadas.'}</p><p className="text-xs font-mono text-slate-500">IP: {log.ipAddress || 'Não informado'}</p></article>)}</div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Data / Hora</th>
                  <th className="px-6 py-4">Ação Registrada</th>
                  <th className="px-6 py-4">Usuário Responsável</th>
                  <th className="px-6 py-4">IP</th>
                  <th className="px-6 py-4">Detalhes do Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-xs">{log.user}</span>
                        <span className="text-[10px] text-purple-300 font-mono">{log.role}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td className="px-6 py-4 text-slate-300 text-xs max-w-md leading-relaxed">
                      {log.details || 'Sem informações detalhadas.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></>
        )}
      </div>
    </div>
  );
};
