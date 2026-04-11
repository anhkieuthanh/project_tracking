import cors from 'cors';
import express from 'express';
import path from 'path';
import { config } from './config.js';
import taskRoutes from './routes/tasks.js';
import reportRoutes from './routes/reports.js';
import employeeRoutes from './routes/employees.js';
import aiInitiativeRoutes from './routes/aiInitiatives.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.frontendOrigin
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.use('/reports/files', express.static(path.resolve(process.cwd(), 'uploads/reports')));
  app.use('/tasks', taskRoutes);
  app.use('/reports', reportRoutes);
  app.use('/employees', employeeRoutes);
  app.use('/ai-initiatives', aiInitiativeRoutes);

  app.use((err, _req, res, _next) => {
    // Keep errors concise for clients while logging full context on server
    console.error(err);
    res.status(500).json({ error: 'Đã xảy ra lỗi máy chủ.' });
  });

  return app;
}
