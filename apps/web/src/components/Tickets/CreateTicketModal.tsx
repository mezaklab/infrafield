import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  FileText, 
  Building2, 
  AlertCircle, 
  RefreshCw, 
  Image as ImageIcon,
  Film,
  Trash2,
  Sparkles,
  Laptop
  ,MapPin
} from 'lucide-react';
import { api } from '../../services/api';
import { TicketPriority } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadedFile {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface SectorOption {
  id: string;
  name: string;
}
interface LocationOption { id: string; name: string; building?: string | null; room?: string | null }

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [loadingSectors, setLoadingSectors] = useState<boolean>(true);
  const [sectorsError, setSectorsError] = useState<boolean>(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [locationsError, setLocationsError] = useState<boolean>(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);

  // Form fields
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [sectorId, setSectorId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [assetId, setAssetId] = useState<string>('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIA');

  // Attachments state
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);

  // Form submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSectors = async () => {
      try {
        setLoadingSectors(true);
        setSectorsError(false);
        const res = await api.get<{ success: boolean; data: SectorOption[] }>('/sectors');
        setSectors(res.data?.data || []);
      } catch (err) {
        console.warn('Failed to load sectors for ticket creation:', err);
        setSectors([]);
        setSectorsError(true);
      } finally {
        setLoadingSectors(false);
      }
    };
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        setLocationsError(false);
        const res = await api.get<LocationOption[]>('/tickets/locations');
        setLocations(res.data || []);
      } catch (err) {
        console.warn('Failed to load locations for ticket creation:', err);
        setLocations([]);
        setLocationsError(true);
      } finally {
        setLoadingLocations(false);
      }
    };

    // Fetch dynamic Categories
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get<{ success: boolean; data: CategoryOption[] }>('/categories');
        const list = res.data?.data || [];
        setCategories(list);
        setCategoryId(list[0]?.id || '');
      } catch (err) {
        console.warn('Failed to load categories:', err);
        setCategories([]);
        setCategoryId('');
      } finally {
        setLoadingCategories(false);
      }
    };

    setSectorId('');
    setLocationId('');
    fetchSectors();
    fetchLocations();
    fetchCategories();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await api.post<UploadedFile>('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setAttachments((prev) => [...prev, res.data]);
      }
    } catch (err: any) {
      setError('Erro ao enviar anexo. Certifique-se que o arquivo possui tamanho válido.');
    } finally {
      setUploading(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sectorId) {
      setError('O campo Setor é obrigatório.');
      return;
    }
    if (!locationId) {
      setError('O campo Localização é obrigatório.');
      return;
    }
    if (!categoryId) {
      setError('O campo Categoria é obrigatório.');
      return;
    }
    if (!subject.trim()) {
      setError('O assunto do chamado é obrigatório.');
      return;
    }
    if (!description.trim()) {
      setError('Por favor, informe a descrição detalhada do problema.');
      return;
    }

    try {
      setIsSubmitting(true);
      const attachmentUrls = attachments.map((a) => a.url);

      await api.post('/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        categoryId,
        sectorId,
        locationId,
        assetId: assetId || undefined,
        priority,
        attachments: attachmentUrls,
      });

      // Reset form
      setSubject('');
      setDescription('');
      setCategoryId('');
      setSectorId('');
      setLocationId('');
      setAssetId('');
      setAttachments([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao registrar chamado. Tente novamente.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="responsive-modal-backdrop animate-fadeIn">
      <div className="responsive-modal-panel bg-[#080d1a] border-cyan-500/30 max-w-2xl space-y-5 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-[#00f2fe] rounded-2xl border border-[#00f2fe]/30 shadow-[0_0_15px_rgba(0,242,254,0.15)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Abertura de Novo Chamado</h2>
              <p className="text-xs text-slate-400">Preencha o formulário para atendimento da equipe de suporte TI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identification Banner */}
        <div className="p-4 rounded-2xl bg-[#050811] border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-sm">
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>{user?.name || 'Usuário'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {user?.role === 'USUARIO' ? 'USUÁRIO' : user?.role || 'SESSÃO ATIVA'}
                </span>
              </div>
              <div className="text-slate-400 font-mono text-[11px] mt-0.5">{user?.email}</div>
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-400">
            <span>Sessão Autenticada</span>
            <div className="text-cyan-400 font-semibold">{user?.company?.name || 'Prefeitura Municipal'}</div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Setor e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Setor (Obrigatório) */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Setor *</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={loadingSectors || sectorsError || sectors.length === 0}
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
                  className="w-full max-w-full px-3.5 py-3 rounded-xl bg-[#050811] border border-slate-800 text-white font-semibold outline-none focus:border-cyan-500 transition-colors disabled:opacity-60"
                >
                  <option value="">Selecione o setor...</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>{sector.name}</option>
                  ))}
                </select>
              </div>
              {loadingSectors && <p className="text-slate-400">Carregando setores...</p>}
              {!loadingSectors && sectorsError && <p className="text-rose-300">Não foi possível carregar os setores.</p>}
              {!loadingSectors && !sectorsError && sectors.length === 0 && <p className="text-amber-300">Nenhum setor cadastrado.</p>}
            </div>

            {/* Localização física (Obrigatória) */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Localização *</span>
              </label>
              <select
                required
                disabled={loadingLocations || locationsError || locations.length === 0}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full max-w-full px-3.5 py-3 rounded-xl bg-[#050811] border border-slate-800 text-white font-semibold outline-none focus:border-cyan-500 transition-colors disabled:opacity-60"
              >
                <option value="">Selecione a localização...</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
              {loadingLocations && <p className="text-slate-400">Carregando localidades...</p>}
              {!loadingLocations && locationsError && <p className="text-rose-300">Erro ao carregar localidades.</p>}
              {!loadingLocations && !locationsError && locations.length === 0 && <p className="text-amber-300">Nenhuma localização cadastrada.</p>}
            </div>

            {/* Categoria Dinâmica */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-purple-400" />
                <span>Categoria *</span>
              </label>
              <div className="relative">
                <select
                  required
                  disabled={loadingCategories || categories.length === 0}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl bg-[#050811] border border-slate-800 text-white font-semibold outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                  <option value="">Selecione a categoria...</option>
                  {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              {!loadingCategories && categories.length === 0 && <p className="text-amber-300">Nenhuma categoria cadastrada.</p>}
            </div>
          </div>

          {/* Assunto e Prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-slate-300 font-bold">Assunto do Chamado *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Impressora do Almoxarifado sem papel/offline"
                className="w-full px-3.5 py-3 rounded-xl bg-[#050811] border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 transition-colors font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold">Prioridade Indicada</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3.5 py-3 rounded-xl bg-[#050811] border border-slate-800 text-white font-bold outline-none focus:border-cyan-500"
              >
                <option value="BAIXA">🟢 Baixa (Dúvidas/Suporte)</option>
                <option value="MEDIA">🟡 Média (Falha Parcial)</option>
                <option value="ALTA">🟠 Alta (Impacto no Setor)</option>
                <option value="CRITICA">🔴 Crítica (Parada Geral)</option>
              </select>
            </div>
          </div>

          {/* Descrição Detalhada */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold">Descrição Detalhada do Problema *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que aconteceu, mensagens de erro exibidas, equipamentos envolvidos..."
              className="w-full px-3.5 py-3 rounded-xl bg-[#050811] border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 transition-colors leading-relaxed"
            />
          </div>

          {/* Upload de Anexos (Imagens, Vídeos, Prints) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-cyan-400" />
                <span>Anexar Evidências (Imagens, Prints, Vídeos)</span>
              </label>
              <span className="text-[11px] text-slate-400">Tamanho máximo: 50MB</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#050811] border border-dashed border-slate-800 hover:border-cyan-500/40 transition-all text-center space-y-3">
              <div className="flex items-center justify-center gap-3 text-slate-400">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <Film className="w-5 h-5 text-purple-400" />
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-slate-400 text-xs">
                Selecione ou solte arquivos de imagem, vídeos de telas ou documentos
              </p>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer">
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00f2fe]" />
                    <span>Enviando Anexo...</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-4 h-4 text-[#00f2fe]" />
                    <span>Escolher Arquivos</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  disabled={uploading}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {att.mimetype?.startsWith('image/') || att.url?.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                        <img src={att.url} alt="anexo" className="w-8 h-8 rounded-lg object-cover border border-slate-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <span className="text-slate-200 font-mono text-[11px] truncate">{att.originalname || att.filename}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Remover anexo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando Chamado...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Abrir Chamado</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
