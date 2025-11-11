import { VerificationEmailData, EmailTemplate } from '../types';

export function generateVerificationEmail(data: VerificationEmailData): EmailTemplate {
  const {
    username,
    verificationLink,
    appName = 'NuP Platform',
    expiresIn = '24 horas'
  } = data;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirme seu email - ${appName}</title>
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
        .link-box {
            word-break: break-all;
            background: #f3f4f6;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg fill="white" viewBox="0 0 24 24" width="32" height="32">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </div>
            <h1>${appName}</h1>
        </div>

        <div class="content">
            <h2>Olá, ${username}!</h2>
            
            <p>Bem-vindo ao <strong>${appName}</strong>!</p>
            
            <p>Para completar seu cadastro e começar a usar o sistema, você precisa confirmar seu endereço de email clicando no botão abaixo:</p>
            
            <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Confirmar Email</a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p class="link-box">${verificationLink}</p>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong> Este link é válido por ${expiresIn}. Após esse período, você precisará solicitar um novo email de verificação.
            </div>
            
            <p>Se você não solicitou este cadastro, pode ignorar este email com segurança.</p>
        </div>

        <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema ${appName}.</p>
            <p>© ${new Date().getFullYear()} ${appName}</p>
        </div>
    </div>
</body>
</html>
  `.trim();

  const text = `
Olá ${username},

Bem-vindo ao ${appName}!

Para completar seu cadastro, clique no link abaixo para verificar seu email:

${verificationLink}

Este link é válido por ${expiresIn}.

Se você não solicitou este cadastro, ignore este email.

Atenciosamente,
Equipe ${appName}

---
© ${new Date().getFullYear()} ${appName}
  `.trim();

  return {
    subject: `Confirme seu email - ${appName}`,
    html,
    text
  };
}
