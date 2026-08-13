import 'dotenv/config';
import nodemailer from 'nodemailer';

const isProduction = process.env.NODE_ENV === 'production';
const host = process.env.SMTP_HOST?.trim();
const port = Number(process.env.SMTP_PORT || 587);
const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true';
const user = process.env.SMTP_USER?.trim();
const password = process.env.SMTP_PASSWORD;
const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || user;
const fromName = process.env.SMTP_FROM_NAME?.trim() || 'InfraField';
const transporter = host && fromEmail
  ? nodemailer.createTransport({ host, port, secure, auth: user && password ? { user, pass: password } : undefined })
  : null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildPasswordResetEmail(resetUrl: string, expiresMinutes: number): { text: string; html: string } {
  const safeResetUrl = escapeHtml(resetUrl);
  const expiration = `${expiresMinutes} minutos`;
  const text = [
    'InfraField — Redefinição de senha',
    '',
    'Redefinir sua senha',
    '',
    'Recebemos uma solicitação para redefinir a senha da sua conta InfraField.',
    '',
    'Redefinir minha senha:',
    resetUrl,
    '',
    `Este link expira em ${expiration}.`,
    '',
    'Se você não solicitou essa alteração, pode ignorar este e-mail com segurança.',
    '',
    'InfraField — Operações & Infraestrutura de TI',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>InfraField — Redefinição de senha</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; color:#1e293b; font-family:Arial, Helvetica, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">Redefina sua senha do InfraField. O link expira em ${expiration}.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background-color:#f1f5f9; border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:580px; border-collapse:separate; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 4px 18px rgba(15, 23, 42, 0.06);">
          <tr>
            <td style="padding:40px 44px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td width="48" height="48" align="center" valign="middle" style="width:48px; height:48px; background-color:#0891b2; border-radius:12px; color:#ffffff; font-size:17px; line-height:48px; font-weight:700; letter-spacing:-0.5px;">IF</td>
                  <td style="padding-left:14px; color:#0f2740; font-size:20px; line-height:26px; font-weight:700;">InfraField</td>
                </tr>
              </table>

              <h1 style="margin:32px 0 16px; color:#0f2740; font-size:28px; line-height:35px; font-weight:700; letter-spacing:-0.4px;">Redefinir sua senha</h1>
              <p style="margin:0 0 28px; color:#475569; font-size:16px; line-height:25px;">Recebemos uma solicitação para redefinir a senha da sua conta InfraField.</p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                <tr>
                  <td align="center" bgcolor="#0891b2" style="background-color:#0891b2; border-radius:9px;">
                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeResetUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="18%" strokecolor="#0891b2" fillcolor="#0891b2"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Redefinir minha senha</center></v:roundrect><![endif]-->
                    <!--[if !mso]><!--><a href="${safeResetUrl}" target="_blank" style="display:inline-block; padding:15px 24px; color:#ffffff; background-color:#0891b2; border:1px solid #0891b2; border-radius:9px; font-size:16px; line-height:18px; font-weight:700; text-decoration:none; mso-hide:all;">Redefinir minha senha</a><!--<![endif]-->
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin-top:24px; border-collapse:separate; background-color:#ecfeff; border-left:4px solid #06b6d4; border-radius:8px;">
                <tr><td style="padding:13px 16px; color:#164e63; font-size:14px; line-height:21px; font-weight:600;">Este link expira em ${expiration}.</td></tr>
              </table>

              <p style="margin:26px 0 8px; color:#64748b; font-size:13px; line-height:20px;">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
              <p style="margin:0; font-size:13px; line-height:20px; word-break:break-all;"><a href="${safeResetUrl}" target="_blank" style="color:#087ea4; text-decoration:underline;">${safeResetUrl}</a></p>

              <div style="height:1px; margin:30px 0 24px; background-color:#e2e8f0; line-height:1px; font-size:1px;">&nbsp;</div>
              <p style="margin:0; color:#64748b; font-size:14px; line-height:22px;">Se você não solicitou essa alteração, pode ignorar este e-mail com segurança.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 24px; background-color:#f8fafc; border-top:1px solid #e2e8f0; border-radius:0 0 16px 16px; color:#64748b; font-size:12px; line-height:18px;">InfraField — Operações &amp; Infraestrutura de TI</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, expiresMinutes: number): Promise<boolean> {
  if (!transporter || !fromEmail) {
    if (isProduction) throw new Error('SMTP não configurado.');
    console.warn('[MAIL] SMTP not configured');
    console.info(`[MAIL][DEV] Password reset URL generated for ${to}; token omitted from logs.`);
    return false;
  }

  try {
    const content = buildPasswordResetEmail(resetUrl, expiresMinutes);
    await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to,
      subject: 'InfraField — Redefinição de senha',
      text: content.text,
      html: content.html,
    });
    return true;
  } catch (error) {
    console.error('[MAIL] send failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}
