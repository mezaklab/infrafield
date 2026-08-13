import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  QrCode,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  FolderKanban,
  X,
  Wifi,
  WifiOff,
  Send,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';

interface WhatsAppGroup {
  id: string;
  subject: string;
}

interface Sector {
  id: string;
  name: string;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

interface SettingsData {
  id?: string;
  whatsapp_group_id: string | null;
  whatsapp_group_name: string | null;
  whatsapp_status: string | null;
}

export const Settings: React.FC = () => {
  // Settings & WhatsApp State
  const [settings, setSettings] = useState<SettingsData>({
    whatsapp_group_id: null,
    whatsapp_group_name: null,
    whatsapp_status: 'DISCONNECTED',
  });
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);

  // Sectors & Categories State
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingSectors, setLoadingSectors] = useState<boolean>(false);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);

  // Form Inputs for Adding
  const [newSectorName, setNewSectorName] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [addingSector, setAddingSector] = useState<boolean>(false);
  const [addingCategory, setAddingCategory] = useState<boolean>(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar configurações:', err);
    }
  };

  const fetchWhatsappStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await api.get('/whatsapp/status');
      if (res.data) {
        const status = res.data.status || 'UNKNOWN';
        setSettings((prev) => ({ ...prev, whatsapp_status: status }));
      }
    } catch (err) {
      console.warn('Erro ao buscar status do WhatsApp:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchWhatsappGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await api.get('/whatsapp/groups');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setGroups(res.data.data);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Erro ao carregar grupos do WhatsApp' });
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchSectors = async () => {
    try {
      setLoadingSectors(true);
      const res = await api.get('/sectors');
      if (res.data?.data) {
        setSectors(res.data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar setores:', err);
    } finally {
      setLoadingSectors(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await api.get('/categories');
      if (res.data?.data) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWhatsappStatus();
    fetchWhatsappGroups();
    fetchSectors();
    fetchCategories();
  }, []);

  const handleGenerateQrCode = async () => {
    try {
      setLoadingQr(true);
      setQrCodeUrl(null);

      const res = await api.get('/whatsapp/qrcode');

      if (res.data?.connected) {
        setIsQrModalOpen(false);
        setSettings((prev) => ({ ...prev, whatsapp_status: 'open' }));
        setFeedback({ type: 'success', message: 'WhatsApp já conectado!' });
        return;
      }

      if (res.data?.qrcode) {
        setQrCodeUrl(res.data.qrcode);
        setIsQrModalOpen(true);
      } else {
        setIsQrModalOpen(false);
        setFeedback({
          type: 'error',
          message: res.data?.message || 'Erro ao obter QR Code do WhatsApp.',
        });
      }
    } catch (err: any) {
      console.error('[QR Code] Erro na requisição:', err?.response?.data ?? err?.message);
      setIsQrModalOpen(false);
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Erro ao gerar QR Code do WhatsApp.',
      });
    } finally {
      setLoadingQr(false);
    }
  };

  const handleSaveSettings = async () => {
    setFeedback(null);
    try {
      setSavingSettings(true);
      const selectedGroup = groups.find((g) => g.id === settings.whatsapp_group_id);
      const payload = {
        whatsapp_group_id: settings.whatsapp_group_id,
        whatsapp_group_name: selectedGroup ? selectedGroup.subject : settings.whatsapp_group_name,
      };

      await api.post('/settings', payload);
      setFeedback({ type: 'success', message: 'Configurações de integração do WhatsApp salvas!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Erro ao salvar configurações.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Sector Handlers
  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim()) return;
    try {
      setAddingSector(true);
      const res = await api.post('/sectors', { name: newSectorName.trim() });
      if (res.data?.data) {
        setSectors((prev) => [...prev, res.data.data]);
        setNewSectorName('');
        setFeedback({ type: 'success', message: 'Setor adicionado com sucesso!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Erro ao criar setor.' });
    } finally {
      setAddingSector(false);
    }
  };

  const handleDeleteSector = async (id: string) => {
    if (!confirm('Deseja realmente remover este setor?')) return;
    try {
      await api.delete(`/sectors/${id}`);
      setSectors((prev) => prev.filter((s) => s.id !== id));
      setFeedback({ type: 'success', message: 'Setor removido com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Erro ao remover setor.' });
    }
  };

  // Category Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setAddingCategory(true);
      const res = await api.post('/categories', { name: newCategoryName.trim() });
      if (res.data?.data) {
        setCategories((prev) => [...prev, res.data.data]);
        setNewCategoryName('');
        setFeedback({ type: 'success', message: 'Categoria adicionada com sucesso!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Erro ao criar categoria.' });
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Deseja realmente remover esta categoria?')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setFeedback({ type: 'success', message: 'Categoria removida com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Erro ao remover categoria.' });
    }
  };

  const isConnected = settings.whatsapp_status?.toUpperCase() === 'OPEN' || settings.whatsapp_status?.toUpperCase() === 'CONNECTED';

  const [testingSend, setTestingSend] = useState<boolean>(false);
  const [resettingInstance, setResettingInstance] = useState<boolean>(false);

  const handleTestSend = async () => {
    try {
      setTestingSend(true);
      const res = await api.post('/whatsapp/test-send');

      if (res.data?.success === true) {
        setFeedback({ type: 'success', message: 'Mensagem de teste enviada com sucesso para o grupo!' });
        return;
      }

      setFeedback({ type: 'error', message: 'Falha ao enviar mensagem de teste para o grupo.' });
    } catch (err) {
      console.error('Erro no teste de envio do WhatsApp:', err);
      setFeedback({ type: 'error', message: 'Falha ao enviar mensagem de teste para o grupo.' });
    } finally {
      setTestingSend(false);
    }
  };

  const handleResetInstance = async () => {
    if (!confirm('Isso irá deletar e recriar a instância do WhatsApp do zero. Deseja continuar?')) return;
    try {
      setResettingInstance(true);
      setFeedback(null);
      const res = await api.post('/whatsapp/reset-instance');
      setFeedback({ type: 'success', message: res.data?.message || 'Instância resetada! Gerando QR Code...' });
      // Auto-dispara geração do QR Code após reset bem-sucedido
      await handleGenerateQrCode();
    } catch (err: any) {
      console.error('[Reset Instance] Erro:', err?.response?.data || err?.message);
      const errorMsg = err?.response?.data?.error || err?.message || 'Erro ao resetar instância';
      setFeedback({ type: 'error', message: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg });
    } finally {
      setResettingInstance(false);
    }
  };

  return (
    <div className="settings-page space-y-5 max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="settings-hero surface-ambient flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 md:p-6">
        <div>
          <h1 className="if-text text-xl md:text-2xl font-black tracking-tight">
            Painel de Configurações Operacionais
          </h1>
          <p className="if-text-secondary mt-1 text-xs md:text-sm">
            Gerenciamento de integrações com WhatsApp, cadastro de setores e categorias de chamados
          </p>
        </div>

        <button
          onClick={() => {
            fetchSettings();
            fetchWhatsappStatus();
            fetchWhatsappGroups();
            fetchSectors();
            fetchCategories();
          }}
          className="if-button-secondary min-h-10 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {feedback && (
        <div className={`settings-feedback p-4 rounded-2xl border text-xs md:text-sm font-semibold flex items-center justify-between gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 success-text'
            : 'bg-rose-500/10 border-rose-500/30 danger-text'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="icon-box h-8 w-8 rounded-lg if-text-muted hover:text-[var(--if-text)] hover:bg-black/5" aria-label="Fechar mensagem">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Seção 1: Conexão WhatsApp */}
      <section className="settings-panel surface-elevated rounded-2xl p-4 sm:p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between border-b if-divider pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-box h-11 w-11 rounded-xl bg-[var(--if-accent-soft)] text-[var(--if-accent)] border border-cyan-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="if-text text-base md:text-lg font-bold">Integrador WhatsApp (Evolution API)</h2>
              <p className="if-text-secondary text-xs">Status da instância e roteamento de alertas para grupos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchWhatsappStatus}
              disabled={loadingStatus}
              className="if-button-secondary icon-box h-10 w-10 rounded-xl"
              title="Atualizar Status"
              aria-label="Atualizar status do WhatsApp"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
          {/* Card Status */}
          <div className={`settings-status-card p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
            isConnected
              ? 'is-connected border-emerald-500/30 success-text'
              : 'is-disconnected border-rose-500/30 danger-text'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Atual</span>
              {isConnected ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-rose-400" />}
            </div>

            <div>
              <div className="metric-number text-2xl font-black tracking-tight">
                {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
              </div>
              <div className="if-text-secondary text-xs mt-1.5 font-mono leading-relaxed">
                Estado da instância: {settings.whatsapp_status || 'DESCONHECIDO'}
              </div>
            </div>

            <button
              onClick={handleGenerateQrCode}
              disabled={loadingQr || resettingInstance}
              className="if-button-primary min-h-10 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
            >
              {loadingQr ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              <span>{loadingQr ? 'Gerando...' : 'Gerar QR Code'}</span>
            </button>

            <button
              onClick={handleResetInstance}
              disabled={resettingInstance || loadingQr}
              className="if-button-danger min-h-10 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
              title="Deleta e recria a instância para destravar estado 'connecting'"
            >
              {resettingInstance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{resettingInstance ? 'Resetando...' : 'Resetar Instância'}</span>
            </button>
          </div>

          {/* Seleção do Grupo de Destino */}
          <div className="settings-subpanel md:col-span-2 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="whatsapp-alert-group" className="if-text-secondary text-xs font-bold tracking-wide">
                  Grupo de Destino dos Alertas
                </label>
                <button
                  onClick={fetchWhatsappGroups}
                  disabled={loadingGroups}
                  className="action-text inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} />
                  <span>Atualizar grupos</span>
                </button>
              </div>

              <select
                id="whatsapp-alert-group"
                value={settings.whatsapp_group_id || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_group_id: e.target.value })}
                className="settings-control w-full min-h-11 px-4 py-3 rounded-xl text-sm font-medium"
              >
                <option value="">-- Selecione o Grupo de Notificação --</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.subject} ({group.id})
                  </option>
                ))}
              </select>

              <p className="if-text-secondary text-xs mt-2 leading-relaxed">
                Os alertas de novos chamados abertos no sistema serão enviados automaticamente para o grupo selecionado acima.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <button
                onClick={handleTestSend}
                disabled={testingSend}
                className="if-button-secondary min-h-10 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
              >
                {testingSend ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Testar Envio</span>
              </button>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="if-button-primary min-h-10 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50"
              >
                {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Seleção de Grupo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Setores e Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
        {/* Gestão de Setores */}
        <section className="settings-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b if-divider text-[var(--if-accent)]">
            <Building2 className="w-5 h-5" />
            <h2 className="if-text text-base font-bold">Gestão de Setores</h2>
          </div>

          {/* Adicionar Setor */}
          <form onSubmit={handleAddSector} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nome do novo setor..."
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              className="settings-control min-h-10 flex-1 px-4 py-2 rounded-xl text-sm"
            />
            <button
              type="submit"
              disabled={addingSector || !newSectorName.trim()}
              className="if-button-primary min-h-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-50"
            >
              {addingSector ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Adicionar</span>
            </button>
          </form>

          {/* Lista de Setores */}
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pt-2">
            {loadingSectors ? (
              <div className="settings-empty flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Carregando setores...</span>
              </div>
            ) : sectors.length === 0 ? (
              <div className="settings-empty"><Building2 className="h-4 w-4" aria-hidden="true" /><span>Nenhum setor cadastrado.</span></div>
            ) : (
              sectors.map((sec) => (
                <div
                  key={sec.id}
                  className="settings-list-item flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <span className="if-text font-semibold truncate">{sec.name}</span>
                  <button
                    onClick={() => handleDeleteSector(sec.id)}
                    className="settings-remove icon-box h-8 w-8 rounded-lg"
                    title="Excluir setor"
                    aria-label={`Excluir setor ${sec.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Gestão de Categorias */}
        <section className="settings-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b if-divider text-[var(--if-accent)]">
            <FolderKanban className="w-5 h-5" />
            <h2 className="if-text text-base font-bold">Categorias de Atendimento</h2>
          </div>

          {/* Adicionar Categoria */}
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nome da nova categoria..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="settings-control min-h-10 flex-1 px-4 py-2 rounded-xl text-sm"
            />
            <button
              type="submit"
              disabled={addingCategory || !newCategoryName.trim()}
              className="if-button-primary min-h-10 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-50"
            >
              {addingCategory ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Adicionar</span>
            </button>
          </form>

          {/* Lista de Categorias */}
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pt-2">
            {loadingCategories ? (
              <div className="settings-empty flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Carregando categorias...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="settings-empty"><FolderKanban className="h-4 w-4" aria-hidden="true" /><span>Nenhuma categoria cadastrada.</span></div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="settings-list-item flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <span className="if-text font-semibold truncate">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="settings-remove icon-box h-8 w-8 rounded-lg"
                    title="Excluir categoria"
                    aria-label={`Excluir categoria ${cat.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal QR Code */}
      {isQrModalOpen && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel max-w-sm space-y-5 text-center relative">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-extrabold text-white">Conectar WhatsApp</h3>
              <p className="text-xs text-slate-400 mt-1">Escaneie o QR Code no seu aplicativo do WhatsApp</p>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-inner min-h-[280px]">
              {qrCodeUrl ? (
                <img
                  key={qrCodeUrl.slice(-10)}
                  src={qrCodeUrl}
                  alt="QR Code WhatsApp"
                  className="w-full max-w-64 aspect-square object-contain block m-auto"
                  onError={(e) => {
                    console.error("Erro de renderização da imagem:", e);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                  <p className="text-sm font-medium">Carregando QR Code...</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
