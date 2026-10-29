require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./routes');
const { pool } = require('./db');

const app = express();
const port = Number(process.env.PORT || 3001);
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
  console.error('[Configuração] JWT_SECRET precisa ter pelo menos 32 caracteres. Configure backend/.env.');
  process.exit(1);
}

const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:8081,http://localhost:19006,http://localhost:19000')
  .split(',').map((value) => value.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem bloqueada pela política CORS.'));
  },
  credentials: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads'), { maxAge: '1h', fallthrough: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(routes);

app.use((req, res) => res.status(404).json({ error: { message: 'Rota não encontrada.' } }));
app.use((err, req, res, _next) => {
  console.error(`[API] ${req.method} ${req.originalUrl}:`, err.message);
  if (err.code === '23505') return res.status(409).json({ error: { message: 'Este registro já existe.' } });
  if (err.code === '23503') return res.status(400).json({ error: { message: 'O registro referenciado não existe ou está em uso.' } });
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') return res.status(503).json({ error: { message: 'Não foi possível conectar ao PostgreSQL. Confira a configuração do banco.' } });
  if (err.message === 'Origem bloqueada pela política CORS.') return res.status(403).json({ error: { message: err.message } });
  res.status(500).json({ error: { message: 'Erro interno do servidor.' } });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Memória Viva API rodando em http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
