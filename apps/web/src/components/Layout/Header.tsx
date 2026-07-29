import React from 'react';
import { Bell, Search, Server, RefreshCw, Wifi, WifiOff, Activity } from 'lucide-react';
import { useOnlineStatus } from '../../services/offlineSync';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onRefresh }) => {
  const { isOnline, pendingCount, syncNow } = useOnlineStatus();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/10 px-4 md:px-8 py-4 flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">{title}</h2>
            <span className="hidden xl:inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" /> NOC NOC-01
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">Painel Operacional e Gestão de Infraestrutura de Campo</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Realtime LED Status Telemetry Indicator */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-950/90 border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono font-semibold text-emerald-400">TELEMETRIA 1ms</span>
        </div>

        {/* Offline / Online Status Indicator */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Online</span>
              {pendingCount > 0 && (
                <button
                  onClick={() => syncNow()}
                  className="ml-1 text-[10px] bg-cyan-500 text-white px-2 py-0.5 rounded-full hover:bg-cyan-400"
                >
                  Sincronizar ({pendingCount})
                </button>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Modo Offline</span>
              {pendingCount > 0 && (
                <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </span>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-xl transition-all"
            title="Atualizar Dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <div className="relative hidden xl:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ativos, ordens, técnicos..."
            className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-60"
          />
        </div>

        <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-xl border border-slate-800">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold text-slate-300">TechCorp</span>
        </div>
      </div>
    </header>
  );
};
