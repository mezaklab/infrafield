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
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { SystemUser } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TECHNICIAN' as 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<SystemUser[]>('/admin/users');
      setUsers(res.data);
    } catch (err: any) {
      console.warn('Fallback backend users list:', err);
      // Fallback data if backend database is empty or offline
      setUsers([
        {
          id: 'usr-1',
          name: 'SuperAdministrador InfraField',
          email: 'superadmin@infrafield.io',
          role: 'SUPERADMIN',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'TechCorp Infraestrutura S.A.' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'usr-2',
          name: 'Administrador InfraField',
          email: 'admin@infrafield.io',
          role: 'ADMIN',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'TechCorp Infraestrutura S.A.' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'usr-3',
          name: 'Carlos Silva (Técnico)',
          email: 'carlos.silva@infrafield.io',
          role: 'TECHNICIAN',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'TechCorp Infraestrutura S.A.' },
          createdAt: new Date().toISOString(),
        },
        {
          id: 'usr-4',
          name: 'Mariana Costa (Gerente)',
          email: 'mariana.costa@infrafield.io',
          role: 'MANAGER',
          companyId: 'comp-1',
          company: { id: 'comp-1', name: 'TechCorp Infraestrutura S.A.' },
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (userToEdit?: SystemUser) => {
    setFormError(null);
    setFormSuccess(null);
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'TECHNICIAN',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.name || !formData.email) {
      setFormError('Nome e E-mail são obrigatórios.');
      return;
    }
    if (!editingUser && !formData.password) {
      setFormError('Senha é obrigatória para criação de novos usuários.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, formData);
        setFormSuccess('Usuário atualizado com sucesso!');
        setTimeout(() => {
          handleCloseModal();
          fetchUsers();
        }, 1000);
      } else {
        // Create user
        await api.post('/admin/users', formData);
        setFormSuccess('Usuário criado com sucesso!');
        setTimeout(() => {
          handleCloseModal();
          fetchUsers();
        }, 1000);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Erro ao salvar usuário.';
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
      fetchUsers();
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
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            SUPERADMIN
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 w-fit">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            ADMIN
          </span>
        );
      case 'MANAGER':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 w-fit">
            MANAGER
          </span>
        );
      case 'TECHNICIAN':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 w-fit">
            TECHNICIAN
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40 w-fit">
            VIEWER
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-purple-900/40 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Controle de Usuários & RBAC</h2>
            <p className="text-xs text-slate-400">Total de {filteredUsers.length} usuário(s) localizado(s)</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Usuário ADM / Técnico</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">Todos os Perfis (RBAC)</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
          <option value="ADMIN">ADMIN</option>
          <option value="MANAGER">MANAGER</option>
          <option value="TECHNICIAN">TECHNICIAN</option>
          <option value="VIEWER">VIEWER</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-purple-900/40 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-purple-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhum usuário encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Usuário / E-mail</th>
                  <th className="px-6 py-4">Perfil RBAC</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Criado em</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          usr.role === 'SUPERADMIN' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {usr.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white">{usr.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{usr.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {getRoleBadge(usr.role)}
                    </td>

                    <td className="px-6 py-4 text-slate-300 text-xs">
                      {usr.company?.name || 'TechCorp Infraestrutura'}
                    </td>

                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                      {new Date(usr.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(usr)}
                          title="Editar Usuário / Perfil"
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usr.id, usr.email)}
                          disabled={usr.id === currentUser?.id}
                          title={usr.id === currentUser?.id ? 'Você não pode excluir sua própria conta' : 'Excluir Usuário'}
                          className={`p-2 rounded-lg transition-colors ${
                            usr.id === currentUser?.id
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in">
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
                <label className="text-xs font-semibold text-slate-300">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="exemplo@infrafield.io"
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
                    placeholder={editingUser ? 'Manter senha atual' : 'Mínimo 6 caracteres'}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Perfil de Permissão (RBAC)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="SUPERADMIN">SUPERADMIN — Acesso Total e Edição Global</option>
                  <option value="ADMIN">ADMIN — Acesso Backoffice e Gestão</option>
                  <option value="MANAGER">MANAGER — Gestor de Operações e Visitas</option>
                  <option value="TECHNICIAN">TECHNICIAN — Técnico de Campo</option>
                  <option value="VIEWER">VIEWER — Apenas Leitura e Auditoria</option>
                </select>
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
