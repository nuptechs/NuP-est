import { Express } from 'express';
import authRoutes from './routes/auth.routes';
import validationRoutes from './routes/validation.routes';
import systemsRoutes from './routes/systems.routes';
import organizationsRoutes from './routes/organizations.routes';
import teamsRoutes from './routes/teams.routes';
import invitationsRoutes from './routes/invitations.routes';
import webhooksRoutes from './routes/webhooks.routes';

export function registerRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api', validationRoutes);
  app.use('/api/systems', systemsRoutes);
  app.use('/api/organizations', organizationsRoutes);
  app.use('/api/teams', teamsRoutes);
  app.use('/api/invitations', invitationsRoutes);
  app.use('/api/webhooks', webhooksRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'NuPIdentity',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
}
