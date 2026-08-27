const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'publicity-images';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

function requireSupabase(res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ ok: false, message: 'Supabase pa konfigire sou backend lan.' });
    return false;
  }
  return true;
}

async function supabaseRequest(table, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(body?.message || body?.hint || 'Supabase request failed');
    error.status = response.status;
    throw error;
  }
  return body;
}

async function uploadPublicityImage(file) {
  const extension = file.originalname.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filePath = `${Date.now()}-${randomUUID()}.${extension}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${filePath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': file.mimetype,
      'x-upsert': 'false'
    },
    body: file.buffer
  });
  if (!response.ok) throw new Error('Imaj publicité a pa ka upload nan Supabase.');
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${filePath}`;
}

function mapArticle(row) {
  return { ...row, createdAt: row.created_at };
}

function mapContact(row) {
  return { ...row, createdAt: row.created_at };
}

function mapPublicity(row) {
  return { ...row, companyName: row.company_name, createdAt: row.created_at };
}

function handleServerError(res, error) {
  console.error(error);
  return res.status(error.status || 500).json({ ok: false, message: 'Erè pandan operasyon an.' });
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      articles: [],
      contacts: [],
      publicity: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

function normalizeEntries(items, type) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const normalized = { ...item };
    normalized.id = normalized.id || `${type}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
    if (type === 'articles' && !normalized.status) {
      normalized.status = 'pending';
    }
    return normalized;
  });
}

function readData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      articles: normalizeEntries(parsed.articles, 'articles'),
      contacts: normalizeEntries(parsed.contacts, 'contacts'),
      publicity: normalizeEntries(parsed.publicity, 'publicity')
    };
  } catch (error) {
    return { articles: [], contacts: [], publicity: [] };
  }
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function validatePassword(password) {
  return Boolean(ADMIN_PASSWORD) && String(password || '') === ADMIN_PASSWORD;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Kalfou Nouvelles API active',
    database: SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'not-configured'
  });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) return res.status(400).json({ ok: false, message: 'Tous les champs sont requis.' });
  if (!requireSupabase(res)) return;
  try {
    await supabaseRequest('contacts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ name: String(name).trim(), email: String(email).trim(), subject: String(subject).trim(), message: String(message).trim() })
    });
    res.status(201).json({ ok: true, message: 'Message enregistré avec succès.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/articles', async (req, res) => {
  const { author, email, title, category, summary, content } = req.body || {};
  if (!author || !email || !title || !category || !summary || !content) return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  if (!requireSupabase(res)) return;
  try {
    await supabaseRequest('articles', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ author: String(author).trim(), email: String(email).trim(), title: String(title).trim(), category: String(category).trim(), summary: String(summary).trim(), content: String(content).trim(), status: 'pending' })
    });
    res.status(201).json({ ok: true, message: 'Article soumis avec succès.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/articles', async (req, res) => {
  const { password, author, email, title, category, summary, content, status } = req.body || {};
  if (!validatePassword(password)) return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  if (!author || !email || !title || !category || !summary || !content) return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  if (!['pending', 'published'].includes(status)) return res.status(400).json({ ok: false, message: 'Statut invalide.' });
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest('articles', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ author: String(author).trim(), email: String(email).trim(), title: String(title).trim(), category: String(category).trim(), summary: String(summary).trim(), content: String(content).trim(), status })
    });
    res.status(201).json({ ok: true, article: mapArticle(rows[0]), message: status === 'published' ? 'Article publié avec succès.' : 'Brouillon enregistré.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/publicity', upload.single('image'), async (req, res) => {
  const { companyName, company, email, type, message } = req.body || {};
  if (!companyName || !company || !email || !type || !message) return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  if (!requireSupabase(res)) return;
  try {
    const imageUrl = req.file ? await uploadPublicityImage(req.file) : null;
    await supabaseRequest('publicity', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ company_name: String(companyName).trim(), company: String(company).trim(), email: String(email).trim(), type: String(type).trim(), message: String(message).trim(), image_url: imageUrl, status: 'pending' })
    });
    res.status(201).json({ ok: true, message: 'Demande de publicité enregistrée.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/newsletter', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ ok: false, message: 'Veuillez entrer une adresse e-mail valide.' });
  }
  if (!requireSupabase(res)) return;
  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    return res.status(503).json({ ok: false, message: 'Newsletter pa konfigire sou backend lan.' });
  }

  try {
    await supabaseRequest('newsletter_subscribers', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ email })
    });

    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ email, listIds: [Number(BREVO_LIST_ID)], updateEnabled: true })
    });

    if (!brevoResponse.ok && brevoResponse.status !== 204) {
      throw new Error('Brevo subscription failed');
    }
    res.status(201).json({ ok: true, message: 'Inscription réussie. Vous recevrez nos prochaines informations.' });
  } catch (error) { handleServerError(res, error); }
});

app.get('/api/public/publicity', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest('publicity?select=*&status=eq.published&order=created_at.desc');
    res.json({ ok: true, publicity: rows.map(mapPublicity) });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/login', (req, res) => {
  if (validatePassword(req.body?.password)) return res.json({ ok: true, message: 'Authentification réussie.' });
  return res.status(401).json({ ok: false, message: 'Mot de passe incorrect.' });
});

app.post('/api/admin/data', async (req, res) => {
  if (!validatePassword(req.body?.password)) return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  if (!requireSupabase(res)) return;
  try {
    const [articles, contacts, publicity] = await Promise.all([
      supabaseRequest('articles?select=*&order=created_at.desc'),
      supabaseRequest('contacts?select=*&order=created_at.desc'),
      supabaseRequest('publicity?select=*&order=created_at.desc')
    ]);
    res.json({
      ok: true,
      counts: { articles: articles.length, contacts: contacts.length, publicity: publicity.length },
      articles: articles.map(mapArticle),
      contacts: contacts.map(mapContact),
      publicity: publicity.map(mapPublicity)
    });
  } catch (error) { handleServerError(res, error); }
});

app.get('/api/public/articles', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest('articles?select=*&status=eq.published&order=created_at.desc');
    res.json({ ok: true, articles: rows.map(mapArticle) });
  } catch (error) { handleServerError(res, error); }
});

app.get('/api/public/articles/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest(`articles?select=*&id=eq.${encodeURIComponent(req.params.id)}&status=eq.published`);
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Article introuvable.' });
    res.json({ ok: true, article: mapArticle(rows[0]) });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/articles/:id/status', async (req, res) => {
  const { password, status } = req.body || {};
  if (!validatePassword(password)) return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  if (!['pending', 'published', 'rejected'].includes(status)) return res.status(400).json({ ok: false, message: 'Statut invalide.' });
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest(`articles?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status }) });
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Article introuvable.' });
    res.json({ ok: true, article: mapArticle(rows[0]) });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/publicity/:id/status', async (req, res) => {
  const { password, status } = req.body || {};
  if (!validatePassword(password)) return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  if (!['pending', 'published', 'rejected'].includes(status)) return res.status(400).json({ ok: false, message: 'Statut invalide.' });
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest(`publicity?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status }) });
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Demande introuvable.' });
    res.json({ ok: true, publicity: mapPublicity(rows[0]) });
  } catch (error) { handleServerError(res, error); }
});

async function deleteAdminRow(table, id, password, res, label) {
  if (!validatePassword(password)) return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    if (!rows.length) return res.status(404).json({ ok: false, message: `${label} introuvable.` });
    res.json({ ok: true, message: `${label} supprimé.` });
  } catch (error) { handleServerError(res, error); }
}

app.post('/api/admin/articles/:id/delete', (req, res) => deleteAdminRow('articles', req.params.id, req.body?.password, res, 'Article'));
app.post('/api/admin/contacts/:id/delete', (req, res) => deleteAdminRow('contacts', req.params.id, req.body?.password, res, 'Message'));
app.post('/api/admin/publicity/:id/delete', (req, res) => deleteAdminRow('publicity', req.params.id, req.body?.password, res, 'Demande'));

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ ok: false, message: 'Tous les champs sont requis.' });
  }

  const data = readData();
  const entry = {
    id: randomUUID(),
    name: String(name).trim(),
    email: String(email).trim(),
    subject: String(subject).trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString()
  };

  data.contacts.push(entry);
  writeData(data);

  res.status(201).json({ ok: true, message: 'Message enregistré avec succès.' });
});

app.post('/api/articles', (req, res) => {
  const { author, email, title, category, summary, content } = req.body || {};

  if (!author || !email || !title || !category || !summary || !content) {
    return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  }

  const data = readData();
  const entry = {
    id: randomUUID(),
    author: String(author).trim(),
    email: String(email).trim(),
    title: String(title).trim(),
    category: String(category).trim(),
    summary: String(summary).trim(),
    content: String(content).trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  data.articles.push(entry);
  writeData(data);

  res.status(201).json({ ok: true, message: 'Article soumis avec succès.' });
});

app.post('/api/publicity', (req, res) => {
  const { companyName, company, email, type, message } = req.body || {};

  if (!companyName || !company || !email || !type || !message) {
    return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  }

  const data = readData();
  const entry = {
    id: randomUUID(),
    companyName: String(companyName).trim(),
    company: String(company).trim(),
    email: String(email).trim(),
    type: String(type).trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString()
  };

  data.publicity.push(entry);
  writeData(data);

  res.status(201).json({ ok: true, message: 'Demande de publicité enregistrée.' });
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};

  if (validatePassword(password)) {
    return res.json({ ok: true, message: 'Authentification réussie.' });
  }

  return res.status(401).json({ ok: false, message: 'Mot de passe incorrect.' });
});

app.post('/api/admin/data', (req, res) => {
  const { password } = req.body || {};

  if (!validatePassword(password)) {
    return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  }

  const data = readData();
  return res.json({
    ok: true,
    counts: {
      articles: data.articles.length,
      contacts: data.contacts.length,
      publicity: data.publicity.length
    },
    articles: data.articles,
    contacts: data.contacts,
    publicity: data.publicity
  });
});

app.get('/api/public/articles', (req, res) => {
  const data = readData();
  const published = data.articles
    .filter((article) => article.status === 'published')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ ok: true, articles: published });
});

app.get('/api/public/articles/:id', (req, res) => {
  const data = readData();
  const article = data.articles.find((item) => item.id === req.params.id && item.status === 'published');

  if (!article) {
    return res.status(404).json({ ok: false, message: 'Article introuvable.' });
  }

  return res.json({ ok: true, article });
});

app.post('/api/admin/articles/:id/status', (req, res) => {
  const { password, status } = req.body || {};
  const allowed = ['pending', 'published', 'rejected'];

  if (!validatePassword(password)) {
    return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  }

  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, message: 'Statut invalide.' });
  }

  const data = readData();
  const index = data.articles.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ ok: false, message: 'Article introuvable.' });
  }

  data.articles[index].status = status;
  writeData(data);

  return res.json({ ok: true, article: data.articles[index] });
});

app.post('/api/admin/articles/:id/delete', (req, res) => {
  const { password } = req.body || {};

  if (!validatePassword(password)) {
    return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  }

  const data = readData();
  const nextArticles = data.articles.filter((item) => item.id !== req.params.id);

  if (nextArticles.length === data.articles.length) {
    return res.status(404).json({ ok: false, message: 'Article introuvable.' });
  }

  data.articles = nextArticles;
  writeData(data);

  return res.json({ ok: true, message: 'Article supprimé.' });
});

app.post('/api/admin/contacts/:id/delete', (req, res) => {
  const { password } = req.body || {};

  if (!validatePassword(password)) {
    return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  }

  const data = readData();
  const nextContacts = data.contacts.filter((item) => item.id !== req.params.id);

  if (nextContacts.length === data.contacts.length) {
    return res.status(404).json({ ok: false, message: 'Message introuvable.' });
  }

  data.contacts = nextContacts;
  writeData(data);

  return res.json({ ok: true, message: 'Message supprimé.' });
});

app.post('/api/admin/publicity/:id/delete', (req, res) => {
  const { password } = req.body || {};

  if (!validatePassword(password)) {
    return res.status(401).json({ ok: false, message: 'Accès refusé.' });
  }

  const data = readData();
  const nextPublicity = data.publicity.filter((item) => item.id !== req.params.id);

  if (nextPublicity.length === data.publicity.length) {
    return res.status(404).json({ ok: false, message: 'Demande introuvable.' });
  }

  data.publicity = nextPublicity;
  writeData(data);

  return res.json({ ok: true, message: 'Demande supprimée.' });
});

app.use(express.static(__dirname));

app.get('*', (req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  return res.sendFile(path.join(__dirname, 'KalfouNouvel.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur Kalfou Nouvelles lancé sur http://localhost:${PORT}`);
});
