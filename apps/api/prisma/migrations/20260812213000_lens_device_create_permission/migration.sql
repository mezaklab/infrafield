-- Permissão granular necessária para técnicos importarem ativos pelo InfraField Lens
-- sem receber acesso para editar/excluir registros existentes.
INSERT INTO "permissions" ("id", "key", "name", "category", "created_at")
VALUES ('perm_devices_create', 'devices.create', 'Cadastrar equipamentos', 'Equipamentos', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT ar."id", p."id"
FROM "access_roles" ar
JOIN "permissions" p ON p."key" = 'devices.create'
WHERE ar."key" IN ('SUPERADMIN', 'ADMIN', 'TECHNICIAN')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
