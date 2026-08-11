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

import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { AdminUsers } from './pages/Admin/AdminUsers';
import { AdminAuditLogs } from './pages/Admin/AdminAuditLogs';
import { AdminSettings } from './pages/Admin/AdminSettings';
import { AdminLocations } from './pages/Admin/AdminLocations';

import { TabType, AdminTabType } from './types';
import { QRScannerModal } from './components/Camera/QRScannerModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppInner: React.FC = () => {
  const { isAuthenticated, isLoading, logout, isFinalUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabType>('dashboard');
  const [activePeripheralSub, setActivePeripheralSub] = useState<PeripheralsSubTab>('TODOS');
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState<boolean>(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState<boolean>(false);

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
      if (currentPath.startsWith('/admin') || currentPath !== '/tickets') {
        if (window.location.pathname !== '/tickets') {
          window.history.replaceState({}, '', '/tickets');
        }
        setCurrentPath('/tickets');
      }
      return;
    }

    if (currentPath.startsWith('/admin')) {
      if (currentPath.includes('/users')) setActiveAdminTab('users');
      else if (currentPath.includes('/audit-logs')) setActiveAdminTab('audit-logs');
      else if (currentPath.includes('/settings')) setActiveAdminTab('settings');
      else if (currentPath.includes('/locations')) setActiveAdminTab('locations');
      else setActiveAdminTab('dashboard');
    } else if (currentPath.startsWith('/perifericos') || currentPath.startsWith('/peripherals')) {
      setActiveTab('peripherals');
    } else if (currentPath.includes('/tickets/dashboard') || currentPath.includes('/helpdesk/dashboard')) {
      setActiveTab('ticket-dashboard');
    } else if (currentPath.startsWith('/tickets') || currentPath.startsWith('/chamados')) {
      setActiveTab('tickets');
    } else if (currentPath.startsWith('/assets') || currentPath.startsWith('/redes')) {
      setActiveTab('assets');
    } else if (currentPath.startsWith('/visits') || currentPath.startsWith('/visitas')) {
      setActiveTab('visits');
    } else if (currentPath.startsWith('/issues') || currentPath.startsWith('/nao-conformidades')) {
      setActiveTab('issues');
    } else if (currentPath === '/' || currentPath === '/dashboard') {
      setActiveTab('dashboard');
    }
  }, [currentPath, isFinalUser, isLoading]);

  const navigateToPath = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  const handleGlobalScan = (scannedCode: string) => {
    alert(`🔍 QR Code Lido Globalmente: ${scannedCode}. Redirecionando para o catálogo de ativos...`);
    setActiveTab('assets');
    navigateToPath('/assets');
  };

  // Dedicated Isolated Route: /onboard or /onboarding (No Layout, No Sidebar)
  if (currentPath.startsWith('/onboard') || currentPath.startsWith('/onboarding')) {
    return <OnboardStandalone />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-[#00f2fe] space-y-4">
        <div className="w-10 h-10 border-4 border-[#00f2fe]/30 border-t-[#00f2fe] rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400">Verificando sessão...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
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
        setActiveTab(tab);
        navigateToPath(`/${tab}`);
      }}
      onLogout={logout}
      onRefresh={() => setRefreshKey((prev) => prev + 1)}
      onOpenScanner={() => setIsGlobalScannerOpen(true)}
      onNavigateToAdmin={() => navigateToPath('/admin/dashboard')}
      activePeripheralSub={activePeripheralSub}
      setActivePeripheralSub={setActivePeripheralSub}
      onOpenCreateTicket={() => {
        setActiveTab('tickets');
        setIsCreateTicketModalOpen(true);
      }}
    >
      <div key={refreshKey}>
        {activeTab === 'dashboard'        && <Dashboard onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'ticket-dashboard' && <TicketDashboard onNavigateToTickets={() => { setActiveTab('tickets'); navigateToPath('/tickets'); }} />}
        {activeTab === 'tickets'          && <Tickets isCreateOpen={isCreateTicketModalOpen} onCloseCreateModal={() => setIsCreateTicketModalOpen(false)} />}
        {activeTab === 'assets'           && <Assets />}
        {activeTab === 'visits'           && <Visits />}
        {activeTab === 'issues'           && <Issues />}
        {activeTab === 'peripherals'      && <Peripherals key={`peripherals-${activePeripheralSub}`} defaultSubTab={activePeripheralSub} onSubTabChange={setActivePeripheralSub} />}
      </div>

      {/* Global QR Code / Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onScan={handleGlobalScan}
      />
    </AppLayout>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;
