import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Download,
  CircleDot,
  Zap,
  Clock,
  CheckCircle2,
  XCircle
  ,MapPin
} from 'lucide-react';
import { api } from '../../services/api';
import { Ticket, TicketStatus, TicketPriority, SystemUser } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface TicketDetailModalProps {
  ticketId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTicketUpdated: () => void;
}

interface UploadedFile {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
}

interface SectorOption { id: string; name: string }
interface LocationOption { id: string; name: string }
interface CategoryOption { id: string; name: string }

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticketId,
  isOpen,
  onClose,
  onTicketUpdated,
}) => {
  const { isAdmin, isTechnician } = useAuth();
  const canManageTicket = isAdmin || isTechnician;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [technicians, setTechnicians] = useState<SystemUser[]>([]);
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Message reply state
  const [replyText, setReplyText] = useState<string>('');
  const [replyAttachments, setReplyAttachments] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Status & Technician edit state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const res = await api.get<Ticket>(`/tickets/${ticketId}`);
      setTicket(res.data);
    } catch (err: any) {
      console.error('Failed to load ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await api.get<SystemUser[]>('/admin/users');
      const techs = res.data.filter(
        (u) => u.role === 'TECHNICIAN' || u.role === 'ADMIN' || u.role === 'SUPERADMIN'
      );
      setTechnicians(techs);
    } catch {
      // Fallback
    }
  };

  const fetchSectors = async () => {
    try {
      const res = await api.get<{ data: SectorOption[] }>('/sectors');
      setSectors(res.data?.data || []);
    } catch {
      setError('Não foi possível carregar os setores.');
    }
  };
  const fetchLocations = async () => {
    try {
      const res = await api.get<LocationOption[]>('/tickets/locations');
      setLocations(res.data || []);
    } catch {
      setError('Não foi possível carregar as localidades.');
    }
  };
  const fetchCategories = async () => {
    try {
      const res = await api.get<{ data: CategoryOption[] }>('/categories');
      setCategories(res.data?.data || []);
    } catch {
      setError('Não foi possível carregar as categorias.');
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchTicketDetails();
      fetchSectors();
      fetchLocations();
      fetchCategories();
      if (canManageTicket) {
        fetchTechnicians();
      }
    }
  }, [isOpen, ticketId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  if (!isOpen || !ticketId) return null;

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      setIsUpdatingStatus(true);
      await api.patch(`/tickets/${ticketId}`, { status: newStatus });
      await fetchTicketDetails();
      onTicketUpdated();
    } catch (err) {
      setError('Erro ao atualizar status do chamado.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignTechnician = async (techId: string) => {
    try {
      setIsUpdatingStatus(true);
      await api.patch(`/tickets/${ticketId}`, { assignedToId: techId || null });
      await fetchTicketDetails();
      onTicketUpdated();
    } catch (err) {
      setError('Erro ao atribuir técnico responsável.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLocationChange = async (locationId: string) => {
    try {
      setIsUpdatingStatus(true);
      await api.patch(`/tickets/${ticketId}`, { locationId });
      await fetchTicketDetails();
      onTicketUpdated();
    } catch {
      setError('Erro ao atualizar localização do chamado.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSectorChange = async (newSectorId: string) => {
    try {
      setIsUpdatingStatus(true);
      setError(null);
      await api.patch(`/tickets/${ticketId}`, { sectorId: newSectorId });
      await fetchTicketDetails();
      onTicketUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar o setor do chamado.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCategoryChange = async (newCategoryId: string) => {
    try {
      setIsUpdatingStatus(true);
      setError(null);
      await api.patch(`/tickets/${ticketId}`, { categoryId: newCategoryId });
      await fetchTicketDetails();
      onTicketUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar a categoria do chamado.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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

        setReplyAttachments((prev) => [...prev, res.data]);
      }
    } catch (err) {
      setError('Erro ao enviar arquivo anexado.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && replyAttachments.length === 0) return;

    try {
      setSending(true);
      setError(null);

      const attachmentUrls = replyAttachments.map((a) => a.url);

      await api.post(`/tickets/${ticketId}/messages`, {
        content: replyText.trim(),
        attachments: attachmentUrls,
      });

      setReplyText('');
      setReplyAttachments([]);
      await fetchTicketDetails();
      onTicketUpdated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao enviar resposta.');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'ABERTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 w-fit overflow-hidden whitespace-nowrap animate-pulse">
            <CircleDot className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>ABERTO</span>
          </span>
        );
      case 'EM_ATENDIMENTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 w-fit overflow-hidden whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>EM ATENDIMENTO</span>
          </span>
        );
      case 'AGUARDANDO_USUARIO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 w-fit overflow-hidden whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>AGUARDANDO USUÁRIO</span>
          </span>
        );
      case 'RESOLVIDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 w-fit overflow-hidden whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>RESOLVIDO</span>
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-500/20 text-slate-400 border border-slate-500/40 w-fit overflow-hidden whitespace-nowrap">
            <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>CANCELADO</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'CRITICA':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40">CRÍTICA</span>;
      case 'ALTA':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">ALTA</span>;
      case 'MEDIA':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/40">MÉDIA</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-500/20 text-slate-400 border border-slate-500/40">BAIXA</span>;
    }
  };

  const renderAttachmentPreviews = (attachmentUrls: string[]) => {
    return (
      <div className="mt-3 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Anexos ({attachmentUrls.length}):</span>
        <div className="flex flex-wrap gap-2">
          {attachmentUrls.map((url, idx) => {
            const isImage = url.match(/\.(jpeg|jpg|png|gif|webp)$/i);
            const isVideo = url.match(/\.(mp4|webm|mov|ogg)$/i);

            if (isImage) {
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block relative group overflow-hidden rounded-xl border border-slate-700/80 max-w-[200px]"
                >
                  <img src={url} alt={`Anexo ${idx + 1}`} className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <ExternalLink className="w-4 h-4" /> Expandir
                  </div>
                </a>
              );
            }

            if (isVideo) {
              return (
                <div key={idx} className="rounded-xl border border-slate-700/80 overflow-hidden max-w-[280px]">
                  <video src={url} controls className="w-full h-32 object-cover bg-slate-950" />
                </div>
              );
            }

            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Baixar Arquivo {idx + 1}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="responsive-modal-backdrop animate-fadeIn">
      <div className="bg-[#080d1a] border border-cyan-500/30 rounded-t-3xl sm:rounded-3xl max-w-4xl w-full h-[100dvh] sm:h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* TOP HEADER METADATA BAR */}
        <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-sm font-mono font-black text-[#00f2fe] bg-[#00f2fe]/10 border border-[#00f2fe]/30 px-3 py-1 rounded-xl shadow-[0_0_10px_rgba(0,242,254,0.15)] shrink-0">
                {ticket?.code || 'TK-0000'}
              </span>
              <h2 className="text-base font-black text-white tracking-tight leading-snug">{ticket?.subject}</h2>
              {ticket && getStatusBadge(ticket.status)}
              {ticket && getPriorityBadge(ticket.priority)}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all self-end sm:self-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Detailed Info Grid */}
          {ticket && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs bg-[#050811] p-3.5 rounded-2xl border border-slate-800/80 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Solicitante (Autor)</span>
                <span className="text-white font-bold block truncate">{ticket.author?.name}</span>
                <span className="text-slate-400 text-[11px] truncate block">{ticket.author?.email}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Setor</span>
                {canManageTicket && ticket.sectorId ? (
                  <select
                    disabled={isUpdatingStatus}
                    value={ticket.sectorId}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full max-w-full mt-0.5 bg-slate-900 border border-slate-800 text-cyan-300 font-bold rounded-lg px-2 py-1 outline-none text-xs"
                  >
                    {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                  </select>
                ) : (
                  <span className="text-cyan-300 font-bold block truncate">{ticket.sector?.name || 'Não especificado'}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Localização</span>
                {canManageTicket ? (
                  <select disabled={isUpdatingStatus} value={ticket.locationId || ''} onChange={(e) => handleLocationChange(e.target.value)} className="w-full max-w-full mt-0.5 bg-slate-900 border border-slate-800 text-cyan-300 font-bold rounded-lg px-2 py-1 outline-none text-xs">
                    <option value="" disabled>Selecione...</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                ) : <span className="text-cyan-300 font-bold block truncate"><MapPin className="inline h-3 w-3 mr-1" />{ticket.location?.name || 'Não especificada'}</span>}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Categoria</span>
                {canManageTicket ? (
                  <select
                    disabled={isUpdatingStatus}
                    value={ticket.categoryId || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full max-w-full mt-0.5 bg-slate-900 border border-slate-800 text-cyan-300 font-bold rounded-lg px-2 py-1 outline-none text-xs"
                  >
                    <option value="" disabled>Não especificada</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                ) : (
                  <span className="text-cyan-300 font-bold block truncate">{ticket.categoryRef?.name || ticket.category || 'Não especificada'}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Ativo Afetado</span>
                <span className="text-purple-300 text-[11px] truncate block font-bold">
                  {ticket.asset ? `💻 ${ticket.asset.name} (${ticket.asset.code})` : ticket.location?.room || ticket.location?.building || 'Infraestrutura'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Técnico Atribuído</span>
                {canManageTicket ? (
                  <select
                    disabled={isUpdatingStatus}
                    value={ticket.assignedToId || ''}
                    onChange={(e) => handleAssignTechnician(e.target.value)}
                    className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-purple-300 font-bold rounded-lg px-2 py-1 outline-none text-xs"
                  >
                    <option value="">Nenhum (Não Atribuído)</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-purple-300 font-bold block truncate">{ticket.assignedTo?.name || 'Aguardando Técnico'}</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-sans block font-semibold">Ação de Status</span>
                {canManageTicket ? (
                  <select
                    disabled={isUpdatingStatus}
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    className="w-full mt-0.5 bg-slate-900 border border-slate-800 text-emerald-400 font-bold rounded-lg px-2 py-1 outline-none text-xs"
                  >
                    <option value="ABERTO">🔴 Aberto</option>
                    <option value="EM_ATENDIMENTO">⚡ Em Atendimento</option>
                    <option value="AGUARDANDO_USUARIO">⏳ Aguardando Usuário</option>
                    <option value="RESOLVIDO">✅ Resolvido</option>
                    <option value="CANCELADO">⚪ Cancelado</option>
                  </select>
                ) : (
                  <span className="text-slate-300 font-bold block">{new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* TIMELINE / CHAT MESSAGES BODY */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 custom-scrollbar bg-[#04060d]">
          {loading ? (
            <div className="p-12 text-center text-cyan-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Carregando histórico do chamado...</span>
            </div>
          ) : ticket?.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((msg) => {
              // DETECT IF SENDER IS USUARIO (OR TICKET AUTHOR) VS STAFF/TECHNICIAN
              const isAuthorMessage = msg.senderId === ticket.authorId || msg.sender?.role === 'USUARIO';

              // Parse attachments if present
              let attachmentUrls: string[] = [];
              if (msg.attachments) {
                try {
                  attachmentUrls = JSON.parse(msg.attachments);
                } catch {
                  attachmentUrls = [msg.attachments];
                }
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isAuthorMessage ? 'justify-start' : 'justify-end'
                  }`}
                >
                  {/* LEFT AVATAR: USUÁRIO */}
                  {isAuthorMessage && (
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
                      {msg.sender?.name?.slice(0, 2).toUpperCase() || 'US'}
                    </div>
                  )}

                  {/* CHAT BALLOON CONTAINER */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl shadow-xl space-y-2 ${
                      isAuthorMessage
                        ? 'bg-[#0b1326] border border-[#00f2fe]/20 text-slate-100 rounded-tl-none'
                        : 'bg-gradient-to-r from-cyan-900/60 via-blue-900/60 to-slate-900 border border-cyan-500/40 text-cyan-50 rounded-tr-none'
                    }`}
                  >
                    {/* Message Sender Header */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white">{msg.sender?.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAuthorMessage
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {isAuthorMessage ? 'USUÁRIO' : msg.sender?.role || 'TÉCNICO TI'}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(msg.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    {/* Message Body Content */}
                    <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-slate-200">
                      {msg.content}
                    </div>

                    {/* Attachments Section */}
                    {attachmentUrls.length > 0 && renderAttachmentPreviews(attachmentUrls)}
                  </div>

                  {/* RIGHT AVATAR: TÉCNICO / ADMIN */}
                  {!isAuthorMessage && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-lg shadow-cyan-500/20">
                      {msg.sender?.name?.slice(0, 2).toUpperCase() || 'TC'}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">Sem mensagens no histórico deste chamado.</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* BOTTOM MESSAGE COMPONENT INPUT BOX */}
        {ticket?.status === 'RESOLVIDO' || ticket?.status === 'CANCELADO' ? (
          <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Este chamado foi encerrado.</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Pending Attachments */}
            {replyAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {replyAttachments.map((att, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono">
                    <Paperclip className="w-3 h-3 text-cyan-400" />
                    <span className="truncate max-w-[150px]">{att.originalname || att.filename}</span>
                    <button onClick={() => setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
              <div className="flex-1 relative bg-[#050811] rounded-2xl border border-slate-800 focus-within:border-cyan-500 transition-all p-2">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva sua mensagem ou réplica para o suporte..."
                  className="w-full bg-transparent text-white text-xs outline-none resize-none p-1 leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 px-1">
                  <label className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Anexar imagem ou arquivo">
                    {uploading ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <Paperclip className="w-4 h-4" />}
                    <input type="file" multiple disabled={uploading} onChange={handleFileUpload} className="hidden" />
                  </label>
                  <span className="text-[10px] text-slate-500">Pressione Enviar para responder</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending || uploading || (!replyText.trim() && replyAttachments.length === 0)}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all h-full"
              >
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Enviar</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
