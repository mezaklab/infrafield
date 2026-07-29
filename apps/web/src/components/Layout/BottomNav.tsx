import React from 'react';
import { LayoutDashboard, Box, MapPin, LogOut, Scan } from 'lucide-react';
import { TabType } from '../../types';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout: () => void;
  onOpenScanner?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  onOpenScanner,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50 px-2 py-2 select-none shadow-2xl">
      <div className="flex items-center justify-around relative">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'scale-110 text-cyan-400' : ''}`} />
          <span className="text-[10px]">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            activeTab === 'assets' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className={`w-5 h-5 ${activeTab === 'assets' ? 'scale-110 text-cyan-400' : ''}`} />
          <span className="text-[10px]">Ativos</span>
        </button>

        {/* Highlighted Central QR Code Scan Button */}
        <button
          onClick={onOpenScanner}
          className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white p-3.5 rounded-full shadow-lg shadow-cyan-500/40 border-4 border-slate-950 hover:scale-105 active:scale-95 transition-all"
          title="Escanear QR Code / Patrimônio"
        >
          <Scan className="w-6 h-6 animate-pulse" />
          <span className="sr-only">Escanear QR Code</span>
        </button>

        <button
          onClick={() => setActiveTab('visits')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
            activeTab === 'visits' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className={`w-5 h-5 ${activeTab === 'visits' ? 'scale-110 text-cyan-400' : ''}`} />
          <span className="text-[10px]">Visitas</span>
        </button>

        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-1 px-3 py-1 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px]">Sair</span>
        </button>
      </div>
    </div>
  );
};
