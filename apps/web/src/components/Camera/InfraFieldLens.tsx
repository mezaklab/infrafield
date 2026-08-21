import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, ImagePlus, ScanSearch, Sparkles, X } from 'lucide-react';
import { api } from '../../services/api';
import type { LensImportDraft } from '../../types';

type Evidence = { value: string; source: 'OCR' | 'BARCODE' | 'VISION' | 'USER' | 'DATABASE'; confidence: number } | null;
type Recognition = {
  type: Evidence; manufacturer: Evidence; model: Evidence; serialNumber: Evidence; serviceTag: Evidence;
  productNumber: Evidence; macAddress: Evidence; possibleAssetTag: Evidence; confidence: number; rawText: string;
};
type Duplicate = { id: string; entityType: 'ASSET' | 'PERIPHERAL'; name: string; code: string; assetTag?: string };

interface Props { isOpen: boolean; onClose: () => void; onImport: (draft: LensImportDraft) => void; }

const emptyDraft: LensImportDraft = { type: 'OUTRO', manufacturer: '', model: '', serialNumber: '', serviceTag: '', productNumber: '', macAddress: '', assetTag: '' };

const prepareImage = async (file: File, purpose: 'equipment' | 'label'): Promise<File> => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  const bitmap = await createImageBitmap(file);
  const maxDimension = purpose === 'label' ? 3600 : 2200;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Falha ao preparar imagem.')), 'image/jpeg', purpose === 'label' ? .96 : .9));
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
};

export const InfraFieldLens: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const galleryRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'capture' | 'labelCapture' | 'analyzing' | 'result'>('capture');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [draft, setDraft] = useState<LensImportDraft>(emptyDraft);
  const [confidence, setConfidence] = useState(0);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [assetTagCandidate, setAssetTagCandidate] = useState('');
  const [rawOcrText, setRawOcrText] = useState('');

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startCamera = async (purpose: 'equipment' | 'label' = 'equipment') => {
    stopCamera(); setCameraError('');
    const requestId = cameraRequestRef.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Câmera não suportada');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: purpose === 'label' ? 3840 : 2560 }, height: { ideal: purpose === 'label' ? 2160 : 1440 } }, audio: false,
      });
      if (requestId !== cameraRequestRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError('Câmera indisponível ou sem permissão. Selecione uma foto do dispositivo.');
    }
  };

  useEffect(() => {
    if (isOpen) { setStage('capture'); setError(''); setMainImage(null); setPreview(''); setDraft(emptyDraft); setDuplicates([]); setRawOcrText(''); }
    else stopCamera();
    return stopCamera;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (stage === 'capture') void startCamera('equipment');
    else if (stage === 'labelCapture') void startCamera('label');
    else stopCamera();
    return stopCamera;
  }, [isOpen, stage]);

  const analyze = async (image: File, labelImage?: File) => {
    stopCamera(); setStage('analyzing'); setError('');
    try {
      const preparedMain = mainImage || await prepareImage(image, 'equipment');
      const preparedLabel = labelImage ? await prepareImage(labelImage, 'label') : undefined;
      if (!mainImage) { setMainImage(preparedMain); setPreview(URL.createObjectURL(preparedMain)); }
      const data = new FormData(); data.append('image', preparedMain); if (preparedLabel) data.append('labelImage', preparedLabel);
      const response = await api.post<{ result: Recognition }>('/lens/recognize', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 });
      const r = response.data.result;
      const next: LensImportDraft = {
        type: r.type?.value || draft.type || 'OUTRO', manufacturer: r.manufacturer?.value || draft.manufacturer,
        model: r.model?.value || draft.model, serialNumber: r.serialNumber?.value || draft.serialNumber,
        serviceTag: r.serviceTag?.value || draft.serviceTag, productNumber: r.productNumber?.value || draft.productNumber,
        macAddress: r.macAddress?.value || draft.macAddress, assetTag: draft.assetTag, imageFile: preparedMain,
      };
      setDraft(next); setConfidence(r.confidence); setRawOcrText(r.rawText || ''); setAssetTagCandidate(r.possibleAssetTag?.value || assetTagCandidate);
      const duplicateResponse = await api.post<Duplicate[]>('/lens/duplicates', { serialNumber: next.serviceTag || next.serialNumber, macAddress: next.macAddress, assetTag: next.assetTag });
      setDuplicates(duplicateResponse.data); setStage('result');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Não conseguimos identificar o ativo automaticamente.');
      setStage('result');
    }
  };

  const capture = async () => {
    const video = videoRef.current; if (!video?.videoWidth) { setCameraError('A câmera ainda não está pronta.'); return; }
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 2200 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && void analyze(new File([blob], `lens-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', .9);
  };

  const openLabelCapture = () => { setStage('labelCapture'); setCameraError(''); };
  const captureLabel = () => {
    const video = videoRef.current; if (!video?.videoWidth || !mainImage) { setCameraError('A câmera ainda não está pronta.'); return; }
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 3600 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && void analyze(mainImage, new File([blob], `lens-etiqueta-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', .96);
  };

  if (!isOpen) return null;
  const set = (key: keyof LensImportDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div className="responsive-modal-backdrop z-[45] bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-0 bg-slate-950/95">
      <section className="responsive-modal-panel max-w-2xl relative max-h-full overflow-y-auto" aria-label="InfraField Lens">
        <button onClick={() => { stopCamera(); onClose(); }} aria-label="Fechar InfraField Lens" className="absolute right-4 top-4 touch-target rounded-xl bg-slate-800 text-slate-300 z-10"><X className="w-5 h-5" /></button>
        <header className="flex gap-3 pr-12 mb-4"><span className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><ScanSearch /></span><div><h2 className="text-lg font-black text-white">InfraField Lens</h2><p className="text-sm text-slate-400">Identificar ativo com foto, OCR e códigos</p></div></header>

        {stage === 'capture' && <>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-950 border border-slate-700">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-5 border border-cyan-400/50 rounded-xl pointer-events-none" />
            {cameraError && <div className="absolute inset-0 grid place-content-center text-center p-8 bg-slate-950/90 text-amber-300"><Camera className="mx-auto mb-3" />{cameraError}</div>}
          </div>
          <p className="text-sm text-center text-slate-300 my-4">Aponte para o equipamento ou para sua etiqueta.</p>
          <div className="grid sm:grid-cols-2 gap-3"><button onClick={capture} disabled={!!cameraError} className="touch-target rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white disabled:opacity-40"><Camera className="w-5 h-5" /> Capturar fotografia</button><button onClick={() => galleryRef.current?.click()} className="touch-target rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-100"><ImagePlus className="w-5 h-5" /> Selecionar imagem</button></div>
          <input ref={galleryRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && void analyze(e.target.files[0])} />
        </>}

        {stage === 'labelCapture' && <>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 mb-4"><h3 className="font-bold text-cyan-200">Fotografe a etiqueta</h3><p className="text-sm text-slate-300 mt-1">Aproxime a câmera até que os textos estejam legíveis.</p><p className="text-xs text-slate-400 mt-2">Procure enquadrar: Modelo · Serial · Product Number · MAC</p></div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-950 border border-cyan-500/40">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-x-5 top-1/4 bottom-1/4 border-2 border-cyan-300/70 rounded-lg pointer-events-none" />
            {cameraError && <div className="absolute inset-0 grid place-content-center text-center p-8 bg-slate-950/90 text-amber-300">{cameraError}</div>}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4"><button onClick={captureLabel} disabled={!!cameraError} className="touch-target rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white disabled:opacity-40"><Camera className="w-5 h-5" /> Capturar etiqueta</button><button onClick={() => labelRef.current?.click()} className="touch-target rounded-xl bg-slate-800 border border-slate-700 font-bold text-slate-100"><ImagePlus className="w-5 h-5" /> Selecionar foto</button></div>
          <button onClick={() => { stopCamera(); setStage('result'); }} className="w-full min-h-11 mt-2 text-sm text-slate-400">Voltar sem nova foto</button>
        </>}

        {stage === 'analyzing' && <div className="min-h-80 grid place-content-center text-center"><Sparkles className="w-12 h-12 mx-auto text-cyan-400 animate-pulse" /><h3 className="mt-4 text-lg font-bold text-white">Analisando ativo...</h3><p className="text-sm text-slate-400 mt-2">Lendo etiqueta e verificando códigos presentes na imagem.</p></div>}

        {stage === 'result' && <div className="space-y-4">
          {preview && <img src={preview} alt="Foto analisada" className="w-full max-h-56 object-contain rounded-2xl bg-slate-950" />}
          {error && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200"><AlertTriangle className="inline w-4 h-4 mr-2" />{error} Você ainda pode preencher os dados e importar manualmente.</div>}
          <div className="flex items-center justify-between"><h3 className="font-bold text-white">Conferir identificação</h3><span className="text-xs text-cyan-300">Confiança {Math.round(confidence * 100)}%</span></div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[['type','Tipo'],['manufacturer','Fabricante'],['model','Modelo'],['serialNumber','Serial'],['serviceTag','Service Tag'],['productNumber','Product Number'],['macAddress','MAC Address']] .map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-400">{label}<input value={String(draft[key as keyof LensImportDraft] || '')} onChange={(e) => set(key as keyof LensImportDraft, e.target.value)} className="mt-1 w-full min-h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-base text-white" /></label>)}
          </div>
          {(!draft.manufacturer || !draft.model || !(draft.serialNumber || draft.serviceTag)) && <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 p-4"><h4 className="font-bold text-cyan-100">Precisamos de uma foto mais próxima da etiqueta</h4><p className="text-sm text-slate-300 mt-1">Isso ajuda a identificar fabricante, modelo e número de série sem inventar informações.</p><button onClick={openLabelCapture} className="mt-3 touch-target w-full rounded-xl bg-cyan-600 text-white font-bold"><Camera className="w-5 h-5" /> Fotografar etiqueta</button></div>}
          {assetTagCandidate && !draft.assetTag && <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-sm text-slate-200">Possível patrimônio: <strong>{assetTagCandidate}</strong><div className="flex gap-2 mt-2"><button onClick={() => set('assetTag', assetTagCandidate)} className="px-3 py-2 rounded-lg bg-cyan-600 font-bold"><Check className="inline w-4" /> Usar</button><button onClick={() => setAssetTagCandidate('')} className="px-3 py-2 rounded-lg bg-slate-800">Ignorar</button></div></div>}
          <label className="text-xs font-semibold text-slate-400">Patrimônio (confirmação manual)<input value={draft.assetTag} onChange={(e) => set('assetTag', e.target.value)} className="mt-1 w-full min-h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-base text-white" /></label>
          {duplicates.length > 0 && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"><strong className="text-amber-200">Possível ativo já cadastrado</strong>{duplicates.map((item) => <div key={`${item.entityType}-${item.id}`} className="flex items-center justify-between gap-2 text-sm text-slate-200 mt-2"><span>{item.name} · {item.code}{item.assetTag ? ` · ${item.assetTag}` : ''}</span><a href={item.entityType === 'ASSET' ? '/assets' : '/peripherals'} className="shrink-0 px-3 py-2 rounded-lg bg-slate-800 text-cyan-300">Ver existente</a></div>)}<p className="text-xs text-slate-400 mt-2">Confira antes de continuar. “Importar” apenas abre o formulário; você decide se deseja prosseguir.</p></div>}
          {import.meta.env.DEV && <details className="rounded-xl border border-slate-700 bg-slate-950 p-3"><summary className="cursor-pointer text-sm font-bold text-slate-300">Debug OCR</summary><p className="mt-3 text-xs text-slate-400">Texto encontrado na etiqueta:</p><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-emerald-300">{rawOcrText || '(OCR não reconheceu texto)'}</pre></details>}
          <input ref={labelRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && mainImage && void analyze(mainImage, e.target.files[0])} />
          <div className="grid sm:grid-cols-2 gap-3"><button onClick={openLabelCapture} className="touch-target rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-bold">Fotografar etiqueta</button><button onClick={() => onImport(draft)} className="touch-target rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black">+ Importar para Ativos</button></div>
          <button onClick={() => setStage('capture')} className="w-full min-h-11 text-sm text-slate-400">Tirar outra foto</button>
        </div>}
      </section>
    </div>
  );
};
