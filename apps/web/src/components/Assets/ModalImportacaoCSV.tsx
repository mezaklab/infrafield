import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, FileText, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import { api } from '../../services/api';

interface ModalImportacaoCSVProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalImportacaoCSV: React.FC<ModalImportacaoCSVProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const EXPECTED_HEADERS = ['Categoria', 'Patrimonio', 'MAC_Address', 'Fabricante', 'Modelo', 'Localidade', 'Status'];

  const downloadTemplate = () => {
    const csvContent = EXPECTED_HEADERS.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_importacao_ativos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Por favor, selecione um arquivo .csv válido.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (fileToParse: File) => {
    setParsing(true);
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        const headers = results.meta.fields || [];
        
        const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          setError(`Cabeçalhos inválidos. Faltam: ${missingHeaders.join(', ')}`);
          setParsedData([]);
          return;
        }

        if (results.data.length === 0) {
          setError('O arquivo CSV está vazio.');
          setParsedData([]);
          return;
        }

        setParsedData(results.data);
      },
      error: (err: any) => {
        setParsing(false);
        setError(`Erro ao ler o CSV: ${err.message}`);
      }
    });
  };

  const handleSubmit = async () => {
    if (parsedData.length === 0) return;
    try {
      setSubmitting(true);
      setError(null);
      
      await api.post('/assets/bulk', { assets: parsedData });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao importar ativos no servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="responsive-modal-backdrop animate-fadeIn z-[60]">
      <div className="responsive-modal-panel max-w-lg relative bg-[#080d1a] border border-cyan-500/30 p-6 rounded-3xl w-full">
        <button
          aria-label="Fechar modal"
          onClick={onClose}
          className="absolute right-4 top-4 touch-target rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Upload className="w-6 h-6 text-cyan-400" /> Importar Ativos (CSV)
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Faça o upload de uma planilha para cadastro em lote de equipamentos e redes.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="flex justify-between items-center bg-[#050811] p-4 rounded-xl border border-slate-800 border-dashed">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Baixar modelo</p>
                <p className="text-[10px] text-slate-400">CSV pré-formatado com cabeçalhos</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Modelo
            </button>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700 bg-[#050811] hover:border-cyan-500/50'
            }`}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="text-sm font-bold text-white">{file.name}</p>
                <button 
                  onClick={() => { setFile(null); setParsedData([]); setError(null); }}
                  className="text-xs text-rose-400 hover:underline mt-1"
                >
                  Remover arquivo
                </button>
              </div>
            ) : (
              <div 
                className="flex flex-col items-center gap-3 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-cyan-400">Clique para selecionar</p>
                  <p className="text-xs text-slate-500 mt-1">Apenas arquivos .csv</p>
                </div>
              </div>
            )}
          </div>

          {parsing && (
            <div className="text-center text-xs text-cyan-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Analisando arquivo...
            </div>
          )}

          {parsedData.length > 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <p className="text-xs font-bold text-emerald-400">
                {parsedData.length} ativos encontrados. Pronto para importar.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={parsedData.length === 0 || submitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Confirmar Importação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
