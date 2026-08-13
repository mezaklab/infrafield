import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  FileText, 
  Settings as SettingsIcon, 
  Database, 
  CheckCircle2, 
  ArrowUpRight,
  RefreshCw,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminDashboardStats, AdminTabType } from '../../types';

interface AdminDashboardProps {
  onNavigateTab: (tab: AdminTabType) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/dashboard');
      if (response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (err: any) {
      console.warn('Backend admin stats fallback:', err);
      // Fallback para zeros se a API falhar
      setStats({
        totalUsers: 0,
        totalAssets: 0,
        totalPeripherals: 0,
        totalVisits: 0,
        totalIssues: 0,
        auditLogsCount: 0,
        usersByRole: {
          SUPERADMIN: 0,
          ADMIN: 0,
          MANAGER: 0,
          TECHNICIAN: 0,
          VIEWER: 0,
        },
        systemHealth: 'UNAVAILABLE',
        serverUptimeSeconds: 0,
        environment: 'development',
        dbConnection: 'ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-purple-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-slate-300">Carregando métricas da Administração...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="admin-hero surface-ambient relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold admin-action">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>InfraField Core · Administração</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Gestão Central do InfraField
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Gerencie usuários, acessos, logs do sistema e configurações avançadas da plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('users')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
            >
              <Users className="w-4 h-4" />
              <span>Gerenciar Usuários</span>
            </button>
            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Logs</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="admin-surface admin-kpi rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Usuários</span>
            <div className="icon-box h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="metric-number text-3xl font-black text-white">{stats?.totalUsers || 0}</span>
            <span className="text-xs font-semibold text-purple-400 font-mono">cadastrados</span>
          </div>
          <p className="text-xs text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
            <span>Perfís Ativos:</span>
            <span className="text-purple-300 font-bold">SUPERADMIN & ADMIN</span>
          </p>
        </div>

        {/* Audit Logs */}
        <div className="admin-surface admin-kpi rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Eventos Auditados</span>
            <div className="icon-box h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="metric-number text-3xl font-black text-white">{stats?.auditLogsCount || 0}</span>
            <span className="text-xs font-semibold text-indigo-400 font-mono">registros</span>
          </div>
          <p className="text-xs text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
            <span>Rastreabilidade:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% Ativa
            </span>
          </p>
        </div>

        {/* System Uptime */}
        <div className="admin-surface admin-kpi rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uptime do Servidor</span>
            <div className="icon-box h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="metric-number text-3xl font-black text-white">{formatUptime(stats?.serverUptimeSeconds || 0)}</span>
          </div>
          <p className="text-xs text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
            <span>Ambiente:</span>
            <span className="text-cyan-300 font-mono uppercase">{stats?.environment || 'dev'}</span>
          </p>
        </div>

        {/* DB & API Status */}
        <div className="admin-surface admin-kpi rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status do Banco</span>
            <div className="icon-box h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-2xl font-black text-white">{stats?.dbConnection || 'SAUDÁVEL'}</span>
          </div>
          <p className="text-xs text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
            <span>API REST:</span>
            <span className="text-emerald-400 font-bold">ONLINE (:3333)</span>
          </p>
        </div>
      </div>

      {/* Role Distribution & Global Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Roles Breakdown */}
        <div className="admin-surface-elevated rounded-2xl p-5 sm:p-6 space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Distribuição de Perfis no Sistema (RBAC)</span>
              </h3>
              <p className="text-xs text-slate-400">Quantidade de contas ativas filtradas por nivel de privilégio</p>
            </div>

            <button
              onClick={() => onNavigateTab('users')}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <span>Gerenciar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* SUPERADMIN */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  SUPERADMIN (Acesso Total ilimitado)
                </span>
                <span className="text-slate-300">{stats?.usersByRole.SUPERADMIN || 0} usuário(s)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, ((stats?.usersByRole.SUPERADMIN || 0) / Math.max(stats?.totalUsers || 0, 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* ADMIN */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-purple-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  ADMIN (Administrador do Backoffice)
                </span>
                <span className="text-slate-300">{stats?.usersByRole.ADMIN || 0} usuário(s)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, ((stats?.usersByRole.ADMIN || 0) / Math.max(stats?.totalUsers || 0, 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* MANAGER */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-cyan-400 font-bold">MANAGER (Gestor de Operações)</span>
                <span className="text-slate-300">{stats?.usersByRole.MANAGER || 0} usuário(s)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, ((stats?.usersByRole.MANAGER || 0) / Math.max(stats?.totalUsers || 0, 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* TECHNICIAN */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-blue-400 font-bold">TECHNICIAN (Técnico de Campo)</span>
                <span className="text-slate-300">{stats?.usersByRole.TECHNICIAN || 0} usuário(s)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, ((stats?.usersByRole.TECHNICIAN || 0) / Math.max(stats?.totalUsers || 0, 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* VIEWER */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400 font-bold">VIEWER (Leitura e Auditoria)</span>
                <span className="text-slate-300">{stats?.usersByRole.VIEWER || 0} usuário(s)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-slate-500 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, ((stats?.usersByRole.VIEWER || 0) / Math.max(stats?.totalUsers || 0, 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Card */}
        <div className="admin-surface-elevated rounded-2xl p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <SettingsIcon className="w-5 h-5 text-purple-400" />
            <span>Ações Rápidas ADM</span>
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => onNavigateTab('users')}
              className="admin-quick-action w-full flex items-center justify-between p-3.5 rounded-xl text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">Criar Usuário</div>
                  <div className="text-[11px] text-slate-400">Adicionar novo admin ou técnico</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="admin-quick-action w-full flex items-center justify-between p-3.5 rounded-xl text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Verificar Auditoria</div>
                  <div className="text-[11px] text-slate-400">Examinar histórico de alterações</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </button>

            <button
              onClick={() => onNavigateTab('settings')}
              className="admin-quick-action w-full flex items-center justify-between p-3.5 rounded-xl text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">Políticas do Sistema</div>
                  <div className="text-[11px] text-slate-400 font-normal">Ajustar timeout e notificações</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
