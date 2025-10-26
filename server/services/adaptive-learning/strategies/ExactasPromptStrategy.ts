/**
 * Exatas Prompt Strategy
 * 
 * Specialized prompt engineering for exact sciences (Math, Physics, Chemistry, Engineering)
 * Focus: Step-by-step problem solving, mathematical rigor, formulas
 */

import { BasePromptStrategy } from './IPromptStrategy';
import type { StudyContext } from '../types';

export class ExactasPromptStrategy extends BasePromptStrategy {
  readonly category = 'exatas' as const;
  readonly name = 'Exatas (Matemática, Física, Química, Engenharia)';
  
  buildSystemPrompt(context: StudyContext): string {
    return `Você é um professor especialista em Ciências Exatas para concursos e exames competitivos de alto nível.

${this.buildPersonalityPrompt(context)}

EXPERTISE:
- Matemática, Física, Química, Estatística, Raciocínio Lógico
- Resolução passo a passo com rigor matemático
- Uso correto de notação e simbologia
- Explicação clara de conceitos abstratos

METODOLOGIA PARA EXATAS:
1. Identifique dados e incógnitas claramente
2. Apresente fórmulas e teoremas relevantes
3. Mostre TODOS os passos do cálculo (nunca pule etapas)
4. Explique o raciocínio lógico por trás de cada passo
5. Indique unidades de medida quando aplicável
6. Aponte "pegadinhas" comuns em questões de concurso

${this.buildProfileContext(context)}
${this.buildAdaptationsPrompt(context)}

Adapte todo conteúdo considerando essas características.`;
  }
  
  buildQuestionPrompt(context: StudyContext, topic: string, difficulty: number): string {
    const difficultyLabels = {
      0.5: 'BÁSICO - Conceitos fundamentais',
      1.0: 'BÁSICO/INTERMEDIÁRIO - Aplicação direta',
      1.5: 'INTERMEDIÁRIO - Requer raciocínio',
      2.0: 'INTERMEDIÁRIO/AVANÇADO - Questões de concurso',
      2.5: 'AVANÇADO - Nível competitivo alto',
      3.0: 'MUITO AVANÇADO - Questões desafiadoras de concursos difíceis',
    };
    
    const difficultyKey = Object.keys(difficultyLabels)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - difficulty) < Math.abs(prev - difficulty) ? curr : prev
      );
    
    let prompt = `Crie uma questão de múltipla escolha sobre: ${topic}

CATEGORIA: EXATAS (${context.subject?.name || 'Ciências Exatas'})
NÍVEL: ${difficultyLabels[difficultyKey as keyof typeof difficultyLabels]} (${difficulty.toFixed(1)}/3.0)

FORMATO OBRIGATÓRIO:
- 4 alternativas (A, B, C, D)
- UMA única resposta correta
- Distratores plausíveis (pegadinhas comuns)

REQUISITOS PARA EXATAS:
✓ Use notação matemática correta (símbolos, fórmulas)
✓ Seja preciso com unidades de medida
✓ Exija raciocínio lógico-matemático
✓ Inclua cálculos ou deduções
✓ Base-se em conceitos fundamentais sólidos
✓ Evite "decoreba" - teste compreensão

DISTRATORES (alternativas incorretas):
- Resultado de erro comum de cálculo
- Resposta para quem confunde conceitos
- Valor correto mas com unidade errada
- Pegadinhas típicas de concursos

${this.buildPriorityInstructions(context)}
${this.buildRAGContext(context)}

ESTRUTURA DE RESPOSTA (JSON):
{
  "question": "Enunciado completo da questão com dados numéricos se aplicável",
  "options": [
    "A) Primeira alternativa com valor/resultado",
    "B) Segunda alternativa",
    "C) Terceira alternativa",
    "D) Quarta alternativa"
  ],
  "correctAnswer": "A",
  "explanation": "Explicação PASSO A PASSO:\\n1. Dados: ...\\n2. Fórmula: ...\\n3. Substituição: ...\\n4. Cálculo: ...\\n5. Resultado: ...",
  "adaptations": ["step_by_step_math", "visual_formulas", "rigorous_notation"]
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
      1: 'Dica sutil sobre qual fórmula/conceito usar',
      2: 'Mostre o primeiro passo do cálculo ou raciocínio',
      3: 'Detalhe quase toda a resolução, faltando apenas o cálculo final',
    };
    
    return `Forneça uma dica MATEMÁTICA progressiva (nível ${hintLevel}/3) para esta questão de exatas.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer ? `TENTATIVA DO ALUNO: ${studentAnswer}` : ''}

TIPO DE DICA (Nível ${hintLevel}): ${hints[hintLevel as keyof typeof hints]}

FORMATO DA DICA:
${hintLevel === 1 ? '- Indique qual conceito/fórmula deve ser usado\n- NÃO mostre cálculos' : ''}
${hintLevel === 2 ? '- Mostre a fórmula completa\n- Inicie a substituição dos valores\n- NÃO complete o cálculo' : ''}
${hintLevel === 3 ? '- Mostre TODOS os passos até chegar perto do resultado\n- Deixe apenas a conclusão final para o aluno' : ''}

Seja didático e use notação matemática clara.`;
  }
  
  buildExplanationPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer?: string
  ): string {
    return `Explique a resolução COMPLETA desta questão de exatas com rigor matemático.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer && studentAnswer !== correctAnswer ? `ERRO DO ALUNO: ${studentAnswer}` : ''}

ESTRUTURA DA EXPLICAÇÃO:

1. IDENTIFICAÇÃO:
   - Liste dados fornecidos
   - Identifique o que é pedido
   - Reconheça o conceito/teorema aplicável

2. RESOLUÇÃO PASSO A PASSO:
   - Passo 1: [Primeira etapa]
   - Passo 2: [Segunda etapa]
   - ... (todos os passos necessários)
   - Passo final: [Resultado]

3. CONCEITOS-CHAVE:
   - Explique os fundamentos teóricos
   - Cite fórmulas/teoremas usados

4. PEGADINHAS COMUNS:
   - Erros típicos neste tipo de questão
   - Como evitar confusões

${studentAnswer && studentAnswer !== correctAnswer ? `
5. ANÁLISE DO SEU ERRO:
   - Por que "${studentAnswer}" está incorreto
   - Qual raciocínio levou a este erro
   - Como corrigir o pensamento
` : ''}

Use notação matemática clara e seja MUITO didático.`;
  }
}
