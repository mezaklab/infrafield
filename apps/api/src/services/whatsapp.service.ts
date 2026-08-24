// Arquivo obsoleto - Mantido apenas para evitar quebras em settings.routes.ts temporariamente
export async function sendWhatsAppText(_groupJid: string, _text: string): Promise<any> {
  console.warn('[WhatsApp Service] Serviço descontinuado. Migrado para o Telegram.');
  return { baseUrl: '', data: {} };
}
