import { Router } from 'express';
import type { IStorage } from './storage';
import { insertMindMapSchema } from '@shared/schema';

export function registerMindMapRoutes(router: Router, storage: IStorage) {
  // Get all mind maps for a user
  router.get('/mindmaps', async (req, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const subjectId = req.query.subjectId as string | undefined;
      const mindMaps = await storage.getMindMaps(req.user.id, subjectId);
      res.json(mindMaps);
    } catch (error) {
      console.error('Error getting mind maps:', error);
      res.status(500).send('Failed to get mind maps');
    }
  });

  // Get a specific mind map
  router.get('/mindmaps/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const mindMap = await storage.getMindMap(req.params.id);
      if (!mindMap) {
        return res.status(404).send('Mind map not found');
      }
      if (mindMap.userId !== req.user.id) {
        return res.status(403).send('Forbidden');
      }
      res.json(mindMap);
    } catch (error) {
      console.error('Error getting mind map:', error);
      res.status(500).send('Failed to get mind map');
    }
  });

  // Create a new mind map
  router.post('/mindmaps', async (req, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const validated = insertMindMapSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const mindMap = await storage.createMindMap(validated);
      res.json(mindMap);
    } catch (error) {
      console.error('Error creating mind map:', error);
      res.status(500).send('Failed to create mind map');
    }
  });

  // Update a mind map
  router.patch('/mindmaps/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const validated = insertMindMapSchema.partial().parse(req.body);
      const mindMap = await storage.updateMindMap(req.params.id, req.user.id, validated);
      res.json(mindMap);
    } catch (error) {
      console.error('Error updating mind map:', error);
      res.status(500).send('Failed to update mind map');
    }
  });

  // Delete a mind map
  router.delete('/mindmaps/:id', async (req, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      await storage.deleteMindMap(req.params.id, req.user.id);
      res.sendStatus(204);
    } catch (error) {
      console.error('Error deleting mind map:', error);
      res.status(500).send('Failed to delete mind map');
    }
  });

  // Generate mind map using AI
  router.post('/mindmaps/generate', async (req, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const { prompt, subjectId, useRAG, maxDepth, maxNodes } = req.body;
      
      // TODO: Implement AI generation with RAG
      // This is a placeholder that returns mock Mermaid syntax
      const mermaidSyntax = `mindmap
  root((${prompt}))
    Tópico 1
      Subtópico 1.1
      Subtópico 1.2
    Tópico 2
      Subtópico 2.1
    Tópico 3`;

      res.json({ mermaid: mermaidSyntax });
    } catch (error) {
      console.error('Error generating mind map:', error);
      res.status(500).send('Failed to generate mind map');
    }
  });

  // Generate mind map from material
  router.post('/mindmaps/generate-from-material/:materialId', async (req, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const material = await storage.getMaterial(req.params.materialId);
      if (!material) {
        return res.status(404).send('Material not found');
      }
      if (material.userId !== req.user.id) {
        return res.status(403).send('Forbidden');
      }

      // TODO: Implement material-to-mindmap generation with RAG
      const mermaidSyntax = `mindmap
  root((${material.title}))
    Conceito 1
    Conceito 2
    Conceito 3`;

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
