# 🔗 VERIFICAÇÃO COMPLETA - Conexão Supabase ↔ NuP_AIM

## 🎯 **OBJETIVO**
Verificar se sua base de dados Supabase está corretamente conectada à aplicação NuP_AIM.

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

### ✅ **PARTE 1: VERIFICAÇÃO NO SUPABASE**

#### 1.1 **Verificar Projeto e Credenciais**
1. Acesse [supabase.com](https://supabase.com)
2. Entre no seu projeto **nup-aim**
3. Vá para **Settings** → **API**
4. Anote as informações:
   ```
   Project URL: https://[SEU-PROJETO].supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIs... (longa)
   ```

#### 1.2 **Verificar Tabelas Criadas**
1. No Supabase, vá para **Table Editor**
2. Verifique se existem estas tabelas:
   - ✅ `profiles` (perfis de acesso)
   - ✅ `users` (usuários)
   - ✅ `projects` (projetos)
   - ✅ `analyses` (análises)
   - ✅ `processes` (funcionalidades)
   - ✅ `impacts` (impactos)
   - ✅ `risks` (riscos)
   - ✅ `mitigations` (mitigações)
   - ✅ `conclusions` (conclusões)

#### 1.3 **Verificar Dados Iniciais**
1. Clique na tabela **`profiles`**
2. Deve ter **2 registros**:
   - Administrador
   - Usuário Padrão

3. Clique na tabela **`users`**
4. Deve ter **1 registro**:
   - username: `admin`
   - email: `nuptechs@nuptechs.com`
   - is_email_verified: `true`

5. Clique na tabela **`projects`**
6. Deve ter **1 registro**:
   - name: `Sistema de Habilitações`

#### 1.4 **Testar Conexão no SQL Editor**
1. Vá para **SQL Editor**
2. Execute esta query:
   ```sql
   -- Teste de conexão e dados
   SELECT 
     'Perfis' as tabela, 
     count(*) as registros 
   FROM profiles
   
   UNION ALL
   
   SELECT 
     'Usuários' as tabela, 
     count(*) as registros 
   FROM users
   
   UNION ALL
   
   SELECT 
     'Projetos' as tabela, 
     count(*) as registros 
   FROM projects;
   ```

3. **Resultado esperado:**
   ```
   tabela    | registros
   ----------|----------
   Perfis    | 2
   Usuários  | 1
   Projetos  | 1
   ```

---

### ✅ **PARTE 2: VERIFICAÇÃO NA APLICAÇÃO**

#### 2.1 **Verificar Variáveis de Ambiente**

**Para Desenvolvimento Local:**
1. Verifique se existe o arquivo `.env` na raiz do projeto
2. Conteúdo deve ser:
   ```env
   VITE_SUPABASE_URL=https://[SEU-PROJETO].supabase.co
   VITE_SUPABASE_ANON_KEY=[SUA-CHAVE-ANONIMA]
   ```

**Para Produção (Netlify):**
1. No dashboard do Netlify
2. Site settings → Environment variables
3. Verifique se existem:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

#### 2.2 **Verificar Console do Navegador**
1. Abra sua aplicação NuP_AIM
2. Pressione **F12** para abrir o console
3. Procure por estas mensagens:

**✅ Se estiver funcionando:**
```
🔧 Configuração do Supabase:
   URL: https://seu-projeto.supabase.co
   Key: eyJhbGciOiJIUzI1NiIs...
   Ambiente: development/production
   Hostname: localhost/seu-site.netlify.app
✅ Criando cliente Supabase...
✅ Cliente Supabase criado com sucesso
```

**❌ Se não estiver funcionando:**
```
⚠️ Supabase não configurado corretamente:
   URL válida: false
   Key válida: false
   Usando modo local (localStorage)
```

#### 2.3 **Verificar Status na Interface**
1. Faça login na aplicação (admin/Senha@1010)
2. Clique no menu do usuário (canto superior direito)
3. Clique em **"Gerenciar Dados"**
4. Vá para a aba **"Status da Conexão"**
5. Clique no botão de **refresh** (🔄)

**✅ Status esperado:**
```
✅ Supabase conectado e funcionando

Configuração: ✅ OK
Conexão: ✅ OK
Tabelas: ✅ OK
Dados: ✅ OK

Dados Encontrados no Supabase:
Perfis: 2
Usuários: 1
Projetos: 1
```

#### 2.4 **Testar Login com Supabase**
1. Faça logout da aplicação
2. Tente fazer login com:
   - **Usuário:** `admin`
   - **Senha:** `Senha@1010`
3. No console, procure por:
   ```
   🔄 Tentando autenticação Supabase...
   ✅ Autenticação Supabase bem-sucedida
   ```

---

## 🔍 **DIAGNÓSTICO DE PROBLEMAS**

### **Problema 1: Tabelas não existem**
**Sintomas:** Table Editor vazio no Supabase
**Solução:**
1. Execute o SQL das migrations no SQL Editor
2. Use o arquivo: `supabase/migrations/20250612013446_icy_limit.sql`

### **Problema 2: Dados não existem**
**Sintomas:** Tabelas existem mas estão vazias
**Solução:**
1. Execute o SQL de dados iniciais
2. Use o arquivo: `supabase/migrations/20250612034132_golden_island.sql`

### **Problema 3: Variáveis não carregam**
**Sintomas:** Console mostra "não configurado corretamente"
**Solução:**
1. **Local:** Verifique arquivo `.env` e reinicie servidor
2. **Produção:** Configure variáveis no Netlify e redeploy

### **Problema 4: Conexão falha**
**Sintomas:** "Erro de conexão" na interface
**Solução:**
1. Verifique se as credenciais estão corretas
2. Teste a query SQL no Supabase SQL Editor
3. Verifique se RLS não está bloqueando

---

## 🧪 **TESTE RÁPIDO DE CONEXÃO**

### **No Console do Navegador (F12):**
```javascript
// 1. Verificar variáveis
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

// 2. Testar conexão direta (se as variáveis estiverem OK)
import { supabase } from './src/lib/supabase.js';
const { data, error } = await supabase.from('profiles').select('*');
console.log('Dados:', data, 'Erro:', error);
```

### **No SQL Editor do Supabase:**
```sql
-- Verificar usuário admin
SELECT 
  u.username,
  u.email,
  u.is_email_verified,
  p.name as profile_name
FROM users u
JOIN profiles p ON u.profile_id = p.id
WHERE u.username = 'admin';
```

---

## 📊 **RESULTADO FINAL ESPERADO**

### ✅ **Supabase (Backend)**
- Projeto criado e ativo
- 9 tabelas criadas
- Dados iniciais inseridos
- Queries funcionando

### ✅ **Aplicação (Frontend)**
- Variáveis de ambiente configuradas
- Cliente Supabase inicializado
- Conexão estabelecida
- Login funcionando com dados do Supabase

### ✅ **Integração Completa**
- Status mostra "conectado e funcionando"
- Login usa dados do Supabase
- Gerenciamento de usuários funciona
- Dados sincronizados entre aplicação e banco

---

## 🆘 **SE AINDA TIVER PROBLEMAS**

**Me envie:**
1. **Screenshot** do Table Editor do Supabase
2. **Mensagens do console** (F12)
3. **Status** mostrado na interface
4. **Resultado** da query SQL de teste
5. **Ambiente** (local ou produção)

**Com essas informações, posso identificar exatamente onde está o problema!**

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Execute esta verificação completa**
2. **Anote onde cada etapa falha** (se falhar)
3. **Me informe os resultados**
4. **Vou ajudar a corrigir** qualquer problema encontrado

**O objetivo é ter 100% de conectividade entre Supabase e NuP_AIM!**