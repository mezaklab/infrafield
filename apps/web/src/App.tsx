import React, { useState } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { Visits } from './pages/Visits';
import { Issues } from './pages/Issues';
import { TabType } from './types';
import { QRScannerModal } from './components/Camera/QRScannerModal';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState<boolean>(false);

  const handleGlobalScan = (scannedCode: string) => {
    alert(`🔍 QR Code Lido Globalmente: ${scannedCode}. Redirecionando para o catálogo de ativos...`);
    setActiveTab('assets');
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={() => setIsAuthenticated(false)}
      onRefresh={() => setRefreshKey((prev) => prev + 1)}
      onOpenScanner={() => setIsGlobalScannerOpen(true)}
    >
      <div key={refreshKey}>
        {activeTab === 'dashboard' && <Dashboard onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'assets' && <Assets />}
        {activeTab === 'visits' && <Visits />}
        {activeTab === 'issues' && <Issues />}
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

export default App;
