import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

import festivalRoutes from './routes/festivalRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import userRoutes from './routes/userRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check (Always responds so deployment status & DB connectivity can be verified)
app.get(['/api/health', '/health'], async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  try {
    await connectDB();
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }

  res.json({
    status: 'ok',
    message: 'Jyoti Mandal Vargani API is live',
    database: dbStatus,
    dbError: dbError,
    hasMongoUri: !!process.env.MONGO_URI,
    timestamp: new Date(),
  });
});

// Ensure DB is connected for all API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in request middleware:', err.message);
    res.status(500).json({
      message: 'डेटाबेस जोडणी त्रुटी (Database connection error): ' + err.message,
      hasMongoUri: !!process.env.MONGO_URI,
      hint: !process.env.MONGO_URI ? 'MONGO_URI is missing in Vercel Environment Variables' : 'Check MongoDB Atlas Network Access and DB user credentials'
    });
  }
});

// Helper to mount routes with or without /api prefix
const mountRoutes = (prefix = '') => {
  app.use(`${prefix}/festivals`, festivalRoutes);
  app.use(`${prefix}/donors`, donorRoutes);
  app.use(`${prefix}/payments`, paymentRoutes);
  app.use(`${prefix}/expenses`, expenseRoutes);
  app.use(`${prefix}/dashboard`, dashboardRoutes);
  app.use(`${prefix}/reports`, reportsRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/receipts`, receiptRoutes);
};

// Support both /api/* and direct /* paths for maximum Vercel flexibility
mountRoutes('/api');
mountRoutes('');

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Standalone server mode (for local development)
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Backend Server] Running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;

