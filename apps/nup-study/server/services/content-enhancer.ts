import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Enhances user-provided text content using AI
 * Analyzes, polishes, and improves the content according to commands included in the text
 * 
 * @param textContent - Raw text provided by the user
 * @param userId - User ID for context (future: fetch user profile for personalization)
 * @returns Enhanced, structured, and polished content ready for PPT generation
 */
export async function enhanceContentWithAI(
  textContent: string,
  userId: string
): Promise<string> {
  console.log('[ContentEnhancer] Iniciando aprimoramento de conteúdo...');
  console.log('[ContentEnhancer] Tamanho do texto original:', textContent.length, 'caracteres');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em criar conteúdo didático de alta qualidade.

Sua tarefa é analisar o texto fornecido pelo usuário e transformá-lo em conteúdo didático estruturado, pronto para ser convertido em uma apresentação PowerPoint.

REGRAS:
1. ANALISE O TEXTO: Identifique o tema principal, tópicos-chave e quaisquer comandos/instruções do usuário
2. ESTRUTURE O CONTEÚDO: Organize em seções lógicas com títulos claros
3. MELHORE A CLAREZA: Reescreva frases confusas, adicione contexto onde necessário
4. ADICIONE EXEMPLOS: Quando apropriado, inclua exemplos práticos para ilustrar conceitos
5. MANTENHA O FORMATO MARKDOWN: Use # para títulos principais, ## para subtítulos, - para listas
6. SEJA CONCISO MAS COMPLETO: Cada slide deve ter informação suficiente mas não sobrecarregada
7. PRESERVE A INTENÇÃO: Se o usuário incluiu comandos específicos (ex: "foque em X", "adicione exemplos de Y"), siga-os
8. ADICIONE VALOR: Não apenas copie o texto - melhore, estruture e enriqueça

FORMATO DE SAÍDA:
- Use # para título principal
- Use ## para cada seção/slide
- Use listas (-) para pontos importantes
- Use **negrito** para termos-chave
- Adicione parágrafos explicativos quando necessário

EXEMPLO DE BOA SAÍDA:
# Título Principal

## Introdução
- Ponto importante 1
- Ponto importante 2

Parágrafo explicativo com contexto adicional.

## Conceitos-Chave
- **Conceito 1**: Explicação clara e concisa
- **Conceito 2**: Explicação com exemplo prático

## Aplicação Prática
Descrição de como aplicar os conceitos...`
        },
        {
          role: 'user',
          content: `Analise e transforme o seguinte conteúdo em material didático estruturado:

${textContent}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const enhancedContent = response.choices[0]?.message?.content;

    if (!enhancedContent) {
      throw new Error('AI returned empty content');
    }

    console.log('[ContentEnhancer] ✅ Conteúdo aprimorado com sucesso');
    console.log('[ContentEnhancer] Tamanho do texto aprimorado:', enhancedContent.length, 'caracteres');
    console.log('[ContentEnhancer] Preview:', enhancedContent.substring(0, 200) + '...');

    return enhancedContent;
  } catch (error) {
    console.error('[ContentEnhancer] Error enhancing content:', error);
    
    // Fallback: return original content if AI fails
    console.warn('[ContentEnhancer] Falling back to original content');
    return textContent;
  }
}
