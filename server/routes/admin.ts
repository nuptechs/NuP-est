import { Router } from "express";
import { db } from "../db";
import { searchSites, siteSearchTypes, insertSearchSiteSchema, insertSiteSearchTypeSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { webScraperService } from "../services/web-scraper";

const router = Router();

// ===== ROUTES DE SITES DE BUSCA =====

// Listar todos os sites de busca
router.get("/search-sites", isAuthenticated, async (req, res) => {
  try {
    const sites = await db.select().from(searchSites).orderBy(searchSites.createdAt);
    res.json(sites);
  } catch (error) {
    console.error("Erro ao buscar sites:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar tipos de busca por site
router.get("/site-search-types", isAuthenticated, async (req, res) => {
  try {
    const types = await db.select().from(siteSearchTypes);
    
    // Organizar por site ID
    const typesBySite = types.reduce((acc, type) => {
      if (!acc[type.siteId]) {
        acc[type.siteId] = [];
      }
      acc[type.siteId].push(type);
      return acc;
    }, {} as Record<string, typeof types>);
    
    res.json(typesBySite);
  } catch (error) {
    console.error("Erro ao buscar tipos de busca:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Validar e testar URL antes de salvar
router.post("/validate-url", isAuthenticated, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        valid: false, 
        error: "URL é obrigatória",
        details: "Por favor, forneça uma URL válida"
      });
    }

    // Validar formato da URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Protocolo inválido');
      }
    } catch (error) {
      return res.status(400).json({ 
        valid: false, 
        error: "Formato de URL inválido",
        details: "A URL deve estar no formato: https://exemplo.com"
      });
    }

    console.log(`🔍 Validando URL: ${url}`);

    // Testar conectividade e scraping
    const validationResult = await webScraperService.validateUrlForScraping(url);
    
    res.json(validationResult);
  } catch (error: any) {
    console.error('❌ Erro na validação da URL:', error);
    res.status(500).json({ 
      valid: false,
      error: "Erro interno do servidor",
      details: "Não foi possível validar a URL. Tente novamente."
    });
  }
});

// Criar novo site de busca
router.post("/search-sites", isAuthenticated, async (req, res) => {
  try {
    const { site, searchTypes } = req.body;
    
    // Validar dados do site
    const siteData = insertSearchSiteSchema.parse(site);
    
    // Validar tipos de busca
    if (!Array.isArray(searchTypes) || searchTypes.length === 0) {
      return res.status(400).json({ error: "Tipos de busca são obrigatórios" });
    }

    // Validar URL novamente antes de salvar
    console.log(`📝 Salvando site configurado: ${siteData.url}`);
    
    try {
      const urlValidation = new URL(siteData.url);
      if (!['http:', 'https:'].includes(urlValidation.protocol)) {
        return res.status(400).json({ 
          error: "URL inválida",
          details: "A URL deve usar protocolo HTTP ou HTTPS"
        });
      }
    } catch (error) {
      return res.status(400).json({ 
        error: "Formato de URL inválido",
        details: "Verifique se a URL está no formato correto"
      });
    }

    // Iniciar transação
    const result = await db.transaction(async (tx) => {
      // Criar o site
      const [newSite] = await tx.insert(searchSites).values(siteData).returning();
      
      // Criar os tipos de busca associados
      const typeValues = searchTypes.map(type => ({
        siteId: newSite.id,
        searchType: type as any, // Cast para o enum type
        isEnabled: true,
      }));
      
      await tx.insert(siteSearchTypes).values(typeValues);
      
      return newSite;
    });

    // Iniciar processamento inteligente em background
    console.log(`🚀 Iniciando processamento inteligente para: ${siteData.url}`);
    webScraperService.processWebsiteIntelligently(
      siteData.url, 
      searchTypes, 
      result.id
    ).then((processResult) => {
      console.log(`✅ Processamento concluído para: ${siteData.url}`);
      console.log(`📊 Resultados: ${processResult.documentsProcessed} documentos, método: ${processResult.method}`);
    }).catch(error => {
      console.error(`❌ Erro no processamento de ${siteData.url}:`, error);
      // TODO: Notificar usuário sobre erro (WebSocket ou polling)
    });

    res.status(201).json({
      ...result,
      processingStarted: true,
      processingStatus: 'iniciado',
      message: `Site '${siteData.name}' configurado com sucesso! O sistema está processando automaticamente o conteúdo e enviando para a base de conhecimento. Você poderá buscar informações deste site em alguns minutos.`
    });
  } catch (error: any) {
    console.error("Erro ao criar site:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Atualizar site de busca
router.put("/search-sites/:id", isAuthenticated, async (req, res) => {
  try {
    const siteId = req.params.id;
    const { site, searchTypes } = req.body;
    
    // Validar dados do site
    const siteData = insertSearchSiteSchema.parse(site);
    
    // Validar tipos de busca
    if (!Array.isArray(searchTypes)) {
      return res.status(400).json({ error: "Tipos de busca são obrigatórios" });
    }

    // Iniciar transação
    const result = await db.transaction(async (tx) => {
      // Atualizar o site
      const [updatedSite] = await tx
        .update(searchSites)
        .set({ ...siteData, updatedAt: new Date() })
        .where(eq(searchSites.id, siteId))
        .returning();
      
      if (!updatedSite) {
        throw new Error("Site não encontrado");
      }
      
      // Remover tipos existentes
      await tx.delete(siteSearchTypes).where(eq(siteSearchTypes.siteId, siteId));
      
      // Recriar os tipos de busca
      if (searchTypes.length > 0) {
        const typeValues = searchTypes.map(type => ({
          siteId: siteId,
          searchType: type as any,
          isEnabled: true,
        }));
        
        await tx.insert(siteSearchTypes).values(typeValues);
      }
      
      return updatedSite;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Erro ao atualizar site:", error);
    if (error.message === "Site não encontrado") {
      return res.status(404).json({ error: "Site não encontrado" });
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Deletar site de busca
router.delete("/search-sites/:id", isAuthenticated, async (req, res) => {
  try {
    const siteId = req.params.id;
    
    const result = await db.transaction(async (tx) => {
      // Primeiro deletar os tipos associados (CASCADE deve cuidar disso, mas é mais explícito)
      await tx.delete(siteSearchTypes).where(eq(siteSearchTypes.siteId, siteId));
      
      // Depois deletar o site
      const [deletedSite] = await tx
        .delete(searchSites)
        .where(eq(searchSites.id, siteId))
        .returning();
      
      if (!deletedSite) {
        throw new Error("Site não encontrado");
      }
      
      return deletedSite;
    });

    res.json({ message: "Site removido com sucesso", site: result });
  } catch (error: any) {
    console.error("Erro ao deletar site:", error);
    if (error.message === "Site não encontrado") {
      return res.status(404).json({ error: "Site não encontrado" });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Ativar/desativar site
router.patch("/search-sites/:id/toggle", isAuthenticated, async (req, res) => {
  try {
    const siteId = req.params.id;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: "isActive deve ser um boolean" });
    }
    
    const [updatedSite] = await db
      .update(searchSites)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(searchSites.id, siteId))
      .returning();
    
    if (!updatedSite) {
      return res.status(404).json({ error: "Site não encontrado" });
    }
    
    res.json(updatedSite);
  } catch (error) {
    console.error("Erro ao atualizar status do site:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ===== ROUTES DE TIPOS DE BUSCA =====

// Atualizar tipos de busca de um site específico
router.put("/search-sites/:id/types", isAuthenticated, async (req, res) => {
  try {
    const siteId = req.params.id;
    const { searchTypes } = req.body;
    
    if (!Array.isArray(searchTypes)) {
      return res.status(400).json({ error: "searchTypes deve ser um array" });
    }

    const result = await db.transaction(async (tx) => {
      // Verificar se o site existe
      const [site] = await tx.select().from(searchSites).where(eq(searchSites.id, siteId));
      if (!site) {
        throw new Error("Site não encontrado");
      }
      
      // Remover tipos existentes
      await tx.delete(siteSearchTypes).where(eq(siteSearchTypes.siteId, siteId));
      
      // Adicionar novos tipos
      if (searchTypes.length > 0) {
        const typeValues = searchTypes.map(type => ({
          siteId: siteId,
          searchType: type as any,
          isEnabled: true,
        }));
        
        await tx.insert(siteSearchTypes).values(typeValues);
      }
      
      // Retornar os tipos atualizados
      return await tx.select().from(siteSearchTypes).where(eq(siteSearchTypes.siteId, siteId));
    });

    res.json(result);
  } catch (error: any) {
    console.error("Erro ao atualizar tipos de busca:", error);
    if (error.message === "Site não encontrado") {
      return res.status(404).json({ error: "Site não encontrado" });
    }
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ===== ENDPOINT PARA TESTAR BROWSER SCRAPING =====

// Testar browser scraping diretamente no Cebraspe
router.post("/test-browser-scraping", isAuthenticated, async (req, res) => {
  try {
    console.log('🚀 Iniciando teste de browser scraping...');
    
    // Importar browserScraperService dinamicamente
    const { browserScraperService } = await import('../services/browser-scraper');
    
    // URLs do Cebraspe para testar
    const testUrls = [
      'https://www.cebraspe.org.br/concursos/',
      'https://www.cebraspe.org.br/concursos/encerrado'
    ];
    
    console.log(`🌐 Testando browser scraping em ${testUrls.length} URLs...`);
    
    // Executar browser scraping
    const result = await browserScraperService.scrapeMultipleCebraspePages(testUrls);
    
    res.json({
      success: result.success,
      message: `Browser scraping concluído: ${result.totalConcursos} concursos extraídos`,
      details: {
        totalConcursos: result.totalConcursos,
        totalUrls: testUrls.length,
        errors: result.errors,
        firstConcursos: result.results.slice(0, 3).map(c => ({ 
          titulo: c.titulo, 
          fonte: c.fonte,
          metodo: c.metodo 
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de browser scraping:', error);
    res.status(500).json({ 
      success: false,
      error: "Erro ao executar browser scraping",
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;