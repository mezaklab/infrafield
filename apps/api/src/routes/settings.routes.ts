import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import axios from 'axios';
import QRCode from 'qrcode';
import { sendWhatsAppText } from '../services/whatsapp.service';

export const settingsRouter = Router();

const UpdateSettingsSchema = z.object({
  whatsapp_group_id: z.string().optional().nullable(),
  whatsapp_group_name: z.string().optional().nullable(),
});

// GET /api/settings - Retorna as configurações atuais (cria registro default se não existir)
settingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          whatsapp_group_id: null,
          whatsapp_group_name: null,
          whatsapp_status: 'DISCONNECTED',
        },
      });
    }
    return res.json({ success: true, data: settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar configurações', error: error?.message });
  }
});

// POST / PUT / PATCH /api/settings - Atualiza ou cria as configurações
const handleUpdateSettings = async (req: Request, res: Response) => {
  try {
    const data = UpdateSettingsSchema.parse(req.body);
    let settings = await prisma.settings.findFirst();

    if (settings) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          whatsapp_group_id: data.whatsapp_group_id ?? null,
          whatsapp_group_name: data.whatsapp_group_name ?? null,
          whatsapp_status: 'DISCONNECTED',
        },
      });
    }

    return res.json({ success: true, data: settings });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Erro ao atualizar configurações', error: error?.message });
  }
};

settingsRouter.post('/', handleUpdateSettings);
settingsRouter.put('/', handleUpdateSettings);
settingsRouter.patch('/', handleUpdateSettings);

// ─── Evolution API helper & WhatsApp routes ───────────────────────────────────

/**
 * Extrai apenas o host base da Evolution API (sem paths, sem trailing slash).
 * Isso evita que variáveis como WHATSAPP_API_URL com paths embutidos
 * (ex: http://host:8080/message/sendText/...) corrompam a composição de URLs.
 */
function getEvolutionBaseUrl(): string {
  const raw =
    process.env.EVOLUTION_API_URL ||
    process.env.WHATSAPP_API_URL ||
    'http://localhost:8080';
  try {
    const parsed = new URL(raw);
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    return 'http://localhost:8080';
  }
}

const getEvolutionConfig = () => {
  const baseUrl = getEvolutionBaseUrl();
  const instance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || 'infrafield';
  const apiKey = process.env.EVOLUTION_API_KEY || process.env.WHATSAPP_TOKEN || '';
  return { baseUrl, instance, apiKey };
};

export const whatsappRouter = Router();

// GET /api/whatsapp/status - Retorna o status da instância
whatsappRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const { baseUrl, instance, apiKey } = getEvolutionConfig();
    const response = await axios.get(`${baseUrl}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey },
      timeout: 5000,
    });

    // Atualiza whatsapp_status no banco se possível
    const connectionState = response.data?.instance?.state || response.data?.state || 'UNKNOWN';
    const settings = await prisma.settings.findFirst();
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: { whatsapp_status: connectionState },
      });
    }

    return res.json({ success: true, data: response.data, status: connectionState });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao consultar status da instância WhatsApp',
      error: error?.response?.data || error?.message,
    });
  }
});

// GET /api/whatsapp/qrcode - Solicita e retorna o QR Code em Base64
whatsappRouter.get('/qrcode', async (_req: Request, res: Response) => {
  const { baseUrl, instance, apiKey } = getEvolutionConfig();

  try {
    // 1. Checa primeiro se a instância já está aberta/conectada
    try {
      const stateRes = await axios.get(`${baseUrl}/instance/connectionState/${instance}`, {
        headers: { apikey: apiKey },
        timeout: 8000,
      });

      const state = stateRes.data?.instance?.state || stateRes.data?.state;
      if (state === 'open' || state === 'CONNECTED') {
        // Atualiza status no banco se possível
        const settings = await prisma.settings.findFirst();
        if (settings) {
          await prisma.settings.update({
            where: { id: settings.id },
            data: { whatsapp_status: 'open' },
          });
        }

        return res.json({
          success: true,
          connected: true,
          message: "WhatsApp já conectado!",
          data: stateRes.data,
        });
      }
    } catch (stateErr: any) {
      console.warn(`[WhatsApp] Erro ao consultar estado antes do QR Code:`, stateErr?.message);
    }

    // 2. Se não estiver conectada, solicita o QR Code / conexão
    const response = await axios.get(`${baseUrl}/instance/connect/${instance}`, {
      headers: { apikey: apiKey },
      timeout: 8000,
    });

    let rawCode =
      response.data?.code ||
      response.data?.qrcode?.code ||
      response.data?.qrcode?.base64 ||
      response.data?.base64 ||
      response.data?.qrcode;

    if (typeof rawCode === 'object' && rawCode !== null) {
      rawCode = rawCode.code || rawCode.base64;
    }

    if (typeof rawCode === 'string' && rawCode.trim()) {
      let qrDataUrl = rawCode.trim();

      if (!qrDataUrl.startsWith('data:image')) {
        qrDataUrl = await QRCode.toDataURL(qrDataUrl);
      }

      return res.json({ success: true, connected: false, qrcode: qrDataUrl });
    }

    return res.json({
      success: false,
      connected: false,
      message: "Instância em transição ou resposta sem QR Code válido",
      data: response.data,
    });
  } catch (error: any) {
    console.error("ERRO EVOLUTION:", error.message);
    return res.status(500).json({ success: false, connected: false, error: error.message });
  }
});

// GET /api/whatsapp/groups - Puxa e retorna a lista de grupos (id e subject) do número conectado
whatsappRouter.get('/groups', async (_req: Request, res: Response) => {
  try {
    const { baseUrl, instance, apiKey } = getEvolutionConfig();
    const response = await axios.get(`${baseUrl}/group/fetchAllGroups/${instance}`, {
      params: { getParticipants: false },
      headers: { apikey: apiKey },
      timeout: 10000,
    });

    const rawGroups = Array.isArray(response.data)
      ? response.data
      : response.data?.groups || response.data?.response || [];

    const groups = rawGroups.map((g: any) => ({
      id: g.id || g.jid,
      subject: g.subject || g.name || 'Grupo sem nome',
    }));

    return res.json({ success: true, data: groups });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar grupos do WhatsApp',
      error: error?.response?.data || error?.message,
    });
  }
});

// POST /api/whatsapp/reset-instance - Faz logout, deleta e recria a instancia
whatsappRouter.post('/reset-instance', async (_req: Request, res: Response) => {
  try {
    const { baseUrl, instance, apiKey } = getEvolutionConfig();
    const headers = { apikey: apiKey };
    const encodedInstance = encodeURIComponent(instance);

    // 1. Encerra a sessao ativa antes de remover o registro da instancia.
    try {
      await axios.delete(`${baseUrl}/instance/logout/${encodedInstance}`, { headers, timeout: 5000 });
    } catch (logoutErr: any) {
      // O delete abaixo ainda consegue remover instancias sem sessao ativa.
      console.warn('[WhatsApp Reset] Logout não concluído; tentando deleção:', logoutErr?.response?.data || logoutErr?.message);
    }

    // 2. Remove a instancia para evitar o 403 "This name is already in use".
    try {
      await axios.delete(`${baseUrl}/instance/delete/${encodedInstance}`, { headers, timeout: 5000 });
    } catch (delErr: any) {
      if (delErr?.response?.status !== 404) {
        throw delErr;
      }
    }

    // Aguarda 1s para garantir que a instância foi removida do estado interno da Evolution API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Recria a instância zerada somente depois da deleção bem-sucedida.
    const createRes = await axios.post(
      `${baseUrl}/instance/create`,
      { instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
      { headers, timeout: 5000 }
    );

    return res.json({
      success: true,
      message: "Instância resetada com sucesso! Gere o QR Code para conectar.",
      data: createRes.data,
    });
  } catch (err: any) {
    console.error("[WhatsApp Reset] Erro ao resetar:", err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err?.response?.data || err.message,
    });
  }
});

// POST /api/whatsapp/test-send - Usa o mesmo envio resiliente das notificacoes de chamados
whatsappRouter.post('/test-send', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findFirst();
    const groupJid = settings?.whatsapp_group_id || process.env.WHATSAPP_NOTIFY_GROUP;

    if (!groupJid) {
      return res.status(400).json({ success: false, error: 'Nenhum grupo WhatsApp configurado.' });
    }

    const result = await sendWhatsAppText(
      groupJid,
      "🧪 *TESTE DE ENVIO INFRAFIELD*\nNotificacao enviada com sucesso!",
    );
    return res.json({ success: true, urlUsada: result.baseUrl, data: result.data });
  } catch (error: any) {
    return res.status(502).json({ success: false, error: error?.message || 'Falha ao enviar mensagem.' });
  }
});
