export const generateVerificationEmailHTML = (username: string, verificationLink: string): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirme seu email - NuP_AIM</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 64px;
            height: 64px;
            background: #2563eb;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
        }
        .logo svg {
            width: 32px;
            height: 32px;
            color: white;
        }
        h1 {
            color: #1f2937;
            margin: 0 0 8px 0;
            font-size: 24px;
        }
        .subtitle {
            color: #6b7280;
            margin: 0;
            font-size: 14px;
        }
        .content {
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background: #1d4ed8;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
            </div>
            <h1>NuP_AIM</h1>
            <p class="subtitle">Sistema de Análise de Impacto</p>
        </div>

        <div class="content">
            <h2>Olá, ${username}!</h2>
            
            <p>Bem-vindo ao <strong>NuP_AIM</strong> - Sistema de Análise de Impacto!</p>
            
            <p>Para completar seu cadastro e começar a usar o sistema, você precisa confirmar seu endereço de email clicando no botão abaixo:</p>
            
            <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Confirmar Email</a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                ${verificationLink}
            </p>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong> Este link é válido por 24 horas. Após esse período, você precisará solicitar um novo email de verificação.
            </div>
            
            <p>Se você não solicitou este cadastro, pode ignorar este email com segurança.</p>
        </div>

        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema NuP_AIM.</p>
            <p>© ${new Date().getFullYear()} NuP_AIM - Sistema de Análise de Impacto</p>
        </div>
    </div>
</body>
</html>
  `.trim();
};

export const generateVerificationEmailText = (username: string, verificationLink: string): string => {
  return `
Olá ${username},

Bem-vindo ao NuP_AIM - Sistema de Análise de Impacto!

Para completar seu cadastro, clique no link abaixo para verificar seu email:

${verificationLink}

Este link é válido por 24 horas.

Se você não solicitou este cadastro, ignore este email.

Atenciosamente,
Equipe NuP_AIM

---
© ${new Date().getFullYear()} NuP_AIM - Sistema de Análise de Impacto
  `.trim();
};