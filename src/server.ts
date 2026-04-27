import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import pool from './config/database';
import redis from './config/redis';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const startServer = async (): Promise<void> => {
  try {
    // Verify DB connection
    await pool.query('SELECT 1');
    console.log(' Database connection verified');

    // Connect Redis
    await redis.connect();

    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
      console.log(`API Docs: ${BASE_URL}/api-docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', (err as Error).message);
    process.exit(1);
  }
};

// shutdown
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received — shutting down gracefully`);
  await redis.quit();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

void startServer();
