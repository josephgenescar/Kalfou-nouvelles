const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Kalfou2026';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

app.use(express.json({ limit: '1mb' }));

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
  return String(password || '') === ADMIN_PASSWORD;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Kalfou Nouvelles API active' });
});

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
