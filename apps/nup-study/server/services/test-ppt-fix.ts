import { generatePresentationFromContent } from "./ppt-generator";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMarkdownParser() {
  console.log("🧪 Testando correções do Markdown parser...\n");

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

  console.log("📝 Markdown de entrada:");
  console.log(markdownContent);
  console.log("\n");

  const buffer = await generatePresentationFromContent(
    "Fotossíntese: Processo Vital",
    markdownContent,
    "Dra. Maria Silva - Teste de Correção",
    {
      theme: "academic",
      difficulties: [{ type: "dislexia", severity: "leve" }]
    }
  );

  const outputPath = path.join(__dirname, "../../output/test-correcao.pptx");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  console.log("✅ Apresentação gerada com sucesso!");
  console.log(`📁 Arquivo salvo em: ${outputPath}`);
  console.log("\n");
  console.log("🔍 Verificações esperadas:");
  console.log("  1. Slides devem ter títulos corretos (não começando com '- ')");
  console.log("  2. Headings (##) devem estar associados aos bullets seguintes");
  console.log("  3. Rodapés devem aparecer em todos os slides (exceto título)");
  console.log("\n");
  console.log("💡 Abra o arquivo .pptx para verificar visualmente!");
}

testMarkdownParser().catch(console.error);
