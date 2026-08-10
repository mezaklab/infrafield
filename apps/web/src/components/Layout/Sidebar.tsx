import React from 'react';
import { 
  LayoutDashboard, 
  Network, 
  MapPin, 
  AlertTriangle, 
  LogOut, 
  Server, 
  Laptop, 
  ShieldCheck, 
  ArrowRight, 
  Headset,
  BarChart3,
  PlusCircle
} from 'lucide-react';
import { TabType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  onNavigateToAdmin?: () => void;
  onOpenCreateTicket?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  onNavigateToAdmin,
  onOpenCreateTicket
}) => {
  const { user, isSuperAdmin, isFinalUser } = useAuth();
  const hasAdminRole = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  const mainNavItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard NOC', icon: LayoutDashboard },
    { id: 'assets' as TabType, label: 'Redes', icon: Network },
    { id: 'visits' as TabType, label: 'Visitas & Vistorias', icon: MapPin },
    { id: 'issues' as TabType, label: 'Não Conformidades', icon: AlertTriangle },
    { id: 'peripherals' as TabType, label: 'Ativos de TI', icon: Laptop },
  ];

  const helpdeskNavItems = isFinalUser
    ? [{ id: 'tickets' as TabType, label: 'Meus Chamados', icon: Headset }]
    : [
        { id: 'ticket-dashboard' as TabType, label: 'Dashboard Helpdesk', icon: BarChart3 },
        { id: 'tickets' as TabType, label: 'Chamados', icon: Headset },
      ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0 p-4 select-none overflow-y-auto custom-scrollbar">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
          <Server className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
            InfraField <span className="text-[10px] font-bold bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/20 px-2 py-0.5 rounded-full">v1.0</span>
          </h1>
          <p className="text-xs text-slate-400">{isFinalUser ? 'Central de Suporte' : 'Gestão de Infraestrutura'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4">
        {/* Main Section (hidden for USUARIO role) */}
        {!isFinalUser && (
          <div>
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Infraestrutura & NOC
            </div>
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110 text-cyan-400' : ''}`} />
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Helpdesk Section */}
        <div>
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80 mb-1.5 flex items-center justify-between">
            <span>{isFinalUser ? 'Suporte & Atendimento' : 'Helpdesk'}</span>
          </div>
          <div className="space-y-1">
            {helpdeskNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/15 text-[#00f2fe] border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110 text-[#00f2fe]' : ''}`} />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}

            {/* Novo Chamado Quick Action */}
            <button
              onClick={() => {
                setActiveTab('tickets');
                if (onOpenCreateTicket) onOpenCreateTicket();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl font-bold text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f2fe] border border-cyan-500/30 transition-all group mt-1"
            >
              <PlusCircle className="w-4 h-4 shrink-0 text-[#00f2fe] group-hover:rotate-90 transition-transform" />
              <span>{isFinalUser ? 'Abrir Novo Chamado' : 'Novo Chamado'}</span>
            </button>
          </div>
        </div>

        {/* Dedicated Backoffice Button (Exibido APENAS para SUPERADMIN e ADMIN) */}
        {hasAdminRole && onNavigateToAdmin && (
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={onNavigateToAdmin}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-300 border border-purple-500/40 hover:border-purple-400/60 transition-all shadow-md shadow-purple-950/40 group"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
                <span>Gestão Central</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </nav>

      {/* System Status summary badge */}
      <div className="my-4 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Rede Operacional</span>
        </div>
        <p className="text-[11px] text-slate-400">Painel NOC Executivo (v1.0)</p>
      </div>

      {/* User Profile & Logout */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between px-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-xs ${
            isSuperAdmin 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {user?.name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Usuário'}</span>
            <span className="text-[11px] text-slate-400 truncate">{user?.email || 'email@infrafield.io'}</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sair do sistema"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
