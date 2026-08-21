import { Role } from '@prisma/client';

export const PERMISSIONS = [
  ['dashboard.view', 'Visualizar dashboard', 'Dashboard'],
  ['devices.view', 'Visualizar equipamentos', 'Equipamentos'],
  ['devices.create', 'Cadastrar equipamentos', 'Equipamentos'],
  ['devices.manage', 'Gerenciar equipamentos', 'Equipamentos'],
  ['monitoring.view', 'Visualizar monitoramento', 'Monitoramento'],
  ['monitoring.manage', 'Gerenciar monitoramento', 'Monitoramento'],
  ['alerts.view', 'Visualizar alertas', 'Alertas'],
  ['workorders.view', 'Visualizar ordens de serviço', 'Ordens de serviço'],
  ['workorders.manage', 'Criar e editar ordens de serviço', 'Ordens de serviço'],
  ['workorders.assigned.update', 'Atualizar ordens atribuídas', 'Ordens de serviço'],
  ['checklists.execute', 'Executar checklists', 'Checklists'],
  ['checklists.manage', 'Gerenciar templates de checklist', 'Checklists'],
  ['users.view', 'Visualizar usuários', 'Administração'],
  ['users.manage', 'Gerenciar usuários', 'Administração'],
  ['roles.view', 'Visualizar cargos e permissões', 'Administração'],
  ['roles.manage', 'Gerenciar cargos e permissões', 'Administração'],
  ['settings.view', 'Visualizar configurações', 'Administração'],
  ['settings.manage', 'Alterar configurações globais', 'Administração'],
  ['audit.view', 'Visualizar auditoria', 'Administração'],
] as const;

export type PermissionKey = typeof PERMISSIONS[number][0];

export const TECHNICIAN_PERMISSION_KEYS: PermissionKey[] = [
  'dashboard.view', 'devices.view', 'devices.create', 'monitoring.view', 'alerts.view',
  'workorders.view', 'workorders.assigned.update', 'checklists.execute',
];

export const DEFAULT_ACCESS_ROLES = [
  { key: 'SUPERADMIN', name: 'Super Admin', description: 'Acesso irrestrito e administração completa.', protected: true, legacyRole: Role.SUPERADMIN },
  { key: 'ADMIN', name: 'Administrador', description: 'Gestão administrativa e operacional.', protected: true, legacyRole: Role.ADMIN },
  { key: 'MANAGER', name: 'Gestor', description: 'Gestão operacional de equipes e serviços.', protected: true, legacyRole: Role.MANAGER },
  { key: 'TECNICO', name: 'Técnico', description: 'Execução de atividades técnicas e ordens atribuídas.', protected: true, legacyRole: Role.TECHNICIAN },
  { key: 'VIEWER', name: 'Visualizador', description: 'Consulta sem alterações administrativas.', protected: true, legacyRole: Role.VIEWER },
  { key: 'USUARIO', name: 'Usuário', description: 'Abertura e acompanhamento de solicitações.', protected: true, legacyRole: Role.USUARIO },
] as const;
