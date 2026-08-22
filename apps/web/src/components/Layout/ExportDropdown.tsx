import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Zap, Copy, CheckCheck, RefreshCw } from 'lucide-react';

export interface ExportOption {
  id: string;
  label: string;
  sublabel?: string;
  type: 'csv' | 'pdf' | 'copy';
  onExport: () => Promise<void> | void;
}

interface ExportDropdownProps {
  options: ExportOption[];
  buttonLabel?: string;
  align?: 'left' | 'right';
  className?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  options,
  buttonLabel = 'Exportar',
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleOptionClick = async (opt: ExportOption) => {
    setLoadingId(opt.id);
    try {
      await opt.onExport();
      if (opt.type === 'copy') {
        setCopiedId(opt.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error(`Erro ao executar exportação (${opt.id}):`, err);
    } finally {
      setLoadingId(null);
      if (opt.type !== 'copy') {
        setIsOpen(false);
      }
    }
  };

  const getIcon = (opt: ExportOption) => {
    if (loadingId === opt.id) {
      return <RefreshCw className="w-4 h-4 text-[#00f2fe] animate-spin shrink-0" />;
    }
    if (copiedId === opt.id) {
      return <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    switch (opt.type) {
      case 'csv':
        return <Zap className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-[#00f2fe] shrink-0" />;
      case 'copy':
        return <Copy className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Download className="w-4 h-4 text-slate-300 shrink-0" />;
    }
  };

  return (
    <div className={`relative inline-block text-left z-30 ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 h-full min-h-[40px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer shadow-sm w-full"
      >
        <Download className="w-4 h-4 text-slate-300" />
        <span>{buttonLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`fixed left-3 right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:absolute sm:left-auto ${align === 'left' ? 'sm:left-0' : 'sm:right-0'} sm:bottom-auto sm:top-full sm:mt-2 sm:w-64 bg-[#080d1a] border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2`}
        >
          <div className="px-3.5 py-2 border-b border-slate-800 bg-[#050811]">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Opções de Exportação</p>
          </div>
          <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt)}
                disabled={loadingId === opt.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/90 transition-all text-left cursor-pointer disabled:opacity-50"
              >
                {getIcon(opt)}
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate text-slate-200">{copiedId === opt.id ? 'Copiado para área de transferência!' : opt.label}</div>
                  {opt.sublabel && <div className="text-[10px] text-slate-400 truncate mt-0.5">{opt.sublabel}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
