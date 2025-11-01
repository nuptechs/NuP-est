import { Router } from 'express';
import type { IStorage } from './storage';
import { insertMindMapSchema } from '@shared/schema';
import { mindMapGenerator } from './services/mindmap/MindMapGenerator';
import { JobQueue } from './services/mindmap/JobQueue';

// Job Queue instance for async mind map generation
interface MindMapGenerationInput {
  type: 'prompt' | 'material';
  prompt?: string;
  materialId?: string;
  userId: string;
  subjectId?: string;
  useRAG?: boolean;
}

const mindMapJobQueue = new JobQueue<MindMapGenerationInput, string>(
  async (input, updateProgress) => {
    if (input.type === 'prompt' && input.prompt) {
      return await mindMapGenerator.generateFromPrompt(
        input.prompt,
        input.userId,
        input.subjectId,
        input.useRAG ?? true,
        updateProgress
      );
    } else if (input.type === 'material' && input.materialId) {
      const material = await storage.getMaterial(input.materialId);
      if (!material) {
        throw new Error('Material not found');
      }
      return await mindMapGenerator.generateFromMaterial(
        material,
        input.userId,
        updateProgress
      );
    }
    throw new Error('Invalid job input');
  }
);

export function registerMindMapRoutes(router: Router, storage: IStorage) {
  // Get all mind maps for a user
  router.get('/api/mindmaps', async (req: any, res) => {
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
  router.get('/api/mindmaps/:id', async (req: any, res) => {
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
  router.post('/api/mindmaps', async (req: any, res) => {
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
  router.patch('/api/mindmaps/:id', async (req: any, res) => {
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
  router.delete('/api/mindmaps/:id', async (req: any, res) => {
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

  // Create async generation job
  router.post('/api/mindmaps/jobs', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const { type, prompt, materialId, subjectId, useRAG = true } = req.body;

      if (!type || (type !== 'prompt' && type !== 'material')) {
        return res.status(400).json({ error: 'Invalid job type' });
      }

      if (type === 'prompt' && (!prompt || typeof prompt !== 'string')) {
        return res.status(400).json({ error: 'Prompt is required for prompt-type jobs' });
      }

      if (type === 'material' && !materialId) {
        return res.status(400).json({ error: 'Material ID is required for material-type jobs' });
      }

      const jobId = await mindMapJobQueue.enqueue({
        type,
        prompt,
        materialId,
        userId,
        subjectId,
        useRAG,
      }, {
        type,
        prompt: type === 'prompt' ? prompt : undefined,
        materialId: type === 'material' ? materialId : undefined,
      });

      res.json({ jobId, status: 'queued' });
    } catch (error) {
      console.error('[MindMap Jobs] Error creating job:', error);
      res.status(500).json({ error: 'Failed to create generation job' });
    }
  });

  // Get job status
  router.get('/api/mindmaps/jobs/:jobId', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const job = mindMapJobQueue.getJob(req.params.jobId);
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Return job status
      res.json({
        id: job.id,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      });
    } catch (error) {
      console.error('[MindMap Jobs] Error getting job status:', error);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  });

  // Generate mind map using AI (deprecated - use jobs instead, kept for backward compatibility)
  router.post('/api/mindmaps/generate', async (req: any, res) => {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const userId = req.user.claims.sub;
      const { prompt, subjectId, useRAG = true } = req.body;
      
      console.log('[MindMap Generate] Received request:', { 
        userId, 
        prompt, 
        subjectId, 
        useRAG,
        bodyKeys: Object.keys(req.body)
      });

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        console.error('[MindMap Generate] Invalid prompt:', prompt);
        return res.status(400).json({ error: 'Prompt is required' });
      }

      console.log('[MindMap Generate] Calling mindMapGenerator.generateFromPrompt...');
      const mermaidSyntax = await mindMapGenerator.generateFromPrompt(
        prompt,
        userId,
        subjectId,
        useRAG
      );
      
      console.log('[MindMap Generate] Generated mermaid syntax:', mermaidSyntax?.substring(0, 100));

      res.json({ mermaid: mermaidSyntax });
    } catch (error) {
      console.error('[MindMap Generate] Error generating mind map:', error);
      res.status(500).json({ error: 'Failed to generate mind map', message: error instanceof Error ? error.message : String(error) });
    }
  });

  // Generate mind map from material
  router.post('/api/mindmaps/generate-from-material/:materialId', async (req: any, res) => {
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
