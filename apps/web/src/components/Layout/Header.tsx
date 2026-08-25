import React from 'react';
import { Search, RefreshCw, WifiOff, Menu } from 'lucide-react';
import { useOnlineStatus } from '../../services/offlineSync';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
  onOpenMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onRefresh, onOpenMenu }) => {
  const { isOnline, pendingCount, syncNow } = useOnlineStatus();

  return (
    <header className="surface-ambient sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-cyan-500/10 px-3 sm:px-5 lg:px-8 py-2.5 sm:py-4 flex items-center justify-between shadow-xl safe-header gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onOpenMenu} className="md:hidden touch-target rounded-xl bg-slate-900 border border-slate-800 text-cyan-300" aria-label="Abrir menu"><Menu className="w-5 h-5" /></button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-lg md:text-xl font-bold text-white tracking-tight truncate">{title}</h2>
          </div>
          {title !== 'Operações & Infraestrutura de TI' && <p className="text-xs text-slate-400 hidden sm:block">Operações &amp; Infraestrutura de TI</p>}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {/* Offline / Online Status Indicator */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-2 text-xs text-slate-300" aria-label="InfraField Operacional">
              <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="hidden md:inline">InfraField Operacional</span>
              {pendingCount > 0 && (
                <button
                  onClick={() => syncNow()}
                  className="ml-1 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Sincronizar ({pendingCount})
                </button>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">InfraField indisponível</span>
              {pendingCount > 0 && (
                <span className="text-[10px] bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </span>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="touch-target text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-xl transition-all"
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

        <NotificationBell />
        <ThemeToggle />

        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold text-slate-300">InfraField</span>
        </div>
      </div>
    </header>
  );
};
