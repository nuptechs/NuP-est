# @nup/email

> 📧 Infraestrutura compartilhada de email para o ecossistema NuP

Pacote de infraestrutura que fornece serviços de email transacionais para todas as aplicações NuP (Study, AIM, Identify, Kan, etc).

## ✨ Características

- 🔌 **Adapter pattern** - Suporte para múltiplos provedores de email
- 🎨 **Templates prontos** - Verificação, reset de senha, boas-vindas
- 🔄 **Retry automático** - Exponential backoff para falhas temporárias
- 📝 **TypeScript nativo** - Type-safe com excelente DX
- 🎯 **Backend-only** - Seguro, sem exposição de credenciais no frontend
- ⚡ **Zero dependências** - Exceto o provider escolhido

## 📦 Instalação

```bash
# No workspace root
pnpm add @nup/email --filter=seu-app
```

## 🚀 Uso Rápido

### 1. Configurar o Adapter

```typescript
import { EmailService, SendGridAdapter } from '@nup/email';

// Criar adapter SendGrid
const adapter = new SendGridAdapter({
  apiKey: process.env.SENDGRID_API_KEY!,
  defaultFrom: 'noreply@nup.app'
});

// Criar serviço de email
const emailService = new EmailService({
  adapter,
  defaultFrom: 'noreply@nup.app',
  defaultReplyTo: 'support@nup.app',
  retryAttempts: 3,
  retryDelay: 1000
});
```

### 2. Enviar Emails

```typescript
// Email de verificação
await emailService.sendVerification('user@example.com', {
  username: 'João Silva',
  verificationLink: 'https://app.nup.com/verify?token=abc123',
  appName: 'NuP-Study',
  expiresIn: '24 horas'
});

// Email de reset de senha
await emailService.sendPasswordReset('user@example.com', {
  username: 'João Silva',
  resetLink: 'https://app.nup.com/reset?token=def456',
  appName: 'NuP-Study',
  expiresIn: '1 hora'
});

// Email de boas-vindas
await emailService.sendWelcome('user@example.com', {
  username: 'João Silva',
  appName: 'NuP-Study',
  loginLink: 'https://app.nup.com/login'
});

// Email transacional customizado
await emailService.sendTransactional({
  to: 'user@example.com',
  subject: 'Sua análise está pronta!',
  html: '<h1>Análise concluída</h1><p>Confira os resultados...</p>',
  text: 'Análise concluída. Confira os resultados...'
});
```

## 🎨 Templates Disponíveis

### Verificação de Email
- Subject: `Confirme seu email - {appName}`
- Conteúdo: Logo, mensagem de boas-vindas, botão de confirmação, link alternativo
- Expirável: Sim (configurável)

### Reset de Senha
- Subject: `Redefinir senha - {appName}`
- Conteúdo: Alerta de segurança, botão de reset, avisos importantes
- Expirável: Sim (configurável)

### Boas-vindas
- Subject: `Bem-vindo ao {appName}!`
- Conteúdo: Mensagem de celebração, próximos passos, link de acesso
- Expirável: Não

## 🔌 Adapters Disponíveis

### SendGrid
```typescript
import { SendGridAdapter } from '@nup/email';

const adapter = new SendGridAdapter({
  apiKey: process.env.SENDGRID_API_KEY!,
  defaultFrom: 'noreply@nup.app'
});
```

### Futuros Adapters (Roadmap)
- Resend
- Postmark
- AWS SES
- SMTP Genérico

## 🏗️ Arquitetura

```
@nup/email/
├── src/
│   ├── adapters/           # Implementações de provedores
│   │   ├── sendgrid.adapter.ts
│   │   └── index.ts
│   ├── templates/          # Templates HTML prontos
│   │   ├── verification.ts
│   │   ├── password-reset.ts
│   │   ├── welcome.ts
│   │   └── index.ts
│   ├── utils/              # Utilidades (retry, etc)
│   │   └── retry.ts
│   ├── email-service.ts    # Serviço principal
│   ├── types.ts            # Tipos TypeScript
│   └── index.ts            # Exports públicos
└── package.json
```

## 📝 API Reference

### `EmailService`

```typescript
class EmailService {
  constructor(config: EmailServiceConfig)
  
  sendVerification(to: string, data: VerificationEmailData): Promise<EmailResult>
  sendPasswordReset(to: string, data: PasswordResetEmailData): Promise<EmailResult>
  sendWelcome(to: string, data: WelcomeEmailData): Promise<EmailResult>
  sendTransactional(payload: EmailPayload): Promise<EmailResult>
  
  getProviderName(): string
  isConfigured(): boolean
}
```

### Tipos Principais

```typescript
interface EmailResult {
  success: boolean;
  messageId?: string;
  message: string;
  provider?: string;
  timestamp?: Date;
}

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}
```

## 🔒 Segurança

- ✅ Backend-only (nunca exponha API keys no frontend)
- ✅ Variáveis de ambiente para credenciais
- ✅ Validação de configuração no startup
- ✅ Rate limiting (delegado ao provider)
- ✅ Logs auditáveis

## 🎯 Casos de Uso

### NuP-Identify (Auth Central)
```typescript
// Durante signup
await emailService.sendVerification(user.email, {
  username: user.name,
  verificationLink: generateVerificationLink(user.id),
  appName: 'NuP Platform'
});
```

### NuP-Study
```typescript
// Lembrete de estudo
await emailService.sendTransactional({
  to: user.email,
  subject: 'Hora de estudar! 📚',
  html: renderStudyReminder(session),
  text: 'Sua próxima sessão de estudo começa em 15 minutos.'
});
```

### NuP-AIM
```typescript
// Análise completa
await emailService.sendTransactional({
  to: user.email,
  subject: 'Análise concluída ✅',
  html: renderAnalysisReport(analysis),
  text: `Sua análise "${analysis.name}" foi concluída.`
});
```

## 🚦 Status

- ✅ **SendGrid Adapter** - Produção
- ⏳ **Resend Adapter** - Planejado
- ⏳ **Queue System** - Planejado
- ⏳ **Template Builder** - Planejado

## 📄 Licença

MIT © NuP Team
