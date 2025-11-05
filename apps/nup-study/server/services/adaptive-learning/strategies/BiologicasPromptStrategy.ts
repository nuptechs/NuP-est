/**
 * Biológicas Prompt Strategy
 * 
 * Specialized prompt engineering for biological sciences (Biology, Medicine, Health)
 * Focus: Biological processes, systems, clinical reasoning, taxonomy
 */

import { BasePromptStrategy } from './IPromptStrategy';
import type { StudyContext } from '../types';

export class BiologicasPromptStrategy extends BasePromptStrategy {
  readonly category = 'biologicas' as const;
  readonly name = 'Biológicas (Biologia, Medicina, Saúde)';
  
  buildSystemPrompt(context: StudyContext): string {
    return `Você é um professor especialista em Ciências Biológicas e da Saúde para concursos e exames competitivos de alto nível.

${this.buildPersonalityPrompt(context)}

EXPERTISE:
- Biologia, Medicina, Farmacologia, Anatomia, Fisiologia, Genética
- Processos biológicos e sistemas corporais
- Raciocínio clínico e diagnóstico
- Taxonomia e classificação científica

METODOLOGIA PARA BIOLÓGICAS:
1. Explique processos biológicos em sequência lógica
2. Use nomenclatura técnica correta (nomes científicos)
3. Relacione estrutura e função
4. Apresente mecanismos de ação e vias metabólicas
5. Use casos clínicos quando aplicável
6. Destaque relações entre sistemas

ATENÇÃO PARA CONCURSOS:
- Medicina: sinais, sintomas, diagnóstico diferencial, tratamento
- Biologia: classificação taxonômica, evolução, ecologia
- Farmacologia: mecanismos, indicações, contraindicações
- Anatomia/Fisiologia: localização, função, integração sistêmica

${this.buildProfileContext(context)}
${this.buildAdaptationsPrompt(context)}

Adapte todo conteúdo considerando essas características.`;
  }
  
  buildQuestionPrompt(context: StudyContext, topic: string, difficulty: number): string {
    const difficultyLabels = {
      0.5: 'BÁSICO - Conceitos e definições fundamentais',
      1.0: 'BÁSICO/INTERMEDIÁRIO - Relações básicas',
      1.5: 'INTERMEDIÁRIO - Processos e mecanismos',
      2.0: 'INTERMEDIÁRIO/AVANÇADO - Integração de sistemas',
      2.5: 'AVANÇADO - Raciocínio clínico/científico',
      3.0: 'MUITO AVANÇADO - Casos complexos e correlações',
    };
    
    const difficultyKey = Object.keys(difficultyLabels)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - difficulty) < Math.abs(prev - difficulty) ? curr : prev
      );
    
    let prompt = `Crie uma questão de múltipla escolha sobre: ${topic}

CATEGORIA: BIOLÓGICAS (${context.subject?.name || 'Ciências Biológicas/Saúde'})
NÍVEL: ${difficultyLabels[difficultyKey as keyof typeof difficultyLabels]} (${difficulty.toFixed(1)}/3.0)

FORMATO OBRIGATÓRIO:
- 4 alternativas (A, B, C, D)
- UMA única resposta correta
- Distratores baseados em confusões conceituais ou clínicas

REQUISITOS PARA BIOLÓGICAS:
✓ Use nomenclatura científica correta (SEMPRE nomes latinos em itálico quando aplicável)
✓ Descreva processos biológicos em sequência lógica
✓ Relacione estrutura e função
✓ Para casos clínicos: sinais, sintomas, quadro clínico realista
✓ Base-se em evidências científicas atualizadas
✓ Exija compreensão de mecanismos, não apenas memorização

TIPOS DE QUESTÃO (varie):
- Identificação de estruturas/processos
- Mecanismos de ação e vias metabólicas
- Relação causa-efeito em sistemas biológicos
- Casos clínicos (para medicina/saúde)
- Classificação taxonômica
- Integração entre sistemas

DISTRATORES (alternativas incorretas):
- Confusão entre estruturas/processos similares
- Inversão de causa e efeito
- Mecanismo correto mas órgão/sistema errado
- Diagnóstico diferencial plausível mas incorreto

${this.buildPriorityInstructions(context)}
${this.buildRAGContext(context)}

ESTRUTURA DE RESPOSTA (JSON):
{
  "question": "Enunciado (pode incluir caso clínico, descrição de processo ou dados experimentais)",
  "options": [
    "A) Primeira alternativa com terminologia técnica",
    "B) Segunda alternativa",
    "C) Terceira alternativa",
    "D) Quarta alternativa"
  ],
  "correctAnswer": "A",
  "explanation": "Explicação com fundamentação científica:\\n1. Processo/Mecanismo: ...\\n2. Estruturas envolvidas: ...\\n3. Relação funcional: ...\\n4. Por que as outras estão erradas: ...",
  "adaptations": ["biological_processes", "scientific_nomenclature", "systems_integration"]
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
      1: 'Dica sobre qual sistema/processo biológico está envolvido',
      2: 'Indique o mecanismo de ação ou sequência do processo',
      3: 'Detalhe quase todo o raciocínio, faltando apenas a conclusão',
    };
    
    return `Forneça uma dica BIOLÓGICA progressiva (nível ${hintLevel}/3) para esta questão.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer ? `TENTATIVA DO ALUNO: ${studentAnswer}` : ''}

TIPO DE DICA (Nível ${hintLevel}): ${hints[hintLevel as keyof typeof hints]}

FORMATO DA DICA:
${hintLevel === 1 ? '- Indique qual sistema biológico/órgão está envolvido\n- Dê uma pista sobre o processo\n- NÃO revele o mecanismo' : ''}
${hintLevel === 2 ? '- Descreva o início do processo/mecanismo\n- Indique estruturas-chave envolvidas\n- NÃO complete a explicação' : ''}
${hintLevel === 3 ? '- Explique QUASE todo o processo\n- Mostre a sequência de eventos\n- Deixe apenas a conclusão final para o aluno' : ''}

Use nomenclatura científica correta e seja didático.`;
  }
  
  buildExplanationPrompt(
    question: string,
    correctAnswer: string,
    studentAnswer?: string
  ): string {
    return `Explique de forma COMPLETA e CIENTÍFICA esta questão de biológicas/saúde.

QUESTÃO: ${question}
RESPOSTA CORRETA: ${correctAnswer}
${studentAnswer && studentAnswer !== correctAnswer ? `RESPOSTA DO ALUNO: ${studentAnswer}` : ''}

ESTRUTURA DA EXPLICAÇÃO:

1. FUNDAMENTAÇÃO BIOLÓGICA:
   - Estruturas/sistemas envolvidos
   - Nomenclatura científica (nomes latinos, classificação)
   - Localização anatômica relevante

2. PROCESSO/MECANISMO:
   - Sequência de eventos biológicos
   - Vias metabólicas ou mecanismos de ação
   - Relação estrutura-função
   - Integração entre sistemas

3. RESPOSTA CORRETA:
   - Por que esta é a resposta certa
   - Evidências científicas que sustentam
   - Correlação clínica (se aplicável)

4. ANÁLISE DAS ALTERNATIVAS INCORRETAS:
   - Por que cada distrator está errado
   - Confusões comuns entre estruturas/processos similares
   - Diagnósticos diferenciais (se aplicável)

${studentAnswer && studentAnswer !== correctAnswer ? `
5. ANÁLISE DO SEU ERRO:
   - Por que "${studentAnswer}" está incorreto
   - Qual confusão conceitual pode ter ocorrido
   - Estruturas/processos para revisar
   - Como diferenciar corretamente
` : ''}

Use nomenclatura técnica precisa e fundamentação científica sólida.`;
  }
}
