import { Resend } from 'resend';

function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[Email] RESEND_API_KEY não configurada. Os emails serão simulados na consola.');
        return null;
    }
    return new Resend(apiKey);
}

const FROM_EMAIL = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'SafetyFirst <noreply@xispoli.eu>';
const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://safety1irst.xispoli.eu';

export async function sendVerificationEmail({
    to,
    name,
    companyName,
    plan,
    token,
}: {
    to: string;
    name: string;
    companyName: string;
    plan: string;
    token: string;
}) {
    const verifyUrl = `${APP_URL}/pt/verify-email?token=${token}`;
    const isFreePlan = !plan || plan === 'free';
    const planLabel = plan === 'premium' ? 'Profissional / Premium' : plan === 'enterprise' ? 'Enterprise' : plan === 'basic' ? 'Básico' : 'Gratuito';

    const html = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin: 8px 0; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 20px; box-shadow: 0 4px 10px rgba(37,99,235,0.25); }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SafetyFirst</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Plataforma de Gestão de Segurança e Saúde no Trabalho</p>
        </div>
        <div class="content">
          <p>Olá <strong>${name}</strong>,</p>
          ${isFreePlan ? `
          <p>Recebemos o registo da sua conta na plataforma <strong>SafetyFirst</strong> associada a <strong>${companyName}</strong>.</p>
          <p>Para confirmar a autenticidade do seu endereço de email e ativar o seu acesso, por favor clique no botão abaixo:</p>
          ` : `
          <p>Recebemos o pedido de adesão da sua empresa <strong>${companyName}</strong> à plataforma <strong>SafetyFirst</strong> com a subscrição:</p>
          <p><span class="badge">Plano ${planLabel}</span></p>
          <p>Para confirmar a autenticidade deste endereço de email e encaminhar o seu pedido para aprovação final da nossa equipa, por favor clique no botão abaixo:</p>
          `}
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyUrl}" class="button">Confirmar o meu E-mail</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Se o botão não funcionar, copie e cole o seguinte link no seu navegador:<br>
          <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a></p>
          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            ${isFreePlan ? 'Após a confirmação, o seu acesso fica imediatamente pronto para entrar na plataforma.' : 'Após a confirmação, o seu pedido será analisado pela nossa equipa e receberá um aviso assim que a sua conta for ativada.'}
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} SafetyFirst by Xispoli. Todos os direitos reservados.
        </div>
      </div>
    </body>
    </html>
    `;

    const resend = getResendClient();
    if (!resend) {
        console.log(`[Email Mock] Enviando verificação para ${to}: ${verifyUrl}`);
        return { success: true, mocked: true, verifyUrl };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: 'Confirmação de Registo — SafetyFirst',
            html,
        });

        if (error) {
            console.error('[Resend Error] Erro ao enviar email de verificação:', error);
            return { success: false, error: error.message };
        }
        return { success: true, messageId: data?.id };
    } catch (err: any) {
        console.error('[Resend Exception] Falha no envio:', err);
        return { success: false, error: err.message };
    }
}

export async function sendAdminNewRequestNotification({
    companyName,
    nif,
    contactName,
    email,
    plan,
}: {
    companyName: string;
    nif: string;
    contactName: string;
    email: string;
    plan: string;
}) {
    const adminEmail = process.env.SUPERADMIN_NOTIFICATION_EMAIL || 'paulo.ferreira@xispoli.eu';
    const platformUrl = `${APP_URL}/pt/platform`;

    const html = `
    <h2>Novo Pedido de Subscrição SafetyFirst</h2>
    <p>O cliente confirmou o email e o pedido está agora aguardar a sua aprovação no painel de administração.</p>
    <ul>
      <li><strong>Empresa:</strong> ${companyName}</li>
      <li><strong>NIF:</strong> ${nif}</li>
      <li><strong>Responsável:</strong> ${contactName}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Plano Pretendido:</strong> ${plan.toUpperCase()}</li>
    </ul>
    <p><a href="${platformUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Ir para Painel de Administração</a></p>
    `;

    const resend = getResendClient();
    if (!resend) {
        console.log(`[Email Mock] Notificação admin para ${adminEmail} sobre pedido de ${companyName}`);
        return { success: true, mocked: true };
    }

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmail,
            subject: `[SafetyFirst] Novo Pedido de Subscrição: ${companyName} (NIF: ${nif})`,
            html,
        });
        return { success: true };
    } catch (err: any) {
        console.error('[Resend Exception] Erro notificação admin:', err);
        return { success: false, error: err.message };
    }
}

export async function sendAccountApprovedEmail({
    to,
    name,
    companyName,
    plan,
}: {
    to: string;
    name: string;
    companyName: string;
    plan: string;
}) {
    const loginUrl = `${APP_URL}/pt/login`;

    const html = `
    <h2>Bem-vindo ao SafetyFirst!</h2>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Temos o prazer de informar que o acesso da sua empresa <strong>${companyName}</strong> (Plano ${plan.toUpperCase()}) foi <strong>aprovado e ativado</strong> com sucesso!</p>
    <p>Já pode aceder à plataforma com as credenciais que definiu no registo:</p>
    <p><a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;font-weight:bold;border-radius:6px;text-decoration:none;">Entrar na Plataforma</a></p>
    <p>Se tiver qualquer dúvida ou necessitar de apoio na configuração inicial de obras, a nossa equipa está inteiramente à sua disposição.</p>
    `;

    const resend = getResendClient();
    if (!resend) {
        console.log(`[Email Mock] Notificação de conta aprovada para ${to}`);
        return { success: true, mocked: true };
    }

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: 'Conta Aprovada — Acesso ao SafetyFirst',
            html,
        });
        return { success: true };
    } catch (err: any) {
        console.error('[Resend Exception] Erro aprovacao:', err);
        return { success: false, error: err.message };
    }
}

export async function sendPasswordResetEmail({
    to,
    name,
    token,
}: {
    to: string;
    name?: string;
    token: string;
}) {
    const resetUrl = `${APP_URL}/pt/reset-password?token=${token}`;
    const userName = name || 'Utilizador';

    const html = `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .button { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 20px; box-shadow: 0 4px 10px rgba(37,99,235,0.25); }
        .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SafetyFirst</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Recuperação de Palavra-passe</p>
        </div>
        <div class="content">
          <p>Olá <strong>${userName}</strong>,</p>
          <p>Recebemos um pedido para repor a palavra-passe da sua conta SafetyFirst associada a <strong>${to}</strong>.</p>
          <p>Para definir uma nova palavra-passe, clique no botão abaixo:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" class="button">Redefinir Palavra-passe</a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Se o botão não funcionar, copie e cole o seguinte link no seu navegador:<br>
          <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a></p>
          <div class="notice">
            <strong>Atenção:</strong> Este link é válido durante 1 hora. Se não pediu a recuperação de palavra-passe, pode ignorar esta mensagem em segurança.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} SafetyFirst by Xispoli. Todos os direitos reservados.
        </div>
      </div>
    </body>
    </html>
    `;

    const resend = getResendClient();
    if (!resend) {
        console.log(`[Email Mock] Enviando reposição de password para ${to}: ${resetUrl}`);
        return { success: true, mocked: true, resetUrl };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: 'Recuperação de Palavra-passe — SafetyFirst',
            html,
        });

        if (error) {
            console.error('[Resend Error] Erro ao enviar email de reposição:', error);
            return { success: false, error: error.message };
        }
        return { success: true, messageId: data?.id };
    } catch (err: any) {
        console.error('[Resend Exception] Falha no envio de reposição:', err);
        return { success: false, error: err.message };
    }
}

