# 🚀 PASSO A PASSO - Configuração Completa do Sistema

## 📋 RESUMO EXECUTIVO

Este guia te levará do zero até ter o sistema NuP_AIM funcionando completamente com banco de dados e envio de emails.

**Tempo estimado:** 30-45 minutos

## 🎯 FASE 1: CONFIGURAÇÃO DO SUPABASE (15 min)

### Passo 1.1: Criar Projeto no Supabase
```bash
1. Acesse: https://supabase.com
2. Clique em "Start your project"
3. Faça login ou crie conta
4. Clique em "New Project"
5. Nome: "nup-aim"
6. Senha do banco: [crie uma senha forte]
7. Região: [escolha a mais próxima]
8. Clique em "Create new project"
```

### Passo 1.2: Executar SQL do Banco
```bash
1. No projeto, vá para "SQL Editor"
2. Clique em "New query"
3. Cole o SQL do arquivo: supabase/migrations/20250612013446_icy_limit.sql
4. Clique em "RUN"
5. Aguarde execução (pode demorar 30s)
```

### Passo 1.3: Inserir Dados Iniciais
```bash
1. Nova query no SQL Editor
2. Cole o SQL do arquivo: supabase/migrations/20250612014856_nameless_unit.sql
3. Clique em "RUN"
4. Verifique se criou: 2 perfis, 1 projeto, 1 usuário admin
```

### Passo 1.4: Obter Credenciais
```bash
1. Vá para "Settings" → "API"
2. Copie "Project URL"
3. Copie "anon public" key
4. Anote essas informações
```

## 🎯 FASE 2: CONFIGURAÇÃO LOCAL (10 min)

### Passo 2.1: Criar Arquivo .env
Na raiz do projeto, crie `.env`:
```bash
VITE_SUPABASE_URL=https://[SEU-PROJETO].supabase.co
VITE_SUPABASE_ANON_KEY=[SUA-CHAVE-ANONIMA]

SENDGRID_API_KEY=your-sendgrid-api-key
VERIFIED_SENDER_EMAIL=your-verified-email@gmail.com

VITE_FROM_EMAIL=noreply@nup-aim.netlify.app
VITE_FROM_NAME=NuP_AIM Sistema
```

### Passo 2.2: Substituir Valores Reais
```bash
# Substitua [SEU-PROJETO] pela URL real do Supabase
# Substitua [SUA-CHAVE-ANONIMA] pela chave real
# Exemplo:
VITE_SUPABASE_URL=https://xyzabc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Passo 2.3: Testar Conexão
```bash
1. Execute: npm run dev
2. Abra: http://localhost:5173
3. Tente fazer login:
   - Usuário: admin
   - Senha: admin123
4. Se funcionou: ✅ Supabase configurado!
```

## 🎯 FASE 3: CONFIGURAÇÃO DO SENDGRID (15 min)

### Passo 3.1: Criar Conta SendGrid
```bash
1. Acesse: https://sendgrid.com
2. Clique em "Start for Free"
3. Preencha dados e crie conta
4. Confirme email de verificação
```

### Passo 3.2: Verificar Email Remetente
```bash
1. No SendGrid: Settings → Sender Authentication
2. Clique em "Verify a Single Sender"
3. Preencha com seu email pessoal
4. Clique em "Verify"
5. Confirme no seu email
```

### Passo 3.3: Criar API Key
```bash
1. Settings → API Keys
2. Clique em "Create API Key"
3. Nome: "NuP_AIM_Local"
4. Permissões: "Full Access"
5. Clique em "Create & View"
6. COPIE A CHAVE (só aparece uma vez!)
```

### Passo 3.4: Atualizar .env Local
```bash
# Substitua no arquivo .env:
SENDGRID_API_KEY=SG.abc123def456...
VERIFIED_SENDER_EMAIL=seu-email@gmail.com
```

## 🎯 FASE 4: DEPLOY NO NETLIFY (10 min)

### Passo 4.1: Preparar Repositório
```bash
1. Commit todas as alterações
2. Push para GitHub/GitLab
3. Certifique-se que .env está no .gitignore
```

### Passo 4.2: Deploy no Netlify
```bash
1. Acesse: https://netlify.com
2. Clique em "New site from Git"
3. Conecte seu repositório
4. Build command: npm run build
5. Publish directory: dist
6. Clique em "Deploy site"
```

### Passo 4.3: Configurar Variáveis de Ambiente
```bash
1. No Netlify: Site settings → Environment variables
2. Adicione cada variável:

Key: VITE_SUPABASE_URL
Value: https://[SEU-PROJETO].supabase.co

Key: VITE_SUPABASE_ANON_KEY  
Value: [SUA-CHAVE-ANONIMA]

Key: SENDGRID_API_KEY
Value: SG.abc123def456...

Key: VERIFIED_SENDER_EMAIL
Value: seu-email@gmail.com

Key: VITE_FROM_EMAIL
Value: noreply@nup-aim.netlify.app

Key: VITE_FROM_NAME
Value: NuP_AIM Sistema
```

### Passo 4.4: Redeploy
```bash
1. Vá para "Deploys"
2. Clique em "Trigger deploy"
3. Aguarde o deploy terminar
4. Teste o site em produção
```

## ✅ VERIFICAÇÃO FINAL

### Teste Completo do Sistema
```bash
1. Acesse seu site no Netlify
2. Faça login com admin/admin123
3. Crie um novo usuário
4. Verifique se email foi enviado
5. Teste todas as funcionalidades
```

### Checklist de Funcionamento
- [ ] Site carrega sem erros
- [ ] Login do admin funciona
- [ ] Criação de usuário funciona
- [ ] Email de verificação é enviado
- [ ] Verificação de email funciona
- [ ] Todas as telas são acessíveis
- [ ] Exportação para Word funciona
- [ ] Gerenciamento de dados funciona

## 🚨 RESOLUÇÃO DE PROBLEMAS

### Problema: "Supabase connection failed"
```bash
Solução:
1. Verifique VITE_SUPABASE_URL no .env
2. Verifique VITE_SUPABASE_ANON_KEY no .env
3. Confirme que o banco foi criado corretamente
```

### Problema: "SendGrid API key not configured"
```bash
Solução:
1. Verifique SENDGRID_API_KEY no Netlify
2. Confirme que a chave começa com "SG."
3. Verifique se o email foi verificado no SendGrid
```

### Problema: "Email not sent"
```bash
Solução:
1. Verifique VERIFIED_SENDER_EMAIL
2. Confirme verificação no SendGrid
3. Verifique logs da função no Netlify
```

### Problema: "Function not found"
```bash
Solução:
1. Verifique se netlify.toml existe
2. Confirme pasta netlify/functions/send-email.js
3. Redeploy o site
```

## 📞 SUPORTE

Se ainda tiver problemas:

1. **Verifique logs:**
   - Console do navegador (F12)
   - Netlify Functions logs
   - Supabase logs

2. **Teste individual:**
   - Supabase: Tente query manual
   - SendGrid: Teste API via Postman
   - Netlify: Verifique build logs

3. **Documentação:**
   - [Supabase](https://supabase.com/docs)
   - [SendGrid](https://docs.sendgrid.com)
   - [Netlify](https://docs.netlify.com)

## 🎉 PARABÉNS!

Se chegou até aqui, seu sistema NuP_AIM está completamente funcional com:
- ✅ Banco de dados Supabase
- ✅ Autenticação completa
- ✅ Envio de emails
- ✅ Deploy em produção
- ✅ Todas as funcionalidades ativas

**Próximos passos:**
- Customize o sistema conforme suas necessidades
- Adicione mais usuários e perfis
- Configure domínio personalizado (opcional)
- Monitore uso e performance