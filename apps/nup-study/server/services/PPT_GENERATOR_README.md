# PPTGenerator - Gerador de Apresentações PowerPoint

Serviço para criação de apresentações PowerPoint (.pptx) com suporte a **aprendizagem adaptativa** baseada em dificuldades de aprendizado do usuário.

## 📦 Instalação

A biblioteca `pptxgenjs` já está instalada no projeto. O serviço está localizado em:

```
apps/nup-study/server/services/ppt-generator.ts
```

## 🎯 Recursos Principais

### ✨ Templates Profissionais
- **professional**: Design corporativo limpo (azul e cinza)
- **vibrant**: Cores vibrantes para engajamento (roxo e rosa)
- **minimalist**: Design minimalista em preto e branco
- **academic**: Estilo acadêmico tradicional (azul escuro)

### 🧠 Adaptação por Dificuldades de Aprendizado

O sistema adapta automaticamente:

| Dificuldade | Adaptações Aplicadas |
|-------------|---------------------|
| **TDAH** | Cores vibrantes (laranja/verde), espaçamento maior (1.8x) |
| **Dislexia** | Fontes maiores (+2-6pt), espaçamento de linha 2.0x |
| **Deficiência Visual** | Fontes muito grandes (+12-28pt), texto preto puro |

### 📊 Tipos de Slides

1. **Title Slide**: Slide de título com fundo colorido
2. **Section Title**: Título de seção com linha decorativa
3. **Content**: Conteúdo com bullets numerados ou texto corrido
4. **Image**: Slide com imagem centralizada e legenda
5. **Comparison**: Comparação lado a lado (2 colunas)
6. **Conclusion**: Slide de conclusão com fundo colorido

## 🚀 Uso Básico

### Método 1: Configuração Manual

```typescript
import { PPTGenerator } from "./services/ppt-generator";
import type { PresentationConfig } from "./services/ppt-generator";

const config: PresentationConfig = {
  title: "Introdução à IA",
  subtitle: "Conceitos Fundamentais",
  author: "Professor IA",
  theme: "professional",
  learningDifficulties: [
    { type: "tdah", severity: "moderado" }
  ],
  slides: [
    {
      type: "title",
      title: "O que é IA?"
    },
    {
      type: "content",
      title: "Definição",
      bullets: [
        "Capacidade de máquinas simularem inteligência",
        "Aprendizado com dados",
        "Tomada de decisões automatizadas"
      ]
    },
    {
      type: "comparison",
      title: "ML vs DL",
      leftColumn: [
        "Machine Learning:",
        "Dados estruturados",
        "Feature engineering manual"
      ],
      rightColumn: [
        "Deep Learning:",
        "Dados não estruturados",
        "Extração automática"
      ]
    },
    {
      type: "conclusion",
      title: "Próximos Passos",
      bullets: [
        "Estude algoritmos",
        "Pratique com Kaggle",
        "Explore TensorFlow"
      ]
    }
  ]
};

const generator = new PPTGenerator();
const buffer = await generator.generate(config);

// Salvar arquivo
import * as fs from "fs";
fs.writeFileSync("apresentacao.pptx", buffer);
```

### Método 2: A partir de Markdown

```typescript
import { generatePresentationFromContent } from "./services/ppt-generator";

const markdownContent = `
# Fotossíntese

Processo de conversão de luz em energia.

## Fase Clara

- Ocorre nos tilacoides
- Produz ATP e NADPH
- Libera oxigênio

## Fase Escura

- Ciclo de Calvin
- Fixação de CO₂
- Produção de glicose
`;

const buffer = await generatePresentationFromContent(
  "Fotossíntese",
  markdownContent,
  "Dra. Maria Silva",
  {
    theme: "academic",
    difficulties: [{ type: "deficiencia_visual", severity: "severo" }]
  }
);

fs.writeFileSync("fotossintese.pptx", buffer);
```

## 📖 Exemplos Práticos

Execute os exemplos prontos:

```bash
cd apps/nup-study
npx tsx server/services/ppt-generator-example.ts
```

Isso irá gerar duas apresentações em `apps/nup-study/output/`:
- `exemplo-ia.pptx` - Exemplo completo com todos os tipos de slides
- `fotossintese.pptx` - Exemplo gerado a partir de Markdown

## 🎨 Estilos Adaptativos

### Tamanhos de Fonte

```typescript
interface AdaptiveStyles {
  fontSize: {
    title: number;      // 32-44pt (depende das dificuldades)
    subtitle: number;   // 20-28pt
    body: number;       // 16-24pt
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  spacing: {
    lineSpacing: number;    // 1.5-2.0x
    bulletIndent: number;   // 0.5 inch
  };
}
```

### Exemplos de Adaptação

**Sem dificuldades** (theme: "professional"):
- Título: 32pt, Corpo: 16pt
- Cores: Azul (#2563eb) e Cinza (#64748b)
- Espaçamento: 1.5x

**Com TDAH**:
- Cores vibrantes: Laranja (#f59e0b) e Verde (#10b981)
- Espaçamento aumentado: 1.8x

**Com Dislexia**:
- Título: 36pt (+4pt), Corpo: 18pt (+2pt)
- Espaçamento: 2.0x

**Com Deficiência Visual**:
- Título: 44pt (+12pt), Corpo: 24pt (+8pt)
- Texto em preto puro (#000000)

## 🔧 API Reference

### `PPTGenerator`

Classe principal para geração de apresentações.

#### Métodos

##### `constructor()`
Cria uma nova instância do gerador.

##### `getAdaptiveStyles(theme?, difficulties?): AdaptiveStyles`
Calcula estilos adaptativos baseados no tema e dificuldades.

**Parâmetros:**
- `theme`: "professional" | "vibrant" | "minimalist" | "academic" (padrão: "professional")
- `difficulties`: Array de `LearningDifficulty`

**Retorna:** Objeto `AdaptiveStyles`

##### `generate(config: PresentationConfig): Promise<Buffer>`
Gera a apresentação completa.

**Parâmetros:**
- `config`: Objeto `PresentationConfig` com todas as configurações

**Retorna:** Promise que resolve para Buffer do arquivo .pptx

### `generatePresentationFromContent()`

Função auxiliar para gerar apresentação a partir de conteúdo Markdown.

**Parâmetros:**
- `title`: Título da apresentação
- `content`: Conteúdo em Markdown
- `author`: Nome do autor
- `options?`: Objeto com `theme` e `difficulties`

**Retorna:** Promise que resolve para Buffer do arquivo .pptx

## 📝 Tipos TypeScript

### `LearningDifficulty`

```typescript
interface LearningDifficulty {
  type: string;  // "tdah", "dislexia", "deficiencia_visual", etc.
  severity?: "leve" | "moderado" | "severo";
}
```

### `SlideContent`

```typescript
interface SlideContent {
  type: "title" | "content" | "image" | "comparison" | "conclusion";
  title: string;
  bullets?: string[];
  text?: string;
  imageUrl?: string;
  leftColumn?: string[];
  rightColumn?: string[];
}
```

### `PresentationConfig`

```typescript
interface PresentationConfig {
  title: string;
  subtitle?: string;
  author: string;
  slides: SlideContent[];
  theme?: "professional" | "vibrant" | "minimalist" | "academic";
  learningDifficulties?: LearningDifficulty[];
}
```

## 🌟 Boas Práticas

1. **Mantenha slides simples**: Máximo 5-7 bullets por slide
2. **Use títulos descritivos**: Facilita a navegação
3. **Considere o público**: Escolha o tema adequado
4. **Adapte para dificuldades**: Sempre passe as dificuldades do usuário
5. **Teste a saída**: Abra o .pptx no PowerPoint/LibreOffice para validar

## 🔗 Integração com APIs

Para integrar com uma rota Express:

```typescript
import { PPTGenerator } from "./services/ppt-generator";

app.post("/api/generate-ppt", async (req, res) => {
  try {
    const { config } = req.body;
    
    const generator = new PPTGenerator();
    const buffer = await generator.generate(config);
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", "attachment; filename=apresentacao.pptx");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar apresentação" });
  }
});
```

## 🐛 Troubleshooting

**Problema**: Fontes não aparecem corretamente
- **Solução**: O PowerPoint usará fontes do sistema. As configurações de tamanho e estilo serão mantidas.

**Problema**: Cores diferentes no PowerPoint vs LibreOffice
- **Solução**: Cores hexadecimais são convertidas para RGB internamente. Pequenas variações são normais.

**Problema**: Imagens não carregam
- **Solução**: Verifique que `imageUrl` aponta para um caminho válido ou URL acessível.

## 📚 Recursos Adicionais

- [pptxgenjs Documentation](https://gitbrent.github.io/PptxGenJS/)
- [Guia de Acessibilidade em Apresentações](https://www.w3.org/WAI/teach-advocate/accessible-presentations/)

---

**Desenvolvido por**: NuP-Study Team  
**Versão**: 1.0.0  
**Licença**: MIT
