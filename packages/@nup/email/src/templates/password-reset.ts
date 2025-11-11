import { PasswordResetEmailData, EmailTemplate } from '../types';

export function generatePasswordResetEmail(data: PasswordResetEmailData): EmailTemplate {
  const {
    username,
    resetLink,
    appName = 'NuP Platform',
    expiresIn = '1 hora'
  } = data;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinir senha - ${appName}</title>
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
            background: #dc2626;
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
        .content {
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background: #dc2626;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background: #b91c1c;
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
            background: #fee2e2;
            border: 1px solid #dc2626;
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
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <h1>${appName}</h1>
        </div>

        <div class="content">
            <h2>Olá, ${username}!</h2>
            
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${appName}</strong>.</p>
            
            <p>Para criar uma nova senha, clique no botão abaixo:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="button">Redefinir Senha</a>
            </div>
            
            <p>Ou copie e cole este link no seu navegador:</p>
            <p class="link-box">${resetLink}</p>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong> Este link é válido por ${expiresIn}. Após esse período, você precisará solicitar uma nova redefinição de senha.
            </div>
            
            <p><strong>Se você não solicitou esta redefinição de senha:</strong></p>
            <ul>
                <li>Ignore este email com segurança</li>
                <li>Sua senha atual permanecerá inalterada</li>
                <li>Considere alterar sua senha se suspeitar de atividade não autorizada</li>
            </ul>
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

Recebemos uma solicitação para redefinir a senha da sua conta no ${appName}.

Para criar uma nova senha, clique no link abaixo:

${resetLink}

Este link é válido por ${expiresIn}.

Se você não solicitou esta redefinição:
- Ignore este email com segurança
- Sua senha atual permanecerá inalterada
- Considere alterar sua senha se suspeitar de atividade não autorizada

Atenciosamente,
Equipe ${appName}

---
© ${new Date().getFullYear()} ${appName}
  `.trim();

  return {
    subject: `Redefinir senha - ${appName}`,
    html,
    text
  };
}
