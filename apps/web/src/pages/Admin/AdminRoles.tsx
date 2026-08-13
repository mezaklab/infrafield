import React, { useEffect, useState } from 'react';
import { Plus, ShieldCheck, Edit3, X, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { AccessRole, PermissionDefinition } from '../../types';

const emptyForm = { name: '', description: '', enabled: true, permissionKeys: [] as string[] };

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [editing, setEditing] = useState<AccessRole | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get<AccessRole[]>('/admin/roles'), api.get<PermissionDefinition[]>('/admin/permissions'),
      ]);
      setRoles(rolesResponse.data);
      setPermissions(permissionsResponse.data);
      setError(null);
    } catch (err: any) { setError(err.response?.data?.error || 'Não foi possível carregar cargos e permissões.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const showForm = (role?: AccessRole) => {
    setEditing(role || null);
    setForm(role ? { name: role.name, description: role.description || '', enabled: role.enabled, permissionKeys: role.permissionKeys } : emptyForm);
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editing) await api.put(`/admin/roles/${editing.id}`, form);
      else await api.post('/admin/roles', form);
      setOpen(false);
      await load();
    } catch (err: any) { setError(err.response?.data?.error || 'Erro ao salvar cargo.'); }
  };

  const categories = [...new Set(permissions.map((permission) => permission.category))];
  return <div className="space-y-6">
    <div className="surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-purple-900/40 rounded-2xl p-4 sm:p-5">
      <div><h2 className="text-lg font-bold text-white">Cargos e Permissões</h2><p className="text-xs text-slate-400">Permissões aplicadas pelo backend</p></div>
      <button onClick={() => showForm()} className="min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"><Plus className="w-4 h-4" /> Novo Cargo</button>
    </div>
    {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">{error}</div>}
    {loading ? <div className="py-16 flex justify-center"><RefreshCw className="animate-spin text-purple-400" /></div> :
      <div className="grid md:grid-cols-2 gap-4">{roles.map((role) => <div key={role.id} className="surface-base bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex justify-between"><div className="flex gap-2"><ShieldCheck className="text-purple-400" /><div><h3 className="font-bold text-white">{role.name}</h3><span className="text-[10px] font-mono text-slate-500">{role.key}</span></div></div>
          <button disabled={role.key === 'SUPERADMIN'} onClick={() => showForm(role)} className="p-2 text-slate-400 disabled:opacity-30"><Edit3 className="w-4 h-4" /></button></div>
        <p className="text-xs text-slate-400 mt-3">{role.description}</p>
        <div className="mt-3 text-xs text-slate-300">{role.key === 'SUPERADMIN' ? 'Todas as permissões (protegido)' : `${role.permissionKeys.length} permissões`} · {role._count?.users || 0} usuário(s) · {role.enabled ? 'Ativo' : 'Inativo'}</div>
      </div>)}</div>}
    {open && <div className="responsive-modal-backdrop"><form onSubmit={save} className="responsive-modal-panel border-purple-500/40 max-w-2xl space-y-4">
      <div className="flex justify-between"><h3 className="text-lg font-bold text-white">{editing ? 'Editar Cargo' : 'Novo Cargo'}</h3><button type="button" onClick={() => setOpen(false)}><X className="text-slate-400" /></button></div>
      <input required value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} placeholder="Nome do cargo" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" />
      <textarea value={form.description} onChange={(e) => setForm({...form, description:e.target.value})} placeholder="Descrição" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" />
      <label className="flex gap-2 text-sm text-slate-200"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({...form, enabled:e.target.checked})} /> Cargo ativo</label>
      {categories.map((category) => <fieldset key={category} className="border border-slate-800 rounded-xl p-3"><legend className="px-2 text-xs font-bold text-purple-300">{category}</legend><div className="grid md:grid-cols-2 gap-2">{permissions.filter((permission) => permission.category === category).map((permission) => <label key={permission.key} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-slate-300 active:bg-slate-800"><input className="w-5 h-5 shrink-0" type="checkbox" checked={form.permissionKeys.includes(permission.key)} onChange={(e) => setForm({...form, permissionKeys:e.target.checked ? [...form.permissionKeys, permission.key] : form.permissionKeys.filter((key) => key !== permission.key)})} />{permission.name}</label>)}</div></fieldset>)}
      <div className="flex justify-end"><button className="px-5 py-2.5 bg-purple-600 rounded-xl text-white text-xs font-bold">Salvar Cargo</button></div>
    </form></div>}
  </div>;
};
