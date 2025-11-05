/**
 * SERVIÇO DE CATEGORIZAÇÃO INTELIGENTE DE MATÉRIAS
 * 
 * Previne erros de categorização usando:
 * 1. Mapeamento estático de matérias comuns (rápido, sem custo)
 * 2. IA como fallback para casos não mapeados (preciso mas tem custo)
 */

import { aiAnalyze } from './ai/index.js';

type SubjectCategory = 'exatas' | 'humanas' | 'biologicas';

interface CategorySuggestion {
  category: SubjectCategory;
  confidence: number; // 0.0 - 1.0
  source: 'pattern' | 'ai' | 'fallback';
  reasoning?: string;
}

/**
 * Mapeamento estático de palavras-chave → categoria
 * Baseado em matérias comuns de concursos e vestibulares
 */
const CATEGORY_PATTERNS: Record<string, SubjectCategory> = {
  // HUMANAS - Direito
  'direito': 'humanas',
  'constitucional': 'humanas',
  'administrativo': 'humanas',
  'penal': 'humanas',
  'civil': 'humanas',
  'tributário': 'humanas',
  'processual': 'humanas',
  'trabalhista': 'humanas',
  'legislação': 'humanas',
  
  // HUMANAS - Outras
  'história': 'humanas',
  'filosofia': 'humanas',
  'sociologia': 'humanas',
  'geografia': 'humanas',
  'literatura': 'humanas',
  'português': 'humanas',
  'redação': 'humanas',
  'administração': 'humanas',
  'gestão': 'humanas',
  'economia': 'humanas',
  'contabilidade': 'humanas',
  'auditoria': 'humanas',
  
  // EXATAS
  'matemática': 'exatas',
  'física': 'exatas',
  'química': 'exatas',
  'cálculo': 'exatas',
  'estatística': 'exatas',
  'programação': 'exatas',
  'algoritmo': 'exatas',
  'engenharia': 'exatas',
  'informática': 'exatas',
  'computação': 'exatas',
  'raciocínio lógico': 'exatas',
  'rlm': 'exatas',
  
  // BIOLÓGICAS
  'biologia': 'biologicas',
  'medicina': 'biologicas',
  'anatomia': 'biologicas',
  'fisiologia': 'biologicas',
  'farmácia': 'biologicas',
  'enfermagem': 'biologicas',
  'nutrição': 'biologicas',
  'saúde': 'biologicas',
  'genética': 'biologicas',
  'ecologia': 'biologicas',
  'bioquímica': 'biologicas',
};

/**
 * Sugere categoria para uma matéria baseada em seu nome
 */
export async function suggestSubjectCategory(
  subjectName: string
): Promise<CategorySuggestion> {
  const normalized = subjectName.toLowerCase().trim();
  
  // FASE 1: Tentar encontrar padrão conhecido (rápido, sem custo)
  for (const [keyword, category] of Object.entries(CATEGORY_PATTERNS)) {
    if (normalized.includes(keyword)) {
      console.log(`[CategorySuggestion] Padrão encontrado: "${keyword}" → ${category}`);
      return {
        category,
        confidence: 0.95, // Alta confiança em padrões conhecidos
        source: 'pattern',
        reasoning: `Palavra-chave "${keyword}" detectada`,
      };
    }
  }
  
  // FASE 2: Usar IA para casos não mapeados (custoso mas preciso)
  console.log(`[CategorySuggestion] Padrão não encontrado, consultando IA para: "${subjectName}"`);
  
  try {
    const prompt = `
Classifique a matéria "${subjectName}" em uma das categorias:

CATEGORIAS:
- **exatas**: Matemática, Física, Química, Engenharia, Programação, Estatística
- **humanas**: Direito, História, Filosofia, Administração, Economia, Literatura, Português
- **biologicas**: Biologia, Medicina, Enfermagem, Farmácia, Saúde, Genética

Responda APENAS com JSON:
{
  "category": "exatas" | "humanas" | "biologicas",
  "confidence": 0.0-1.0,
  "reasoning": "Explicação breve"
}
`.trim();

    const result = await aiAnalyze<{
      category: SubjectCategory;
      confidence: number;
      reasoning: string;
    }>(
      prompt,
      'Você é um especialista em classificação de matérias acadêmicas.',
      {
        temperature: 0.2, // Baixa temperatura para consistência
        maxTokens: 150,
      }
    );
    
    console.log(`[CategorySuggestion] IA sugeriu: ${result.category} (${(result.confidence * 100).toFixed(0)}%)`);
    
    return {
      category: result.category,
      confidence: result.confidence,
      source: 'ai',
      reasoning: result.reasoning,
    };
  } catch (error) {
    // FASE 3: Fallback seguro se IA falhar
    console.error(`[CategorySuggestion] Erro na IA, usando fallback:`, error);
    return {
      category: 'humanas', // Default mais comum em concursos
      confidence: 0.3, // Baixa confiança
      source: 'fallback',
      reasoning: 'Não foi possível determinar categoria automaticamente',
    };
  }
}

/**
 * Valida se uma categoria é válida
 */
export function isValidCategory(category: string): category is SubjectCategory {
  return ['exatas', 'humanas', 'biologicas'].includes(category);
}
