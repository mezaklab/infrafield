import React, { useEffect, useRef, useState } from 'react';
import { Camera, ScanLine, X } from 'lucide-react';

interface Props { isOpen: boolean; onClose: () => void; onScan: (value: string) => void; }

/** Leitor contextual mantido para inspeções existentes; o atalho global usa o InfraField Lens. */
export const QRScannerModal: React.FC<Props> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [value, setValue] = useState('');
  const stop = () => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  useEffect(() => {
    if (!isOpen) { stop(); return; }
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } }).then((stream) => {
      streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => undefined);
    return stop;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return <div className="responsive-modal-backdrop z-[60]"><div className="responsive-modal-panel max-w-md relative"><button aria-label="Fechar leitor" onClick={() => { stop(); onClose(); }} className="absolute right-4 top-4 touch-target rounded-xl bg-slate-800"><X /></button><h2 className="font-bold text-white flex gap-2"><ScanLine className="text-cyan-400" /> Ler etiqueta na inspeção</h2><div className="mt-4 aspect-video rounded-xl overflow-hidden bg-slate-950"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div><label className="block mt-4 text-xs text-slate-400">Código lido ou digitado<input autoFocus value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl bg-slate-950 border border-slate-700 px-3 text-white" /></label><button disabled={!value.trim()} onClick={() => { onScan(value.trim()); stop(); onClose(); }} className="mt-3 w-full touch-target rounded-xl bg-cyan-600 text-white font-bold disabled:opacity-40"><Camera className="w-4" /> Confirmar código</button></div></div>;
};
