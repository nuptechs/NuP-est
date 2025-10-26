/**
 * Humanas Prompt Strategy
 * 
 * Specialized prompt engineering for humanities (History, Law, Philosophy, Literature)
 * Focus: Critical analysis, interpretation, argumentation, contextualization
 */

import { BasePromptStrategy } from './IPromptStrategy';
import type { StudyContext } from '../types';

export class HumanasPromptStrategy extends BasePromptStrategy {
  readonly category = 'humanas' as const;
  readonly name = 'Humanas (História, Direito, Filosofia, Literatura)';
  
  buildSystemPrompt(context: StudyContext): string {
    return `Você é um professor especialista em Ciências Humanas para concursos e exames competitivos de alto nível.

${this.buildPersonalityPrompt(context)}

EXPERTISE:
- História, Direito, Filosofia, Sociologia, Geografia Humana, Literatura
- Análise crítica e interpretação de textos
- Contextualização histórica e social
- Argumentação fundamentada

METODOLOGIA PARA HUMANAS:
1. Contextualize historicamente e socialmente
2. Conecte fatos, conceitos e teorias
3. Estimule pensamento crítico
4. Use exemplos concretos e casos reais
5. Exija interpretação, não apenas memorização
6. Relacione com questões contemporâneas quando relevante

ATENÇÃO PARA CONCURSOS PÚBLICOS:
- Questões de Direito: cite artigos, leis, jurisprudência
- História: contexto cronológico e causalidade
- Filosofia: correntes de pensamento e autores principais
- Literatura: movimentos literários e análise textual

${this.buildProfileContext(context)}
${this.buildAdaptationsPrompt(context)}

Adapte todo conteúdo considerando essas características.`;
  }
  
  buildQuestionPrompt(context: StudyContext, topic: string, difficulty: number): string {
    const difficultyLabels = {
      0.5: 'BÁSICO - Fatos e conceitos fundamentais',
      1.0: 'BÁSICO/INTERMEDIÁRIO - Compreensão e relação',
      1.5: 'INTERMEDIÁRIO - Análise e interpretação',
      2.0: 'INTERMEDIÁRIO/AVANÇADO - Síntese e aplicação',
      2.5: 'AVANÇADO - Questões de concursos difíceis',
      3.0: 'MUITO AVANÇADO - Análise crítica complexa',
    };
    
    const difficultyKey = Object.keys(difficultyLabels)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - difficulty) < Math.abs(prev - difficulty) ? curr : prev
      );
    
    let prompt = `Crie uma questão de múltipla escolha sobre: ${topic}

CATEGORIA: HUMANAS (${context.subject?.name || 'Ciências Humanas'})
NÍVEL: ${difficultyLabels[difficultyKey as keyof typeof difficultyLabels]} (${difficulty.toFixed(1)}/3.0)

FORMATO OBRIGATÓRIO:
- 4 alternativas (A, B, C, D)
- UMA única resposta correta
- Distratores baseados em confusões conceituais comuns

REQUISITOS PARA HUMANAS:
✓ Contextualize historicamente/socialmente quando relevante
✓ Exija interpretação e análise crítica
✓ Use linguagem precisa e técnica adequada
✓ Base-se em fontes confiáveis e fatos verificáveis
✓ Evite ambiguidades ou questões de opinião
✓ Para Direito: cite legislação/jurisprudência quando aplicável

TIPOS DE QUESTÃO (varie):
- Interpretação de texto/contexto histórico
- Relação causa-consequência
- Comparação entre teorias/períodos/autores
- Aplicação de conceitos a casos concretos
- Análise de citações ou documentos

DISTRATORES (alternativas incorretas):
- Afirmação parcialmente correta mas incompleta
- Confusão entre conceitos similares
- Anacronismo ou erro de contexto
- Interpretação superficial ou senso comum

${this.buildPriorityInstructions(context)}
${this.buildRAGContext(context)}

ESTRUTURA DE RESPOSTA (JSON):
{
  "question": "Enunciado contextualizado (pode incluir texto-base, citação ou caso)",
  "options": [
    "A) Primeira alternativa com análise/interpretação",
    "B) Segunda alternativa",
    "C) Terceira alternativa",
    "D) Quarta alternativa"
  ],
  "correctAnswer": "A",
  "explanation": "Explicação fundamentada:\\n1. Contexto: ...\\n2. Análise: ...\\n3. Justificativa: ...\\n4. Por que as outras estão erradas: ...",
  "adaptations": ["critical_thinking", "contextualization", "argumentation"]
}

Retorne APENAS o JSON válido, sem texto adicional.`;
    
    return prompt;
  }
  
  buildHintPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer?: string,
    hintLevel: number = 1
  ): string {
    const hints = {
      1: 'Dica sobre contexto histórico/conceitual relevante',
      2: 'Indique qual aspecto analisar ou qual conexão fazer',
      3: 'Detalhe o raciocínio quase completo, faltando apenas a conclusão',
    };
    
    return `Forneça uma dica INTERPRETATIVA progressiva (nível ${hintLevel}/3) para esta questão de humanas.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer ? `TENTATIVA DO ALUNO: ${studentAnswer}` : ''}

TIPO DE DICA (Nível ${hintLevel}): ${hints[hintLevel as keyof typeof hints]}

FORMATO DA DICA:
${hintLevel === 1 ? '- Contextualize o tema historicamente/socialmente\n- Indique qual conceito/teoria é central\n- NÃO revele a resposta' : ''}
${hintLevel === 2 ? '- Aponte qual aspecto da questão é crucial\n- Sugira uma linha de raciocínio\n- Indique conexões relevantes\n- NÃO conclua' : ''}
${hintLevel === 3 ? '- Desenvolva quase toda a análise\n- Mostre o raciocínio completo\n- Deixe apenas a conclusão final para o aluno' : ''}

Seja didático e estimule o pensamento crítico.`;
  }
  
  buildExplanationPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer?: string
  ): string {
    return `Explique de forma COMPLETA e FUNDAMENTADA esta questão de humanas.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer && studentAnswer !== correctAnswer ? `RESPOSTA DO ALUNO: ${studentAnswer}` : ''}

ESTRUTURA DA EXPLICAÇÃO:

1. CONTEXTUALIZAÇÃO:
   - Contexto histórico, social ou filosófico relevante
   - Período, autores, correntes de pensamento envolvidos
   - Importância do tema

2. ANÁLISE DA QUESTÃO:
   - O que está sendo perguntado (explícita e implicitamente)
   - Conceitos-chave envolvidos
   - Relações e conexões necessárias

3. DESENVOLVIMENTO DA RESPOSTA CORRETA:
   - Por que esta é a melhor resposta
   - Argumentação fundamentada
   - Evidências, exemplos ou citações de suporte

4. ANÁLISE DAS ALTERNATIVAS INCORRETAS:
   - Por que cada distrator está errado
   - Confusões conceituais comuns
   - "Pegadinhas" da questão

${studentAnswer && studentAnswer !== correctAnswer ? `
5. ANÁLISE DO SEU ERRO:
   - Por que "${studentAnswer}" não é a melhor resposta
   - Qual raciocínio pode ter levado a este erro
   - Como evitar esta confusão no futuro
   - Conceitos a revisar
` : ''}

Use linguagem clara, fundamentada e estimule o pensamento crítico.`;
  }
}
