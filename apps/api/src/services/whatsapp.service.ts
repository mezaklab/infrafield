import axios from 'axios';
import { prisma } from '../lib/prisma';

export interface TicketNotificationData {
  code: string;
  subject: string;
  description: string;
  priority?: string;
  author?: {
    name?: string;
    email?: string;
  } | null;
  location?: {
    name?: string | null;
    building?: string | null;
    room?: string | null;
  } | null;
  category?: string;
  asset?: {
    name?: string;
    category?: string;
  } | null;
}

const EVOLUTION_FALLBACK_URLS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://infrafield-evolution:8080',
  'http://evolution-api:8080',
] as const;

function normalizeBaseUrl(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin.replace(/\/+$/, '');
  } catch {
    console.warn(`[WhatsApp Service] URL da Evolution ignorada por ser invalida: ${rawUrl}`);
    return null;
  }
}

export function getEvolutionCandidateUrls(): string[] {
  const configuredUrls = [
    process.env.EVOLUTION_API_URL,
    process.env.WHATSAPP_API_URL,
  ].filter((url): url is string => Boolean(url));

  return Array.from(
    new Set(
      [...configuredUrls, ...EVOLUTION_FALLBACK_URLS]
        .map(normalizeBaseUrl)
        .filter((url): url is string => Boolean(url)),
    ),
  );
}

function getEvolutionConfig() {
  const instance =
    process.env.EVOLUTION_INSTANCE_NAME ||
    process.env.EVOLUTION_INSTANCE ||
    'infrafield';
  const apiKey =
    process.env.EVOLUTION_API_KEY ||
    process.env.WHATSAPP_TOKEN ||
    '';
  if (!apiKey) {
    throw new Error('EVOLUTION_API_KEY ou WHATSAPP_TOKEN não configurado.');
  }
  return { instance, apiKey };
}

/**
 * Monta os headers padrão para todas as requisições à Evolution API v2.
 */
function evolutionHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { apikey: apiKey } : {}),
  };
}

export interface WhatsAppSendResult {
  baseUrl: string;
  data: unknown;
}

const PRIORITY_PRESENTATION: Record<string, { emoji: string; label: string }> = {
  CRITICA: { emoji: '🔴', label: 'Crítica' },
  ALTA: { emoji: '⚠️', label: 'Alta' },
  MEDIA: { emoji: '🟠', label: 'Média' },
  BAIXA: { emoji: '🟢', label: 'Baixa' },
};

function getPriorityPresentation(priority?: string): { emoji: string; label: string } {
  const normalizedPriority = priority?.trim().toUpperCase() || 'MEDIA';
  return PRIORITY_PRESENTATION[normalizedPriority] || {
    emoji: '⚠️',
    label: priority?.trim() || 'Média',
  };
}

async function findReachableEvolutionUrl(): Promise<string> {
  const { instance, apiKey } = getEvolutionConfig();
  const candidateUrls = getEvolutionCandidateUrls();
  let lastError: unknown;

  for (const baseUrl of candidateUrls) {
    const statusEndpoint = `${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`;

    try {
      const response = await axios.get(statusEndpoint, {
        headers: evolutionHeaders(apiKey),
        timeout: 3000,
      });
      const state = String(response.data?.instance?.state || response.data?.state || '').toLowerCase();
      console.log(`[WhatsApp Service] Evolution API encontrada em ${baseUrl}; instancia '${instance}': ${state || 'desconhecido'}`);

      if (state !== 'open' && state !== 'connected') {
        throw new Error(`A instancia WhatsApp '${instance}' esta '${state || 'desconhecida'}'. Reconecte pelo QR Code.`);
      }
      return baseUrl;
    } catch (error: any) {
      // Uma resposta HTTP prova que a URL esta correta. Nao tente aliases do
      // mesmo servidor nem esconda erros de autenticacao/estado da instancia.
      if (error?.response) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('Reconecte pelo QR Code')) {
        throw error;
      }
      lastError = error;
      console.warn(`[WhatsApp Service] Evolution indisponivel em ${baseUrl}: ${error?.message}`);
    }
  }

  const error: any = lastError;
  const detail = error?.message || 'nenhuma URL candidata disponivel';
  throw new Error(`Todas as URLs da Evolution API falharam. Ultimo erro: ${detail}`);
}

/** Envio unico e resiliente usado por todos os fluxos da aplicacao. */
export async function sendWhatsAppText(groupJid: string, text: string): Promise<WhatsAppSendResult> {
  const normalizedJid = groupJid.trim();
  if (!normalizedJid.endsWith('@g.us')) {
    throw new Error(`JID de grupo WhatsApp invalido: ${normalizedJid || '(vazio)'}`);
  }

  const { instance, apiKey } = getEvolutionConfig();
  const baseUrl = await findReachableEvolutionUrl();
  const endpoint = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;
  console.log(`[WhatsApp Service] Enviando uma unica vez via ${endpoint} para ${normalizedJid}`);

  const response = await axios.post(
    endpoint,
    { number: normalizedJid, text },
    { headers: evolutionHeaders(apiKey), timeout: 8000 },
  );
  console.log(`[WhatsApp Service] Mensagem aceita pela Evolution API em ${baseUrl}`);
  return { baseUrl, data: response.data };
}

/**
 * Envia notificação formatada de um chamado para um grupo do WhatsApp
 * via Evolution API v2.
 *
 * Rotas Evolution API v2:
 *   Envio de mensagem: POST /message/sendText/{instanceName}
 *     body: { number: "<groupId>", text: "<mensagem>" }
 *
 * O `whatsapp_group_id` é buscado da tabela `Settings` do banco de dados.
 */
export async function sendTicketNotification(ticketData: TicketNotificationData): Promise<void> {
  const settings = await prisma.settings.findFirst();
  const targetJid = settings?.whatsapp_group_id || process.env.WHATSAPP_NOTIFY_GROUP;

  if (!targetJid) {
    console.error("\x1b[31mERRO: Nenhum grupo de WhatsApp configurado no banco.\x1b[0m");
    return;
  }

  const requesterName = ticketData.author?.name || 'Solicitante não identificado';
  const categoryName = ticketData.category || ticketData.asset?.category || 'Outros';
  const sectorName =
    ticketData.location?.name ||
    (ticketData.location
      ? [ticketData.location.name, ticketData.location.building, ticketData.location.room]
          .filter(Boolean)
          .join(' - ')
      : 'Não informado');

  const priority = getPriorityPresentation(ticketData.priority);
  const dashboardUrl = (process.env.WEB_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .replace(/\/+$/, '');

  const formattedMessage = [
    `🚨 *NOVO CHAMADO ABERTO*`,
    ``,
    `📌 *Título:* ${ticketData.subject}`,
    `🏷️ *Categoria:* ${categoryName}`,
    `👤 *Solicitante:* ${requesterName}`,
    `🏢 *Setor:* ${sectorName}`,
    `${priority.emoji} *Prioridade:* ${priority.label}`,
    ``,
    `🔗 *Acessar chamado:*`,
    `${dashboardUrl}/tickets/${ticketData.code}`,
  ].join('\n');

  await sendWhatsAppText(targetJid, formattedMessage);
}
