import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
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
import storageRoutes from './routes/storage.routes';
import notificationsRoutes from './routes/notifications.routes';
import suggestionsRoutes from './routes/suggestions.routes';
import dashboardRoutes from './routes/dashboard.routes';

// Import Excel service for graceful shutdown
import { excelService } from './services/excel.service';
import { maintenanceChecker } from './services/maintenance-checker.service';
import { databaseService } from './services/database.service';
import { backupSchedulerService } from './services/backup-scheduler.service';
import { ensureDefaultAdmin } from './services/auth.service';
import { notificationSchedulerService } from './services/notification-scheduler.service';

// Import rate limiting middleware
import { apiLimiter, authLimiter, aiLimiter, uploadLimiter } from './middleware/rateLimit.middleware';

// Import error handling middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

const app: Express = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for LAN access

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));

// CORS Configuration - Secure with homelab flexibility
const getAllowedOrigins = (): cors.CorsOptions['origin'] => {
  const origins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
  ];
  
  // Add configured origins from env (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }
  
  // For homelab: allow same-network requests (default: true for homelab use)
  const allowLan = process.env.ALLOW_LAN !== 'false';
  
  if (allowLan) {
    return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (same-origin, mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      // Allow configured origins
      if (origins.includes(origin)) return callback(null, true);
      
      // Allow LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const lanPattern = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
      if (lanPattern.test(origin)) return callback(null, true);
      
      // Allow Tailscale IPs (100.x.x.x)
      const tailscalePattern = /^https?:\/\/100\.\d+\.\d+\.\d+(:\d+)?$/;
      if (tailscalePattern.test(origin)) return callback(null, true);
      
      callback(new Error('Not allowed by CORS'));
    };
  }
  
  return origins;
};

app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Rate limiting - apply different limits to different route groups
app.use('/api/', apiLimiter); // General API limit
app.use('/api/auth', authLimiter); // Stricter auth limit
app.use('/api/ai-jobs', aiLimiter); // AI operations limit
app.use('/api/images', uploadLimiter); // Upload limit
app.use('/api/files', uploadLimiter); // Upload limit

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
app.use('/api/storage', storageRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/dashboard', dashboardRoutes);

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

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

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
const server = app.listen(Number(PORT), HOST, async () => {
  console.log(`🚀 Home Tracker API running on http://${HOST}:${PORT}`);
  console.log(`🌐 LAN Access: http://<your-ip>:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Excel download: http://localhost:${PORT}/api/excel/download`);
  console.log(`🖼️  Image upload: http://localhost:${PORT}/api/images/upload`);
  console.log(`🤖 AI Jobs: http://localhost:${PORT}/api/ai-jobs`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  
  // Ensure default admin user exists
  await ensureDefaultAdmin();
  
  // Initialize background jobs
  maintenanceChecker.init();
  backupSchedulerService.initialize();
  notificationSchedulerService.initialize();
});

// Handle server errors
server.on('error', (error: Error) => {
  console.error('Server error:', error);
});

export default app;
