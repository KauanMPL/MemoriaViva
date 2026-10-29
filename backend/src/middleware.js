const jwt = require('jsonwebtoken');
const { query } = require('./db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: { message: 'Faça login para continuar.' } });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id_usuario, nome, email, foto_perfil, data_criacao FROM usuario WHERE id_usuario = $1',
      [payload.sub],
    );
    if (!result.rowCount) return res.status(401).json({ error: { message: 'Sessão inválida. Entre novamente.' } });
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: { message: 'Sua sessão expirou. Entre novamente.' } });
    }
    next(err);
  }
}

async function requireFamilyMember(req, res, next) {
  const familyId = Number(req.params.familyId || req.params.id || req.body.familyId);
  if (!Number.isInteger(familyId) || familyId <= 0) {
    return res.status(400).json({ error: { message: 'Identificador de família inválido.' } });
  }
  try {
    const result = await query(
      `SELECT pg.permissao, g.id_admin
       FROM participante_grupo pg JOIN grupo g ON g.id_grupo = pg.id_grupo
       WHERE pg.id_grupo = $1 AND pg.id_usuario = $2`,
      [familyId, req.user.id_usuario],
    );
    if (!result.rowCount) return res.status(403).json({ error: { message: 'Você não participa desta família.' } });
    req.familyId = familyId;
    req.familyPermission = result.rows[0].permissao;
    req.familyAdminId = result.rows[0].id_admin;
    next();
  } catch (err) { next(err); }
}

module.exports = { authenticate, requireFamilyMember };
