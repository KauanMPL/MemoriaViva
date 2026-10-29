const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[Memória Viva] DATABASE_URL não configurada. Crie backend/.env antes de iniciar.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('[PostgreSQL] erro inesperado no pool:', err.message));

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
