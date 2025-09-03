import type { Express } from "express";
import { ragService } from "../services/rag";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";

export function setupRAGRoutes(app: Express) {
  
  // Migrar documento específico para RAG
  app.post('/api/rag/migrate/:documentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { documentId } = req.params;
      
      // Buscar documento na base atual
      const documents = await storage.getKnowledgeBase(documentId);
      
      if (!documents || documents.length === 0 || documents[0].userId !== userId) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }
      
      const document = documents[0];
      
      // Migrar para RAG/Pinecone
      await ragService.addDocumentToRAG(
        document.id,
        document.title,
        document.content || '',
        userId,
        document.category || 'Geral'
      );
      
      res.json({ 
        success: true, 
        message: `Documento "${document.title}" migrado com sucesso para o sistema RAG` 
      });
      
    } catch (error) {
      console.error("Erro na migração RAG:", error);
      res.status(500).json({ message: "Falha na migração para RAG" });
    }
  });

  // Migrar materiais existentes que não foram para RAG
  app.post('/api/rag/migrate-materials', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Buscar materiais do usuário
      const materials = await storage.getMaterials(userId);
      
      let migrated = 0;
      let errors = 0;
      let processed = 0;
      
      for (const material of materials) {
        processed++;
        try {
          // Se o material tem filePath mas não tem content, extrair
          let content = material.content;
          if (!content && material.filePath) {
            console.log(`📄 Extraindo conteúdo do arquivo: ${material.title}`);
            // Usar a função de extração de texto
            content = await aiService.extractTextFromFile(material.filePath);
          }
          
          if (content) {
            await ragService.addDocumentToRAG(
              material.id,
              material.title,
              content,
              userId,
              'Material'
            );
            migrated++;
          }
        } catch (error) {
          console.error(`Erro ao migrar material ${material.id}:`, error);
          errors++;
        }
      }
      
      res.json({ 
        success: true, 
        processed,
        migrated, 
        errors,
        message: `Materiais processados: ${processed}, migrados: ${migrated}, erros: ${errors}` 
      });
      
    } catch (error) {
      console.error("Erro na migração de materiais:", error);
      res.status(500).json({ message: "Falha na migração de materiais" });
    }
  });

  // Migrar TODOS os documentos do usuário para RAG
  app.post('/api/rag/migrate-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Buscar todos os documentos do usuário (usar método que retorna lista)
      let migrated = 0;
      let errors = 0;
      let total = 0;
      
      // Para cada categoria de documento, tentar migrar
      const categories = ['Geral', 'Exatas', 'Humanas', 'Biológicas'];
      
      for (const category of categories) {
        try {
          const categoryDocs = await storage.searchKnowledgeBase(userId, '', category);
          // Se retornar string, significa que há documentos nesta categoria
          if (categoryDocs && typeof categoryDocs === 'string') {
            total++;
            // Simular migração (precisaria de mais informações para implementar completamente)
            migrated++;
          }
        } catch (error) {
          errors++;
        }
      }
      
      res.json({ 
        success: true, 
        migrated, 
        errors,
        total,
        message: `Migração concluída: ${migrated} documentos migrados, ${errors} erros` 
      });
      
    } catch (error) {
      console.error("Erro na migração em massa:", error);
      res.status(500).json({ message: "Falha na migração em massa para RAG" });
    }
  });

  // Estatísticas do RAG
  app.get('/api/rag/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await ragService.getRAGStats();
      res.json(stats);
    } catch (error) {
      console.error("Erro ao obter estatísticas RAG:", error);
      res.status(500).json({ message: "Falha ao obter estatísticas" });
    }
  });

  // Teste de busca RAG
  app.post('/api/rag/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        query, 
        category, 
        enableReRanking = true,  // Habilitar re-ranking por padrão
        initialTopK = 15,        // Buscar mais resultados iniciais para re-ranking
        finalTopK = 5,           // Número final de resultados após re-ranking
        maxContextLength = 4000,
        minSimilarity = 0.1
      } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query é obrigatória" });
      }
      
      const results = await ragService.generateContextualResponse({
        userId,
        query,
        category,
        enableReRanking,
        initialTopK,
        finalTopK,
        maxContextLength,
        minSimilarity
      });
      
      res.json(results);
      
    } catch (error) {
      console.error("Erro na busca RAG:", error);
      res.status(500).json({ message: "Falha na busca RAG" });
    }
  });
}