import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';

export const reportRouter = Router();

// 1. GET /api/reports/visits/:visitId/pdf - Generate Visit Report PDF
reportRouter.get('/visits/:visitId/pdf', async (req: Request, res: Response) => {
  try {
    const { visitId } = req.params;

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        company: true,
        location: {
          include: {
            company: true,
          },
        },
        checklistResponses: {
          include: {
            checklistItem: true,
            asset: true,
          },
        },
        issues: {
          include: {
            asset: true,
          },
        },
        technician: true,
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visita técnica não encontrada.' });
    }

    // Also fetch all assets for this location to compute Expected vs Found
    const totalLocationAssets = visit.locationId ? await prisma.asset.count({
      where: { locationId: visit.locationId },
    }) : 0;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set response headers for direct PDF download/stream
    const fileName = `Relatorio_Visita_${visit.protocol}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    doc.pipe(res);

    // --- HEADER CORPORATIVO ---
    doc.fillColor('#0284c7').fontSize(22).font('Helvetica-Bold').text('InfraField NOC', { continued: true });
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(' | Plataforma de Gestão de Infraestrutura & TI');
    doc.moveDown(0.3);
    doc.strokeColor('#0284c7').lineWidth(2).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Protocol & Visit Title
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(`RELATÓRIO TÉCNICO DE VISITA`);
    doc.fillColor('#0284c7').fontSize(11).font('Helvetica-Bold').text(`Protocolo: ${visit.protocol}`);
    doc.moveDown(0.8);

    // Site & Technical Details Metadata Table
    const startY = doc.y;
    doc.rect(40, startY, 515, 75).fillAndStroke('#f8fafc', '#e2e8f0');

    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
    doc.text(`Empresa / Cliente:`, 50, startY + 10);
    doc.font('Helvetica').text(visit.client || visit.company?.name || 'Cliente InfraField', 150, startY + 10);

    doc.font('Helvetica-Bold').text(`Unidade / Local:`, 50, startY + 25);
    doc.font('Helvetica').text(`${visit.location?.name || 'Rack Central'} (${visit.location?.building || 'Prédio A'})`, 150, startY + 25);

    doc.font('Helvetica-Bold').text(`Técnico Responsável:`, 50, startY + 40);
    doc.font('Helvetica').text(visit.technician?.name || 'Carlos Silva (Técnico NOC)', 150, startY + 40);

    doc.font('Helvetica-Bold').text(`Data / Horário:`, 50, startY + 55);
    doc.font('Helvetica').text(`${new Date(visit.scheduledDate).toLocaleDateString('pt-BR')} - Status: ${visit.status}`, 150, startY + 55);

    doc.y = startY + 90;

    // --- SEÇÃO 1: RESUMO DA VISITA & MÉTRICAS ---
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('1. Resumo Executivo da Vistoria');
    doc.moveDown(0.5);

    const checkedCount = visit.checklistResponses.length;
    const issuesCount = visit.issues.length;

    doc.rect(40, doc.y, 515, 45).fillAndStroke('#f0f9ff', '#bae6fd');
    const metricY = doc.y + 10;

    doc.fillColor('#0369a1').fontSize(9).font('Helvetica-Bold');
    doc.text('Equipamentos Esperados:', 55, metricY);
    doc.fillColor('#0f172a').fontSize(11).text(`${totalLocationAssets}`, 55, metricY + 12);

    doc.fillColor('#0369a1').fontSize(9).font('Helvetica-Bold');
    doc.text('Itens Checados:', 210, metricY);
    doc.fillColor('#0f172a').fontSize(11).text(`${checkedCount}`, 210, metricY + 12);

    doc.fillColor('#0369a1').fontSize(9).font('Helvetica-Bold');
    doc.text('Não Conformidades:', 380, metricY);
    doc.fillColor(issuesCount > 0 ? '#e11d48' : '#16a34a').fontSize(11).text(`${issuesCount}`, 380, metricY + 12);

    doc.y = metricY + 45;

    // --- SEÇÃO 2: RESPOSTAS DO CHECKLIST ---
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('2. Verificações do Checklist Dinâmico');
    doc.moveDown(0.5);

    if (visit.checklistResponses.length === 0) {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text('Nenhuma resposta de checklist registrada durante a visita.');
      doc.moveDown(1);
    } else {
      // Table Header
      let tableY = doc.y;
      doc.rect(40, tableY, 515, 20).fillAndStroke('#1e293b', '#1e293b');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('Item Verificado', 48, tableY + 6);
      doc.text('Ativo Relacionado', 220, tableY + 6);
      doc.text('Resultado / Valor', 390, tableY + 6);

      tableY += 20;

      visit.checklistResponses.forEach((resp: any, idx: number) => {
        if (tableY > 730) {
          doc.addPage();
          tableY = 40;
        }

        const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(40, tableY, 515, 22).fillAndStroke(bg, '#e2e8f0');

        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(resp.checklistItem?.label || 'Item de Checklist', 48, tableY + 6, { width: 165, height: 14 });
        doc.text(resp.asset ? `${resp.asset.name} (${resp.asset.code})` : 'N/A', 220, tableY + 6, { width: 165, height: 14 });

        const isOk = resp.value === 'CONFORME' || resp.value === 'SIM' || resp.value === 'OK';
        doc.fillColor(isOk ? '#15803d' : '#b91c1c').font('Helvetica-Bold');
        doc.text(resp.value, 390, tableY + 6, { width: 150, height: 14 });

        tableY += 22;
      });

      doc.y = tableY + 15;
    }

    // --- SEÇÃO 3: NÃO CONFORMIDADES / PROBLEMAS REGISTRADOS ---
    if (doc.y > 680) {
      doc.addPage();
    }

    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('3. Ocorrências e Não Conformidades Registradas');
    doc.moveDown(0.5);

    if (visit.issues.length === 0) {
      doc.rect(40, doc.y, 515, 30).fillAndStroke('#f0fdf4', '#bbf7d0');
      doc.fillColor('#15803d').fontSize(9).font('Helvetica-Bold').text('✔ Nenhuma não conformidade ou falha registrada nesta vistoria.', 50, doc.y + 10);
      doc.moveDown(2);
    } else {
      visit.issues.forEach((issue: any) => {
        if (doc.y > 700) {
          doc.addPage();
        }

        const issueY = doc.y;
        doc.rect(40, issueY, 515, 60).fillAndStroke('#fff1f2', '#fecdd3');

        doc.fillColor('#b91c1c').fontSize(10).font('Helvetica-Bold').text(`[${issue.severity}] ${issue.title}`, 50, issueY + 8);
        doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
        doc.text(`Equipamento: ${issue.asset?.name || 'Geral'} | Status: ${issue.status}`, 50, issueY + 22);
        doc.text(`Descrição: ${issue.description}`, 50, issueY + 34, { width: 490 });
        if (issue.recommendation) {
          doc.fillColor('#0369a1').text(`Recomendação: ${issue.recommendation}`, 50, issueY + 46, { width: 490 });
        }

        doc.y = issueY + 70;
      });
    }

    // --- FOOTER CORPORATIVO ---
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        `InfraField NOC © ${new Date().getFullYear()} - Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}`,
        40,
        780,
        { align: 'center', width: 515 }
      );
    }

    doc.end();
  } catch (error: any) {
    console.error('Failed to generate visit PDF:', error);
    res.status(500).json({ error: 'Erro interno ao gerar PDF do relatório.' });
  }
});

// 2. GET /api/reports/inventory/pdf - Generate Assets Inventory PDF Report
reportRouter.get('/inventory/pdf', async (_req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        location: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const fileName = `Inventario_Ativos_InfraField_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    doc.pipe(res);

    // --- HEADER CORPORATIVO ---
    doc.fillColor('#0284c7').fontSize(22).font('Helvetica-Bold').text('InfraField NOC', { continued: true });
    doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(' | Inventário Geral de Ativos');
    doc.moveDown(0.3);
    doc.strokeColor('#0284c7').lineWidth(2).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('RELATÓRIO DE INVENTÁRIO GERAL DE TI & REDES');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(`Total de Ativos Cadastrados: ${assets.length} | Data da Emissão: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.moveDown(1);

    // Table Header
    let tableY = doc.y;
    doc.rect(40, tableY, 515, 20).fillAndStroke('#0f172a', '#0f172a');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Código', 48, tableY + 6);
    doc.text('Nome do Equipamento', 110, tableY + 6);
    doc.text('Patrimônio', 270, tableY + 6);
    doc.text('Hostname / IP', 340, tableY + 6);
    doc.text('Status', 475, tableY + 6);

    tableY += 20;

    assets.forEach((asset: any, idx: number) => {
      if (tableY > 740) {
        doc.addPage();
        tableY = 40;
      }

      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(40, tableY, 515, 22).fillAndStroke(bg, '#e2e8f0');

      doc.fillColor('#0284c7').fontSize(8).font('Helvetica-Bold').text(asset.code, 48, tableY + 6, { width: 55 });
      doc.fillColor('#334155').font('Helvetica').text(asset.name, 110, tableY + 6, { width: 155, height: 14 });
      doc.text(asset.assetTag || 'N/A', 270, tableY + 6, { width: 65 });
      doc.fillColor('#0369a1').font('Helvetica-Bold').text(asset.ipAddress || asset.hostname || 'N/A', 340, tableY + 6, { width: 130 });

      const isOp = asset.status === 'OPERATIONAL';
      doc.fillColor(isOp ? '#16a34a' : '#d97706').text(asset.status, 475, tableY + 6, { width: 75 });

      tableY += 22;
    });

    // FOOTER
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
        `InfraField NOC © ${new Date().getFullYear()} - Documento Oficial de Inventário`,
        40,
        780,
        { align: 'center', width: 515 }
      );
    }

    doc.end();
  } catch (error: any) {
    console.error('Failed to generate inventory PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF do inventário.' });
  }
});

// 3. GET /api/reports/assets/export - Export Assets to CSV
reportRouter.get('/assets/export', async (_req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        location: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const csvHeader = 'Codigo;Nome;Categoria;Patrimonio;Serial;Hostname;IP;Status;Localizacao;Empresa\n';
    const csvRows = assets.map((a: any) => {
      const locName = a.location?.name || '';
      const compName = a.location?.company?.name || '';
      return `"${a.code}";"${a.name}";"${a.category}";"${a.assetTag}";"${a.serialNumber}";"${a.hostname}";"${a.ipAddress}";"${a.status}";"${locName}";"${compName}"`;
    }).join('\n');

    // UTF-8 BOM for Excel compatibility
    const csvContent = '\uFEFF' + csvHeader + csvRows;

    const fileName = `Inventario_Ativos_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Failed to export assets CSV:', error);
    res.status(500).json({ error: 'Erro ao exportar arquivo CSV.' });
  }
});
