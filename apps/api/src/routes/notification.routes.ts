import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendTelegramNotification } from '../services/telegram.service';

export const notificationRouter = Router();
const notificationStore = prisma.notification as any;

// GET /api/notifications - List notifications
notificationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await notificationStore.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// PATCH /api/notifications/mark-as-read - Mark all unread notifications as read
notificationRouter.patch('/mark-as-read', async (req: Request, res: Response) => {
  try {
    await notificationStore.updateMany({
      where: { companyId: req.user!.companyId, isRead: false },
      data: { isRead: true },
    });

    const updatedNotifications = await notificationStore.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return res.json({ message: 'Todas as notificações foram marcadas como lidas', notifications: updatedNotifications });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return res.status(500).json({ error: 'Erro ao marcar notificações como lidas' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification as read
notificationRouter.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await notificationStore.updateMany({
      where: { id, companyId: req.user!.companyId },
      data: { isRead: true },
    });
    if (updated.count === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    const notification = await notificationStore.findFirst({
      where: { id, companyId: req.user!.companyId },
    });

    return res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
  }
});

// POST /api/notifications/test - Test Telegram notification
notificationRouter.post('/test', async (_req: Request, res: Response) => {
  try {
    await sendTelegramNotification("✅ *Teste de comunicação do InfraField concluído com sucesso!*");
    return res.json({ success: true, message: 'Mensagem de teste enviada via Telegram com sucesso.' });
  } catch (error: any) {
    console.error('[Telegram Notification Test Error]:', error);
    return res.status(500).json({ error: 'Erro interno ao enviar mensagem de teste', details: error.message });
  }
});
