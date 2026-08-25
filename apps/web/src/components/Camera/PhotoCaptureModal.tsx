import React, { useState, useRef } from 'react';
import { Camera, X, Upload, Check } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { compressImage } from '../../utils/imageCompressor';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  assetName: string;
  onClose: () => void;
  onCapture: (photoBase64: string) => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  assetName,
  onClose,
  onCapture,
}) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompressing(true);
      try {
        const compressed = await compressImage(file, 800, 800, 0.7);
        setPhoto(compressed);
      } catch (err) {
        console.warn('Error compressing uploaded image:', err);
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleSimulatePhoto = async () => {
    setCompressing(true);
    const sampleSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%230f172a"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%2306b6d4" font-family="sans-serif" font-size="16" font-weight="bold">EVIDENCIA COMPACTADA (CANVAS Web API)</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="12">${encodeURIComponent(assetName)}</text></svg>`;
    try {
      const compressed = await compressImage(sampleSvg, 800, 800, 0.7);
      setPhoto(compressed);
    } catch (err) {
      setPhoto(sampleSvg);
    } finally {
      setCompressing(false);
    }
  };

  const handleConfirm = () => {
    if (photo) {
      onCapture(photo);
      onClose();
    }
  };

  return (
    <div className="responsive-modal-backdrop bg-slate-950/90">
      <div className="responsive-modal-panel max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Capturar Evidência Fotográfica</h3>
            <p className="text-xs text-slate-400 truncate max-w-[240px]">{assetName}</p>
          </div>
        </div>

        {/* Photo Preview Container */}
        <div className="w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
          {compressing ? (
            <div className="text-center p-4 text-xs text-cyan-400">
              Compressão Canvas Web API em andamento...
            </div>
          ) : photo ? (
            <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4 text-xs text-slate-500">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              Nenhuma foto capturada ainda. Use as opções abaixo.
            </div>
          )}
        </div>

        {/* Action Controls */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-3 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl border border-slate-800"
          >
            <Upload className="w-4 h-4 text-cyan-400" /> Upload de Foto
          </button>

          <button
            onClick={handleSimulatePhoto}
            className="flex items-center justify-center gap-2 p-3 bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-cyan-400 rounded-xl border border-slate-800"
          >
            <Camera className="w-4 h-4" /> Captura Rápida
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!photo || compressing}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Salvar Evidência
          </button>
        </div>
      </div>
    </div>
  );
};
