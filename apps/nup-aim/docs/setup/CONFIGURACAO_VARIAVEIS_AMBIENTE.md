# 🔧 Configuração de Variáveis de Ambiente - NuP_AIM

## 📋 Visão Geral

O sistema NuP_AIM precisa de variáveis de ambiente para:
- **Supabase**: Conexão com o banco de dados
- **SendGrid**: Envio de emails de verificação
- **Netlify Functions**: Processamento de emails

## 🏠 DESENVOLVIMENTO LOCAL

### Passo 1: Criar arquivo .env
Na raiz do projeto, crie um arquivo `.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui

# SendGrid Configuration (for Netlify Function)
SENDGRID_API_KEY=sua-chave-sendgrid-aqui
VERIFIED_SENDER_EMAIL=seu-email-verificado@gmail.com

# Email Configuration
VITE_FROM_EMAIL=noreply@nup-aim.netlify.app
VITE_FROM_NAME=NuP_AIM Sistema
```

### Passo 2: Obter Credenciais do Supabase

1. **Acesse seu projeto no Supabase**
   - Vá para [supabase.com](https://supabase.com)
   - Entre no seu projeto

2. **Navegue para Settings → API**
   - Copie a **Project URL**
   - Copie a **anon public** key

3. **Substitua no .env:**
   ```bash
   VITE_SUPABASE_URL=https://xyzabc123.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Passo 3: Configurar SendGrid (Opcional para desenvolvimento)

1. **Criar conta no SendGrid**
   - Acesse [sendgrid.com](https://sendgrid.com)
   - Crie uma conta gratuita (100 emails/dia)

2. **Gerar API Key**
   - Vá para Settings → API Keys
   - Clique em "Create API Key"
   - Escolha "Full Access"
   - Copie a chave gerada

3. **Verificar email remetente**
   - Vá para Settings → Sender Authentication
   - Clique em "Verify a Single Sender"
   - Adicione seu email e verifique

4. **Atualizar .env:**
   ```bash
   SENDGRID_API_KEY=SG.abc123...
   VERIFIED_SENDER_EMAIL=seu-email@gmail.com
   ```

## 🌐 PRODUÇÃO (NETLIFY)

### Passo 1: Deploy no Netlify

1. **Conectar repositório**
   - Acesse [netlify.com](https://netlify.com)
   - Clique em "New site from Git"
   - Conecte seu repositório GitHub

2. **Configurar build**
   - Build command: `npm run build`
   - Publish directory: `dist`

### Passo 2: Configurar Variáveis de Ambiente no Netlify

1. **Acessar configurações**
   - No dashboard do Netlify, vá para seu site
   - Clique em "Site settings"
   - Vá para "Environment variables"

2. **Adicionar variáveis:**

   | Key | Value | Exemplo |
   |-----|-------|---------|
   | `VITE_SUPABASE_URL` | URL do seu projeto Supabase | `https://xyzabc123.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase | `eyJhbGciOiJIUzI1NiIs...` |
   | `SENDGRID_API_KEY` | Chave da API do SendGrid | `SG.abc123def456...` |
   | `VERIFIED_SENDER_EMAIL` | Email verificado no SendGrid | `seu-email@gmail.com` |
   | `VITE_FROM_EMAIL` | Email remetente | `noreply@seu-dominio.com` |
   | `VITE_FROM_NAME` | Nome do remetente | `NuP_AIM Sistema` |

### Passo 3: Redeploy

Após configurar as variáveis:
1. Vá para "Deploys"
2. Clique em "Trigger deploy"
3. Selecione "Deploy site"

## 🔧 CONFIGURAÇÃO DETALHADA

### SendGrid - Configuração Completa

#### 1. Criar Conta
```bash
# Acesse: https://sendgrid.com
# Plano gratuito: 100 emails/dia
```

#### 2. Verificar Domínio (Recomendado)
```bash
# No SendGrid:
# Settings → Sender Authentication → Authenticate Your Domain
# Siga as instruções para verificar seu domínio
```

#### 3. Criar API Key
```bash
# Settings → API Keys → Create API Key
# Nome: "NuP_AIM_Production"
# Permissões: Full Access
```

#### 4. Configurar DNS (se usar domínio próprio)
```bash
# Adicione os registros DNS fornecidos pelo SendGrid
# Tipo: CNAME
# Host: em.seu-dominio.com
# Value: u12345.wl123.sendgrid.net
```

### Supabase - Configuração de Segurança

#### 1. RLS (Row Level Security)
```sql
-- Já configurado nas migrations
-- Garante que usuários só acessem seus próprios dados
```

#### 2. Políticas de Acesso
```sql
-- Configuradas automaticamente
-- Baseadas nos perfis de usuário
```

#### 3. Variáveis de Ambiente Seguras
```bash
# NUNCA exponha a service_role key no frontend
# Use apenas a anon key para o frontend
```

## 🧪 TESTE DE CONFIGURAÇÃO

### Verificar Supabase
```javascript
// No console do navegador (F12):
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'Não configurada');
```

### Verificar SendGrid
```bash
# Teste enviando um email de verificação
# Crie um usuário no sistema
# Verifique se o email é enviado
```

### Verificar Netlify Functions
```bash
# Acesse: https://seu-site.netlify.app/.netlify/functions/send-email
# Deve retornar erro 405 (Method not allowed) - isso é normal
```

## 🚨 PROBLEMAS COMUNS

### 1. "Supabase URL not found"
```bash
# Solução: Verificar se VITE_SUPABASE_URL está configurada
# Deve começar com https:// e terminar com .supabase.co
```

### 2. "SendGrid API key not configured"
```bash
# Solução: Verificar SENDGRID_API_KEY no Netlify
# Deve começar com SG.
```

### 3. "Email not verified in SendGrid"
```bash
# Solução: Verificar VERIFIED_SENDER_EMAIL
# Email deve estar verificado no SendGrid
```

### 4. "Function not found"
```bash
# Solução: Verificar se netlify.toml está configurado
# Verificar se pasta netlify/functions existe
```

## 📁 ESTRUTURA DE ARQUIVOS

```
projeto/
├── .env                          # Desenvolvimento local
├── .env.example                  # Exemplo de configuração
├── netlify.toml                  # Configuração do Netlify
├── netlify/
│   └── functions/
│       └── send-email.js         # Função de envio de email
└── src/
    ├── lib/
    │   └── supabase.ts           # Cliente Supabase
    └── utils/
        └── emailService.ts       # Serviço de email
```

## ✅ CHECKLIST FINAL

### Desenvolvimento Local
- [ ] Arquivo `.env` criado
- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] Banco de dados criado no Supabase
- [ ] Login funcionando com admin/admin123

### Produção (Netlify)
- [ ] Site deployado no Netlify
- [ ] Variáveis de ambiente configuradas
- [ ] `SENDGRID_API_KEY` configurada
- [ ] `VERIFIED_SENDER_EMAIL` verificado
- [ ] Função `send-email` funcionando
- [ ] Emails sendo enviados

### Testes
- [ ] Login funcionando
- [ ] Criação de usuário funcionando
- [ ] Email de verificação sendo enviado
- [ ] Verificação de email funcionando
- [ ] Todas as funcionalidades acessíveis

## 🆘 SUPORTE

Se encontrar problemas:

1. **Verifique os logs:**
   - Console do navegador (F12)
   - Logs do Netlify (Functions tab)
   - Logs do Supabase (Logs tab)

2. **Teste as conexões:**
   - Supabase: Tente fazer login
   - SendGrid: Tente criar usuário
   - Netlify: Verifique se o site carrega

3. **Documentação oficial:**
   - [Supabase Docs](https://supabase.com/docs)
   - [SendGrid Docs](https://docs.sendgrid.com)
   - [Netlify Docs](https://docs.netlify.com)