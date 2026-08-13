import React, { useEffect } from 'react';
import { X, Server, LayoutDashboard, Network, Laptop, MapPin, AlertTriangle, Headset, BarChart3, Settings, ShieldCheck, LogOut } from 'lucide-react';
import { TabType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface Props { open: boolean; onClose: () => void; activeTab: TabType; onNavigate: (tab: TabType) => void; onAdmin?: () => void; onLogout: () => void }

export const MobileDrawer: React.FC<Props> = ({ open, onClose, activeTab, onNavigate, onAdmin, onLogout }) => {
  const { user, canAccessAdmin, isFinalUser } = useAuth();
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, onClose]);
  if (!open) return null;
  const items = isFinalUser ? [{ id: 'tickets' as TabType, label: 'Meus Chamados', icon: Headset }] : [
    { id: 'dashboard' as TabType, label: 'Dashboard NOC', icon: LayoutDashboard },
    { id: 'assets' as TabType, label: 'Redes e Equipamentos', icon: Network },
    { id: 'peripherals' as TabType, label: 'Ativos de TI', icon: Laptop },
    { id: 'visits' as TabType, label: 'Visitas e Checklists', icon: MapPin },
    { id: 'issues' as TabType, label: 'Não Conformidades', icon: AlertTriangle },
    { id: 'ticket-dashboard' as TabType, label: 'Dashboard Helpdesk', icon: BarChart3 },
    { id: 'tickets' as TabType, label: 'Ordens e Chamados', icon: Headset },
    { id: 'settings' as TabType, label: 'Configurações', icon: Settings },
  ];
  return <div className="md:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Menu principal">
    <button aria-label="Fechar menu" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={onClose} />
    <aside className="absolute inset-y-0 left-0 w-[min(86vw,340px)] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 safe-panel">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center"><Server /></div><div><strong className="text-white">InfraField NOC</strong><p className="text-xs text-slate-400">{user?.name}</p></div></div>
        <button className="touch-target text-slate-400" onClick={onClose} aria-label="Fechar menu"><X /></button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { onNavigate(id); onClose(); }} className={`w-full min-h-12 px-4 rounded-xl flex items-center gap-3 text-sm text-left ${activeTab === id ? 'bg-slate-800 text-cyan-300' : 'text-slate-300 active:bg-slate-800'}`}><Icon className="w-5 h-5 shrink-0" />{label}</button>)}
        {canAccessAdmin && <button onClick={() => { onAdmin?.(); onClose(); }} className="w-full min-h-12 px-4 rounded-xl flex items-center gap-3 text-sm text-left text-amber-300 active:bg-slate-800"><ShieldCheck className="w-5 h-5" />Administração</button>}
      </nav>
      <button onClick={onLogout} className="m-3 min-h-12 rounded-xl border border-rose-500/20 text-rose-300 flex items-center justify-center gap-2"><LogOut className="w-5 h-5" />Sair</button>
    </aside>
  </div>;
};
