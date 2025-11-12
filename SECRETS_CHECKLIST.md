# 🔐 Secrets Checklist - Multi-Repl

Use esta checklist para configurar os Secrets em cada Repl.

---

## 📝 PREPARAÇÃO

### 1. Gerar JWT Secrets (execute 3x):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Salvar como:
- [ ] `JWT_SECRET_STUDY` = _______________
- [ ] `JWT_SECRET_IDENTIFY` = _______________
- [ ] `JWT_SECRET_AIM` = _______________

### 2. Copiar DATABASE_URL:
```bash
echo $DATABASE_URL
```

- [ ] `DATABASE_URL` = _______________

### 3. Copiar API Keys do workspace atual:
- [ ] `OPENAI_API_KEY` = _______________
- [ ] `PINECONE_API_KEY` = _______________
- [ ] `DEEPGRAM_API_KEY` = _______________

---

## 🌐 REPL 1: Gateway

### Secrets a configurar:

```env
PORT=5000
NODE_ENV=production
NUP_STUDY_URL=[preencher depois]
NUP_IDENTIFY_URL=[preencher depois]
NUP_AIM_URL=[preencher depois]
```

### Checklist:
- [ ] PORT configurado
- [ ] NODE_ENV configurado
- [ ] NUP_STUDY_URL (aguardar criação do Repl 2)
- [ ] NUP_IDENTIFY_URL (aguardar criação do Repl 3)
- [ ] NUP_AIM_URL (aguardar criação do Repl 4)

**URL deste Repl:** _______________

---

## 📚 REPL 2: NuP-Study

### Secrets OBRIGATÓRIOS:

```env
DATABASE_URL=[copiado]
JWT_SECRET=[JWT_SECRET_STUDY]
NODE_ENV=production
PORT=5001
OPENAI_API_KEY=[copiado]
PINECONE_API_KEY=[copiado]
DEEPGRAM_API_KEY=[copiado]
```

### Secrets OPCIONAIS (recursos avançados):

```env
# OpenRouter (alternativa ao OpenAI)
OPENROUTER_API_KEY=[copiar se usar]

# Google AI / Document AI (OCR avançado)
GOOGLE_AI_API_KEY=[copiar se usar]
GOOGLE_CLOUD_PROJECT_ID=[copiar se usar]
GOOGLE_CLOUD_CLIENT_EMAIL=[copiar se usar]
GOOGLE_CLOUD_PRIVATE_KEY=[copiar se usar]
GOOGLE_DOC_AI_PROJECT_ID=[copiar se usar]
GOOGLE_DOC_AI_CLIENT_EMAIL=[copiar se usar]
GOOGLE_DOC_AI_PRIVATE_KEY=[copiar se usar]

# External Processing Service (se configurado)
EXTERNAL_PROCESSOR_URL=[copiar se usar]
PROCESSING_SERVICE_URL=[copiar se usar]
PROCESSING_SERVICE_API_KEY=[copiar se usar]
```

### Checklist OBRIGATÓRIOS:
- [ ] DATABASE_URL configurado
- [ ] JWT_SECRET configurado
- [ ] NODE_ENV configurado
- [ ] PORT configurado
- [ ] OPENAI_API_KEY configurado
- [ ] PINECONE_API_KEY configurado
- [ ] DEEPGRAM_API_KEY configurado

### Checklist OPCIONAIS (copie se estavam no workspace original):
- [ ] OPENROUTER_API_KEY (se usar)
- [ ] Google AI keys (se usar OCR avançado)
- [ ] External processing keys (se usar)

**URL deste Repl:** _______________

**Health check:** https://[URL]/api/health
- [ ] Testado e funcionando

---

## 🔐 REPL 3: NuP-Identify

### Secrets OBRIGATÓRIOS:

```env
DATABASE_URL=[copiado]
JWT_SECRET=[JWT_SECRET_IDENTIFY]
SESSION_SECRET=[gerar novo - veja abaixo]
NODE_ENV=production
PORT=5002
BASE_PREFIX=/nup-identify
```

### Gerar SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Secrets OPCIONAIS (features adicionais):

```env
# Email (SendGrid - para verificação de email)
SENDGRID_API_KEY=[copiar se usar]
EMAIL_FROM=[seu-email@example.com]

# Replit OAuth (se usar login social)
REPLIT_CLIENT_ID=[copiar se usar]
REPLIT_CLIENT_SECRET=[copiar se usar]
REPLIT_CALLBACK_URL=[copiar se usar]

# Configurações adicionais
APP_URL=[url-do-gateway]
CORS_ORIGINS=[urls-permitidas]
ENABLE_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=false
ENABLE_SOCIAL_LOGIN=false
ENABLE_PASSKEYS=false
```

### Checklist OBRIGATÓRIOS:
- [ ] DATABASE_URL configurado
- [ ] JWT_SECRET configurado
- [ ] SESSION_SECRET configurado (NOVO)
- [ ] NODE_ENV configurado
- [ ] PORT configurado
- [ ] BASE_PREFIX configurado

### Checklist OPCIONAIS:
- [ ] SENDGRID_API_KEY (para emails)
- [ ] Replit OAuth (para login social)
- [ ] Feature flags (se precisar)

**URL deste Repl:** _______________

**Health check:** https://[URL]/api/health
- [ ] Testado e funcionando

---

## 🎯 REPL 4: NuP-AIM

### Secrets a configurar:

```env
DATABASE_URL=[copiado]
JWT_SECRET=[JWT_SECRET_AIM]
NODE_ENV=production
PORT=5003
BASE_PREFIX=/nup-aim
```

### Checklist:
- [ ] DATABASE_URL configurado
- [ ] JWT_SECRET configurado
- [ ] NODE_ENV configurado
- [ ] PORT configurado
- [ ] BASE_PREFIX configurado

**URL deste Repl:** _______________

**Health check:** https://[URL]/api/health
- [ ] Testado e funcionando

---

## 🔄 VOLTAR AO GATEWAY

### Atualizar Secrets com URLs reais:

```env
NUP_STUDY_URL=[URL anotada do Repl 2]
NUP_IDENTIFY_URL=[URL anotada do Repl 3]
NUP_AIM_URL=[URL anotada do Repl 4]
```

### Checklist:
- [ ] NUP_STUDY_URL atualizado
- [ ] NUP_IDENTIFY_URL atualizado
- [ ] NUP_AIM_URL atualizado
- [ ] Repl restartado

---

## ✅ VALIDAÇÃO FINAL

### Gateway Health Checks:

- [ ] https://[GATEWAY-URL]/health → `{"status":"healthy"}`
- [ ] https://[GATEWAY-URL]/health/services → Todos "healthy"

### Rotas via Gateway:

- [ ] https://[GATEWAY-URL]/ → NuP-Study carrega
- [ ] https://[GATEWAY-URL]/nup-identify/ → NuP-Identify carrega
- [ ] https://[GATEWAY-URL]/nup-aim/ → NuP-AIM carrega

---

## 🔒 SEGURANÇA

### Verificações de Segurança:

- [ ] Todos JWT_SECRET têm 128 caracteres
- [ ] JWT_SECRET são únicos (diferentes entre apps)
- [ ] SESSION_SECRET foi gerado
- [ ] DATABASE_URL usa SSL/TLS
- [ ] Nenhum secret foi commitado no Git
- [ ] Secrets configurados via interface do Replit

---

**✅ Checklist completo! Todos os serviços configurados corretamente.**
