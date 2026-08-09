import React, { useEffect } from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  onNavigateToApp?: () => void;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, onNavigateToApp }) => {
  const { user, canAccessAdmin, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !canAccessAdmin) {
      alert(`⛔ Acesso Negado (HTTP 403): O perfil '${user?.role}' não possui permissão para acessar a rota '/admin'. Redirecionando para o Dashboard...`);
      if (onNavigateToApp) {
        onNavigateToApp();
      }
    }
  }, [isAuthenticated, canAccessAdmin, onNavigateToApp, user?.role]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Sessão Expirada ou Não Autenticado</h2>
          <p className="text-sm text-slate-400">
            Você precisa estar autenticado no sistema para acessar a área de administração.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900/90 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-rose-950/40">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-500/20 animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
              HTTP 403 — Redirecionando para /dashboard
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight pt-2">
              Acesso Negado à Área ADM
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              A rota <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-300 font-mono text-xs">/admin/*</code> é restrita exclusivamente a usuários com perfil <strong className="text-white">ADMIN</strong> ou <strong className="text-amber-400">SUPERADMIN</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs text-slate-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Seu Usuário:</span>
              <span className="text-slate-200">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Seu Perfil Atual:</span>
              <span className="text-cyan-400 font-bold">{user?.role || 'NENHUM'}</span>
            </div>
            <div className="flex justify-between">
              <span>Perfis Permitidos:</span>
              <span className="text-purple-400 font-bold">SUPERADMIN, ADMIN</span>
            </div>
          </div>

          {onNavigateToApp && (
            <button
              onClick={onNavigateToApp}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-600/30"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Dashboard Agora</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
