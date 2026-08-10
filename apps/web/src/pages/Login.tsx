import React, { useState } from 'react';
import { Server, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle, Shield, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      // Navigation handled by App.tsx (isAuthenticated flips to true)
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Erro ao conectar com o servidor. Verifique a API.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'tech') => {
    if (role === 'admin') { setUsername('superadmin.geral'); setPassword('191003'); }
    else                  { setUsername('carlos.tecnico'); setPassword('123'); }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 text-white mb-4 relative">
            <Server className="w-8 h-8" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">InfraField NOC</h1>
          <p className="text-xs text-slate-400 mt-1">Operações &amp; Infraestrutura de TI</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome de Usuário (Login)</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors placeholder:text-slate-600 font-mono"
                placeholder="Digite seu usuário, ex: mezak.filho"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                required
                autoComplete="current-password"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-100 focus:outline-none transition-colors placeholder:text-slate-600"
                placeholder="••••••••"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm transition-all duration-200 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Autenticando...
              </span>
            ) : (
              <>
                <span>Acessar o Sistema NOC</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick demo access */}
        <div className="mt-5 space-y-2">
          <p className="text-center text-[11px] text-slate-500 uppercase tracking-wider font-bold">Acesso rápido (demonstração)</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin')}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-cyan-400 rounded-xl transition-all cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Admin / Gestor
            </button>
            <button
              type="button"
              onClick={() => fillDemo('tech')}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold text-slate-300 hover:text-amber-400 rounded-xl transition-all cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              Técnico de Campo
            </button>
          </div>
        </div>

        {/* Footer badge */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autenticação JWT + RBAC &bull; Acesso controlado por perfil</span>
        </div>
      </div>
    </div>
  );
};
