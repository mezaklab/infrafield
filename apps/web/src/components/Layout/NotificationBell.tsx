import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, AlertTriangle, CheckCircle2, ShieldAlert, Info, Check } from 'lucide-react';
import { NotificationItem } from '../../types';
import { getNotifications, markNotificationsAsRead } from '../../services/api';
import { getSocket } from '../../services/socket';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.warn('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Sincronização em tempo real via WebSockets
    const socket = getSocket();
    const handleStatusUpdated = () => {
      // Recarrega as notificações quando um evento de status ocorrer
      fetchNotifications();
    };

    socket.on('statusUpdated', handleStatusUpdated);

    return () => {
      socket.off('statusUpdated', handleStatusUpdated);
    };
  }, [fetchNotifications]);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Conta quantas notificações não foram lidas
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Toggle do painel com acionamento de 'marcar como lido' imediato
  const handleToggleOpen = async () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);

    // Se estiver abrindo o painel e houver pendências não lidas
    if (willOpen && unreadCount > 0) {
      // Limpa a flag local instantaneamente na tela
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      // Sincroniza com o banco de dados no backend
      try {
        await markNotificationsAsRead();
      } catch (err) {
        console.warn('Erro ao marcar notificações como lidas no servidor:', err);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ALERT':
        return <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-[#00f2fe] shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Botão do Sino com Indicador de Alerta */}
      <button
        onClick={handleToggleOpen}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? 'bg-slate-900 border-[#00f2fe]/40 text-[#00f2fe]'
            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
        title="Painel de Notificações NOC"
      >
        <Bell className="w-4 h-4" />

        {/* Bolinha Indicadora de Não Lidas — Só aparece se unreadCount > 0 */}
        {unreadCount > 0 && (
          <>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping pointer-events-none"></span>
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-slate-950 shadow-lg">
              {unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Painel Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#080d1a] border border-cyan-500/20 rounded-2xl shadow-2xl z-50 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">Notificações NOC</h4>
              <span className="text-[10px] font-mono font-bold bg-[#00f2fe]/10 text-[#00f2fe] border border-[#00f2fe]/20 px-2 py-0.5 rounded-full">
                {notifications.length} registros
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleToggleOpen}
                className="text-[10px] font-semibold text-slate-400 hover:text-[#00f2fe] flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" /> Limpar Alertas
              </button>
            )}
          </div>

          {/* Conteúdo da Lista */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Carregando alertas...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                Nenhum alerta recente cadastrado no sistema.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all text-xs ${
                    !item.isRead
                      ? 'bg-[#050811] border-cyan-500/30'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {getNotificationIcon(item.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h5 className="font-bold text-slate-200 truncate">{item.title}</h5>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed leading-normal">{item.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-center text-[10px] text-slate-400">
            Sincronização Ativa em Tempo Real via Socket.IO
          </div>
        </div>
      )}
    </div>
  );
};
