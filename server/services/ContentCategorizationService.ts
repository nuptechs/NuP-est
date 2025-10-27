import { aiAnalyze } from "./ai/index";

export interface PedagogicalMetadata {
  professor?: string;
  institution?: string;
  course?: string;
  year?: string;
  semester?: string;
  totalPages?: number;
  totalExercises?: number;
  difficulty?: string;
  [key: string]: any;
}

export interface CategorizationResult {
  pedagogicalMetadata: PedagogicalMetadata;
  cleanContent: string;
  irrelevantContent: string;
  normalizedTopics: Array<{
    topic: string;
    isPrimary: boolean;
    confidence: number;
  }>;
  contentSourceName?: string;
  contentSourceType?: string;
  contentSourceSpecialty?: string;
  categorizationConfidence: number;
}

export class ContentCategorizationService {
  async categorizeContent(
    rawText: string,
    fileName: string,
    materialTitle?: string
  ): Promise<CategorizationResult> {
    const prompt = `Você é um especialista em análise de materiais didáticos acadêmicos. Sua tarefa é categorizar o conteúdo de um material de estudo em três tipos distintos:

1. **Metadados Pedagógicos** (pedagogicalMetadata): Informações sobre professor, instituição, curso, estatísticas do material (páginas, exercícios), etc. Retorne como objeto JSON.

2. **Conteúdo Limpo** (cleanContent): APENAS o conteúdo pedagógico puro - conceitos, definições, teorias, explicações, exemplos, exercícios. REMOVA completamente:
   - Saudações e introduções pessoais
   - Avisos administrativos
   - Informações repetitivas de cabeçalho/rodapé
   - Qualquer "fluff" não-pedagógico

3. **Conteúdo Irrelevante** (irrelevantContent): Saudações, avisos, informações redundantes, texto administrativo.

4. **Tópicos Normalizados** (normalizedTopics): Identifique os principais tópicos acadêmicos abordados (ex: "ICMS", "Princípio da Legalidade", "Equações Diferenciais"). Marque os tópicos primários (isPrimary: true) e atribua confiança (0.0-1.0).

5. **Fonte do Conteúdo** (contentSource): Se identificar professor ou instituição, extraia:
   - contentSourceName: nome do professor ou instituição
   - contentSourceType: "professor" | "institution" | "platform" | "author"
   - contentSourceSpecialty: especialidade/área

**IMPORTANTE:**
- cleanContent deve ser EXTENSO - não resuma, mantenha TODO o conteúdo pedagógico
- Mantenha fórmulas, exemplos, exercícios completos em cleanContent
- irrelevantContent deve conter apenas o que foi REMOVIDO de cleanContent
- pedagogicalMetadata deve ser um objeto JSON estruturado

**Material:**
Nome do arquivo: ${fileName}
Título: ${materialTitle || "Não fornecido"}

**Texto do Material:**
${rawText.substring(0, 100000)}

Responda APENAS com um JSON válido neste formato:
{
  "pedagogicalMetadata": {
    "professor": "string ou null",
    "institution": "string ou null",
    "course": "string ou null",
    "year": "string ou null",
    "totalPages": number ou null,
    "totalExercises": number ou null
  },
  "cleanContent": "texto limpo extenso aqui",
  "irrelevantContent": "texto removido aqui",
  "normalizedTopics": [
    {
      "topic": "nome do tópico normalizado",
      "isPrimary": true ou false,
      "confidence": 0.0 a 1.0
    }
  ],
  "contentSourceName": "string ou null",
  "contentSourceType": "professor | institution | platform | author ou null",
  "contentSourceSpecialty": "string ou null",
  "categorizationConfidence": 0.0 a 1.0
}`;

    try {
      const result = await aiAnalyze<CategorizationResult>(
        prompt,
        "Você é um especialista em análise e categorização de materiais didáticos acadêmicos.",
        {
          temperature: 0.3,
          maxTokens: 16000
        }
      );

      if (!result.cleanContent || result.cleanContent.length < 50) {
        throw new Error("Categorização falhou: cleanContent muito curto ou ausente");
      }

      return {
        pedagogicalMetadata: result.pedagogicalMetadata || {},
        cleanContent: result.cleanContent,
        irrelevantContent: result.irrelevantContent || "",
        normalizedTopics: result.normalizedTopics || [],
        contentSourceName: result.contentSourceName,
        contentSourceType: result.contentSourceType,
        contentSourceSpecialty: result.contentSourceSpecialty,
        categorizationConfidence: result.categorizationConfidence || 0.5
      };
    } catch (error: any) {
      console.error("[ContentCategorizationService] Error:", error);
      
      return {
        pedagogicalMetadata: {},
        cleanContent: rawText,
        irrelevantContent: "",
        normalizedTopics: [],
        categorizationConfidence: 0.0
      };
    }
  }

  async extractContentSourceInfo(
    pedagogicalMetadata: PedagogicalMetadata,
    contentSourceName?: string,
    contentSourceType?: string,
    contentSourceSpecialty?: string
  ): Promise<{
    name: string;
    type: string;
    specialty?: string;
    institution?: string;
  } | null> {
    if (contentSourceName && contentSourceType) {
      return {
        name: contentSourceName,
        type: contentSourceType,
        specialty: contentSourceSpecialty,
        institution: pedagogicalMetadata.institution || undefined
      };
    }

    if (pedagogicalMetadata.professor) {
      return {
        name: pedagogicalMetadata.professor,
        type: "professor",
        specialty: contentSourceSpecialty,
        institution: pedagogicalMetadata.institution || undefined
      };
    }

    if (pedagogicalMetadata.institution) {
      return {
        name: pedagogicalMetadata.institution,
        type: "institution",
        specialty: contentSourceSpecialty
      };
    }

    return null;
  }
}

export const contentCategorizationService = new ContentCategorizationService();
