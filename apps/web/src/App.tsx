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
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabType>('dashboard');
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState<boolean>(false);

  // Sync window location pathname & history
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update active tabs when path changes
  useEffect(() => {
    if (currentPath.startsWith('/admin')) {
      if (currentPath.includes('/users')) setActiveAdminTab('users');
      else if (currentPath.includes('/audit-logs')) setActiveAdminTab('audit-logs');
      else if (currentPath.includes('/settings')) setActiveAdminTab('settings');
      else if (currentPath.includes('/locations')) setActiveAdminTab('locations');
      else setActiveAdminTab('dashboard');
    } else if (currentPath.startsWith('/perifericos') || currentPath.startsWith('/peripherals')) {
      setActiveTab('peripherals');
    }
  }, [currentPath]);

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
    >
      <div key={refreshKey}>
        {activeTab === 'dashboard'   && <Dashboard onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'assets'      && <Assets />}
        {activeTab === 'visits'      && <Visits />}
        {activeTab === 'issues'      && <Issues />}
        {activeTab === 'peripherals' && <Peripherals />}
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
