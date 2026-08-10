import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AssetStatus, PeripheralCategory, PeripheralSubcategory, Prisma } from '@prisma/client';
import { processAndSaveEquipmentImage } from '../services/imageProcessor.service';
import { emitAssetStatusUpdate } from '../services/websocket.service';

export const assetRouter = Router();

const CreateAssetSchema = z.object({
  name: z.string().min(3, 'Nome é obrigatório'),
  code: z.string().min(2, 'Código é obrigatório'),
  assetTag: z.string().optional(),
  ownershipType: z.string().optional().nullable(),
  rentalCompany: z.string().optional().nullable(),
  rental_company: z.string().optional().nullable(),
  serialNumber: z.string().optional(),
  hostname: z.string().optional(),
  ipAddress: z.string().optional(),
  category: z.string().min(2, 'Categoria é obrigatória'),
  status: z.nativeEnum(AssetStatus).optional().default(AssetStatus.OPERATIONAL),
  locationId: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
  imageUrl: z.string().optional(),
  wifiBands: z.string().optional().nullable(),
});

const UpdateAssetSchema = CreateAssetSchema.partial();

// GET /api/assets - List all assets
assetRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, locationId, search } = req.query;

    const where: Prisma.AssetWhereInput = {};

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
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, building: true, room: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
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
      macAddress, 
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

// POST /api/assets - Create asset
assetRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.format() });
    }

    let companyId = parsed.data.companyId;
    if (!companyId) {
      const company = await prisma.company.findFirst();
      if (!company) {
        return res.status(400).json({ error: 'Nenhuma empresa cadastrada no sistema' });
      }
      companyId = company.id;
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
        ipAddress: parsed.data.ipAddress,
        category: parsed.data.category,
        status: parsed.data.status,
        locationId: parsed.data.locationId,
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

    const updateData = { ...parsed.data };

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

    if (parsed.data.status) {
      emitAssetStatusUpdate({
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
        ipAddress: updated.ipAddress,
      });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar ativo' });
  }
});

// DELETE /api/assets/:id - Delete asset
assetRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.asset.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover ativo' });
  }
});
