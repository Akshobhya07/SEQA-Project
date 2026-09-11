import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes';
import { connectDb } from './config/db';
import { errorHandler } from './middleware/errorHandler';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'RollbackAudit Backend API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', apiRouter);

// In production, serve static frontend assets if available
const possibleDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];
const frontendDist = possibleDistPaths.find(p => fs.existsSync(p));

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log(`[Server] Serving production frontend build from ${frontendDist}`);
}

// Centralized error handler
app.use(errorHandler);

async function startServer() {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`[Server] Software Deployment Rollback Audit Manager API running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
