import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  ArrowLeft, 
  LogOut, 
  RefreshCw, 
  Menu, 
  X, 
  Lock,
  Activity,
  ChevronRight,
  Building2
} from 'lucide-react';
import { AdminTabType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeAdminTab: AdminTabType;
  setActiveAdminTab: (tab: AdminTabType) => void;
  onNavigateToApp: () => void;
  onLogout: () => void;
  onRefresh?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeAdminTab,
  setActiveAdminTab,
  onNavigateToApp,
  onLogout,
  onRefresh,
}) => {
  const { user, isSuperAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'dashboard' as AdminTabType,
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      description: 'Métricas globais e saúde do sistema',
    },
    {
      id: 'users' as AdminTabType,
      label: 'Controle de Acessos',
      path: '/admin/users',
      icon: Users,
      description: 'Gestão de usuários e permissões',
    },
    {
      id: 'audit-logs' as AdminTabType,
      label: 'Logs',
      path: '/admin/audit-logs',
      icon: FileText,
      description: 'Histórico e rastreabilidade de ações',
    },
    {
      id: 'locations' as AdminTabType,
      label: 'Localidades',
      path: '/admin/locations',
      icon: Building2,
      description: 'Matrizes, filiais, prédios e departamentos',
    },
    {
      id: 'settings' as AdminTabType,
      label: 'Configurações',
      path: '/admin/settings',
      icon: SettingsIcon,
      description: 'Parâmetros e políticas globais',
    },
  ];

  const getPageInfo = () => {
    switch (activeAdminTab) {
      case 'dashboard':
        return {
          title: 'Visão Geral Administrativa',
          subtitle: 'Painel executivo de controle do sistema e infraestrutura',
        };
      case 'users':
        return {
          title: 'Gestão de Usuários & Acessos (RBAC)',
          subtitle: 'Controle de perfis SUPERADMIN, ADMIN, MANAGER, TECHNICIAN e VIEWER',
        };
      case 'audit-logs':
        return {
          title: 'Logs de Auditoria & Trilha de Eventos',
          subtitle: 'Registros de segurança e auditoria de ações no sistema',
        };
      case 'locations':
        return {
          title: 'Localidades Corporativas',
          subtitle: 'Matrizes, filiais, prédios e departamentos disponíveis no catálogo',
        };
      case 'settings':
        return {
          title: 'Configurações Globais do Sistema',
          subtitle: 'Parâmetros de autenticação, timeout e políticas operacionais',
        };
      default:
        return { title: 'Área Administrativa', subtitle: 'Painel Interno Backoffice' };
    }
  };

  const pageInfo = getPageInfo();

  const handleTabClick = (tab: AdminTabType, path: string) => {
    setActiveAdminTab(tab);
    setMobileMenuOpen(false);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Desktop Sidebar Dedicated to Backoffice */}
      <aside className="hidden lg:flex flex-col w-72 bg-slate-900/90 backdrop-blur-xl border-r border-indigo-900/40 h-screen sticky top-0 p-4 select-none z-30 shadow-2xl">
        {/* Backoffice Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-indigo-900/40">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white font-extrabold ring-1 ring-purple-400/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-lg text-white tracking-tight">InfraField</h1>
              <span className="text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full shadow-sm">
                BACKOFFICE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Painel Interno / ADM</p>
          </div>
        </div>

        {/* Global Functions Section */}
        <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-purple-400/80 mb-3 flex items-center justify-between">
          <span>Funções Globais ADM</span>
          <Lock className="w-3 h-3 text-purple-400/60" />
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeAdminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id, item.path)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-slate-900 text-purple-200 border border-purple-500/40 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40' : 'bg-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:bg-slate-700'
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal truncate opacity-80">
                      {item.description}
                    </span>
                  </div>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Switch to Operational NOC Navigation */}
        <div className="my-4 pt-4 border-t border-indigo-900/30">
          <button
            onClick={onNavigateToApp}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 transition-all shadow-md group"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
              <span>Painel Operacional NOC</span>
            </div>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-200 px-1.5 py-0.5 rounded font-mono">Campo</span>
          </button>
        </div>

        {/* Admin User Profile info & Logout */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-md ${
              isSuperAdmin 
                ? 'bg-gradient-to-tr from-amber-500 to-red-600 text-white ring-2 ring-amber-400/40' 
                : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
            }`}>
              {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{user?.name || 'Administrador'}</span>
              <span className="text-[10px] text-purple-300 font-mono flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isSuperAdmin ? 'bg-amber-400 animate-pulse' : 'bg-purple-400'}`}></span>
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sair do Backoffice"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Backoffice Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-indigo-900/40 px-4 md:px-8 py-4 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile drawer toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-300 hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-purple-400" /> : <Menu className="w-6 h-6 text-purple-400" />}
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs text-purple-400/80 font-mono mb-0.5">
                <span>/admin</span>
                <span>&gt;</span>
                <span className="capitalize">{activeAdminTab}</span>
              </div>
              <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                {pageInfo.title}
              </h2>
              <p className="text-xs text-slate-400 hidden md:block">{pageInfo.subtitle}</p>
            </div>
          </div>

          {/* Top Header Actions */}
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/50 border border-purple-500/30 text-xs font-semibold text-purple-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>NOC Backoffice Active</span>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Atualizar Dados"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onNavigateToApp}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Painel de Campo</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-purple-400" />
                  <div>
                    <h3 className="font-bold text-white">InfraField ADM</h3>
                    <p className="text-xs text-purple-300">Menu Backoffice</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider px-2">
                  Funções Globais
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeAdminTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id, item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left font-medium text-sm transition-all ${
                        isActive
                          ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-purple-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateToApp();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Painel Operacional</span>
              </button>

              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-950/60 text-rose-300 border border-rose-500/30 text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
