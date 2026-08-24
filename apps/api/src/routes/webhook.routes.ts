import { Router, Request, Response } from 'express';

export const webhookRouter = Router();

webhookRouter.post('/telegram', async (req: Request, res: Response) => {
  try {
    const chatId = req.body?.message?.chat?.id;
    const chatTitle = req.body?.message?.chat?.title || req.body?.message?.chat?.username || 'Private Chat';
    
    console.log(`[Telegram Webhook] Recebido do chat ID: ${chatId}, Título: ${chatTitle}`);
    
    return res.status(200).send('OK');
  } catch (error) {
    console.error('[Telegram Webhook] Erro ao processar:', error);
    return res.status(200).send('OK'); // Always return 200 to Telegram to stop retries
  }
});
