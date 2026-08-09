import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Layers,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Location } from '../../types';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../../services/api';

export const AdminLocations: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formName, setFormName] = useState('');
  const [formBuilding, setFormBuilding] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLocations();
      setLocations(data || []);
    } catch (err) {
      setError('Erro ao carregar localidades. Verifique a conexão com a API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleOpenCreate = () => {
    setEditingLocation(null);
    setFormName('');
    setFormBuilding('');
    setFormFloor('');
    setFormRoom('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setFormName(loc.name);
    setFormBuilding(loc.building || '');
    setFormFloor(loc.floor || '');
    setFormRoom(loc.room || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setIsSaving(true);
      setFormError(null);
      const payload = {
        name: formName.trim(),
        building: formBuilding.trim() || undefined,
        floor: formFloor.trim() || undefined,
        room: formRoom.trim() || undefined,
      };

      if (editingLocation) {
        await updateLocation(editingLocation.id, payload);
      } else {
        await createLocation(payload);
      }

      await loadLocations();
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Erro ao salvar localidade.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover a localidade/setor "${name}"?\n\nAtivos vinculados a este setor perderão o vínculo.`)) return;

    try {
      await deleteLocation(id);
      await loadLocations();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Erro ao excluir localidade.');
    }
  };

  const filtered = locations.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.building || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.room || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Localidades & Setores</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie prédios, secretarias e salas. Localidades cadastradas aqui aparecem automaticamente no Onboarding e nos filtros NOC.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadLocations}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nova Localidade</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Total de Setores</span>
          </div>
          <p className="text-2xl font-black text-white">{locations.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Prédios Distintos</span>
          </div>
          <p className="text-2xl font-black text-white">
            {new Set(locations.map((l) => l.building).filter(Boolean)).size || locations.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Com Sala Definida</span>
          </div>
          <p className="text-2xl font-black text-white">
            {locations.filter((l) => l.room).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar setor, prédio ou sala..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500 transition-all"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Locations Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
            <span>Carregando localidades...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-xs text-slate-400">
              {searchQuery ? 'Nenhuma localidade encontrada para essa busca.' : 'Nenhuma localidade cadastrada. Clique em "Nova Localidade" para começar.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Setor / Secretaria</th>
                <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Prédio / Edifício</th>
                <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Andar / Sala</th>
                <th className="px-5 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loc, idx) => (
                <tr
                  key={loc.id}
                  className={`border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors ${
                    idx === filtered.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{loc.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{loc.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-300 hidden sm:table-cell">
                    {loc.building || <span className="text-slate-600 italic">Não informado</span>}
                  </td>

                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="space-y-0.5">
                      {loc.floor && (
                        <span className="block text-slate-400">{loc.floor}</span>
                      )}
                      {loc.room ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                          <MapPin className="w-2.5 h-2.5" />
                          {loc.room}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">—</span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(loc)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(loc.id, loc.name)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-[11px] text-slate-500 text-right">
          {filtered.length} {filtered.length === 1 ? 'localidade' : 'localidades'} exibidas
          {searchQuery && ` (filtro: "${searchQuery}")`}
        </p>
      )}

      {/* Create / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  {editingLocation ? 'Editar Localidade / Setor' : 'Cadastrar Nova Localidade / Setor'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">Nome do Setor / Secretaria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Secretaria de Saúde - Almoxarifado"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-3 outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Prédio */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">Prédio / Edifício</label>
                <input
                  type="text"
                  placeholder="Ex: Prédio Central / Sede da Prefeitura"
                  value={formBuilding}
                  onChange={(e) => setFormBuilding(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-3 outline-none focus:border-purple-500 transition-all"
                />
              </div>

              {/* Andar & Sala */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Andar / Pavimento</label>
                  <input
                    type="text"
                    placeholder="Ex: 2º Andar"
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-3 outline-none focus:border-purple-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Sala / Anexo</label>
                  <input
                    type="text"
                    placeholder="Ex: Sala 204"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-3 outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{editingLocation ? 'Salvar Alterações' : 'Cadastrar Localidade'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
