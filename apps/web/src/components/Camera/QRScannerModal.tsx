import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle2, Scan } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCameraError(null);
      setScannedResult(null);

      // Start HTML5 Camera Stream
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          console.warn('Camera access error:', err);
          setCameraError('Não foi possível acessar a câmera do dispositivo. Utilize os simuladores de leitura abaixo.');
        });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSimulateScan = (code: string) => {
    setScannedResult(code);
    setTimeout(() => {
      onScan(code);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
        {/* Header */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Leitor de QR Code / Código de Barras</h3>
            <p className="text-xs text-slate-400">Aponte a câmera para a etiqueta de patrimônio do ativo</p>
          </div>
        </div>

        {/* Camera Feed Stream or Simulation HUD */}
        <div className="relative w-full h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-center text-xs text-amber-300">
              <Camera className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
              {cameraError}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Scanner Overlay HUD */}
          <div className="absolute inset-0 border-2 border-cyan-500/40 m-8 rounded-2xl pointer-events-none flex items-center justify-center">
            <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_15px_#06b6d4] animate-pulse"></div>
          </div>

          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <span className="text-xs font-semibold text-emerald-300">Código Lido com Sucesso!</span>
              <strong className="text-lg font-mono font-bold text-white mt-1">{scannedResult}</strong>
            </div>
          )}
        </div>

        {/* Field Testing Quick Scan Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Simular Leitura de QR Code em Campo:
          </span>
          <div className="flex flex-wrap gap-2">
            {['SW-CORE-01', 'FW-EDGE-01', 'SRV-VM-01', 'PAT-00101', 'PAT-00102'].map((code) => (
              <button
                key={code}
                onClick={() => handleSimulateScan(code)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-mono font-semibold text-cyan-400 hover:text-cyan-300 transition-all"
              >
                ⚡ {code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
