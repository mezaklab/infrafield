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
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Painel de Configurações Operacionais
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
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
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs md:text-sm font-semibold flex items-center justify-between gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Seção 1: Conexão WhatsApp */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white">Integrador WhatsApp (Evolution API)</h2>
              <p className="text-xs text-slate-400">Status da instância e roteamento de alertas para grupos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchWhatsappStatus}
              disabled={loadingStatus}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="Atualizar Status"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Status */}
          <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
            isConnected
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Status Atual</span>
              {isConnected ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-rose-400" />}
            </div>

            <div>
              <div className="text-2xl font-black tracking-tight">
                {isConnected ? 'CONECTADO' : 'DESCONECTADO'}
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Estado da instância: {settings.whatsapp_status || 'DESCONHECIDO'}
              </div>
            </div>

            <button
              onClick={handleGenerateQrCode}
              disabled={loadingQr || resettingInstance}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {loadingQr ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              <span>{loadingQr ? 'Gerando...' : 'Gerar QR Code'}</span>
            </button>

            <button
              onClick={handleResetInstance}
              disabled={resettingInstance || loadingQr}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
              title="Deleta e recria a instância para destravar estado 'connecting'"
            >
              {resettingInstance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{resettingInstance ? 'Resetando...' : 'Resetar Instância'}</span>
            </button>
          </div>

          {/* Seleção do Grupo de Destino */}
          <div className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Grupo de Destino dos Alertas
                </label>
                <button
                  onClick={fetchWhatsappGroups}
                  disabled={loadingGroups}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} />
                  <span>Atualizar grupos</span>
                </button>
              </div>

              <select
                value={settings.whatsapp_group_id || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_group_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all font-medium"
              >
                <option value="">-- Selecione o Grupo de Notificação --</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.subject} ({group.id})
                  </option>
                ))}
              </select>

              <p className="text-xs text-slate-400 mt-2">
                Os alertas de novos chamados abertos no sistema serão enviados automaticamente para o grupo selecionado acima.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleTestSend}
                disabled={testingSend}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                {testingSend ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Testar Envio</span>
              </button>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all"
              >
                {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Salvar Seleção de Grupo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Setores e Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gestão de Setores */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800 text-cyan-400">
            <Building2 className="w-5 h-5" />
            <h2 className="text-base font-bold text-white">Gestão de Setores</h2>
          </div>

          {/* Adicionar Setor */}
          <form onSubmit={handleAddSector} className="flex gap-2">
            <input
              type="text"
              placeholder="Nome do novo setor..."
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={addingSector || !newSectorName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {addingSector ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Adicionar</span>
            </button>
          </form>

          {/* Lista de Setores */}
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pt-2">
            {loadingSectors ? (
              <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Carregando setores...</span>
              </div>
            ) : sectors.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">Nenhum setor cadastrado.</div>
            ) : (
              sectors.map((sec) => (
                <div
                  key={sec.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all text-xs"
                >
                  <span className="font-semibold text-slate-200">{sec.name}</span>
                  <button
                    onClick={() => handleDeleteSector(sec.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Excluir setor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Gestão de Categorias */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800 text-purple-400">
            <FolderKanban className="w-5 h-5" />
            <h2 className="text-base font-bold text-white">Categorias de Atendimento</h2>
          </div>

          {/* Adicionar Categoria */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="Nome da nova categoria..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={addingCategory || !newCategoryName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {addingCategory ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Adicionar</span>
            </button>
          </form>

          {/* Lista de Categorias */}
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pt-2">
            {loadingCategories ? (
              <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Carregando categorias...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">Nenhuma categoria cadastrada.</div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all text-xs"
                >
                  <span className="font-semibold text-slate-200">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Excluir categoria"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal QR Code */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5 text-center relative">
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
                  className="w-64 h-64 object-contain block m-auto"
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
