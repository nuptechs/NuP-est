# 🖼️ Screenshots e Imagens de Documentação

Esta pasta contém **todas as imagens e screenshots** do projeto NuPtechs organizadas de forma centralizada.

> **📍 Localização:** `/docs/screenshots/` (movido da raiz para melhor organização)

---

## 📊 Resumo

- **Total de Imagens**: 154 arquivos
- **Formatos**: PNG, JPG, JPEG
- **Origem**: Raiz do projeto + attached_assets/

---

## 🗂️ Categorias de Imagens

### 📱 Screenshots de Interface

#### Dashboard
- `dashboard-after-login.png`
- `dashboard-fullpage.png`
- `dashboard-mobile.png`
- `desktop_1200.png`
- `tablet_800.png`
- `tablet_scrolled.png`

#### Landing Page
- `final-landing.png`
- `homepage.png`
- `after-login.png`

#### Flashcards
- `flashcards_after_create_desktop.png`
- `flashcards_decks_desktop.png`
- `flashcards_desktop.png`
- `flashcards_desktop_1760361401533.png`
- `flashcards_mobile.png`
- `flashcards_mobile_1760361426168.png`

#### Knowledge Base / Library
- `knowledge-base.png`
- `knowledge_base_no_change.png`
- `knowledgebase-filters.png`
- `kb_filters_todas.png`
- `library-desktop.png`

#### Quiz
- `quiz.png`

### 📊 Componentes UI

#### Cards e Elementos
- `action-card-after.png`
- `action-card-before.png`
- `acoes-rapidas.png`
- `kpi-after.png`
- `kpi-before.png`
- `stats-section.png`
- `tablet_actions_container_metrics.png`

### 📸 Screenshots de Desenvolvimento
- `Screenshot_20250927_073350_Chrome_*.jpg`
- `Screenshot_20250927_074951_Chrome_*.jpg`
- `Screenshot_20250927_095235_Chrome_*.jpg`
- `Screenshot_20250927_111557_Chrome_*.jpg`
- `Screenshot_20250927_172028_Chrome_*.jpg`
- `Screenshot_20250927_173126_Chrome_*.jpg`
- `Screenshot_20250927_174506_Chrome_*.jpg`
- `Screenshot_20250927_184050_Replit_*.jpg`

### 🔢 Imagens Timestamped
- `image_1756820463293.png` até `image_1761139470305.png`
- **Total**: ~126 imagens com timestamp
- **Propósito**: Screenshots históricos e documentação de progresso

---

## 📁 Estrutura de Organização

```
docs/screenshots/
├── 📱 Interface Screenshots (25 imagens)
│   ├── Dashboard (6)
│   ├── Landing/Homepage (3)
│   ├── Flashcards (6)
│   ├── Knowledge Base (5)
│   └── Quiz (1)
│
├── 🎨 Componentes UI (7 imagens)
│   ├── Action Cards (2)
│   ├── KPIs (2)
│   └── Stats/Metrics (3)
│
├── 📸 Dev Screenshots (8 imagens JPG)
│   └── Chrome/Replit captures
│
└── 🔢 Historical Images (126 imagens)
    └── Timestamped screenshots
```

---

## 🔍 Como Usar

### Encontrar Imagens por Categoria
```bash
# Dashboard screenshots
ls docs/screenshots/ | grep dashboard

# Flashcard screenshots
ls docs/screenshots/ | grep flashcard

# Mobile screenshots
ls docs/screenshots/ | grep mobile

# Todas as imagens timestamped
ls docs/screenshots/ | grep "image_"
```

### Imagens Mais Recentes
```bash
ls -lt docs/screenshots/ | head -20
```

### Buscar por Data (no timestamp)
```bash
# Imagens de Janeiro 2025 (1757...)
ls docs/screenshots/ | grep "image_1757"

# Imagens de Setembro 2025 (1758...)
ls docs/screenshots/ | grep "image_1758"
```

---

## 📝 Convenções de Nomenclatura

### Screenshots de Interface
- `{feature}-{variant}.png`
- Exemplo: `dashboard-mobile.png`, `flashcards_desktop.png`

### Comparações (Before/After)
- `{component}-before.png`
- `{component}-after.png`

### Imagens Históricas
- `image_{unix_timestamp}.png`
- Exemplo: `image_1758029127888.png`

### Screenshots de Dev
- `Screenshot_{YYYYMMDD}_{HHMMSS}_{App}_{timestamp}.jpg`

---

## 🗑️ Limpeza e Manutenção

### Imagens Duplicadas
Algumas imagens podem ter duplicatas com timestamps. Para identificar:
```bash
# Verificar imagens com conteúdo similar
ls -lh Images/ | sort -k5
```

### Arquivar Imagens Antigas
Considere mover imagens timestamped antigas (>3 meses) para uma subpasta:
```bash
mkdir -p docs/screenshots/archive
mv docs/screenshots/image_1756*.png docs/screenshots/archive/
```

---

## 📊 Estatísticas

| Categoria | Quantidade | Formato |
|-----------|------------|---------|
| Interface Screenshots | 25 | PNG |
| Componentes UI | 7 | PNG |
| Dev Screenshots | 8 | JPG |
| Historical/Timestamped | 126 | PNG |
| **TOTAL** | **154** | PNG/JPG |

---

## ⚠️ Notas Importantes

1. **Backup**: Todas essas imagens fazem parte do histórico do projeto
2. **Referências**: Alguns arquivos MD podem referenciar essas imagens
3. **Organização**: Manter esta estrutura facilita navegação e backup
4. **Versioning**: Git ignora arquivos muito grandes (>10MB)

---

## 🔗 Referências em Documentação

As imagens podem ser referenciadas na documentação usando:
```markdown
![Descrição](./docs/screenshots/nome-da-imagem.png)
```

---

*Última atualização: Outubro 2025*  
*Total de imagens: 154 arquivos*
