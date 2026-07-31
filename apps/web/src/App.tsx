import React, { useState } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { Visits } from './pages/Visits';
import { Issues } from './pages/Issues';
import { Peripherals } from './pages/Peripherals';
import { TabType } from './types';
import { QRScannerModal } from './components/Camera/QRScannerModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppInner: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState<boolean>(false);

  const handleGlobalScan = (scannedCode: string) => {
    alert(`🔍 QR Code Lido Globalmente: ${scannedCode}. Redirecionando para o catálogo de ativos...`);
    setActiveTab('assets');
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={logout}
      onRefresh={() => setRefreshKey((prev) => prev + 1)}
      onOpenScanner={() => setIsGlobalScannerOpen(true)}
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
