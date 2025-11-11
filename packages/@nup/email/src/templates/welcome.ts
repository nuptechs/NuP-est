import { WelcomeEmailData, EmailTemplate } from '../types';

export function generateWelcomeEmail(data: WelcomeEmailData): EmailTemplate {
  const {
    username,
    appName = 'NuP Platform',
    loginLink
  } = data;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao ${appName}</title>
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
            background: #10b981;
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
            background: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background: #059669;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        .feature-box {
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <svg fill="white" viewBox="0 0 24 24" width="32" height="32">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h1>Bem-vindo ao ${appName}!</h1>
        </div>

        <div class="content">
            <h2>Olá, ${username}!</h2>
            
            <p>🎉 Sua conta foi criada com sucesso!</p>
            
            <p>Estamos muito felizes em ter você conosco. Agora você tem acesso completo a todas as funcionalidades do <strong>${appName}</strong>.</p>
            
            ${loginLink ? `
            <div style="text-align: center;">
                <a href="${loginLink}" class="button">Acessar Plataforma</a>
            </div>
            ` : ''}
            
            <div class="feature-box">
                <strong>🚀 Próximos passos:</strong>
                <ul style="margin: 8px 0; padding-left: 20px;">
                    <li>Complete seu perfil</li>
                    <li>Explore as funcionalidades</li>
                    <li>Configure suas preferências</li>
                </ul>
            </div>
            
            <p>Se tiver alguma dúvida ou precisar de ajuda, nossa equipe está sempre à disposição.</p>
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

🎉 Sua conta foi criada com sucesso!

Estamos muito felizes em ter você conosco. Agora você tem acesso completo a todas as funcionalidades do ${appName}.

${loginLink ? `Acesse a plataforma: ${loginLink}\n` : ''}

🚀 Próximos passos:
- Complete seu perfil
- Explore as funcionalidades
- Configure suas preferências

Se tiver alguma dúvida ou precisar de ajuda, nossa equipe está sempre à disposição.

Atenciosamente,
Equipe ${appName}

---
© ${new Date().getFullYear()} ${appName}
  `.trim();

  return {
    subject: `Bem-vindo ao ${appName}!`,
    html,
    text
  };
}
