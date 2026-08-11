import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { TabType } from '../../types';
import type { PeripheralsSubTab } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  onOpenScanner?: () => void;
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
  onNavigateToAdmin,
  onOpenCreateTicket,
  activePeripheralSub,
  setActivePeripheralSub,
}) => {
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
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
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
        <Header title={getTitle()} onRefresh={onRefresh} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        onOpenScanner={onOpenScanner}
      />
    </div>
  );
};
