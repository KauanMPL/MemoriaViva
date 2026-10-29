const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pool, query } = require('./db');
const { authenticate, requireFamilyMember } = require('./middleware');

const router = express.Router();
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 12).replace(/[^.a-zA-Z0-9]/g, '');
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});
const maxUploadMb = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 25));
const upload = multer({
  storage,
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm)|audio\/(mpeg|mp4|wav|x-wav|aac|ogg|webm)|application\/pdf)$/i;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Formato não permitido. Envie imagem, vídeo, áudio ou PDF.'));
  },
});

const asId = (value) => String(value);
const publicUser = (u) => ({
  id: asId(u.id_usuario),
  name: u.nome,
  email: u.email,
  photoUrl: u.foto_perfil || null,
  createdAt: u.data_criacao,
});
const publicFamily = (f) => ({
  id: asId(f.id_grupo),
  name: f.nome,
  description: f.descricao || '',
  photoUrl: f.foto_grupo || null,
  createdAt: f.data_criacao,
});
const publicMember = (row) => ({
  id: asId(row.id_participante_grupo),
  userId: asId(row.id_usuario),
  permission: row.permissao,
  joinedAt: row.data_entrada,
  user: { id: asId(row.id_usuario), name: row.nome, email: row.email, photoUrl: row.foto_perfil || null },
});
const mediaType = (mime = '') => mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file';
const publicMedia = (m) => ({
  id: asId(m.id_midia),
  title: m.descricao || path.basename(m.arquivo),
  url: m.arquivo.startsWith('http') ? m.arquivo : m.arquivo,
  type: m.tipo_midia,
  createdAt: m.data_upload,
});
const publicComment = (c) => ({
  id: asId(c.id_comentario),
  body: c.conteudo,
  createdAt: c.data_criacao,
  user: { id: asId(c.id_usuario), name: c.nome, email: c.email },
});

function signToken(user) {
  return jwt.sign({ sub: String(user.id_usuario) }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function listFamiliesForUser(userId) {
  const result = await query(
    `SELECT g.* FROM grupo g
     JOIN participante_grupo pg ON pg.id_grupo = g.id_grupo
     WHERE pg.id_usuario = $1 ORDER BY g.data_criacao DESC`,
    [userId],
  );
  return result.rows.map(publicFamily);
}

async function assertChapterAccess(chapterId, userId, allowPrivate = true) {
  const result = await query(
    `SELECT s.*, g.id_admin,
       pg.permissao AS family_permission,
       EXISTS (SELECT 1 FROM participante_subgrupo ps WHERE ps.id_subgrupo=s.id_subgrupo AND ps.id_usuario=$2) AS is_chapter_member
     FROM subgrupo s
     JOIN participante_grupo pg ON pg.id_grupo=s.id_grupo AND pg.id_usuario=$2
     JOIN grupo g ON g.id_grupo=s.id_grupo
     WHERE s.id_subgrupo=$1`,
    [chapterId, userId],
  );
  if (!result.rowCount) return null;
  const chapter = result.rows[0];
  if (!allowPrivate && chapter.visibilidade === 'private' && !chapter.is_chapter_member) return null;
  if (chapter.visibilidade === 'private' && !chapter.is_chapter_member && Number(chapter.id_admin) !== Number(userId)) return null;
  return chapter;
}

async function getChapter(chapterId, userId) {
  const base = await assertChapterAccess(chapterId, userId, true);
  if (!base) return null;
  const [members, media, comments] = await Promise.all([
    query(
      `SELECT u.id_usuario FROM participante_subgrupo ps JOIN usuario u ON u.id_usuario=ps.id_usuario
       WHERE ps.id_subgrupo=$1 ORDER BY u.nome`, [chapterId]),
    query('SELECT * FROM midia WHERE id_subgrupo=$1 ORDER BY data_upload DESC', [chapterId]),
    query(
      `SELECT c.*, u.nome, u.email FROM comentario c JOIN usuario u ON u.id_usuario=c.id_usuario
       WHERE c.id_subgrupo=$1 ORDER BY c.data_criacao ASC`, [chapterId]),
  ]);
  return {
    id: asId(base.id_subgrupo),
    familyId: asId(base.id_grupo),
    title: base.nome,
    description: base.descricao || '',
    eventDate: base.data_evento.toISOString ? base.data_evento.toISOString().slice(0, 10) : String(base.data_evento).slice(0, 10),
    visibility: base.visibilidade,
    createdAt: base.data_criacao,
    createdBy: asId(base.id_criador),
    memberIds: members.rows.map((r) => asId(r.id_usuario)),
    media: media.rows.map(publicMedia),
    comments: comments.rows.map(publicComment),
  };
}

async function familyPayload(familyId, userId) {
  const familyResult = await query('SELECT * FROM grupo WHERE id_grupo=$1', [familyId]);
  if (!familyResult.rowCount) return null;
  const membersResult = await query(
    `SELECT pg.id_participante_grupo, pg.id_usuario, pg.permissao, pg.data_entrada,
            u.nome, u.email, u.foto_perfil
     FROM participante_grupo pg JOIN usuario u ON u.id_usuario=pg.id_usuario
     WHERE pg.id_grupo=$1 ORDER BY pg.data_entrada, u.nome`, [familyId]);
  const chapterIds = await query(
    `SELECT s.id_subgrupo FROM subgrupo s
     WHERE s.id_grupo=$1 AND (s.visibilidade='family' OR EXISTS (
       SELECT 1 FROM participante_subgrupo ps WHERE ps.id_subgrupo=s.id_subgrupo AND ps.id_usuario=$2
     ) OR EXISTS (SELECT 1 FROM grupo g WHERE g.id_grupo=s.id_grupo AND g.id_admin=$2))
     ORDER BY s.data_evento DESC, s.data_criacao DESC`, [familyId, userId]);
  const chapters = [];
  for (const row of chapterIds.rows) {
    const chapter = await getChapter(row.id_subgrupo, userId);
    if (chapter) chapters.push(chapter);
  }
  return {
    family: publicFamily(familyResult.rows[0]),
    members: membersResult.rows.map(publicMember),
    chapters,
  };
}

// Health check
router.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', service: 'memoria-viva-api', database: 'connected' });
  } catch (_err) {
    res.status(503).json({ status: 'error', service: 'memoria-viva-api', database: 'disconnected' });
  }
});

// Authentication
router.post('/api/auth/register', async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: { message: 'Informe seu nome (de 2 a 100 caracteres).' } });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) return res.status(400).json({ error: { message: 'Informe um e-mail válido.' } });
  if (password.length < 6 || password.length > 100) return res.status(400).json({ error: { message: 'A senha deve ter entre 6 e 100 caracteres.' } });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT 1 FROM usuario WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: { message: 'Este e-mail já está cadastrado.' } });
    }
    const hash = await bcrypt.hash(password, 12);
    const inserted = await client.query(
      'INSERT INTO usuario (nome,email,senha) VALUES ($1,$2,$3) RETURNING id_usuario,nome,email,foto_perfil,data_criacao',
      [name, email, hash],
    );
    const user = inserted.rows[0];
    const invitations = await client.query("SELECT id_convite,id_grupo FROM convite_grupo WHERE LOWER(email)=LOWER($1) AND status='pending'", [email]);
    for (const invite of invitations.rows) {
      await client.query(
        `INSERT INTO participante_grupo (id_usuario,id_grupo,permissao)
         VALUES ($1,$2,'member') ON CONFLICT (id_usuario,id_grupo) DO NOTHING`, [user.id_usuario, invite.id_grupo]);
      await client.query("UPDATE convite_grupo SET status='accepted' WHERE id_convite=$1", [invite.id_convite]);
    }
    await client.query('COMMIT');
    res.status(201).json({ token: signToken(user), user: publicUser(user), families: await listFamiliesForUser(user.id_usuario) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally { client.release(); }
});

router.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await query('SELECT * FROM usuario WHERE LOWER(email)=LOWER($1)', [email]);
    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].senha))) {
      return res.status(401).json({ error: { message: 'E-mail ou senha incorretos.' } });
    }
    const user = result.rows[0];
    res.json({ token: signToken(user), user: publicUser(user), families: await listFamiliesForUser(user.id_usuario) });
  } catch (err) { next(err); }
});

router.get('/api/auth/me', authenticate, async (req, res, next) => {
  try { res.json({ user: publicUser(req.user), families: await listFamiliesForUser(req.user.id_usuario) }); }
  catch (err) { next(err); }
});
router.post('/api/auth/logout', authenticate, (_req, res) => res.status(204).end());

router.patch('/api/auth/profile', authenticate, async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({
      error: { message: 'O nome deve ter entre 2 e 100 caracteres.' },
    });
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 150
  ) {
    return res.status(400).json({
      error: { message: 'Informe um e-mail válido.' },
    });
  }

  try {
    const duplicate = await query(
      `SELECT id_usuario FROM usuario
       WHERE LOWER(email) = LOWER($1) AND id_usuario <> $2`,
      [email, req.user.id_usuario],
    );

    if (duplicate.rowCount) {
      return res.status(409).json({
        error: { message: 'Este e-mail já está sendo utilizado.' },
      });
    }

    const result = await query(
      `UPDATE usuario
       SET nome = $1, email = $2
       WHERE id_usuario = $3
       RETURNING id_usuario, nome, email, foto_perfil, data_criacao`,
      [name, email, req.user.id_usuario],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: { message: 'Usuário não encontrado.' },
      });
    }

    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: { message: 'Este e-mail já está sendo utilizado.' },
      });
    }
    next(err);
  }
});

router.post('/api/auth/profile/photo', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        error: {
          message:
            err.code === 'LIMIT_FILE_SIZE'
              ? `A imagem excede o limite de ${maxUploadMb} MB.`
              : err.message,
        },
      });
    }
    next();
  });
}, async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: { message: 'Selecione uma foto.' },
    });
  }

  try {
    const photoUrl = `/uploads/${req.file.filename}`;

    const result = await query(
      `UPDATE usuario
       SET foto_perfil = $1
       WHERE id_usuario = $2
       RETURNING id_usuario, nome, email, foto_perfil, data_criacao`,
      [photoUrl, req.user.id_usuario],
    );

    if (!result.rowCount) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        error: { message: 'Usuário não encontrado.' },
      });
    }

    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
});

router.post('/api/auth/forgot-password', async (_req, res) => {
  // Mensagem genérica para não revelar se o e-mail está cadastrado.
  // O envio real de e-mail exige configurar um provedor SMTP/transacional.
  res.json({ message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.' });
});

// Families/groups
router.post('/api/families', authenticate, async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: { message: 'O nome da família deve ter de 2 a 100 caracteres.' } });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(
      'INSERT INTO grupo (nome,descricao,id_admin) VALUES ($1,$2,$3) RETURNING *',
      [name, description || null, req.user.id_usuario],
    );
    const family = created.rows[0];
    await client.query("INSERT INTO participante_grupo (id_usuario,id_grupo,permissao) VALUES ($1,$2,'admin')", [req.user.id_usuario, family.id_grupo]);
    await client.query('COMMIT');
    res.status(201).json({ family: publicFamily(family) });
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
});

router.get('/api/families/:id', authenticate, requireFamilyMember, async (req, res, next) => {
  try {
    const data = await familyPayload(req.familyId, req.user.id_usuario);
    if (!data) return res.status(404).json({ error: { message: 'Família não encontrada.' } });
    res.json(data);
  } catch (err) { next(err); }
});

router.patch('/api/families/:id', authenticate, requireFamilyMember, async (req, res, next) => {
  if (req.familyPermission !== 'admin' && Number(req.familyAdminId) !== Number(req.user.id_usuario)) {
    return res.status(403).json({ error: { message: 'Somente administradores podem alterar a família.' } });
  }
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (name.length < 2 || name.length > 100) return res.status(400).json({ error: { message: 'O nome da família deve ter de 2 a 100 caracteres.' } });
  try {
    const result = await query('UPDATE grupo SET nome=$1, descricao=$2 WHERE id_grupo=$3 RETURNING *', [name, description || null, req.familyId]);
    res.json({ family: publicFamily(result.rows[0]) });
  } catch (err) { next(err); }
});

router.post('/api/families/:familyId/members/invite', authenticate, requireFamilyMember, async (req, res, next) => {
  if (req.familyPermission !== 'admin' && Number(req.familyAdminId) !== Number(req.user.id_usuario)) return res.status(403).json({ error: { message: 'Somente administradores podem convidar pessoas.' } });
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: { message: 'Informe um e-mail válido.' } });
  try {
    const existing = await query('SELECT id_usuario FROM usuario WHERE LOWER(email)=LOWER($1)', [email]);
    if (existing.rowCount) {
      await query("INSERT INTO participante_grupo (id_usuario,id_grupo,permissao) VALUES ($1,$2,'member') ON CONFLICT (id_usuario,id_grupo) DO NOTHING", [existing.rows[0].id_usuario, req.familyId]);
      return res.json({ message: 'Pessoa adicionada à família.' });
    }
    await query(
      `INSERT INTO convite_grupo (email,id_grupo,id_convidante,status) VALUES ($1,$2,$3,'pending')
       ON CONFLICT (email,id_grupo) DO UPDATE SET id_convidante=EXCLUDED.id_convidante,status='pending',data_criacao=CURRENT_TIMESTAMP`,
      [email, req.familyId, req.user.id_usuario],
    );
    res.status(201).json({ message: 'Convite registrado. A pessoa será vinculada à família quando criar uma conta com esse e-mail.' });
  } catch (err) { next(err); }
});

// Chapters/subgroups
router.post('/api/families/:familyId/chapters', authenticate, requireFamilyMember, async (req, res, next) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const eventDate = String(req.body.eventDate || '').slice(0, 10);
  const visibility = req.body.visibility === 'private' ? 'private' : 'family';
  if (!title || title.length > 150) return res.status(400).json({ error: { message: 'Informe um título de até 150 caracteres.' } });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(Date.parse(`${eventDate}T00:00:00Z`))) return res.status(400).json({ error: { message: 'Informe uma data válida no formato AAAA-MM-DD.' } });
  const memberIds = Array.isArray(req.body.memberIds) ? [...new Set(req.body.memberIds.map(Number).filter(Number.isInteger))] : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query(
      `INSERT INTO subgrupo (nome,descricao,data_evento,visibilidade,id_grupo,id_criador)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_subgrupo`,
      [title, description || null, eventDate, visibility, req.familyId, req.user.id_usuario],
    );
    const chapterId = created.rows[0].id_subgrupo;
    const selected = [...new Set([...(memberIds.length ? memberIds : []), Number(req.user.id_usuario)])];
    for (const userId of selected) {
      const membership = await client.query('SELECT 1 FROM participante_grupo WHERE id_grupo=$1 AND id_usuario=$2', [req.familyId, userId]);
      if (membership.rowCount) await client.query("INSERT INTO participante_subgrupo (id_usuario,id_subgrupo,permissao) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING", [userId, chapterId]);
    }
    await client.query('COMMIT');
    res.status(201).json({ chapter: await getChapter(chapterId, req.user.id_usuario) });
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); next(err); }
  finally { client.release(); }
});

router.patch('/api/chapters/:id', authenticate, async (req, res, next) => {
  const chapterId = Number(req.params.id);
  try {
    const chapter = await assertChapterAccess(chapterId, req.user.id_usuario, true);
    if (!chapter) return res.status(404).json({ error: { message: 'Memória não encontrada ou sem permissão.' } });
    if (Number(chapter.id_criador) !== Number(req.user.id_usuario) && chapter.family_permission !== 'admin' && chapter.family_permission !== 'editor') return res.status(403).json({ error: { message: 'Você não tem permissão para editar esta memória.' } });
    const title = String(req.body.title ?? chapter.nome).trim();
    const description = String(req.body.description ?? chapter.descricao ?? '').trim();
    const eventDate = String(req.body.eventDate ?? chapter.data_evento).slice(0, 10);
    const visibility = req.body.visibility === 'private' ? 'private' : req.body.visibility === 'family' ? 'family' : chapter.visibilidade;
    if (!title || title.length > 150) return res.status(400).json({ error: { message: 'Informe um título de até 150 caracteres.' } });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(Date.parse(`${eventDate}T00:00:00Z`))) return res.status(400).json({ error: { message: 'Data inválida.' } });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE subgrupo SET nome=$1,descricao=$2,data_evento=$3,visibilidade=$4 WHERE id_subgrupo=$5', [title, description || null, eventDate, visibility, chapterId]);
      if (Array.isArray(req.body.memberIds)) {
        await client.query('DELETE FROM participante_subgrupo WHERE id_subgrupo=$1', [chapterId]);
        const ids = [...new Set(req.body.memberIds.map(Number).filter(Number.isInteger))];
        if (!ids.includes(Number(req.user.id_usuario))) ids.push(Number(req.user.id_usuario));
        for (const userId of ids) {
          const membership = await client.query('SELECT 1 FROM participante_grupo WHERE id_grupo=$1 AND id_usuario=$2', [chapter.id_grupo, userId]);
          if (membership.rowCount) await client.query("INSERT INTO participante_subgrupo (id_usuario,id_subgrupo,permissao) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING", [userId, chapterId]);
        }
      }
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
    finally { client.release(); }
    res.json({ chapter: await getChapter(chapterId, req.user.id_usuario) });
  } catch (err) { next(err); }
});

router.delete('/api/chapters/:id', authenticate, async (req, res, next) => {
  try {
    const chapter = await assertChapterAccess(Number(req.params.id), req.user.id_usuario, true);
    if (!chapter) return res.status(404).json({ error: { message: 'Memória não encontrada ou sem permissão.' } });
    if (Number(chapter.id_criador) !== Number(req.user.id_usuario) && chapter.family_permission !== 'admin') return res.status(403).json({ error: { message: 'Somente quem criou ou um administrador pode excluir esta memória.' } });
    const media = await query('SELECT arquivo FROM midia WHERE id_subgrupo=$1', [req.params.id]);
    await query('DELETE FROM subgrupo WHERE id_subgrupo=$1', [req.params.id]);
    for (const item of media.rows) {
      if (item.arquivo && item.arquivo.startsWith('/uploads/')) fs.promises.unlink(path.join(uploadsDir, path.basename(item.arquivo))).catch(() => {});
    }
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/api/chapters/:id/comments', authenticate, async (req, res, next) => {
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 5000) return res.status(400).json({ error: { message: 'O comentário deve ter entre 1 e 5000 caracteres.' } });
  try {
    const chapter = await assertChapterAccess(Number(req.params.id), req.user.id_usuario, true);
    if (!chapter) return res.status(404).json({ error: { message: 'Memória não encontrada ou sem permissão.' } });
    const created = await query('INSERT INTO comentario (conteudo,id_usuario,id_subgrupo) VALUES ($1,$2,$3) RETURNING *', [body, req.user.id_usuario, req.params.id]);
    res.status(201).json({ comment: publicComment({ ...created.rows[0], nome: req.user.nome, email: req.user.email }) });
  } catch (err) { next(err); }
});

router.post('/api/chapters/:id/media', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: { message: err.code === 'LIMIT_FILE_SIZE' ? `O arquivo excede o limite de ${maxUploadMb} MB.` : err.message } });
    }
    next();
  });
}, async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: { message: 'Selecione um arquivo para enviar.' } });
  try {
    const chapter = await assertChapterAccess(Number(req.params.id), req.user.id_usuario, true);
    if (!chapter) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: { message: 'Memória não encontrada ou sem permissão.' } });
    }
    const type = mediaType(req.file.mimetype);
    const url = `/uploads/${req.file.filename}`;
    const inserted = await query(
      'INSERT INTO midia (arquivo,descricao,tipo_midia,id_usuario,id_subgrupo) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [url, req.file.originalname.slice(0, 255), type, req.user.id_usuario, req.params.id],
    );
    res.status(201).json({ media: publicMedia(inserted.rows[0]) });
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    next(err);
  }
});

module.exports = router;
