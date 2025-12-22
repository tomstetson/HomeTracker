import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import routes
import itemRoutes from './routes/item.routes';
import warrantyRoutes from './routes/warranty.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import vendorRoutes from './routes/vendor.routes';
import projectRoutes from './routes/project.routes';
import documentRoutes from './routes/document.routes';
import excelRoutes from './routes/excel.routes';
import fileRoutes from './routes/file.routes';
import propertyRoutes from './routes/property.routes';
import syncRoutes from './routes/sync.routes';
import authRoutes from './routes/auth.routes';
import imagesRoutes from './routes/images.routes';
import aiJobsRoutes from './routes/ai-jobs.routes';

// Import Excel service for graceful shutdown
import { excelService } from './services/excel.service';
import { maintenanceChecker } from './services/maintenance-checker.service';
import { databaseService } from './services/database.service';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
// CORS - allow all origins for homelab LAN access
app.use(cors({ 
  origin: true, // Allow all origins
  credentials: true 
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/items', itemRoutes);
app.use('/api/warranties', warrantyRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/ai-jobs', aiJobsRoutes);

// Settings routes
app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = excelService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

app.put('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = excelService.updateSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Saving data before shutdown...`);
  try {
    await excelService.forceSave();
    databaseService.close();
    console.log('✅ Data saved successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error saving data:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Home Tracker API running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Excel download: http://localhost:${PORT}/api/excel/download`);
  console.log(`🖼️  Image upload: http://localhost:${PORT}/api/images/upload`);
  console.log(`🤖 AI Jobs: http://localhost:${PORT}/api/ai-jobs`);
  
  // Initialize background jobs
  maintenanceChecker.init();
});

// Handle server errors
server.on('error', (error: Error) => {
  console.error('Server error:', error);
});

export default app;
