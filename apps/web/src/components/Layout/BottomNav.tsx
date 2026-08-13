import React from 'react';
import { LayoutDashboard, Box, Headset, LogOut, ScanSearch } from 'lucide-react';
import { TabType } from '../../types';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  onOpenScanner?: () => void;
  scannerOpen?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  onOpenScanner,
  scannerOpen = false,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50 px-1 pt-1.5 pb-[max(.4rem,env(safe-area-inset-bottom))] select-none shadow-2xl">
      <div className="flex items-center justify-around relative">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`min-w-12 min-h-12 flex flex-col items-center justify-center gap-0.5 px-1 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'scale-110 text-cyan-400' : ''}`} />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`min-w-12 min-h-12 flex flex-col items-center justify-center gap-0.5 px-1 rounded-xl transition-all ${
            activeTab === 'assets' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className={`w-5 h-5 ${activeTab === 'assets' ? 'scale-110 text-cyan-400' : ''}`} />
          <span className="text-[10px]">Ativos</span>
        </button>

        {/* InfraField Lens */}
        <button
          onClick={onOpenScanner}
          aria-pressed={scannerOpen}
          className={`lens-launch-button touch-target flex flex-col items-center justify-center -mt-5 rounded-full active:scale-95 transition-all ${scannerOpen ? 'is-open' : ''}`}
          title="InfraField Lens — Identificar ativo"
        >
          <ScanSearch className="w-6 h-6" />
          <span className="sr-only">Abrir InfraField Lens</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`min-w-12 min-h-12 flex flex-col items-center justify-center gap-0.5 px-1 rounded-xl transition-all ${
            activeTab === 'tickets' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Headset className={`w-5 h-5 ${activeTab === 'tickets' ? 'scale-110 text-cyan-400' : ''}`} />
          <span className="text-[10px]">Chamados</span>
        </button>

        <button
          onClick={onLogout}
          className="min-w-12 min-h-12 flex flex-col items-center justify-center gap-0.5 px-1 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px]">Sair</span>
        </button>
      </div>
    </div>
  );
};
