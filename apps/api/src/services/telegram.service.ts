
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
  sector?: {
    name?: string;
  } | null;
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

export async function sendTelegramNotification(text: string): Promise<void> {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramToken || !telegramChatId) {
    throw new Error('TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID não estão configurados no backend.');
  }

  const payload = {
    chat_id: telegramChatId,
    text,
    parse_mode: 'Markdown',
  };

  const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API Error: ${JSON.stringify(errorData)}`);
  }
}

export async function sendTicketNotification(ticketData: TicketNotificationData): Promise<void> {
  const requesterName = ticketData.author?.name || 'Solicitante não identificado';
  const categoryName = ticketData.category || ticketData.asset?.category || 'Outros';
  const sectorName =
    ticketData.sector?.name ||
    ticketData.location?.name ||
    (ticketData.location
      ? [ticketData.location.name, ticketData.location.building, ticketData.location.room]
          .filter(Boolean)
          .join(' - ')
      : 'Não informado');

  const priority = getPriorityPresentation(ticketData.priority);
  const dashboardUrl = (process.env.APP_BASE_URL || 'http://localhost:5173')
    .replace(/\/+$/, '');

  const formattedMessage = [
    `🚨 **NOVO CHAMADO ABERTO**`,
    ``,
    `📌 **Título:** ${ticketData.subject}`,
    `🏷️ **Categoria:** ${categoryName}`,
    `👤 **Solicitante:** ${requesterName}`,
    `🏢 **Setor:** ${sectorName}`,
    `${priority.emoji} **Prioridade:** ${priority.label}`,
    ``,
    `🔗 **Acessar chamado:**`,
    `${dashboardUrl}/tickets/${ticketData.code}`,
  ].join('\n');

  try {
    await sendTelegramNotification(formattedMessage);
    console.log(`[Telegram Service] Notificação de ticket enviada com sucesso.`);
  } catch (error: any) {
    console.error(`[Telegram Service] Falha ao enviar notificação de ticket:`, error.message);
  }
}
