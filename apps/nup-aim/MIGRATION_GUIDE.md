# 🚀 Guia de Upload - Migração do AIM

## 📂 Onde Colocar Cada Arquivo

Após baixar e extrair o ZIP da app "aim", copie os arquivos conforme abaixo:

### Frontend (Client)
```
aim/src/              → apps/nup-aim/client/src/
aim/public/           → apps/nup-aim/client/public/
aim/views/            → apps/nup-aim/client/src/views/
```

### Backend (Server)
```
aim/server.js         → apps/nup-aim/server/index.ts (renomear)
aim/routes/           → apps/nup-aim/server/routes/
aim/middleware/       → apps/nup-aim/server/middleware/
aim/utils/            → apps/nup-aim/server/utils/
aim/database/         → apps/nup-aim/server/database/
aim/custom-fields-service/ → apps/nup-aim/server/services/custom-fields/
```

### Shared
```
aim/data/             → apps/nup-aim/shared/data/
(schemas se houver)   → apps/nup-aim/shared/schema.ts
```

### Configuração
```
aim/package.json      → Copiar dependências para apps/nup-aim/package.json
aim/.env.example      → apps/nup-aim/.env.example
```

## ⚡ Upload Rápido via Replit

1. No painel esquerdo "Files", clique com botão direito em `apps/nup-aim/`
2. Selecione "Upload file" ou "Upload folder"
3. Selecione os arquivos/pastas correspondentes do ZIP extraído

## 📋 Checklist

- [ ] Frontend copiado para client/src/
- [ ] Backend copiado para server/
- [ ] Rotas copiadas para server/routes/
- [ ] Middleware copiado para server/middleware/
- [ ] Utilitários copiados para server/utils/
- [ ] Database configs copiados
- [ ] package.json revisado
- [ ] Arquivos de configuração copiados

## 🔄 Próximos Passos (Após Upload)

Depois de copiar tudo, me avise que eu vou:
1. Atualizar imports para usar @nup/* packages
2. Adaptar configurações
3. Instalar dependências
4. Testar a app
