import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  Wifi, 
  Building2, 
  Monitor, 
  Laptop, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Briefcase,
  User,
  Plus,
  X
} from 'lucide-react';
import { api, createLocation } from '../services/api';
import { Location } from '../types';

export const OnboardStandalone: React.FC = () => {
  // Read URL query parameters: ?host=...&ip=...&cpu=...&ram=...&os=...&brand=...&model=...
  const [hostname, setHostname] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [cpu, setCpu] = useState<string>('');
  const [ram, setRam] = useState<string>('');
  const [os, setOs] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');

  // Required Responsável / Usuário
  const [assignedToName, setAssignedToName] = useState<string>('');

  // Manual Form Fields
  const [assetTag, setAssetTag] = useState<string>('');
  const [type, setType] = useState<'DESKTOP' | 'NOTEBOOK'>('DESKTOP');
  const [locationId, setLocationId] = useState<string>('');
  const [specifications, setSpecifications] = useState<string>('');

  // Ownership Fields (Próprio vs Locado)
  const [ownershipType, setOwnershipType] = useState<'PROPRIO' | 'LOCADO'>('PROPRIO');
  const [ownerVendor, setOwnerVendor] = useState<string>('');

  // Optional Attached Monitor Section
  const [hasMonitor, setHasMonitor] = useState<boolean>(false);
  const [monitorAssetTag, setMonitorAssetTag] = useState<string>('');
  const [monitorBrand, setMonitorBrand] = useState<string>('');
  const [monitorModel, setMonitorModel] = useState<string>('');
  const [monitorOwnershipType, setMonitorOwnershipType] = useState<'PROPRIO' | 'LOCADO'>('PROPRIO');
  const [monitorOwnerVendor, setMonitorOwnerVendor] = useState<string>('');

  // Quick Location Creation Modal State
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState<boolean>(false);
  const [newLocName, setNewLocName] = useState<string>('');
  const [newLocBuilding, setNewLocBuilding] = useState<string>('');
  const [newLocRoom, setNewLocRoom] = useState<string>('');
  const [isSavingLocation, setIsSavingLocation] = useState<boolean>(false);

  // Auxiliary State
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [hasHardwareData, setHasHardwareData] = useState<boolean>(false);

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const res = await api.get<Location[]>('/locations');
      setLocations(res.data || []);
      if (res.data && res.data.length > 0 && !locationId) {
        setLocationId(res.data[0].id);
      }
    } catch (err) {
      console.warn('Fallback locations fetch:', err);
      setLocations([
        { id: 'loc-1', name: 'Datacenter Principal', building: 'Prédio A', room: 'Sala 204' },
        { id: 'loc-2', name: 'Escritório Central - Rack TI', building: 'Prédio B', room: 'Rack 101' },
        { id: 'loc-3', name: 'Suporte Técnico / TI', building: 'Prédio C', room: 'Sala 12' },
      ]);
      setLocationId('loc-1');
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    // Parse query params
    const params = new URLSearchParams(window.location.search);
    const hostParam  = params.get('host')  || params.get('hostname')  || '';
    const ipParam    = params.get('ip')    || params.get('ipAddress') || '';
    const cpuParam   = params.get('cpu')   || '';
    const ramParam   = params.get('ram')   || '';
    const osParam    = params.get('os')    || '';
    const brandParam = params.get('brand') || '';
    const modelParam = params.get('model') || '';

    setHostname(hostParam);
    setIpAddress(ipParam);
    setCpu(cpuParam);
    setRam(ramParam);
    setOs(osParam);
    if (brandParam && brandParam !== 'N/A') setBrand(brandParam);
    if (modelParam && modelParam !== 'N/A') setModel(modelParam);

    if (cpuParam || ramParam || osParam || brandParam || modelParam) {
      setHasHardwareData(true);
    }

    fetchLocations();
  }, []);

  const handleOwnershipChange = (newType: 'PROPRIO' | 'LOCADO') => {
    setOwnershipType(newType);
  };

  const handleCreateLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    try {
      setIsSavingLocation(true);
      const created = await createLocation({
        name: newLocName.trim(),
        building: newLocBuilding.trim() || undefined,
        room: newLocRoom.trim() || undefined,
      });

      // Refetch locations list and auto-select the newly created location
      const res = await api.get<Location[]>('/locations');
      const updatedList = res.data || [];
      setLocations(updatedList);
      setLocationId(created.id);

      // Reset modal fields and close modal
      setNewLocName('');
      setNewLocBuilding('');
      setNewLocRoom('');
      setIsNewLocationModalOpen(false);
    } catch (err) {
      alert('Erro ao cadastrar nova localidade/setor.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hostname || !ipAddress) {
      setError('Hostname e Endereço IP são obrigatórios na URL de onboarding.');
      return;
    }

    if (!assignedToName.trim()) {
      setError('O campo Usuário / Responsável da Máquina é obrigatório.');
      return;
    }

    if (!locationId) {
      setError('Por favor, selecione uma Localidade / Setor para o equipamento.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        hostname,
        ipAddress,
        locationId,
        type,
        assetTag,
        brand,
        model,
        cpu,
        ram,
        os,
        ownershipType,
        ownerVendor: ownerVendor || (ownershipType === 'PROPRIO' ? 'Município' : 'Locado'),
        specifications,
        assignedToName,
        hasMonitor,
        monitorAssetTag,
        monitorBrand,
        monitorModel,
        monitorOwnershipType,
        monitorOwnerVendor,
      };

      await api.post('/assets/onboard', payload);
      setIsSuccess(true);

      // Trigger local storage and window events for immediate table re-fetch across tabs
      try {
        localStorage.setItem('infrafield_last_onboard', Date.now().toString());
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('infrafield:assetOnboarded'));
      } catch {
        // Ignore storage error
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao cadastrar equipamento via API.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-3xl space-y-6">
        {/* Brand Header Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold shadow-lg shadow-purple-950/40">
            <Server className="w-4 h-4 text-purple-400" />
            <span>INFRAFIELD // ONBOARDING DE EQUIPAMENTO</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Cadastro Automático de Computador
          </h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Inventário de ativos com suporte a captura WMI de hardware, usuário responsável e monitor acoplado
          </p>
        </div>

        {/* Success Screen */}
        {isSuccess ? (
          <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                {hasMonitor ? '🎉 2 ATIVOS CADASTRADOS SIMULTANEAMENTE' : 'COMPUTADOR CADASTRADO NO CATÁLOGO'}
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight pt-2">
                Equipamento(s) Registrado(s) com Sucesso!
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                O computador <strong className="text-white font-mono">{hostname}</strong> 
                {hasMonitor ? ' e o Monitor Acoplado foram salvos' : ' foi salvo'} no banco de dados e adicionado ao monitoramento ICMP.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono space-y-2.5 text-left">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Hostname / Máquina:</span>
                <span className="text-purple-300 font-bold">{hostname}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Endereço IP (Poller Ping):</span>
                <span className="text-cyan-400 font-bold">{ipAddress}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Usuário / Responsável:</span>
                <span className="text-emerald-300 font-bold">{assignedToName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Vínculo Patrimonial:</span>
                <span className="text-amber-400 font-bold">
                  {ownershipType === 'PROPRIO' 
                    ? `Próprio (${ownerVendor || 'Município'})` 
                    : `Locado (${ownerVendor || 'Licitação'})`}
                </span>
              </div>
              {hasMonitor && (
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Monitor Acoplado:</span>
                  <span className="text-cyan-300 font-bold">
                    {monitorBrand || 'Monitor'} {monitorModel || ''} {monitorAssetTag ? `(${monitorAssetTag})` : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Status no InfraField:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  🟢 Operacional (Catálogo &amp; ICMP Ativo)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              ✨ Pode fechar esta janela do navegador com segurança.
            </div>
          </div>
        ) : (
          /* Form Screen */
          <div className="bg-slate-900/90 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Top Highlight Box: Especificações Detectadas do Hardware */}
            {hasHardwareData && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-950 to-indigo-950/70 border border-purple-500/40 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span>ESPECIFICAÇÕES DETECTADAS DO HARDWARE (WMI)</span>
                  </div>
                  <span className="text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                    AUTO-DETECT
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Processador (CPU)</span>
                    <span className="text-white font-bold truncate block">{cpu || 'N/A'}</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">Memória RAM</span>
                    <span className="text-cyan-400 font-bold truncate block">{ram || 'N/A'}</span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block font-sans">Sistema Operacional</span>
                    <span className="text-purple-300 font-bold truncate block">{os || 'Windows OS'}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Hostname & IP (Fixed Network Header) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/40">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>Nome da Máquina (Hostname)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={hostname}
                    placeholder="Auto-captura via URL..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-500/30 text-purple-200 font-mono font-bold text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Endereço IP (IPv4)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={ipAddress}
                    placeholder="Auto-captura via URL..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-200 font-mono font-bold text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Form Manual & Config Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Usuário / Responsável da Máquina (Obrigatório) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-400" />
                    <span>Usuário / Responsável da Máquina *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={assignedToName}
                    onChange={(e) => setAssignedToName(e.target.value)}
                    placeholder="Ex: Maria Silva - RH ou Uso Coletivo"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                {/* Tipo (Desktop / Notebook) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Tipo de Equipamento *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setType('DESKTOP')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold transition-all border cursor-pointer ${
                        type === 'DESKTOP'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span>Desktop (PC)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('NOTEBOOK')}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold transition-all border cursor-pointer ${
                        type === 'NOTEBOOK'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Laptop className="w-4 h-4" />
                      <span>Notebook</span>
                    </button>
                  </div>
                </div>

                {/* Vínculo Patrimonial (Próprio vs Locado) - Clean & Enxuto */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>Vínculo Patrimonial *</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleOwnershipChange('PROPRIO')}
                      className={`py-3 px-4 rounded-xl font-extrabold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        ownershipType === 'PROPRIO'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span>🏛️ Próprio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOwnershipChange('LOCADO')}
                      className={`py-3 px-4 rounded-xl font-extrabold text-xs border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        ownershipType === 'LOCADO'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span>🏢 Locado</span>
                    </button>
                  </div>
                </div>

                {/* Input Dinâmico de Origem / Proprietário */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">
                    {ownershipType === 'PROPRIO' ? 'Origem / Proprietário *' : 'Empresa Locadora *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerVendor}
                    onChange={(e) => setOwnerVendor(e.target.value)}
                    placeholder={
                      ownershipType === 'PROPRIO'
                        ? 'Ex: Prefeitura, Estado, Doação'
                        : 'Ex: Empresa Imprima, Positivo'
                    }
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                {/* Número do Patrimônio (Diretamente abaixo da caixa de Origem) */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Número do Patrimônio</label>
                  <div className="relative">
                    <Tag className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={assetTag}
                      onChange={(e) => setAssetTag(e.target.value)}
                      placeholder="Ex: PAT-00109"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Localidade / Setor Dropdown com Atalho Rápido */}
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Localidade / Setor *</label>
                    <button
                      type="button"
                      onClick={() => setIsNewLocationModalOpen(true)}
                      className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Nova Localidade</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
                    <select
                      required
                      disabled={loadingLocations}
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.room ? `(${loc.room})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Marca */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Marca / Fabricante</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Dell, HP, Lenovo"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Modelo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Modelo do Equipamento</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ex: OptiPlex 7090 / ThinkPad X1"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Observações / Especificações */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Observações / Especificações Adicionais</label>
                  <textarea
                    rows={2}
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    placeholder="Ex: Monocromático, SSD NVMe, Garantia estendida..."
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Seção Opcional: Monitor Acoplado */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/40 space-y-4 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-cyan-400" />
                      <div>
                        <span className="text-xs font-bold text-white block">Cadastrar Monitor Junto?</span>
                        <span className="text-[10px] text-slate-400">Cria um segundo ativo com categoria MONITOR no mesmo setor/responsável</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasMonitor(!hasMonitor)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        hasMonitor ? 'bg-cyan-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hasMonitor ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {hasMonitor && (
                    <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                      {/* Monitor Patrimônio */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Patrimônio do Monitor</label>
                        <input
                          type="text"
                          value={monitorAssetTag}
                          onChange={(e) => setMonitorAssetTag(e.target.value)}
                          placeholder="Ex: PAT-MON-089"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Monitor Marca */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Marca do Monitor</label>
                        <input
                          type="text"
                          value={monitorBrand}
                          onChange={(e) => setMonitorBrand(e.target.value)}
                          placeholder="Ex: Dell, Samsung, LG"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Monitor Modelo */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Modelo do Monitor</label>
                        <input
                          type="text"
                          value={monitorModel}
                          onChange={(e) => setMonitorModel(e.target.value)}
                          placeholder="Ex: P2419H 24 polegadas"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Monitor Vínculo Patrimonial */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">Vínculo do Monitor</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setMonitorOwnershipType('PROPRIO')}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              monitorOwnershipType === 'PROPRIO'
                                ? 'bg-cyan-600 text-white border-cyan-400 font-extrabold'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            Próprio
                          </button>
                          <button
                            type="button"
                            onClick={() => setMonitorOwnershipType('LOCADO')}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              monitorOwnershipType === 'LOCADO'
                                ? 'bg-cyan-600 text-white border-cyan-400 font-extrabold'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            Locado
                          </button>
                        </div>
                      </div>

                      {/* Monitor Empresa Proprietária */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-300">
                          {monitorOwnershipType === 'PROPRIO' ? 'Origem / Proprietário Monitor' : 'Empresa Locadora Monitor'}
                        </label>
                        <input
                          type="text"
                          value={monitorOwnerVendor}
                          onChange={(e) => setMonitorOwnerVendor(e.target.value)}
                          placeholder={monitorOwnershipType === 'PROPRIO' ? 'Ex: Prefeitura' : 'Ex: Positivo / Empresa Locadora'}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-extrabold text-sm transition-all shadow-xl shadow-purple-600/30 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Cadastrando Equipamento(s)...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{hasMonitor ? 'Cadastrar Computador + Monitor' : 'Cadastrar Equipamento no InfraField'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal de Cadastro Rápido de Nova Localidade / Setor */}
        {isNewLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-extrabold text-white">Cadastrar Nova Localidade / Setor</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewLocationModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateLocationSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Nome do Setor / Secretaria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Secretaria de Saúde - Almoxarifado"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Prédio / Edifício</label>
                  <input
                    type="text"
                    placeholder="Ex: Prédio Central"
                    value={newLocBuilding}
                    onChange={(e) => setNewLocBuilding(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Sala / Anexo</label>
                  <input
                    type="text"
                    placeholder="Ex: Sala 02 - Térreo"
                    value={newLocRoom}
                    onChange={(e) => setNewLocRoom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewLocationModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLocation}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    {isSavingLocation ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salvar Setor</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
