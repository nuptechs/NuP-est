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

    // Iniciar scraping em background (não bloquear resposta)
    console.log(`🚀 Iniciando scraping em background para: ${siteData.url}`);
    webScraperService.scrapeWebsite(
      siteData.url, 
      searchTypes, 
      result.id,
      {
        maxPages: 50,  // Aumentado para coletar mais conteúdo
        maxDepth: 3,   // Profundidade maior para mais paginações
        delay: 300     // Delay menor para ser mais rápido
      }
    ).then(() => {
      console.log(`✅ Scraping concluído com sucesso para: ${siteData.url}`);
    }).catch(error => {
      console.error(`❌ Erro no scraping de ${siteData.url}:`, error);
      // TODO: Notificar usuário sobre erro (WebSocket ou polling)
    });

    res.status(201).json({
      ...result,
      scrapingStarted: true,
      scrapingStatus: 'iniciado',
      message: "Site criado com sucesso. Scraping iniciado automaticamente - aguarde enquanto coletamos todo o conteúdo e envios para o sistema de busca."
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

export default router;