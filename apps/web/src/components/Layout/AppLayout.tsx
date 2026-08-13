import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { TabType } from '../../types';
import type { PeripheralsSubTab } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  onOpenScanner?: () => void;
  scannerOpen?: boolean;
  onNavigateToAdmin?: () => void;
  onOpenCreateTicket?: () => void;
  activePeripheralSub?: PeripheralsSubTab;
  setActivePeripheralSub?: (sub: PeripheralsSubTab) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onLogout,
  onRefresh,
  onOpenScanner,
  scannerOpen,
  onNavigateToAdmin,
  onOpenCreateTicket,
  activePeripheralSub,
  setActivePeripheralSub,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Operações & Infraestrutura de TI';
      case 'assets':
        return 'Gestão de Redes & Infraestrutura';
      case 'visits':
        return 'Visitas Técnicas de Campo';
      case 'issues':
        return 'Gestão de Não Conformidades';
      case 'peripherals':
        return 'Gestão de Ativos de TI';
      case 'tickets':
        return 'Central de Chamados & Helpdesk';
      case 'ticket-dashboard':
        return 'Dashboard & Métricas Helpdesk';
      default:
        return 'InfraField';
    }
  };

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100 overflow-x-clip">
      {/* Sidebar for Desktop */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
        onNavigateToAdmin={onNavigateToAdmin} 
        onOpenCreateTicket={onOpenCreateTicket}
        activePeripheralSub={activePeripheralSub}
        setActivePeripheralSub={setActivePeripheralSub}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <Header title={getTitle()} onRefresh={onRefresh} onOpenMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:p-5 lg:p-7 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        onOpenScanner={onOpenScanner}
        scannerOpen={scannerOpen}
      />
      <MobileDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} activeTab={activeTab} onNavigate={setActiveTab} onAdmin={onNavigateToAdmin} onLogout={onLogout} />
    </div>
  );
};
