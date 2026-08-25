import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  KeyRound,
  Mail,
  ShieldAlert,
  Building2,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { SystemUser, Location, AccessRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getLocationFullName } from '../../utils/location';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'SUPERADMIN' as 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER' | 'USUARIO',
    locationId: '',
    accessRoleId: '',
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchUsersAndLocations = async () => {
    try {
      setLoading(true);
      const [usersRes, locsRes, rolesRes] = await Promise.all([
        api.get<SystemUser[]>('/admin/users'),
        api.get<Location[]>('/locations').catch(() => ({ data: [] })),
        api.get<AccessRole[]>('/admin/roles'),
      ]);
      setUsers(usersRes.data);
      setLocations(locsRes.data || []);
      setAccessRoles(rolesRes.data || []);
    } catch (err: any) {
      console.warn('Fallback backend users list:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndLocations();
  }, []);

  const handleOpenModal = (userToEdit?: SystemUser) => {
    setFormError(null);
    setFormSuccess(null);
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        username: userToEdit.username || '',
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
        locationId: userToEdit.locationId || '',
        accessRoleId: userToEdit.accessRoleId || '',
        isActive: userToEdit.isActive !== false,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'USUARIO',
        locationId: '',
        accessRoleId: accessRoles.find((role) => role.key === 'TECHNICIAN')?.id || '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  useEscapeKey(handleCloseModal, isModalOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.name || !formData.email || (!editingUser && !formData.username)) {
      setFormError('Nome, E-mail e Nome de Usuário são obrigatórios.');
      return;
    }
    if (!editingUser && !formData.password) {
      setFormError('Senha é obrigatória para criação de novos usuários.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Record<string, unknown> = editingUser
        ? { name: formData.name, email: formData.email }
        : { ...formData, locationId: formData.locationId || null };

      if (formData.password.trim()) payload.password = formData.password;

      if (!editingUser) {
        payload.role = formData.role;
        payload.accessRoleId = formData.accessRoleId || null;
        payload.isActive = formData.isActive;
      } else {
        // Send only fields intentionally changed; an empty optional field is
        // never sent as an invalid UUID or password.
        if (formData.role !== editingUser.role) payload.role = formData.role;
        if ((formData.accessRoleId || '') !== (editingUser.accessRoleId || '')) {
          payload.accessRoleId = formData.accessRoleId || null;
        }
        if ((formData.locationId || '') !== (editingUser.locationId || '')) {
          payload.locationId = formData.locationId || null;
        }
        if (formData.isActive !== (editingUser.isActive !== false)) payload.isActive = formData.isActive;
      }

      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, payload);
        setFormSuccess('Usuário atualizado com sucesso!');
        setTimeout(() => {
          handleCloseModal();
          fetchUsersAndLocations();
        }, 1000);
      } else {
        await api.post('/admin/users', payload);
        setFormSuccess('Usuário criado com sucesso!');
        setTimeout(() => {
          handleCloseModal();
          fetchUsersAndLocations();
        }, 1000);
      }
    } catch (err: any) {
      const details = err.response?.data?.details;
      const detailMessage = details && Object.values(details as Record<string, { _errors?: string[] }> )
        .flatMap((item) => item?._errors || [])
        .find(Boolean);
      const errMsg = detailMessage || err.response?.data?.error || 'Erro ao salvar usuário.';
      setFormError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, userEmail: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${userEmail}?`)) {
      return;
    }
    try {
      await api.delete(`/admin/users/${id}`);
      alert(`Usuário ${userEmail} removido com sucesso.`);
      fetchUsersAndLocations();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover usuário.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return (
          <span className="ui-badge admin-role-badge role-superadmin px-2.5 py-1 rounded-full text-xs font-bold w-fit">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            SUPERADMIN
          </span>
        );
      case 'ADMIN':
        return (
          <span className="ui-badge admin-role-badge role-admin px-2.5 py-1 rounded-full text-xs font-bold w-fit">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="ui-badge admin-role-badge role-manager px-2.5 py-1 rounded-full text-xs font-bold w-fit">
            MANAGER
          </span>
        );
      case 'TECHNICIAN':
        return (
          <span className="ui-badge admin-role-badge role-technician px-2.5 py-1 rounded-full text-xs font-bold w-fit">
            TECHNICIAN
          </span>
        );
      case 'USUARIO':
        return (
          <span className="ui-badge admin-role-badge role-user px-2.5 py-1 rounded-full text-xs font-bold w-fit">
            USUÁRIO
          </span>
        );
      default:
        return (
          <span className="ui-badge admin-role-badge role-viewer px-2.5 py-1 rounded-full text-xs font-bold w-fit">
            VIEWER
          </span>
        );
    }
  };

  return (
    <div className="admin-data-page space-y-5">
      {/* Action Header */}
      <div className="admin-page-hero surface-ambient flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="admin-icon-box icon-box h-11 w-11 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="if-text text-lg font-bold">Controle de Usuários & RBAC</h2>
            <p className="if-text-secondary text-xs">Total de {filteredUsers.length} usuário(s) localizado(s)</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="admin-button-primary min-h-10 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário ADM / Técnico</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="admin-toolbar surface-elevated flex flex-col md:flex-row gap-3 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 if-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="admin-control min-h-11 w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="admin-control min-h-11 px-4 py-2.5 rounded-xl text-sm font-semibold md:min-w-60"
        >
          <option value="ALL">Todos os Perfis (RBAC)</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="MANAGER">MANAGER</option>
          <option value="TECHNICIAN">TECHNICIAN</option>
          <option value="USUARIO">USUÁRIO</option>
          <option value="VIEWER">VIEWER</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="admin-data-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-purple-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-empty-state m-4 sm:m-6">
            <Users className="h-5 w-5" aria-hidden="true" />
            <span>Nenhum usuário encontrado para os filtros selecionados.</span>
          </div>
        ) : (
          <>
          <div className="md:hidden p-3 space-y-3">
            {filteredUsers.map((usr) => <article key={usr.id} className="mobile-data-card admin-mobile-card space-y-3">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-white break-words">{usr.name}</h3><p className="text-sm text-slate-400 font-mono break-all">{usr.email}</p></div>{getRoleBadge(usr.role)}</div>
              <dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Cargo</dt><dd className="text-slate-200">{usr.accessRole?.name || 'Perfil legado'}</dd></div><div><dt className="text-slate-500">Status</dt><dd className={usr.isActive === false ? 'text-rose-400' : 'text-emerald-400'}>{usr.isActive === false ? 'Inativo' : 'Ativo'}</dd></div><div><dt className="text-slate-500">Local</dt><dd className="text-slate-200 break-words">{usr.location?.name || 'Não vinculado'}</dd></div><div><dt className="text-slate-500">Criado em</dt><dd className="text-slate-200">{new Date(usr.createdAt).toLocaleDateString('pt-BR')}</dd></div></dl>
              <div className="flex gap-2 pt-1"><button onClick={() => handleOpenModal(usr)} className="admin-button-secondary min-h-11 flex-1 rounded-xl inline-flex items-center justify-center gap-2"><Edit3 className="w-4 h-4" />Editar</button><button onClick={() => handleDeleteUser(usr.id, usr.email)} disabled={usr.id === currentUser?.id} className="admin-icon-button is-danger h-11 w-11 rounded-xl disabled:opacity-30" aria-label={`Excluir ${usr.name}`}><Trash2 className="w-4 h-4" /></button></div>
            </article>)}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="admin-table-head text-[11px] font-bold tracking-wide">
                  <th className="px-6 py-4">Usuário / E-mail</th>
                  <th className="px-6 py-4">Perfil RBAC</th>
                  <th className="px-6 py-4">Setor / Localidade</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Criado em</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="admin-table-body text-sm">
                {filteredUsers.map((usr) => (
                  <tr key={usr.id} className="admin-table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`icon-box h-9 w-9 rounded-xl font-bold text-xs ${
                          usr.role === 'SUPERADMIN' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : usr.role === 'USUARIO'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {usr.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="if-text font-bold">{usr.name}</div>
                          <div className="if-text-secondary text-xs font-mono">{usr.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {getRoleBadge(usr.role)}
                      <div className="text-[10px] text-slate-500 mt-1">{usr.accessRole?.name || 'Perfil legado'} · {usr.isActive === false ? 'Inativo' : 'Ativo'}</div>
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold if-text-secondary">
                      {usr.location?.name || 'Não Vinculado'}
                    </td>

                    <td className="px-6 py-4 if-text-secondary text-xs">
                      {usr.company?.name || 'Não informada'}
                    </td>

                    <td className="px-6 py-4 if-text-muted text-xs font-mono tabular-nums">
                      {new Date(usr.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(usr)}
                          title="Editar Usuário / Perfil"
                          className="admin-icon-button h-9 w-9 rounded-lg"
                          aria-label={`Editar ${usr.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usr.id, usr.email)}
                          disabled={usr.id === currentUser?.id}
                          title={usr.id === currentUser?.id ? 'Você não pode excluir sua própria conta' : 'Excluir Usuário'}
                          className={`admin-icon-button h-9 w-9 rounded-lg ${
                            usr.id === currentUser?.id
                              ? 'is-disabled cursor-not-allowed'
                              : 'is-danger'
                          }`}
                          aria-label={`Excluir ${usr.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="responsive-modal-backdrop">
          <div className="responsive-modal-panel max-w-md space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingUser ? 'Editar Perfil de Usuário' : 'Criar Novo Usuário'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Silva"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nome de Usuário (Login)</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    pattern="[a-z]+\.[a-z]+"
                    title="Use o formato nome.sobrenome, apenas letras minúsculas e ponto."
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Digite seu usuário, ex: nome.sobrenome"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <label className="text-xs font-semibold text-slate-300">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@empresa.com.br"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {editingUser ? 'Nova Senha (opcional)' : 'Senha de Acesso'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Manter senha atual' : 'Mínimo 8 caracteres'}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Cargo / Perfil de Permissão (RBAC)</label>
                <select
                  value={formData.accessRoleId}
                  onChange={(e) => setFormData({ ...formData, accessRoleId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="">Selecione um cargo</option>
                  {accessRoles.filter((role) => role.enabled).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} /> Usuário ativo
              </label>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Setor / Localidade Vinculada</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none" />
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Nenhum Setor Selecionado</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {getLocationFullName(loc, locations)} {loc.room ? `(${loc.room})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingUser ? 'Salvar Alterações' : 'Criar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
