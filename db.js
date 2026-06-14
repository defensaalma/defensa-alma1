// Capa de datos sobre PostgreSQL.
// - Producción: define DATABASE_URL (cadena de conexión de Supabase) → usa el cliente `pg`.
// - Desarrollo/local: sin DATABASE_URL → usa PGlite (Postgres en proceso, persistente en data/pgdata).
// Interfaz unificada y asíncrona: query(sql, params) → { rows }.
const path = require('path');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  rut TEXT NOT NULL,
  domicilio TEXT NOT NULL,
  correo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  area TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'nuevo',
  token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ,
  token_revoked INTEGER NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  paid_seen INTEGER NOT NULL DEFAULT 1,
  rol TEXT,
  tribunal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id),
  label TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'todo',
  ord INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id),
  buy_order TEXT NOT NULL,
  session_id TEXT NOT NULL,
  token_ws TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'iniciado',
  authorization_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id),
  label TEXT NOT NULL,
  filename TEXT NOT NULL,
  visible_cliente INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id),
  starts_at TEXT NOT NULL,
  label TEXT NOT NULL,
  room TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Migraciones idempotentes para bases ya existentes:
ALTER TABLE cases ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS token_revoked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS paid_seen INTEGER NOT NULL DEFAULT 1;
`;

let backend = null;
let readyResolve;
const ready = new Promise(r => { readyResolve = r; });

(async function init() {
  if (DATABASE_URL) {
    const { Pool } = require('pg');
    const ssl = /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false };
    const pool = new Pool({ connectionString: DATABASE_URL, ssl });
    backend = { query: (s, p) => pool.query(s, p), exec: (s) => pool.query(s) };
    console.log('[db] PostgreSQL (DATABASE_URL)');
  } else {
    const { PGlite } = require('@electric-sql/pglite');
    const dir = process.env.PG_DIR || path.join(__dirname, 'data', 'pgdata');
    require('fs').mkdirSync(dir, { recursive: true });
    const lite = new PGlite(dir);
    await lite.waitReady;
    backend = { query: (s, p) => lite.query(s, p || []), exec: (s) => lite.exec(s) };
    console.log('[db] PGlite local en', dir);
  }
  await backend.exec(SCHEMA);
  readyResolve();
})().catch(e => { console.error('[db] error de inicialización:', e); process.exit(1); });

async function query(sql, params = []) { await ready; return backend.query(sql, params); }
async function exec(sql) { await ready; return backend.exec(sql); }

const token = () => crypto.randomBytes(20).toString('hex');

module.exports = { query, exec, token, ready };
