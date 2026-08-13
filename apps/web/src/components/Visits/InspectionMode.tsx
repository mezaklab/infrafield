import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  XCircle, 
  PlusCircle, 
  Flag, 
  ShieldCheck, 
  Box, 
  MapPin, 
  RefreshCw, 
  FileCheck,
  Scan,
  Camera,
  X,
  WifiOff,
  Image as ImageIcon,
  CheckSquare,
  AlertTriangle,
  Send,
  FileText
} from 'lucide-react';
import { Visit, VisitAsset, VisitAssetStatus, AuditSummary, ChecklistTemplate, IssueSeverity } from '../../types';
import { 
  getVisitDetails, 
  startVisit, 
  completeVisit, 
  checkVisitAsset, 
  getAuditSummary, 
  createAsset,
  getChecklistTemplates,
  getVisitChecklistResponses,
  saveVisitChecklistResponses,
  createIssue,
  downloadVisitPDFReport
} from '../../services/api';
import { useOnlineStatus, enqueueOfflineCheck } from '../../services/offlineSync';
import { QRScannerModal } from '../Camera/QRScannerModal';
import { PhotoCaptureModal } from '../Camera/PhotoCaptureModal';

interface InspectionModeProps {
  visitId: string;
  onBack: () => void;
}

export const InspectionMode: React.FC<InspectionModeProps> = ({ visitId, onBack }) => {
  const { isOnline } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<'inventory' | 'checklist' | 'issues'>('inventory');
  
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [updatingAssetId, setUpdatingAssetId] = useState<string | null>(null);

  // Modals state for QR Code & Camera Photo
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [photoTargetAsset, setPhotoTargetAsset] = useState<{ id: string; name: string } | null>(null);
  const [assetPhotos, setAssetPhotos] = useState<Record<string, string>>({});

  // Dynamic Checklist State
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
  const [checklistValues, setChecklistValues] = useState<Record<string, string>>({});
  const [savingChecklist, setSavingChecklist] = useState(false);

  // New issue form state
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM' as IssueSeverity,
    recommendation: '',
    assetId: '',
  });

  // New unmapped asset form state
  const [newAssetForm, setNewAssetForm] = useState({
    name: '',
    code: '',
    assetTag: '',
    category: 'TI / Redes',
  });

  const loadVisitData = useCallback(async () => {
    setLoading(true);
    try {
      const [visitData, templates, existingResponses] = await Promise.all([
        getVisitDetails(visitId),
        getChecklistTemplates(),
        getVisitChecklistResponses(visitId),
      ]);

      setVisit(visitData);
      setChecklistTemplates(templates);

      // Populate existing checklist responses
      const initialValues: Record<string, string> = {};
      existingResponses.forEach((res) => {
        initialValues[res.checklistItemId] = res.value;
      });
      setChecklistValues(initialValues);

      if (visitData.status === 'CONCLUIDA') {
        const sum = await getAuditSummary(visitId);
        setSummary(sum);
      }
    } catch (err) {
      console.error('Error loading visit details:', err);
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadVisitData();
  }, [loadVisitData]);

  const handleStartVisit = async () => {
    try {
      const updated = await startVisit(visitId);
      setVisit(updated);
      loadVisitData();
    } catch (err) {
      alert('Erro ao iniciar a visita.');
    }
  };

  const handleCheckAsset = async (assetId: string, status: VisitAssetStatus, photoUrl?: string) => {
    setUpdatingAssetId(assetId);

    if (!isOnline) {
      enqueueOfflineCheck(visitId, assetId, status, 'Check efetuado em modo offline', photoUrl);
      setVisit((prev) => {
        if (!prev) return prev;
        const updatedVisitAssets = prev.visitAssets?.map((va) => {
          if (va.asset?.id === assetId || va.assetId === assetId) {
            return { ...va, status, photoUrl: photoUrl || va.photoUrl };
          }
          return va;
        });
        return { ...prev, visitAssets: updatedVisitAssets };
      });
      setUpdatingAssetId(null);
      return;
    }

    try {
      await checkVisitAsset(visitId, assetId, status, undefined, photoUrl);
      await loadVisitData();
    } catch (err) {
      console.warn('Network error, enqueueing offline:', err);
      enqueueOfflineCheck(visitId, assetId, status, 'Check efetuado em modo offline fallback', photoUrl);
    } finally {
      setUpdatingAssetId(null);
    }
  };

  const handleSaveChecklist = async () => {
    setSavingChecklist(true);
    try {
      const payload = Object.entries(checklistValues).map(([checklistItemId, value]) => ({
        checklistItemId,
        value,
      }));

      await saveVisitChecklistResponses(visitId, payload);
      alert('✅ Respostas do Checklist salvas com sucesso no banco de dados!');
    } catch (err) {
      alert('Erro ao salvar respostas do checklist.');
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleCreateIssueInVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createIssue({
        title: issueForm.title,
        description: issueForm.description,
        severity: issueForm.severity,
        recommendation: issueForm.recommendation,
        visitId,
        assetId: issueForm.assetId || undefined,
        locationId: visit?.locationId || undefined,
      });

      setShowNewIssueModal(false);
      setIssueForm({ title: '', description: '', severity: 'MEDIUM', recommendation: '', assetId: '' });
      alert('🚨 Não conformidade registrada com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao registrar não conformidade.');
    }
  };

  const handleScanQRCode = (scannedCode: string) => {
    if (!visit?.visitAssets) return;

    const matched = visit.visitAssets.find((va) => {
      const a = va.asset;
      if (!a) return false;
      return (
        a.code.toLowerCase() === scannedCode.toLowerCase() ||
        (a.assetTag && a.assetTag.toLowerCase() === scannedCode.toLowerCase()) ||
        (a.serialNumber && a.serialNumber.toLowerCase() === scannedCode.toLowerCase())
      );
    });

    if (matched && matched.asset) {
      handleCheckAsset(matched.asset.id, 'ENCONTRADO');
      alert(`✅ Ativo localizado por QR Code: ${matched.asset.name} (${scannedCode})! Status confirmado.`);
    } else {
      alert(`⚠️ Código lido (${scannedCode}) não pertence à lista de ativos mapeados desta localização.`);
    }
  };

  const handlePhotoCaptured = (photoBase64: string) => {
    if (photoTargetAsset) {
      setAssetPhotos((prev) => ({ ...prev, [photoTargetAsset.id]: photoBase64 }));
      handleCheckAsset(photoTargetAsset.id, 'ENCONTRADO', photoBase64);
      setPhotoTargetAsset(null);
    }
  };

  const handleCompleteVisit = async () => {
    try {
      await completeVisit(visitId);
      const sum = await getAuditSummary(visitId);
      setSummary(sum);
      setShowSummaryModal(true);
      loadVisitData();
    } catch (err) {
      alert('Erro ao finalizar vistoria.');
    }
  };

  const handleCreateNewUnmappedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createAsset({
        name: newAssetForm.name,
        code: newAssetForm.code || `NEW-${Date.now().toString().slice(-4)}`,
        assetTag: newAssetForm.assetTag,
        category: newAssetForm.category,
        locationId: visit?.locationId,
      });

      await handleCheckAsset(created.id, 'NOVO');
      setShowAddAssetModal(false);
      setNewAssetForm({ name: '', code: '', assetTag: '', category: 'TI / Redes' });
      loadVisitData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao registrar novo ativo.');
    }
  };

  if (loading || !visit) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" /> Carregando modo vistoria...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Lista de Visitas
        </button>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" /> Modo Offline Ativo
            </span>
          )}
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl">
            {visit.protocol}
          </span>
        </div>
      </div>

      {/* Visit Execution Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                visit.status === 'EM_ANDAMENTO'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  : visit.status === 'CONCLUIDA'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {visit.status === 'EM_ANDAMENTO' ? 'VISTORIA EM ANDAMENTO' : visit.status}
              </span>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full font-semibold">
                {visit.type}
              </span>
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight">{visit.client}</h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              {visit.address} ({visit.locationName || 'Local Principal'})
            </p>
          </div>

          {/* Action Triggers */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => downloadVisitPDFReport(visit.id)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-lg shadow-cyan-500/25 transition-all"
              title="Baixar Relatório Técnico de Visita em PDF"
            >
              <FileText className="w-4 h-4" /> Gerar Relatório PDF
            </button>

            {visit.status === 'PLANEJADA' && (
              <button
                onClick={handleStartVisit}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm px-6 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Vistoria Agora
              </button>
            )}

            {visit.status === 'EM_ANDAMENTO' && (
              <>
                <button
                  onClick={() => setIsQRScannerOpen(true)}
                  className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs px-4 py-3.5 rounded-2xl shadow-lg shadow-cyan-500/25 transition-all"
                >
                  <Scan className="w-4 h-4" /> QR Code / Câmera
                </button>

                <button
                  onClick={handleCompleteVisit}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Flag className="w-4 h-4" /> Finalizar Vistoria
                </button>
              </>
            )}

            {visit.status === 'CONCLUIDA' && (
              <button
                onClick={() => {
                  getAuditSummary(visitId).then(setSummary);
                  setShowSummaryModal(true);
                }}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs px-4 py-3 rounded-2xl border border-slate-700"
              >
                <FileCheck className="w-4 h-4" /> Resumo de Auditoria
              </button>
            )}
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
            }`}
          >
            <Box className="w-4 h-4" /> Inventário de Ativos
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'checklist'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Checklist Dinâmico
          </button>

          <button
            onClick={() => setShowNewIssueModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all ml-auto"
          >
            <AlertTriangle className="w-4 h-4" /> Registrar Não Conformidade
          </button>
        </div>
      </div>

      {/* SECTION 1: Inventário de Ativos */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-400" />
                Ativos Mapeados no Local
              </h2>
              <p className="text-xs text-slate-400">Confirme a presença, tire evidências fotográficas ou escaneie via QR Code</p>
            </div>

            {visit.status === 'EM_ANDAMENTO' && (
              <button
                onClick={() => setShowAddAssetModal(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 border border-slate-700 px-3.5 py-2 rounded-xl transition-all"
              >
                <PlusCircle className="w-4 h-4" /> Registrar Novo Ativo
              </button>
            )}
          </div>

          {!visit.visitAssets || visit.visitAssets.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
              Nenhum ativo associado a esta localização até o momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visit.visitAssets.map((item: VisitAsset) => {
                const asset = item.asset;
                const hasPhoto = item.photoUrl || (asset?.id && assetPhotos[asset.id]);

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all ${
                      item.status === 'ENCONTRADO'
                        ? 'border-emerald-500/40 bg-emerald-950/10'
                        : item.status === 'AUSENTE'
                        ? 'border-rose-500/40 bg-rose-950/10'
                        : item.status === 'NOVO'
                        ? 'border-cyan-500/40 bg-cyan-950/10'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg">
                            {asset?.code || 'S/CÓDIGO'}
                          </span>
                          {asset?.assetTag && (
                            <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                              Patrimônio: {asset.assetTag}
                            </span>
                          )}
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            item.status === 'ENCONTRADO'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'AUSENTE'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : item.status === 'NOVO'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {item.status}
                          </span>

                          {hasPhoto && (
                            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Foto anexada
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white">{asset?.name || 'Equipamento de Campo'}</h3>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                          {asset?.hostname && (
                            <span>Hostname: <strong className="text-slate-200">{asset.hostname}</strong></span>
                          )}
                          {asset?.ipAddress && (
                            <span>IP: <strong className="text-cyan-300">{asset.ipAddress}</strong></span>
                          )}
                          {asset?.serialNumber && (
                            <span>S/N: <strong className="text-slate-300">{asset.serialNumber}</strong></span>
                          )}
                        </div>
                      </div>

                      {visit.status === 'EM_ANDAMENTO' && asset?.id && (
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                          <button
                            onClick={() => setPhotoTargetAsset({ id: asset.id, name: asset.name })}
                            className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                            title="Tirar Foto Evidência"
                          >
                            <Camera className="w-4 h-4" />
                            <span className="hidden sm:inline">Foto</span>
                          </button>

                          <button
                            onClick={() => handleCheckAsset(asset.id, 'ENCONTRADO')}
                            disabled={updatingAssetId === asset.id}
                            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs transition-all ${
                              item.status === 'ENCONTRADO'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar Presença</span>
                          </button>

                          <button
                            onClick={() => handleCheckAsset(asset.id, 'AUSENTE')}
                            disabled={updatingAssetId === asset.id}
                            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs transition-all ${
                              item.status === 'AUSENTE'
                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Marcar Ausente</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Checklist Dinâmico de Inspeção */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-cyan-400" />
                Checklist Dinâmico de Inspeção
              </h2>
              <p className="text-xs text-slate-400">Preencha os itens obrigatórios e parâmetros operacionais</p>
            </div>

            <button
              onClick={handleSaveChecklist}
              disabled={savingChecklist}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all"
            >
              <Send className="w-4 h-4" /> {savingChecklist ? 'Salvando...' : 'Salvar Respostas'}
            </button>
          </div>

          {checklistTemplates.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
              Nenhum modelo de checklist ativo cadastrado.
            </div>
          ) : (
            checklistTemplates.map((template) => (
              <div key={template.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                    {template.category}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">{template.name}</h3>
                  {template.description && <p className="text-xs text-slate-400">{template.description}</p>}
                </div>

                <div className="space-y-4">
                  {template.items.map((item) => {
                    const currentValue = checklistValues[item.id] || '';

                    return (
                      <div key={item.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-200">
                            {item.label} {item.isRequired && <span className="text-rose-400">*</span>}
                          </label>
                        </div>

                        {/* Field Type Renderers */}
                        {item.fieldType === 'YES_NO' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setChecklistValues({ ...checklistValues, [item.id]: 'SIM' })}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                currentValue === 'SIM'
                                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                              }`}
                            >
                              SIM / OK
                            </button>

                            <button
                              type="button"
                              onClick={() => setChecklistValues({ ...checklistValues, [item.id]: 'NAO' })}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                currentValue === 'NAO'
                                  ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                              }`}
                            >
                              NÃO / FALHA
                            </button>
                          </div>
                        )}

                        {item.fieldType === 'SELECT' && item.options && (
                          <select
                            value={currentValue}
                            onChange={(e) => setChecklistValues({ ...checklistValues, [item.id]: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                          >
                            <option value="">Selecione a opção...</option>
                            {JSON.parse(item.options).map((opt: string) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}

                        {(item.fieldType === 'TEXT' || item.fieldType === 'NUMBER') && (
                          <input
                            type={item.fieldType === 'NUMBER' ? 'number' : 'text'}
                            value={currentValue}
                            onChange={(e) => setChecklistValues({ ...checklistValues, [item.id]: e.target.value })}
                            placeholder="Insira o valor..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                          />
                        )}

                        {item.fieldType === 'PHOTO' && (
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => alert('Anexar foto no item de checklist.')}
                              className="px-3.5 py-2 bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 rounded-xl flex items-center gap-1.5"
                            >
                              <Camera className="w-4 h-4" /> Anexar Foto
                            </button>
                            {currentValue && <span className="text-xs text-emerald-400 font-semibold">Foto capturada</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleScanQRCode}
      />

      {/* Photo Capture Modal */}
      {photoTargetAsset && (
        <PhotoCaptureModal
          isOpen={!!photoTargetAsset}
          assetName={photoTargetAsset.name}
          onClose={() => setPhotoTargetAsset(null)}
          onCapture={handlePhotoCaptured}
        />
      )}

      {/* Audit Summary Modal */}
      {showSummaryModal && summary && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel max-w-lg relative">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400">{summary.protocol}</span>
                <h3 className="text-lg font-bold text-white">Resumo de Auditoria da Vistoria</h3>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 my-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Taxa de Conciliação de Inventário</span>
                <span className="text-xl font-extrabold text-emerald-400">{summary.totals.conciliationRate}%</span>
              </div>

              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${summary.totals.conciliationRate}%` }} className="bg-emerald-500 h-full"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Encontrados / Confirmados</span>
                  <span className="text-lg font-bold text-emerald-400">{summary.totals.encontrados}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Ausentes / Não localizados</span>
                  <span className="text-lg font-bold text-rose-400">{summary.totals.ausentes}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Novos Registrados</span>
                  <span className="text-lg font-bold text-cyan-400">{summary.totals.novos}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Total Mapeados</span>
                  <span className="text-lg font-bold text-white">{summary.totals.totalAssets}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => downloadVisitPDFReport(visit.id)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <FileText className="w-4 h-4" /> Gerar Relatório PDF
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Issue Modal inside Visit */}
      {showNewIssueModal && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel max-w-md relative">
            <button
              onClick={() => setShowNewIssueModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-white mb-1">Registrar Não Conformidade na Vistoria</h3>
            <p className="text-xs text-slate-400 mb-4">Relate uma ocorrência técnica identificada nesta visita.</p>

            <form onSubmit={handleCreateIssueInVisit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título da Ocorrência</label>
                <input
                  type="text"
                  value={issueForm.title}
                  onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                  placeholder="Ex: Exaustor com ruído elevado"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ativo Relacionado (Opcional)</label>
                <select
                  value={issueForm.assetId}
                  onChange={(e) => setIssueForm({ ...issueForm, assetId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="">Nenhum ativo específico / Geral</option>
                  {visit.visitAssets?.map((item) => (
                    <option key={item.asset?.id} value={item.asset?.id}>
                      {item.asset?.code} - {item.asset?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Gravidade / Criticidade</label>
                <select
                  value={issueForm.severity}
                  onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value as IssueSeverity })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição do Problema</label>
                <textarea
                  rows={3}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  placeholder="Detalhes da ocorrência..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowNewIssueModal(false)} className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-xs font-semibold text-white rounded-xl">Registrar Não Conformidade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Unmapped Asset Modal */}
      {showAddAssetModal && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel max-w-md relative">
            <button
              onClick={() => setShowAddAssetModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-2">Registrar Novo Ativo em Campo</h3>
            <p className="text-xs text-slate-400 mb-4">Adicione um equipamento não catalogado anteriormente no local.</p>

            <form onSubmit={handleCreateNewUnmappedAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome / Descrição do Ativo</label>
                <input
                  type="text"
                  value={newAssetForm.name}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, name: e.target.value })}
                  placeholder="Ex: Access Point Adicional HP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Patrimônio (Asset Tag)</label>
                <input
                  type="text"
                  value={newAssetForm.assetTag}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, assetTag: e.target.value })}
                  placeholder="Ex: PAT-00999"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Código de Identificação</label>
                <input
                  type="text"
                  value={newAssetForm.code}
                  onChange={(e) => setNewAssetForm({ ...newAssetForm, code: e.target.value })}
                  placeholder="Ex: AP-09"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddAssetModal(false)} className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-xs font-semibold text-white rounded-xl">Salvar e Vincular</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
