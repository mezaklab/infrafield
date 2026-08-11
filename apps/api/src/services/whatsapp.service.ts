import axios from 'axios';

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

/**
 * Envia notificação formatada de um chamado para o WhatsApp via API/Webhook.
 *
 * Configurações esperadas no .env:
 * - WHATSAPP_API_URL: Endpoint do webhook/gateway WhatsApp (ex: https://api.whatsapp.com/send ou gateway local)
 * - WHATSAPP_TOKEN: Bearer token / API Key para autenticação na gateway
 * - WHATSAPP_NOTIFY_GROUP: Número de telefone ou ID do grupo de destino
 */
export async function sendTicketNotification(ticketData: TicketNotificationData): Promise<void> {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_TOKEN;
  const notifyTarget = process.env.WHATSAPP_NOTIFY_GROUP;

  // Se a URL ou o destino não estiverem configurados, loga apenas em modo de desenvolvimento
  if (!apiUrl || !notifyTarget) {
    console.log(`[WhatsApp Service] Notificação para chamado ${ticketData.code} ignorada (WHATSAPP_API_URL ou WHATSAPP_NOTIFY_GROUP não configurado no .env).`);
    return;
  }

  const requesterName = ticketData.author?.name || 'Solicitante não identificado';
  const sectorName = ticketData.location?.name || (ticketData.location ? [ticketData.location.name, ticketData.location.building, ticketData.location.room].filter(Boolean).join(' - ') : 'Setor não informado');
  const categoryName = ticketData.category || ticketData.asset?.category || ticketData.asset?.name || 'Outros';

  const formattedMessage =
    `🚨 *NOVO CHAMADO ABERTO*\n\n` +
    `📌 *Título:* ${ticketData.subject}\n` +
    `🏷️ *Categoria:* ${categoryName}\n` +
    `👤 *Solicitante:* ${requesterName}\n` +
    `🏢 *Setor:* ${sectorName}\n` +
    `⚠️ *Prioridade:* ${ticketData.priority || 'MEDIA'}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['apikey'] = token;
    }

    await axios.post(
      apiUrl,
      {
        number: notifyTarget,
        text: formattedMessage,
      },
      {
        headers,
        timeout: 5000, // Timeout de 5 segundos para não atrasar retentativas
      }
    );

    console.log(`[WhatsApp Service] Notificação enviada com sucesso para o chamado ${ticketData.code}.`);
  } catch (error: any) {
    // Log amigável sem quebrar o fluxo chamador
    console.error(`[WhatsApp Service] Erro ao enviar notificação do chamado ${ticketData.code}:`, error?.message || error);
  }
}
