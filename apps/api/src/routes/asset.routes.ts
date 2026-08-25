import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AssetStatus, PeripheralCategory, PeripheralSubcategory, Prisma, Role } from '@prisma/client';
import { processAndSaveEquipmentImage } from '../services/imageProcessor.service';
import { emitAssetStatusUpdate } from '../services/websocket.service';
import { normalizeMacAddress } from '../modules/network/utils/macAddress';
import { isIP } from 'node:net';
import { findMacOwner } from '../modules/network/services/findMacOwner';

export const assetRouter = Router();

const OptionalRelationIdSchema = z.preprocess(
  (value) => value === null || (typeof value === 'string' && value.trim() === '') ? null : value,
  z.string().trim().min(1).nullable().optional(),
);

const CreateAssetSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  code: z.string().min(2, 'Código é obrigatório'),
  assetTag: z.string().optional(),
  ownershipType: z.string().optional().nullable(),
  rentalCompany: z.string().optional().nullable(),
  rental_company: z.string().optional().nullable(),
  serialNumber: z.string().optional(),
  hostname: z.string().optional(),
  ipAddress: z.string().trim().refine((value) => value === '' || isIP(value) === 4, 'IPv4 inválido').optional(),
  macAddress: z.string().trim().transform((value, ctx) => {
    if (value === '') return undefined;
    const normalized = normalizeMacAddress(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MAC Address inválido' });
      return z.NEVER;
    }
    return normalized;
  }).optional(),
  monitoringEnabled: z.boolean().optional(),
  category: z.string().min(2, 'Categoria é obrigatória'),
  status: z.nativeEnum(AssetStatus).optional().default(AssetStatus.OPERATIONAL),
  locationId: OptionalRelationIdSchema,
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
  imageUrl: z.string().optional(),
  wifiBands: z.string().optional().nullable(),
});

const UpdateAssetSchema = CreateAssetSchema.partial();

const canAccessCompany = (req: Request, companyId: string) =>
  req.user?.role === Role.SUPERADMIN || req.user?.companyId === companyId;

// GET /api/assets - List all assets
assetRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, locationId, search } = req.query;

    const where: Prisma.AssetWhereInput = req.user?.role === Role.SUPERADMIN
      ? {}
      : { companyId: req.user!.companyId };

    if (status && status !== 'ALL') {
      where.status = status as AssetStatus;
    }

    if (category && category !== 'ALL') {
      where.category = category as string;
    }

    if (locationId && locationId !== 'ALL') {
      where.locationId = locationId as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } },
        { assetTag: { contains: String(search), mode: 'insensitive' } },
        { serialNumber: { contains: String(search), mode: 'insensitive' } },
        { hostname: { contains: String(search), mode: 'insensitive' } },
        { ipAddress: { contains: String(search), mode: 'insensitive' } },
        { currentIp: { contains: String(search), mode: 'insensitive' } },
        { macAddress: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, building: true, room: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        ipHistory: { orderBy: { detectedAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(assets);
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    return res.status(500).json({ error: 'Erro ao buscar ativos' });
  }
});

// GET /api/assets/:id - Get asset details
assetRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        location: true,
        company: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!asset) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }

    if (!canAccessCompany(req, asset.companyId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    return res.json(asset);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar ativo' });
  }
});

/**
 * POST /api/assets/onboard
 * Cadastro rápido via Script PowerShell / Web Onboarding
 * Salva no banco via Prisma na tabela Peripheral (category: COMPUTADOR) e Asset, vincula ao setor e ativa poller ICMP Ping
 */
assetRouter.post('/onboard', async (req: Request, res: Response) => {
  try {
    const { 
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
      ownerVendor, 
      is_rented,
      rental_company,
      rentalCompany,
      specifications, 
      assignedToName,
      hasMonitor,
      monitorAssetTag,
      monitorBrand,
      monitorModel,
      monitorOwnershipType,
      monitorOwnerVendor,
    } = req.body;

    if (!hostname || !ipAddress) {
      res.status(400).json({ error: 'Hostname e Endereço IP são obrigatórios para o onboarding.' });
      return;
    }

    // Determine ownership type and rental company from payload (supporting is_rented boolean flag or ownershipType string)
    const isRented = is_rented === true || is_rented === 'true' || ownershipType === 'LOCADO';
    const computedOwnershipType = isRented ? 'LOCADO' : 'PROPRIO';
    const computedRentalCompany = isRented ? (rental_company || rentalCompany || ownerVendor || null) : null;

    // 1. Obter empresa padrão
    const firstCompany = await prisma.company.findFirst();
    if (!firstCompany) {
      res.status(400).json({ error: 'Nenhuma empresa cadastrada no sistema para vincular o ativo.' });
      return;
    }
    const companyId = firstCompany.id;

    // 2. Gerar código único de identificação e formatar especificações técnicas
    const cleanHost = String(hostname).toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const periphCode = `PER-${cleanHost || Date.now().toString().slice(-6)}`;
    const assetCode = `PC-${cleanHost || Date.now().toString().slice(-6)}`;
    const subcategoryEnum = type === 'NOTEBOOK' ? PeripheralSubcategory.NOTEBOOK : PeripheralSubcategory.DESKTOP;

    const specsParts = [
      cpu && cpu !== 'N/A' && `CPU: ${cpu}`,
      ram && ram !== 'N/A' && `RAM: ${ram}`,
      os && os !== 'N/A' && `OS: ${os}`,
      computedOwnershipType && `Vínculo: ${computedOwnershipType === 'LOCADO' ? `Locado (${computedRentalCompany || 'Empresa Locadora'})` : 'Próprio (Município)'}`,
      specifications && `Obs: ${specifications}`,
    ].filter(Boolean).join(' | ');

    const finalSpecs = specsParts || specifications || null;

    // 3. Verificar se usuário responsável existe ou vincular/criar
    let assignedToId: string | undefined = undefined;
    if (assignedToName) {
      const matchedUser = await prisma.user.findFirst({
        where: {
          OR: [
            { name: { contains: String(assignedToName), mode: 'insensitive' } },
            { email: { contains: String(assignedToName), mode: 'insensitive' } },
          ],
        },
      });
      if (matchedUser) {
        assignedToId = matchedUser.id;
      }
    }

    // 4. Criar ou Atualizar na tabela Peripheral (categoria COMPUTADOR)
    const existingPeripheral = await prisma.peripheral.findFirst({
      where: {
        OR: [
          { code: periphCode },
          { name: String(hostname) },
          { ipAddress: String(ipAddress) },
        ],
      },
    });

    let peripheralResult;
    if (existingPeripheral) {
      peripheralResult = await prisma.peripheral.update({
        where: { id: existingPeripheral.id },
        data: {
          name: String(hostname),
          assetTag: assetTag || existingPeripheral.assetTag,
          ownershipType: computedOwnershipType,
          rentalCompany: computedRentalCompany,
          category: PeripheralCategory.COMPUTADOR,
          subcategory: subcategoryEnum,
          brand: (brand && brand !== 'N/A') ? brand : existingPeripheral.brand,
          model: (model && model !== 'N/A') ? model : existingPeripheral.model,
          ipAddress: String(ipAddress),
          specifications: finalSpecs || existingPeripheral.specifications,
          locationId: locationId || existingPeripheral.locationId,
          assignedToId: assignedToId || existingPeripheral.assignedToId,
          status: AssetStatus.OPERATIONAL,
        },
        include: {
          location: { select: { id: true, name: true, building: true, room: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });
    } else {
      peripheralResult = await prisma.peripheral.create({
        data: {
          name: String(hostname),
          code: periphCode,
          assetTag: assetTag || `PAT-${Date.now().toString().slice(-5)}`,
          ownershipType: computedOwnershipType,
          rentalCompany: computedRentalCompany,
          category: PeripheralCategory.COMPUTADOR,
          subcategory: subcategoryEnum,
          brand: (brand && brand !== 'N/A') ? brand : null,
          model: (model && model !== 'N/A') ? model : null,
          ipAddress: String(ipAddress),
          specifications: finalSpecs,
          locationId: locationId || undefined,
          companyId,
          assignedToId,
          status: AssetStatus.OPERATIONAL,
        },
        include: {
          location: { select: { id: true, name: true, building: true, room: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });
    }

    // 4.5. Se hasMonitor for marcado, criar um SEGUNDO ATIVO (Monitor) vinculado à mesma localidade e responsável
    let monitorResult = null;
    if (hasMonitor) {
      const monCode = `MON-${cleanHost || Date.now().toString().slice(-6)}`;
      const monName = [monitorBrand, monitorModel].filter(Boolean).join(' ') || `Monitor Tela (${hostname})`;
      const isMonRented = monitorOwnershipType === 'LOCADO';
      const monRentalComp = isMonRented ? (monitorOwnerVendor || null) : null;
      const monSpecs = `Vínculo: ${isMonRented ? `Locado (${monRentalComp || 'Empresa Locadora'})` : 'Próprio'}`;

      try {
        monitorResult = await prisma.peripheral.create({
          data: {
            name: monName,
            code: monCode,
            assetTag: monitorAssetTag || `PAT-MON-${Date.now().toString().slice(-5)}`,
            ownershipType: isMonRented ? 'LOCADO' : 'PROPRIO',
            rentalCompany: monRentalComp,
            category: PeripheralCategory.MONITOR,
            brand: monitorBrand || null,
            model: monitorModel || null,
            specifications: monSpecs,
            locationId: locationId || undefined,
            companyId,
            assignedToId,
            status: AssetStatus.OPERATIONAL,
          },
          include: {
            location: { select: { id: true, name: true, building: true, room: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        });
      } catch (monErr) {
        console.warn('Error creating attached monitor peripheral:', monErr);
      }
    }

    // 4.5. Sincronizar na tabela Asset para aparecer também em Ativos TI & Redes
    try {
      await prisma.asset.upsert({
        where: { code: assetCode },
        update: {
          name: String(hostname),
          assetTag: assetTag || undefined,
          hostname: String(hostname),
          ipAddress: String(ipAddress),
          category: type === 'NOTEBOOK' ? 'Computador (Notebook)' : 'Computador (Desktop)',
          locationId: locationId || undefined,
          assignedToId: assignedToId || undefined,
          status: AssetStatus.OPERATIONAL,
        },
        create: {
          name: String(hostname),
          code: assetCode,
          assetTag: assetTag || `PAT-${Date.now().toString().slice(-5)}`,
          hostname: String(hostname),
          ipAddress: String(ipAddress),
          category: type === 'NOTEBOOK' ? 'Computador (Notebook)' : 'Computador (Desktop)',
          locationId: locationId || undefined,
          companyId,
          assignedToId,
          status: AssetStatus.OPERATIONAL,
        },
      });
    } catch (assetErr) {
      console.warn('Asset table sync notice:', assetErr);
    }

    // 5. Inserir IP na fila de monitoramento ICMP Ping via WebSocket
    emitAssetStatusUpdate({
      id: peripheralResult.id,
      code: peripheralResult.code,
      name: peripheralResult.name,
      status: peripheralResult.status,
      ipAddress: peripheralResult.ipAddress || undefined,
      companyId: peripheralResult.companyId,
    });

    // 6. Registrar no Log de Auditoria
    try {
      await prisma.auditLog.create({
        data: {
          action: 'ASSET_ONBOARDED',
          user: req.user?.email || 'SCRIPT_POWERSHELL',
          role: req.user?.role || 'TECHNICIAN',
          details: `Onboarding de computador ${hostname} (IP: ${ipAddress}) cadastrado na categoria COMPUTADOR no setor ID: ${locationId || 'N/A'}`,
          ipAddress: req.ip,
        },
      });
    } catch {
      // Ignore if table warming
    }

    res.status(201).json({
      success: true,
      message: hasMonitor && monitorResult
        ? `2 Ativos cadastrados simultaneamente! Computador (${hostname}) e Monitor cadastrados e vinculados ao setor com sucesso.`
        : `Equipamento ${hostname} cadastrado com sucesso na lista de Periféricos (COMPUTADOR) e ativado no monitoramento ICMP Ping!`,
      asset: peripheralResult,
      peripheral: peripheralResult,
      monitor: monitorResult,
      totalCreated: hasMonitor && monitorResult ? 2 : 1,
    });
  } catch (error: any) {
    console.error('Error during asset onboarding:', error);
    res.status(500).json({ error: 'Erro ao realizar o onboarding do equipamento.' });
  }
});

// POST /api/assets/bulk - Import assets from CSV
assetRouter.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { assets } = req.body;
    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Nenhum ativo válido fornecido.' });
    }

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'Empresa do usuário não identificada.' });
    }

    const preparedAssets: Array<{ line: number; data: Prisma.AssetUncheckedCreateInput }> = [];
    const importErrors: Array<{ line: number; errors: string[] }> = [];
    const seenCodes = new Set<string>();
    const seenMacs = new Set<string>();

    assets.forEach((item, index) => {
      const line = index + 2;
      const rowErrors: string[] = [];
      const { Categoria, Patrimonio, MAC_Address, Fabricante, Modelo, Status } = item;
      
      const code = Patrimonio || `AST-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      const name = Modelo ? `${Fabricante || 'Desconhecido'} ${Modelo}` : `Ativo ${code}`;
      
      // Default to Redes & Switches if no category is provided
      const category = Categoria || 'Redes & Switches';
      
      let mappedStatus: AssetStatus = AssetStatus.OPERATIONAL;
      if (Status) {
        const s = Status.toUpperCase();
        if (s.includes('MANUTENÇÃO') || s.includes('MAINTENANCE')) mappedStatus = AssetStatus.MAINTENANCE;
        else if (s.includes('CRÍTICO') || s.includes('CRITICAL')) mappedStatus = AssetStatus.CRITICAL;
        else if (s.includes('INATIVO') || s.includes('INACTIVE')) mappedStatus = AssetStatus.INACTIVE;
      }

      const macAddress = MAC_Address ? normalizeMacAddress(String(MAC_Address)) : undefined;
      if (MAC_Address && !macAddress) rowErrors.push('MAC Address inválido');
      if (seenCodes.has(code)) rowErrors.push(`Patrimônio/código duplicado no CSV: ${code}`);
      if (macAddress && seenMacs.has(macAddress)) rowErrors.push(`MAC Address duplicado no CSV: ${macAddress}`);

      seenCodes.add(code);
      if (macAddress) seenMacs.add(macAddress);

      if (rowErrors.length > 0) {
        importErrors.push({ line, errors: rowErrors });
        return;
      }

      preparedAssets.push({
        line,
        data: {
          name,
          code,
          category,
          assetTag: Patrimonio || undefined,
          macAddress,
          status: mappedStatus,
          companyId,
        },
      });
    });

    if (preparedAssets.length === 0 && importErrors.length === 0) {
      return res.status(400).json({ error: 'Nenhum ativo válido fornecido.' });
    }

    const codes = preparedAssets.map((asset) => asset.data.code);
    const macs = preparedAssets.flatMap((asset) => asset.data.macAddress ? [asset.data.macAddress] : []);
    const existingAssets = await prisma.asset.findMany({
      where: {
        OR: [
          codes.length ? { code: { in: codes } } : undefined,
          macs.length ? { macAddress: { in: macs } } : undefined,
        ].filter(Boolean) as Prisma.AssetWhereInput[],
      },
      select: { code: true, macAddress: true },
    });
    const existingCodes = new Set(existingAssets.map((asset) => asset.code));
    const existingMacs = new Set(existingAssets.flatMap((asset) => asset.macAddress ? [asset.macAddress] : []));
    preparedAssets.forEach((asset) => {
      const rowErrors: string[] = [];
      if (existingCodes.has(asset.data.code)) rowErrors.push(`Patrimônio/código já cadastrado: ${asset.data.code}`);
      if (asset.data.macAddress && existingMacs.has(asset.data.macAddress)) rowErrors.push(`MAC Address já cadastrado: ${asset.data.macAddress}`);
      if (rowErrors.length > 0) importErrors.push({ line: asset.line, errors: rowErrors });
    });

    if (importErrors.length > 0) {
      return res.status(400).json({
        error: 'Importação cancelada. Corrija as linhas indicadas e envie novamente.',
        details: importErrors.sort((a, b) => a.line - b.line),
      });
    }

    await prisma.$transaction(
      preparedAssets.map((asset) => prisma.asset.create({ data: asset.data })),
    );

    return res.status(201).json({ success: true, count: preparedAssets.length });
  } catch (error: any) {
    console.error('[ASSETS] POST /bulk error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({
        error: 'Importação cancelada. Um ou mais registros conflitam com dados já cadastrados.',
        details: [{ line: null, errors: ['Conflito de chave única durante a transação. Nenhum ativo foi importado.'] }],
      });
    }
    return res.status(500).json({ error: 'Erro ao importar ativos em lote.' });
  }
});

// POST /api/assets - Create asset
assetRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    let companyId = req.user?.role === Role.SUPERADMIN
      ? parsed.data.companyId
      : req.user!.companyId;
    if (!companyId) {
      const company = await prisma.company.findFirst();
      if (!company) {
        return res.status(400).json({ error: 'Nenhuma empresa cadastrada no sistema' });
      }
      companyId = company.id;
    }

    if (parsed.data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: parsed.data.locationId, companyId },
        select: { id: true },
      });
      if (!location) {
        return res.status(400).json({
          error: 'A localização selecionada não existe mais. Selecione outra localização.',
          code: 'INVALID_LOCATION',
        });
      }
    }

    if (parsed.data.monitoringEnabled && !parsed.data.macAddress) {
      return res.status(400).json({ error: 'Informe um MAC Address para ativar o monitoramento.' });
    }
    if (parsed.data.macAddress) {
      const owner = await findMacOwner(parsed.data.macAddress);
      if (owner) return res.status(409).json({ error: `MAC Address já cadastrado em ${owner.name} (${owner.code}).` });
    }

    const existing = await prisma.asset.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return res.status(400).json({ error: 'Já existe um ativo com este código de identificação' });
    }

    let imageUrl = parsed.data.imageUrl;

    // Process image to remove white background and convert to transparent local PNG if provided as remote URL
    if (imageUrl && !imageUrl.startsWith('/uploads/assets/')) {
      try {
        const processedUrl = await processAndSaveEquipmentImage(imageUrl);
        if (processedUrl) {
          imageUrl = processedUrl;
        }
      } catch (procErr) {
        console.warn('Image background removal on creation failed, preserving original URL:', procErr);
      }
    }

    const newAsset = await prisma.asset.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        assetTag: parsed.data.assetTag,
        serialNumber: parsed.data.serialNumber,
        hostname: parsed.data.hostname,
        ipAddress: parsed.data.ipAddress || undefined,
        currentIp: parsed.data.ipAddress || undefined,
        macAddress: parsed.data.macAddress,
        monitoringEnabled: parsed.data.monitoringEnabled ?? Boolean(parsed.data.macAddress),
        ...(parsed.data.ipAddress ? { ipHistory: { create: { ipAddress: parsed.data.ipAddress } } } : {}),
        category: parsed.data.category,
        status: parsed.data.status,
        locationId: parsed.data.locationId ?? null,
        companyId,
        assignedToId: parsed.data.assignedToId,
        imageUrl,
        wifiBands: parsed.data.wifiBands,
      },
      include: {
        location: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(newAsset);
  } catch (error: any) {
    console.error('Error creating asset:', error);
    if (error?.code === 'P2002') return res.status(409).json({ error: 'MAC Address ou código já cadastrado' });
    if (error?.code === 'P2003' && String(error?.meta?.field_name || '').includes('locationId')) {
      return res.status(400).json({ error: 'A localização selecionada não existe mais. Selecione outra localização.', code: 'INVALID_LOCATION' });
    }
    return res.status(500).json({ error: 'Erro ao criar ativo' });
  }
});

// PATCH /api/assets/:id - Update asset
assetRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = UpdateAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    const existing = await prisma.asset.findUnique({ where: { id }, select: { companyId: true, currentIp: true, macAddress: true, monitoringEnabled: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }
    if (!canAccessCompany(req, existing.companyId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (parsed.data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: parsed.data.locationId, companyId: existing.companyId },
        select: { id: true },
      });
      if (!location) {
        return res.status(400).json({
          error: 'A localização selecionada não existe mais. Selecione outra localização.',
          code: 'INVALID_LOCATION',
        });
      }
    }

    const resultingMac = parsed.data.macAddress === undefined ? existing.macAddress : parsed.data.macAddress;
    const resultingMonitoring = parsed.data.monitoringEnabled === undefined ? existing.monitoringEnabled : parsed.data.monitoringEnabled;
    if (resultingMonitoring && !resultingMac) {
      return res.status(400).json({ error: 'Informe um MAC Address para ativar o monitoramento.' });
    }
    if (parsed.data.macAddress) {
      const owner = await findMacOwner(parsed.data.macAddress, { kind: 'ASSET', id });
      if (owner) return res.status(409).json({ error: `MAC Address já cadastrado em ${owner.name} (${owner.code}).` });
    }

    const updateData = {
      ...parsed.data,
      ...(parsed.data.ipAddress !== undefined ? { currentIp: parsed.data.ipAddress || null, ipAddress: parsed.data.ipAddress || null } : {}),
    };
    if (req.user?.role !== Role.SUPERADMIN) {
      delete updateData.companyId;
    }

    if (updateData.imageUrl && !updateData.imageUrl.startsWith('/uploads/assets/')) {
      try {
        const processedUrl = await processAndSaveEquipmentImage(updateData.imageUrl, id);
        if (processedUrl) {
          updateData.imageUrl = processedUrl;
        }
      } catch (procErr) {
        console.warn('Image background removal on update failed, preserving original URL:', procErr);
      }
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (parsed.data.ipAddress && parsed.data.ipAddress !== existing.currentIp) {
      await prisma.$transaction([
        prisma.deviceIpHistory.updateMany({ where: { deviceId: id, lostAt: null }, data: { lostAt: new Date() } }),
        prisma.deviceIpHistory.create({ data: { deviceId: id, ipAddress: parsed.data.ipAddress } }),
      ]);
    }

    if (parsed.data.status) {
      emitAssetStatusUpdate({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        ipAddress: updated.ipAddress,
        companyId: updated.companyId,
      });
    }

    return res.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'MAC Address já cadastrado em outro ativo' });
    if (error?.code === 'P2003' && String(error?.meta?.field_name || '').includes('locationId')) {
      return res.status(400).json({ error: 'A localização selecionada não existe mais. Selecione outra localização.', code: 'INVALID_LOCATION' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar ativo' });
  }
});

// DELETE /api/assets/:id - Delete asset
assetRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.asset.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Ativo não encontrado' });
    }
    if (!canAccessCompany(req, existing.companyId)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    await prisma.asset.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover ativo' });
  }
});
