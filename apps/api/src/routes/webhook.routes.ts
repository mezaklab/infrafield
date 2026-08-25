import { emitAssetStatusUpdate } from '../services/websocket.service';
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
export const webhookRouter = Router();

function isValidAgentApiKey(value: string | string[] | undefined): boolean {
  const configuredKey = process.env.AGENT_API_KEY?.trim();
  const providedKey = Array.isArray(value) ? value[0] : value;
  if (!configuredKey || !providedKey) return false;

  const configured = Buffer.from(configuredKey);
  const provided = Buffer.from(providedKey.trim());
  return configured.length === provided.length && crypto.timingSafeEqual(configured, provided);
}

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
// IMPORTANTE: Adicione o import do Prisma lá na primeira linha do arquivo, junto com o Express.
// Exemplo: import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// Rota para o Agente de Monitoramento Local (InfraField Agent)
webhookRouter.post('/sync-network', async (req: Request, res: Response) => {
    try {
        if (!isValidAgentApiKey(req.headers['x-api-key'])) {
            return res.status(401).json({ error: 'API key ausente ou inválida.' });
        }

        const { devices } = req.body;

        if (!devices || !Array.isArray(devices)) {
            return res.status(400).json({ error: 'Formato inválido. Esperado um array "devices".' });
        }

        console.log(`[Webhook InfraField] Recebida atualização de ${devices.length} dispositivos.`);

        let atualizados = 0;

        // Itera sobre o array recebido do Agente
        for (const device of devices) {
            const { mac, ip } = device;

            // Busca no banco se existe algum Ativo com esse Endereço MAC
            // ATENÇÃO: Ajuste 'asset' e 'macAddress' para os nomes reais da sua tabela e coluna no Prisma
            
            const ativo = await prisma.asset.findFirst({
                where: { macAddress: mac }
            });

            if (ativo) {
                // Se achou, atualiza o IP e o status
                await prisma.asset.update({
                    where: { id: ativo.id },
                    data: { 
                        ipAddress: ip,
                        status: 'OPERATIONAL', // Ajuste pro seu Enum
                        lastSeenAt: new Date()
                    }
                });
                
                emitAssetStatusUpdate({
                    id: ativo.id,
                    code: ativo.code,
                    name: ativo.name,
                    status: 'OPERATIONAL',
                    ipAddress: ip,
                    companyId: ativo.companyId
                });
                atualizados++;
            }
            
        }

        console.log(`[Webhook InfraField] Sincronização concluída. ${atualizados} ativos atualizados no banco.`);
        return res.status(200).json({ message: 'Sincronização concluída.', atualizados });

    } catch (error) {
        console.error('[Webhook InfraField] Erro ao sincronizar rede:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});
