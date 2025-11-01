import { Router } from 'express';
import type { IStorage } from './storage';
import { insertMindMapSchema } from '@shared/schema';
import { mindMapGenerator } from './services/mindmap/MindMapGenerator';

export function registerMindMapRoutes(router: Router, storage: IStorage) {
  // Get all mind maps for a user
  router.get('/mindmaps', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const subjectId = req.query.subjectId as string | undefined;
      const mindMaps = await storage.getMindMaps(userId, subjectId);
      res.json(mindMaps);
    } catch (error) {
      console.error('Error getting mind maps:', error);
      res.status(500).send('Failed to get mind maps');
    }
  });

  // Get a specific mind map
  router.get('/mindmaps/:id', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const mindMap = await storage.getMindMap(req.params.id);
      if (!mindMap) {
        return res.status(404).send('Mind map not found');
      }
      if (mindMap.userId !== userId) {
        return res.status(403).send('Forbidden');
      }
      res.json(mindMap);
    } catch (error) {
      console.error('Error getting mind map:', error);
      res.status(500).send('Failed to get mind map');
    }
  });

  // Create a new mind map
  router.post('/mindmaps', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const validated = insertMindMapSchema.parse({
        ...req.body,
        userId,
      });
      const mindMap = await storage.createMindMap(validated);
      res.json(mindMap);
    } catch (error) {
      console.error('Error creating mind map:', error);
      res.status(500).send('Failed to create mind map');
    }
  });

  // Update a mind map
  router.patch('/mindmaps/:id', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const validated = insertMindMapSchema.partial().parse(req.body);
      const mindMap = await storage.updateMindMap(req.params.id, userId, validated);
      res.json(mindMap);
    } catch (error) {
      console.error('Error updating mind map:', error);
      res.status(500).send('Failed to update mind map');
    }
  });

  // Delete a mind map
  router.delete('/mindmaps/:id', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      await storage.deleteMindMap(req.params.id, userId);
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting mind map:', error);
      res.status(500).send('Failed to delete mind map');
    }
  });

  // Generate mind map using AI
  router.post('/mindmaps/generate', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const { prompt, subjectId, useRAG = true } = req.body;
      
      const mermaidSyntax = await mindMapGenerator.generateFromPrompt(
        prompt,
        userId,
        subjectId,
        useRAG
      );

      res.json({ mermaid: mermaidSyntax });
    } catch (error) {
      console.error('Error generating mind map:', error);
      res.status(500).send('Failed to generate mind map');
    }
  });

  // Generate mind map from material
  router.post('/mindmaps/generate-from-material/:materialId', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const material = await storage.getMaterial(req.params.materialId);
      if (!material) {
        return res.status(404).send('Material not found');
      }
      if (material.userId !== userId) {
        return res.status(403).send('Forbidden');
      }

      const mermaidSyntax = await mindMapGenerator.generateFromMaterial(
        material,
        userId
      );

      res.json({ 
        mermaid: mermaidSyntax,
        title: `Mapa Mental: ${material.title}`
      });
    } catch (error) {
      console.error('Error generating mind map from material:', error);
      res.status(500).send('Failed to generate mind map from material');
    }
  });
}
