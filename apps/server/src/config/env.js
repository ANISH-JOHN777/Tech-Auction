import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || process.env.DATABASE_PATH || 'postgresql://postgres:postgres@localhost:5432/tech_auction',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-key-123',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  aiDurationSeconds: Number(process.env.AI_ASSIST_DURATION_SECONDS) || 900,
  aiMaxRequests: Number(process.env.AI_MAX_REQUESTS) || 30,
};

export function validateEnv() {
  if (process.env.NODE_ENV === 'production') {
    const missing = [];
    if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-this-secret') missing.push('SESSION_SECRET');
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin123') missing.push('ADMIN_PASSWORD');

    if (missing.length > 0) {
      console.warn(`[CONFIG WARNING] Production environment detected with insecure/missing settings: ${missing.join(', ')}.`);
    }
  }
  console.log('[CONFIG] Environment validated');
}
