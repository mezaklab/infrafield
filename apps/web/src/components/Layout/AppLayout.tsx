import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { TabType } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  onOpenScanner?: () => void;
  onNavigateToAdmin?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onLogout,
  onRefresh,
  onOpenScanner,
  onNavigateToAdmin,
}) => {
  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'NOC // Prefeitura Municipal - Setor de TI';
      case 'assets':
        return 'Gestão de Ativos';
      case 'visits':
        return 'Visitas Técnicas de Campo';
      case 'issues':
        return 'Gestão de Não Conformidades';
      case 'peripherals':
        return 'Gestão de Informática & Periféricos';
      case 'onboarding':
        return 'Onboarding Automático de Equipamentos';
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
