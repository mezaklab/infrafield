import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Bell,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { SystemSettingsData } from '../../types';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsData>({
    maintenanceMode: 'false',
    sessionTimeoutMinutes: '60',
    requireMfaForAdmins: 'true',
    icmpPingIntervalSeconds: '30',
    alertEmailNotification: 'noc-alerts@infrafield.io',
    maxLoginAttempts: '5',
    autoAuditLogRetentionDays: '90',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; settings: SystemSettingsData }>('/admin/settings');
      if (res.data?.settings) {
        setSettings((prev) => ({ ...prev, ...res.data.settings }));
      }
    } catch (err) {
      console.warn('Backend settings fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      setSaving(true);
      await api.put('/admin/settings', settings);
      setFeedback({ type: 'success', message: 'Configurações do sistema salvas com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-purple-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-slate-300">Carregando configurações do sistema...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-purple-900/40 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Configurações Globais do Sistema</h2>
            <p className="text-xs text-slate-400">Parâmetros operacionais, segurança e monitoramento</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="min-h-11 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Salvar Alterações</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security & Access */}
        <div className="surface-base bg-slate-900/80 border border-purple-900/40 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-purple-400">
            <Lock className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Segurança & Autenticação</h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Modo de Manutenção ADM</div>
                <div className="text-xs text-slate-400">Bloqueia acessos comuns no app durante manutenção</div>
              </div>
              <select
                value={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.value })}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono font-bold"
              >
                <option value="false">DESATIVADO</option>
                <option value="true">ATIVADO</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Tempo de Expiração de Sessão JWT (Minutos)</label>
              <input
                type="number"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Tentativas Máximas de Login</label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Monitoring & Alerts */}
        <div className="surface-base bg-slate-900/80 border border-cyan-900/40 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-cyan-400">
            <Bell className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Monitoramento & Notificações</h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Intervalo de Polling ICMP Ping (Segundos)</label>
              <input
                type="number"
                value={settings.icmpPingIntervalSeconds}
                onChange={(e) => setSettings({ ...settings, icmpPingIntervalSeconds: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">E-mail para Recebimento de Alertas Críticos</label>
              <input
                type="email"
                value={settings.alertEmailNotification}
                onChange={(e) => setSettings({ ...settings, alertEmailNotification: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Retenção de Logs de Auditoria (Dias)</label>
              <input
                type="number"
                value={settings.autoAuditLogRetentionDays}
                onChange={(e) => setSettings({ ...settings, autoAuditLogRetentionDays: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
