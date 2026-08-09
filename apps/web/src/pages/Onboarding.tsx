import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Laptop, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Tag, 
  User, 
  Wifi, 
  Cpu, 
  RefreshCw, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import { Location } from '../types';

interface OnboardingProps {
  onNavigateToAssets?: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onNavigateToAssets }) => {
  // Read URL query parameters: ?host=...&ip=...&mac=...
  const [queryParams, setQueryParams] = useState({ host: '', ip: '', mac: '' });
  const [hasScriptData, setHasScriptData] = useState<boolean>(false);

  // Form State
  const [hostname, setHostname] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [macAddress, setMacAddress] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [type, setType] = useState<'DESKTOP' | 'NOTEBOOK'>('DESKTOP');
  const [assetTag, setAssetTag] = useState<string>('');
  const [assignedToName, setAssignedToName] = useState<string>('');

  // Auxiliary State
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  // Initialize query parameters & locations
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host') || params.get('hostname') || '';
    const ip   = params.get('ip') || params.get('ipAddress') || '';
    const mac  = params.get('mac') || params.get('macAddress') || '';

    setQueryParams({ host, ip, mac });

    if (host || ip) {
      setHasScriptData(true);
      if (host) setHostname(host);
      if (ip) setIpAddress(ip);
      if (mac) setMacAddress(mac);
    }

    // Fetch locations for dropdown
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const res = await api.get<Location[]>('/locations');
        setLocations(res.data);
        if (res.data.length > 0) {
          setLocationId(res.data[0].id);
        }
      } catch (err) {
        console.warn('Fallback locations list:', err);
        setLocations([
          { id: 'loc-1', name: 'Datacenter Principal', building: 'Prédio A', room: 'Sala 204' },
          { id: 'loc-2', name: 'Escritório Central - Rack TI', building: 'Prédio B', room: 'Rack 101' },
          { id: 'loc-3', name: 'Setor de Informática / Suporte', building: 'Prédio C', room: 'Sala 12' },
        ]);
        setLocationId('loc-1');
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hostname || !ipAddress) {
      setError('Nome da Máquina (Hostname) e Endereço IP são obrigatórios.');
      return;
    }

    if (!locationId) {
      setError('Por favor, selecione um Setor / Localização para o ativo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        hostname,
        ipAddress,
        macAddress,
        locationId,
        type,
        assetTag: assetTag || `PAT-${Date.now().toString().slice(-5)}`,
        assignedToName,
      };

      const response = await api.post('/assets/onboard', payload);
      setSuccessData(response.data?.asset || payload);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao cadastrar equipamento no onboarding.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setError(null);
    if (!hasScriptData) {
      setHostname('');
      setIpAddress('');
      setMacAddress('');
    }
    setAssetTag('');
    setAssignedToName('');
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/40 rounded-3xl p-8 space-y-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              CADASTRO REALIZADO COM SUCESSO
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight pt-2">
              Equipamento Registrado no Catálogo!
            </h2>
            <p className="text-sm text-slate-300">
              O ativo foi adicionado à base de dados do InfraField e integrado à fila de monitoramento ICMP (Ping).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Hostname / Máquina:</span>
              <span className="text-white font-bold">{hostname}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Endereço IP:</span>
              <span className="text-cyan-400 font-bold">{ipAddress}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Tipo:</span>
              <span className="text-purple-300 font-bold">{type}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Patrimônio (Tag):</span>
              <span className="text-amber-400 font-bold">{assetTag || 'Gerado Automaticamente'}</span>
            </div>
            {assignedToName && (
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Responsável:</span>
                <span className="text-slate-200">{assignedToName}</span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Status ICMP Ping:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Monitoramento Ativo
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
            >
              Cadastrar Outro Equipamento
            </button>
            {onNavigateToAssets && (
              <button
                onClick={onNavigateToAssets}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-600/30"
              >
                <span>Ver Catálogo de Ativos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-slate-900 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-bold border border-purple-500/40 w-fit">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>ONBOARDING AUTOMÁTICO DE EQUIPAMENTOS</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Cadastro Rápido de PC / Workstation
        </h1>
        <p className="text-sm text-slate-300">
          Preencha o formulário abaixo para registrar o equipamento no inventário e vinculá-lo ao setor e monitoramento de rede em tempo real.
        </p>

        {hasScriptData && (
          <div className="mt-3 p-3 rounded-2xl bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Dados pré-preenchidos automaticamente via Script PowerShell Windows</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold text-[10px]">
              AUTO-CAPTURA
            </span>
          </div>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hostname */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Nome da Máquina (Hostname) *</span>
              {hasScriptData && queryParams.host && (
                <span className="text-[10px] text-purple-400 font-mono font-normal">Somente Leitura</span>
              )}
            </label>
            <div className="relative">
              <Cpu className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                readOnly={hasScriptData && !!queryParams.host}
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                placeholder="Ex: PC-ADM-01"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-mono font-bold focus:outline-none transition-all ${
                  hasScriptData && queryParams.host
                    ? 'bg-slate-950/90 border-purple-500/40 text-purple-300 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-800 text-white focus:border-purple-500'
                }`}
              />
            </div>
          </div>

          {/* IP Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Endereço IP (IPv4) *</span>
              {hasScriptData && queryParams.ip && (
                <span className="text-[10px] text-cyan-400 font-mono font-normal">Capturado</span>
              )}
            </label>
            <div className="relative">
              <Wifi className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                readOnly={hasScriptData && !!queryParams.ip}
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="Ex: 192.168.1.100"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-mono font-bold focus:outline-none transition-all ${
                  hasScriptData && queryParams.ip
                    ? 'bg-slate-950/90 border-cyan-500/40 text-cyan-300 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-800 text-white focus:border-purple-500'
                }`}
              />
            </div>
          </div>

          {/* MAC Address (Optional / Auto-captured) */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-300">Endereço MAC da Placa de Rede</label>
            <div className="relative">
              <HardDrive className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                readOnly={hasScriptData && !!queryParams.mac}
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
                placeholder="Ex: 00-1A-2B-3C-4D-5E"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-mono transition-all ${
                  hasScriptData && queryParams.mac
                    ? 'bg-slate-950/90 border-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-800 text-white focus:border-purple-500'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Setor / Localização Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Setor / Localização *</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
              <select
                required
                disabled={loadingLocations}
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.room ? `(${loc.room})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Equipamento (Desktop / Notebook) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Tipo de Equipamento *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('DESKTOP')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs border transition-all ${
                  type === 'DESKTOP'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Desktop (PC)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('NOTEBOOK')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs border transition-all ${
                  type === 'NOTEBOOK'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>Notebook</span>
              </button>
            </div>
          </div>

          {/* Número do Patrimônio (Asset Tag) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Número do Patrimônio (Asset Tag)</label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                placeholder="Ex: PAT-00109"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Responsável / Usuário */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Nome do Responsável / Usuário</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                value={assignedToName}
                onChange={(e) => setAssignedToName(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-purple-600/30"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Cadastrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Cadastrar Equipamento no InfraField</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
