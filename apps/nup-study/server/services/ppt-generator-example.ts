import { PPTGenerator, generatePresentationFromContent } from "./ppt-generator";
import type { PresentationConfig } from "./ppt-generator";
import * as fs from "fs";
import * as path from "path";

export async function generateExamplePresentation() {
  const config: PresentationConfig = {
    title: "Introdução à Inteligência Artificial",
    subtitle: "Conceitos Fundamentais e Aplicações",
    author: "Professor IA - NuP Study",
    theme: "professional",
    learningDifficulties: [
      { type: "tdah", severity: "moderado" },
      { type: "dislexia", severity: "leve" }
    ],
    slides: [
      {
        type: "title",
        title: "O que é Inteligência Artificial?"
      },
      {
        type: "content",
        title: "Definição de IA",
        bullets: [
          "Capacidade de máquinas simularem inteligência humana",
          "Aprendizado com dados e experiências",
          "Tomada de decisões automatizadas",
          "Resolução de problemas complexos"
        ]
      },
      {
        type: "content",
        title: "Tipos de IA",
        bullets: [
          "IA Fraca (Narrow AI): Especializada em tarefas específicas",
          "IA Forte (General AI): Capacidade cognitiva similar ao humano",
          "Superinteligência: Ultrapassa capacidades humanas (hipotética)"
        ]
      },
      {
        type: "comparison",
        title: "Machine Learning vs Deep Learning",
        leftColumn: [
          "Machine Learning:",
          "Aprende com dados estruturados",
          "Requer feature engineering",
          "Algoritmos tradicionais",
          "Menor poder computacional"
        ],
        rightColumn: [
          "Deep Learning:",
          "Aprende com dados não estruturados",
          "Extração automática de features",
          "Redes neurais profundas",
          "Requer GPUs potentes"
        ]
      },
      {
        type: "content",
        title: "Aplicações Práticas",
        bullets: [
          "Assistentes virtuais (Siri, Alexa, Google Assistant)",
          "Reconhecimento facial e de voz",
          "Carros autônomos",
          "Diagnóstico médico assistido",
          "Recomendações personalizadas (Netflix, Spotify)"
        ]
      },
      {
        type: "conclusion",
        title: "Próximos Passos",
        bullets: [
          "Estude os conceitos fundamentais de algoritmos",
          "Pratique com datasets do Kaggle",
          "Explore frameworks como TensorFlow e PyTorch",
          "Acompanhe as tendências e novidades da área"
        ]
      }
    ]
  };

  const generator = new PPTGenerator();
  const buffer = await generator.generate(config);

  const outputPath = path.join(__dirname, "../../output/exemplo-ia.pptx");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Apresentação gerada com sucesso: ${outputPath}`);
  return outputPath;
}

export async function generateFromMarkdown() {
  const markdownContent = `
# Fotossíntese

A fotossíntese é o processo pelo qual plantas convertem luz solar em energia química.

## Etapas da Fotossíntese

- Fase clara: Ocorre nos tilacoides
- Captura de luz solar pela clorofila
- Produção de ATP e NADPH
- Liberação de oxigênio

## Fase Escura (Ciclo de Calvin)

- Ocorre no estroma do cloroplasto
- Fixação do CO₂
- Produção de glicose
- Não depende diretamente da luz

## Importância

- Produção de oxigênio para a atmosfera
- Base da cadeia alimentar
- Remoção de CO₂ do ar
- Fonte de energia para ecossistemas
`;

  const buffer = await generatePresentationFromContent(
    "Fotossíntese: Processo Vital",
    markdownContent,
    "Dra. Maria Silva",
    {
      theme: "academic",
      difficulties: [{ type: "deficiencia_visual", severity: "severo" }]
    }
  );

  const outputPath = path.join(__dirname, "../../output/fotossintese.pptx");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Apresentação de Markdown gerada: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  (async () => {
    try {
      console.log("🎨 Gerando apresentações de exemplo...\n");
      
      await generateExamplePresentation();
      await generateFromMarkdown();
      
      console.log("\n✨ Todos os exemplos foram gerados com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao gerar apresentações:", error);
      process.exit(1);
    }
  })();
}
