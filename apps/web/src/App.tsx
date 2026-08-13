import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { AdminLayout } from './components/Layout/AdminLayout';
import { AdminGuard } from './components/Admin/AdminGuard';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { Visits } from './pages/Visits';
import { Issues } from './pages/Issues';
import { Peripherals } from './pages/Peripherals';
import type { PeripheralsSubTab } from './components/Layout/Sidebar';
import { Tickets } from './pages/Tickets';
import { TicketDashboard } from './pages/TicketDashboard';
import { OnboardStandalone } from './pages/OnboardStandalone';
import { Settings } from './pages/Settings';

import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { AdminUsers } from './pages/Admin/AdminUsers';
import { AdminAuditLogs } from './pages/Admin/AdminAuditLogs';
import { AdminSettings } from './pages/Admin/AdminSettings';
import { AdminLocations } from './pages/Admin/AdminLocations';
import { AdminRoles } from './pages/Admin/AdminRoles';

import { TabType, AdminTabType, LensImportDraft } from './types';
import { InfraFieldLens } from './components/Camera/InfraFieldLens';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PasswordRecovery } from './pages/PasswordRecovery';
import { ResetPassword } from './pages/ResetPassword';

const TAB_PATHS: Record<TabType, string> = {
  dashboard: '/dashboard',
  assets: '/assets',
  visits: '/visits',
  issues: '/issues',
  peripherals: '/peripherals',
  tickets: '/tickets',
  'ticket-dashboard': '/tickets/dashboard',
  settings: '/settings',
};

const getTabFromPath = (path: string): TabType => {
  if (path.startsWith('/perifericos') || path.startsWith('/peripherals')) return 'peripherals';
  if (path.includes('/tickets/dashboard') || path.includes('/helpdesk/dashboard') || path.startsWith('/ticket-dashboard')) return 'ticket-dashboard';
  if (path.startsWith('/tickets') || path.startsWith('/chamados')) return 'tickets';
  if (path.startsWith('/assets') || path.startsWith('/redes')) return 'assets';
  if (path.startsWith('/visits') || path.startsWith('/visitas')) return 'visits';
  if (path.startsWith('/issues') || path.startsWith('/nao-conformidades')) return 'issues';
  if (path.startsWith('/settings') || path.startsWith('/configuracoes')) return 'settings';
  return 'dashboard';
};

const getPeripheralSubFromPath = (path: string): PeripheralsSubTab => {
  const subPath = path.split('/')[2]?.toUpperCase();
  const validSubTabs: PeripheralsSubTab[] = ['TODOS', 'COMPUTADOR', 'MONITOR', 'SOFTWARE', 'REDE', 'PERIFERICO'];
  return validSubTabs.includes(subPath as PeripheralsSubTab) ? subPath as PeripheralsSubTab : 'TODOS';
};

const getAdminTabFromPath = (path: string): AdminTabType => {
  if (path.includes('/users')) return 'users';
  if (path.includes('/roles')) return 'roles';
  if (path.includes('/audit-logs')) return 'audit-logs';
  if (path.includes('/settings')) return 'settings';
  if (path.includes('/locations')) return 'locations';
  return 'dashboard';
};

const AppInner: React.FC = () => {
  const { isAuthenticated, isLoading, logout, isFinalUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromPath(window.location.pathname));
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabType>(() => getAdminTabFromPath(window.location.pathname));
  const [activePeripheralSub, setActivePeripheralSub] = useState<PeripheralsSubTab>(() => getPeripheralSubFromPath(window.location.pathname));
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState<boolean>(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState<boolean>(false);
  const [lensImport, setLensImport] = useState<LensImportDraft | null>(null);

  // Sync window location pathname & history
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update active tabs when path changes and enforce USUARIO restrictions
  useEffect(() => {
    if (isLoading) return;

    if (isFinalUser) {
      setActiveTab('tickets');
      if (currentPath.startsWith('/admin') || !currentPath.startsWith('/tickets')) {
        if (window.location.pathname !== '/tickets') {
          window.history.replaceState({}, '', '/tickets');
        }
        setCurrentPath('/tickets');
      }
      return;
    }

    if (currentPath.startsWith('/admin')) {
      setActiveAdminTab(getAdminTabFromPath(currentPath));
    } else {
      const tab = getTabFromPath(currentPath);
      setActiveTab(tab);
      if (tab === 'peripherals') {
        setActivePeripheralSub(getPeripheralSubFromPath(currentPath));
      }
    }
  }, [currentPath, isFinalUser, isLoading]);

  const navigateToPath = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  const navigateToTab = (tab: TabType) => {
    setIsGlobalScannerOpen(false);
    setActiveTab(tab);
    navigateToPath(TAB_PATHS[tab]);
  };

  const navigateToPeripheralSub = (sub: PeripheralsSubTab) => {
    setIsGlobalScannerOpen(false);
    setActivePeripheralSub(sub);
    navigateToPath(sub === 'TODOS' ? TAB_PATHS.peripherals : `${TAB_PATHS.peripherals}/${sub.toLowerCase()}`);
  };

  const handleLensImport = (draft: LensImportDraft) => {
    setLensImport(draft);
    const peripheralTypes = new Set(['DESKTOP', 'NOTEBOOK', 'MONITOR', 'IMPRESSORA', 'MULTIFUNCIONAL', 'SCANNER']);
    navigateToTab(peripheralTypes.has(draft.type.toUpperCase()) ? 'peripherals' : 'assets');
  };

  // Dedicated Isolated Route: /onboard or /onboarding (No Layout, No Sidebar)
  if (currentPath.startsWith('/onboard') || currentPath.startsWith('/onboarding')) {
    return <OnboardStandalone />;
  }

  if (currentPath.startsWith('/reset-password')) {
    const token = new URLSearchParams(window.location.search).get('token') || '';
    return <ResetPassword token={token} onBack={() => navigateToPath('/login')} />;
  }
  if (currentPath.startsWith('/forgot-password')) return <PasswordRecovery onBack={() => navigateToPath('/login')} />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-[#00f2fe] space-y-4">
        <div className="w-10 h-10 border-4 border-[#00f2fe]/30 border-t-[#00f2fe] rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400">Verificando sessão...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onForgotPassword={() => navigateToPath('/forgot-password')} />;
  }

  // Backoffice Routes: /admin/*
  if (currentPath.startsWith('/admin')) {
    return (
      <AdminGuard onNavigateToApp={() => navigateToPath('/')}>
        <AdminLayout
          activeAdminTab={activeAdminTab}
          setActiveAdminTab={(tab) => {
            setActiveAdminTab(tab);
            navigateToPath(`/admin/${tab}`);
          }}
          onNavigateToApp={() => navigateToPath('/')}
          onLogout={logout}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        >
          <div key={refreshKey}>
            {activeAdminTab === 'dashboard'  && <AdminDashboard onNavigateTab={(tab) => { setActiveAdminTab(tab); navigateToPath(`/admin/${tab}`); }} />}
            {activeAdminTab === 'users'      && <AdminUsers />}
            {activeAdminTab === 'roles'      && <AdminRoles />}
            {activeAdminTab === 'audit-logs' && <AdminAuditLogs />}
            {activeAdminTab === 'settings'   && <AdminSettings />}
            {activeAdminTab === 'locations'  && <AdminLocations />}
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  // Standard NOC Field App Routes
  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={(tab) => {
        navigateToTab(tab);
      }}
      onLogout={() => {
        setIsGlobalScannerOpen(false);
        logout();
      }}
      onRefresh={() => setRefreshKey((prev) => prev + 1)}
      onOpenScanner={() => setIsGlobalScannerOpen(true)}
      scannerOpen={isGlobalScannerOpen}
      onNavigateToAdmin={() => navigateToPath('/admin/dashboard')}
      activePeripheralSub={activePeripheralSub}
      setActivePeripheralSub={navigateToPeripheralSub}
      onOpenCreateTicket={() => {
        navigateToTab('tickets');
        setIsCreateTicketModalOpen(true);
      }}
    >
      <div key={refreshKey}>
        {activeTab === 'dashboard'        && <Dashboard onNavigate={navigateToTab} />}
        {activeTab === 'ticket-dashboard' && <TicketDashboard onNavigateToTickets={() => navigateToTab('tickets')} />}
        {activeTab === 'tickets'          && <Tickets isCreateOpen={isCreateTicketModalOpen} onCloseCreateModal={() => setIsCreateTicketModalOpen(false)} />}
        {activeTab === 'assets'           && <Assets lensImport={lensImport} onLensImportConsumed={() => setLensImport(null)} />}
        {activeTab === 'visits'           && <Visits />}
        {activeTab === 'issues'           && <Issues />}
        {activeTab === 'peripherals'      && <Peripherals key={`peripherals-${activePeripheralSub}`} defaultSubTab={activePeripheralSub} onSubTabChange={navigateToPeripheralSub} lensImport={lensImport} onLensImportConsumed={() => setLensImport(null)} />}
        {activeTab === 'settings'         && <Settings />}
      </div>

      <InfraFieldLens
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onImport={handleLensImport}
      />
    </AppLayout>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
