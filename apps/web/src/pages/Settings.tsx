import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  
  
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  FolderKanban,
  X,
  
  
  Send,
  
} from 'lucide-react';
import { api } from '../services/api';


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

export const Settings: React.FC = () => {
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
    fetchSectors();
    fetchCategories();
  }, []);



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


  const [testingSend, setTestingSend] = useState<boolean>(false);

  const handleTestSend = async () => {
    try {
      setTestingSend(true);
      await api.post("/notifications/test");
      
      
      setFeedback({ type: 'success', message: 'Mensagem de teste enviada com sucesso para o grupo do Telegram!' });
    } catch (err) {
      console.error('Erro no teste de envio do Telegram:', err);
      setFeedback({ type: 'error', message: 'Falha ao enviar mensagem de teste para o Telegram. Verifique se o bot está no grupo.' });
    } finally {
      setTestingSend(false);
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
            Gerenciamento de integrações com Telegram, cadastro de setores e categorias de chamados
          </p>
        </div>

        <button
          onClick={() => {
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

      {/* Seção 1: Integração Telegram */}
      <section className="settings-panel surface-elevated rounded-2xl p-4 sm:p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-3 border-b if-divider pb-4">
          <div className="icon-box h-11 w-11 rounded-xl bg-[var(--if-accent-soft)] text-[var(--if-accent)] border border-cyan-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="if-text text-base md:text-lg font-bold">Integrador de Alertas (Telegram)</h2>
            <p className="if-text-secondary text-xs">Roteamento automático de alertas para grupos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
          {/* Painel Telegram */}
          <div className="settings-subpanel md:col-span-3 rounded-2xl p-4 sm:p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="if-text-secondary text-xs font-bold tracking-wide">
                  Grupo de Destino dos Alertas
                </label>
              </div>

              <a
                href="https://t.me/infrafield_alertas_bot?startgroup=true"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-11 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Vincular Grupo do Telegram
              </a>

              <p className="if-text-secondary text-xs mt-3 leading-relaxed">
                Clique no botão para adicionar o bot ao grupo desejado. O sistema registrará automaticamente o ID do grupo assim que você enviar a primeira mensagem lá dentro.
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
    </div>
  );
};
