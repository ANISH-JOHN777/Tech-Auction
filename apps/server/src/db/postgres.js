import pg from 'pg';
import { newDb } from 'pg-mem';
import { config } from '../config/env.js';

const { Pool } = pg;

let pool = null;
let isMemFallback = false;

export function getPoolConfig() {
  const connectionString = (process.env.NODE_ENV === 'test' && process.env.DATABASE_URL_TEST)
    ? process.env.DATABASE_URL_TEST
    : (process.env.DATABASE_URL || config.databaseUrl || 'postgresql://postgres:postgres@localhost:5432/tech_auction');

  return {
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 5,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
    ssl: connectionString.includes('render.com') || connectionString.includes('supabase.com') || connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
  };
}

export function createMemPool() {
  console.log('[DB POOL] Initializing fallback in-memory PostgreSQL engine...');
  const memDb = newDb({
    noAstCoverageCheck: true,
  });

  memDb.public.registerFunction({
    name: 'now',
    returns: memDb.public.getType('timestamp with time zone'),
    implementation: () => new Date(),
  });
  memDb.public.registerFunction({
    name: 'current_timestamp',
    returns: memDb.public.getType('timestamp with time zone'),
    implementation: () => new Date(),
  });

  const adapter = memDb.adapters.createPg();
  isMemFallback = true;
  return new adapter.Pool();
}

export function getPool() {
  if (!pool) {
    const conf = getPoolConfig();
    if (!process.env.DATABASE_URL && (!config.databaseUrl || config.databaseUrl.includes('localhost'))) {
      try {
        pool = new Pool(conf);
        pool.on('error', () => {});
      } catch (e) {
        pool = createMemPool();
      }
    } else {
      pool = new Pool(conf);
      pool.on('error', (err) => {
        console.error('[DB POOL ERROR] Idle client error:', err.message);
      });
    }
  }
  return pool;
}

export function formatPgQuery(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

export async function query(text, params = []) {
  let p = getPool();
  const formattedSql = formatPgQuery(text);
  try {
    const res = await p.query(formattedSql, params);
    return res;
  } catch (err) {
    if (!isMemFallback && (err.code === '28P01' || err.code === 'ECONNREFUSED')) {
      console.warn('[DB POOL] Local PostgreSQL unavailable or auth failed. Falling back to in-memory PostgreSQL pool...');
      pool = createMemPool();
      p = pool;
      return await p.query(formattedSql, params);
    }
    throw err;
  }
}

export async function getClient() {
  let p = getPool();
  let client;
  try {
    client = await p.connect();
  } catch (err) {
    if (!isMemFallback && (err.code === '28P01' || err.code === 'ECONNREFUSED')) {
      console.warn('[DB POOL] Local PostgreSQL unavailable. Switching to in-memory PostgreSQL pool...');
      pool = createMemPool();
      p = pool;
      client = await p.connect();
    } else {
      throw err;
    }
  }

  const originalQuery = client.query.bind(client);
  client.query = (text, params) => {
    if (typeof text === 'string') {
      return originalQuery(formatPgQuery(text), params);
    }
    return originalQuery(text, params);
  };
  return client;
}

export async function checkHealth() {
  try {
    const res = await query('SELECT 1 as healthy');
    return res.rows.length > 0 && (res.rows[0].healthy === 1 || res.rows[0].healthy === '1');
  } catch (err) {
    console.error('[DB HEALTH CHECK FAILED]', err.message);
    return false;
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    isMemFallback = false;
  }
}
