const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID, createHmac, timingSafeEqual } = require('crypto');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'publicity-images';
const SUPABASE_ARTICLE_BUCKET = process.env.SUPABASE_ARTICLE_BUCKET || 'article-images';
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const IMAGEKIT_ARTICLE_FOLDER = process.env.IMAGEKIT_ARTICLE_FOLDER || '/kalfou/articles';
const MAX_VIDEO_DURATION_SECONDS = 3 * 60;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;
const CONTACT_NOTIFICATION_EMAIL = process.env.CONTACT_NOTIFICATION_EMAIL;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const PUBLICITY_PLACEMENTS = ['home_top', 'home_sidebar', 'home_between_sections', 'article_top', 'article_middle', 'article_sidebar', 'footer_banner'];
const PUBLICITY_PLANS = ['basic', 'premium', 'elite'];
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');
const ADMIN_SESSION_COOKIE = 'kalfou_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
const submissionAttempts = new Map();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/.test(file.mimetype))
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
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      const error = new Error(`Supabase returned a non-JSON response (${response.status}).`);
      error.status = response.status || 502;
      throw error;
    }
  }
  if (!response.ok) {
    const error = new Error(body?.message || body?.hint || 'Supabase request failed');
    error.status = response.status;
    throw error;
  }
  return body;
}

async function uploadImage(file, bucket) {
  const extension = file.originalname.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filePath = `${Date.now()}-${randomUUID()}.${extension}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`, {
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
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
}

async function uploadArticleMedia(file) {
  if (!IMAGEKIT_PRIVATE_KEY) {
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('ImageKit pa konfigire pou upload videyo a.');
    }
    return { url: await uploadImage(file, SUPABASE_ARTICLE_BUCKET), type: 'image' };
  }

  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  form.append('fileName', file.originalname);
  form.append('folder', IMAGEKIT_ARTICLE_FOLDER);
  form.append('useUniqueFileName', 'true');

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}` },
    body: form
  });
  const result = await response.json();
  if (!response.ok || !result.url) throw new Error(result.message || 'Media a pa ka upload nan ImageKit.');
  return { url: result.url, type: file.mimetype.startsWith('video/') ? 'video' : 'image' };
}

async function sendContactNotification(contact) {
  if (!BREVO_API_KEY || !CONTACT_NOTIFICATION_EMAIL || !BREVO_SENDER_EMAIL) {
    return false;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Kalfou Nouvelles', email: BREVO_SENDER_EMAIL },
      to: [{ email: CONTACT_NOTIFICATION_EMAIL }],
      replyTo: { email: contact.email, name: contact.name },
      subject: `Nouveau message: ${contact.subject}`,
      textContent: `Nom: ${contact.name}\nEmail: ${contact.email}\nSujet: ${contact.subject}\n\n${contact.message}`
    })
  });

  if (!response.ok) {
    console.error('Brevo contact notification failed:', await response.text());
    return false;
  }
  return true;
}

async function sendAdminNotification(subject, textContent) {
  if (!BREVO_API_KEY || !CONTACT_NOTIFICATION_EMAIL || !BREVO_SENDER_EMAIL) return false;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Kalfou Nouvelles', email: BREVO_SENDER_EMAIL },
      to: [{ email: CONTACT_NOTIFICATION_EMAIL }],
      subject,
      textContent
    })
  });

  if (!response.ok) {
    console.error('Brevo admin notification failed:', await response.text());
    return false;
  }
  return true;
}

function escapeEmailHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendArticlePublicationNotification(article) {
  if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_SENDER_EMAIL) return false;

  const title = escapeEmailHtml(article.title);
  const summary = escapeEmailHtml(article.summary);
  const articleUrl = `https://kalfou-nouvelles.netlify.app/article.html?id=${encodeURIComponent(article.id)}`;
  const response = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      name: `Kalfou Nouvelles - ${article.title}`,
      subject: `Nouvel article: ${article.title}`,
      sender: { name: 'Kalfou Nouvelles', email: BREVO_SENDER_EMAIL },
      replyTo: BREVO_SENDER_EMAIL,
      type: 'classic',
      htmlContent: `<h1>${title}</h1><p>${summary}</p><p><a href="${articleUrl}">Lire l'article complet</a></p>`,
      recipients: { listIds: [Number(BREVO_LIST_ID)] }
    })
  });

  const campaign = await response.json();
  if (!response.ok || !campaign.id) {
    throw new Error(campaign.message || 'Brevo publication notification failed');
  }

  const sendResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}/sendNow`, {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': BREVO_API_KEY }
  });
  if (!sendResponse.ok) {
    throw new Error(`Brevo send failed: ${await sendResponse.text()}`);
  }
  return true;
}

async function notifyArticlePublication(article) {
  try {
    return await sendArticlePublicationNotification(article);
  } catch (error) {
    console.error('Brevo article notification failed:', error);
    return false;
  }
}

function mapArticle(row) {
  return {
    ...row,
    createdAt: row.created_at,
    mediaUrl: row.media_url || row.image_url || null,
    isFeatured: Boolean(row.is_featured),
    mediaType: row.media_type || (row.image_url ? 'image' : null)
  };
}

function mapContact(row) {
  return { ...row, createdAt: row.created_at };
}

function normalizePlacement(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return PUBLICITY_PLACEMENTS.includes(normalized) ? normalized : 'home_sidebar';
}

function normalizePlan(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return PUBLICITY_PLANS.includes(normalized) ? normalized : 'basic';
}

function isPublicityActive(item) {
  if (String(item.status || 'pending') !== 'published') return false;
  const startValue = item.starts_at || item.startsAt || item.start_date || item.startDate;
  const endValue = item.ends_at || item.endsAt || item.end_date || item.endDate;
  const now = Date.now();
  if (startValue) {
    const start = new Date(startValue).getTime();
    if (!Number.isNaN(start) && start > now) return false;
  }
  if (endValue) {
    const end = new Date(endValue).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }
  return true;
}

function mapPublicity(row) {
  return {
    ...row,
    companyName: row.company_name,
    websiteUrl: row.website_url || '',
    placement: normalizePlacement(row.placement),
    plan: normalizePlan(row.plan),
    startsAt: row.starts_at || row.startsAt || null,
    endsAt: row.ends_at || row.endsAt || null,
    createdAt: row.created_at
  };
}

function handleServerError(res, error) {
  console.error(error);
  const message = String(error?.message || '');
  if (message.toLowerCase().includes('website_url')) {
    return res.status(error.status || 500).json({ ok: false, message: 'Kolòn website_url la poko ajoute nan Supabase. Egzekite migration Supabase la epi eseye ankò.' });
  }
  if (message.toLowerCase().includes('is_featured')) {
    return res.status(error.status || 500).json({ ok: false, message: 'Kolòn is_featured la poko ajoute nan Supabase. Egzekite migration Supabase la epi eseye ankò.' });
  }
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
  if (!ADMIN_PASSWORD || typeof password !== 'string') return false;
  const supplied = Buffer.from(password);
  const expected = Buffer.from(ADMIN_PASSWORD);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function createAdminSession(expiresAt) {
  const value = String(expiresAt);
  const signature = createHmac('sha256', ADMIN_PASSWORD).update(value).digest('hex');
  return `${value}.${signature}`;
}

function hasAdminSession(req) {
  if (!ADMIN_PASSWORD) return false;
  const cookie = (req.headers.cookie || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!cookie) return false;

  let token;
  try {
    token = decodeURIComponent(cookie.slice(ADMIN_SESSION_COOKIE.length + 1));
  } catch {
    return false;
  }
  const [expiresAt, suppliedSignature] = token.split('.');
  if (!expiresAt || !suppliedSignature) return false;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry > Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000) return false;

  const expectedSignature = createHmac('sha256', ADMIN_PASSWORD).update(expiresAt).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(suppliedSignature, 'hex');
  } catch {
    return false;
  }
  return actualSignature.length === expectedSignature.length && timingSafeEqual(actualSignature, expectedSignature);
}

function setAdminSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${secure}`);
}

function clearAdminSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${ADMIN_SESSION_COOKIE}=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

function requireAdmin(req, res) {
  if (hasAdminSession(req)) return true;
  res.status(401).json({ ok: false, message: 'Session expirée. Reconnectez-vous.' });
  return false;
}

function hasSpamTrap(req, res) {
  if (!String(req.body?._company_website || '').trim()) return false;
  res.status(200).json({ ok: true, message: 'Mèsi, demann ou an resevwa.' });
  return true;
}

function fieldsExceedLimits(fields, limits) {
  return Object.entries(limits).some(([field, max]) => String(fields[field] || '').length > max);
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || '').trim());
}

function isSubmissionRateLimited(endpoint, email) {
  const key = `${endpoint}:${String(email).trim().toLowerCase()}`;
  const now = Date.now();
  const recent = (submissionAttempts.get(key) || []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (recent.length >= 3) return true;
  recent.push(now);
  submissionAttempts.set(key, recent);
  if (submissionAttempts.size > 5000) {
    for (const [entryKey, timestamps] of submissionAttempts) {
      if (!timestamps.some((timestamp) => now - timestamp < 60 * 60 * 1000)) submissionAttempts.delete(entryKey);
    }
  }
  return false;
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
  if (hasSpamTrap(req, res)) return;
  if (!name || !email || !subject || !message) return res.status(400).json({ ok: false, message: 'Tous les champs sont requis.' });
  if (fieldsExceedLimits({ name, email, subject, message }, { name: 120, email: 254, subject: 200, message: 5000 }) || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Vérifiez la longueur des champs et l’adresse e-mail.' });
  }
  if (isSubmissionRateLimited('contact', email)) return res.status(429).json({ ok: false, message: 'Trop de demandes. Réessayez plus tard.' });
  if (!requireSupabase(res)) return;
  try {
    const contact = { name: String(name).trim(), email: String(email).trim(), subject: String(subject).trim(), message: String(message).trim() };
    await supabaseRequest('contacts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(contact)
    });
    const notificationSent = await sendContactNotification(contact);
    res.status(201).json({ ok: true, message: notificationSent ? 'Message enregistré et notification envoyée.' : 'Message enregistré avec succès.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/articles', upload.single('image'), async (req, res) => {
  const { author, email, title, category, summary, content, mediaDuration } = req.body || {};
  if (hasSpamTrap(req, res)) return;
  if (!author || !email || !title || !category || !summary || !content) return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  if (fieldsExceedLimits({ author, email, title, category, summary, content }, { author: 120, email: 254, title: 180, category: 80, summary: 500, content: 50000 }) || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Vérifiez la longueur des champs et l’adresse e-mail.' });
  }
  if (isSubmissionRateLimited('article', email)) return res.status(429).json({ ok: false, message: 'Trop de soumissions. Réessayez plus tard.' });
  if (req.file && req.file.mimetype.startsWith('image/') && req.file.size > 8 * 1024 * 1024) {
    return res.status(400).json({ ok: false, message: 'L’image ne peut pas dépasser 8 Mo.' });
  }
  if (!requireSupabase(res)) return;
  try {
    const duration = Number(mediaDuration || 0);
    if (req.file?.mimetype.startsWith('video/') && (!duration || duration > MAX_VIDEO_DURATION_SECONDS)) {
      return res.status(400).json({ ok: false, message: 'La vidéo doit durer au maximum 3 minutes.' });
    }
    const media = req.file ? await uploadArticleMedia(req.file) : { url: null, type: null };
    const rows = await supabaseRequest('articles', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ author: String(author).trim(), email: String(email).trim(), title: String(title).trim(), category: String(category).trim(), summary: String(summary).trim(), content: String(content).trim(), image_url: media.type === 'image' ? media.url : null, media_url: media.url, media_type: media.type, status: 'pending' })
    });
    await sendAdminNotification(`Nouvo atik soumèt: ${String(title).trim()}`, `Otè: ${String(author).trim()}\nE-mail: ${String(email).trim()}\nKategori: ${String(category).trim()}\n\n${String(summary).trim()}`);
    res.status(201).json({ ok: true, message: 'Article soumis avec succès.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/articles', async (req, res) => {
  const { author, email, title, category, summary, content, status, isFeatured } = req.body || {};
  if (!requireAdmin(req, res)) return;
  if (!author || !email || !title || !category || !summary || !content) return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  if (fieldsExceedLimits({ author, email, title, category, summary, content }, { author: 120, email: 254, title: 180, category: 80, summary: 500, content: 50000 }) || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Vérifiez la longueur des champs et l’adresse e-mail.' });
  }
  if (!['pending', 'published'].includes(status)) return res.status(400).json({ ok: false, message: 'Statut invalide.' });
  if (!requireSupabase(res)) return;
  try {
    const featured = isFeatured === true || isFeatured === 'true';
    if (featured) {
      await supabaseRequest('articles?is_featured=eq.true', { method: 'PATCH', body: JSON.stringify({ is_featured: false }) });
    }
    const rows = await supabaseRequest('articles', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ author: String(author).trim(), email: String(email).trim(), title: String(title).trim(), category: String(category).trim(), summary: String(summary).trim(), content: String(content).trim(), status, is_featured: featured })
    });
    const article = mapArticle(rows[0]);
    const notificationSent = status === 'published' ? await notifyArticlePublication(article) : false;
    res.status(201).json({ ok: true, article, message: status === 'published' ? (notificationSent ? 'Article publié et notification envoyée.' : 'Article publié. Notification non envoyée.') : 'Brouillon enregistré.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/publicity', upload.single('image'), async (req, res) => {
  const { companyName, company, email, websiteUrl, type, message, placement, plan, startsAt, endsAt } = req.body || {};
  if (hasSpamTrap(req, res)) return;
  if (!companyName || !company || !email || !type || !message) return res.status(400).json({ ok: false, message: 'Veuillez remplir tous les champs.' });
  if (fieldsExceedLimits({ companyName, company, email, websiteUrl, type, message }, { companyName: 120, company: 160, email: 254, websiteUrl: 2048, type: 100, message: 5000 }) || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Vérifiez la longueur des champs et l’adresse e-mail.' });
  }
  if (isSubmissionRateLimited('publicity', email)) return res.status(429).json({ ok: false, message: 'Trop de demandes. Réessayez plus tard.' });
  if (req.file && !req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ ok: false, message: 'Seules les images sont acceptées pour une demande de publicité.' });
  }
  if (req.file && req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ ok: false, message: 'L’image de publicité ne peut pas dépasser 5 Mo.' });
  }
  if (websiteUrl && !/^https?:\/\/\S+$/i.test(String(websiteUrl).trim())) return res.status(400).json({ ok: false, message: 'Le lien du site doit commencer par http:// ou https://.' });
  const validPlacement = normalizePlacement(placement);
  const validPlan = normalizePlan(plan);
  const startDate = startsAt ? new Date(startsAt) : null;
  const endDate = endsAt ? new Date(endsAt) : null;
  if (startsAt && Number.isNaN(startDate.getTime())) return res.status(400).json({ ok: false, message: 'La date de début est invalide.' });
  if (endsAt && Number.isNaN(endDate.getTime())) return res.status(400).json({ ok: false, message: 'La date de fin est invalide.' });
  if (startDate && endDate && endDate < startDate) return res.status(400).json({ ok: false, message: 'La date de fin doit être après la date de début.' });
  if (!requireSupabase(res)) return;
  try {
    const imageUrl = req.file ? await uploadImage(req.file, SUPABASE_STORAGE_BUCKET) : null;
    await supabaseRequest('publicity', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        company_name: String(companyName).trim(),
        company: String(company).trim(),
        email: String(email).trim(),
        website_url: websiteUrl ? String(websiteUrl).trim() : null,
        type: String(type).trim(),
        message: String(message).trim(),
        image_url: imageUrl,
        placement: validPlacement,
        plan: validPlan,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        status: 'pending'
      })
    });
    await sendAdminNotification(`Nouvo demann piblisite: ${String(companyName).trim()}`, `Entreprise: ${String(company).trim()}\nE-mail: ${String(email).trim()}\nTip: ${String(type).trim()}\nPlasman: ${validPlacement}\nPlan: ${validPlan}\n\n${String(message).trim()}`);
    res.status(201).json({ ok: true, message: 'Demande de publicité enregistrée.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/newsletter', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (hasSpamTrap(req, res)) return;
  if (email.length > 254 || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Veuillez entrer une adresse e-mail valide.' });
  }
  if (isSubmissionRateLimited('newsletter', email)) return res.status(429).json({ ok: false, message: 'Trop de demandes. Réessayez plus tard.' });
  if (!requireSupabase(res)) return;
  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    return res.status(503).json({ ok: false, message: 'Newsletter pa konfigire sou backend lan.' });
  }

  try {
    const rows = await supabaseRequest('newsletter_subscribers', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ email })
    });

    if (rows.length) {
      await sendAdminNotification('Nouvelle inscription à la newsletter', `Nouvelle adresse: ${email}`);
    }

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
    const rows = await supabaseRequest('publicity?select=*&order=created_at.desc');
    const active = rows.filter(isPublicityActive).map(mapPublicity);
    res.json({ ok: true, publicity: active });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/track-visit', async (req, res) => {
  const pathValue = String(req.body?.path || '').slice(0, 500);
  const visitorId = String(req.body?.visitorId || '').trim();
  if (!pathValue || !pathValue.startsWith('/')) return res.status(400).json({ ok: false });
  if (!/^[a-z0-9-]{20,80}$/i.test(visitorId)) return res.status(400).json({ ok: false, message: 'Visiteur non identifie.' });
  if (!requireSupabase(res)) return;
  try {
    await supabaseRequest('site_events', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        event_type: 'page_view',
        path: pathValue,
        referrer: String(req.body?.referrer || '').slice(0, 1000) || null,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 500) || null,
        visitor_id: visitorId,
        visit_day: new Date().toISOString().slice(0, 10)
      })
    });
    res.status(201).json({ ok: true });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/login', (req, res) => {
  if (validatePassword(req.body?.password)) {
    setAdminSessionCookie(res, createAdminSession(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000));
    return res.json({ ok: true, message: 'Authentification réussie.' });
  }
  return res.status(401).json({ ok: false, message: 'Mot de passe incorrect.' });
});

app.post('/api/admin/logout', (req, res) => {
  clearAdminSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/admin/data', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (!requireSupabase(res)) return;
  try {
    const [articles, contacts, publicity, newsletter, visits, todayVisits] = await Promise.all([
      supabaseRequest('articles?select=*&order=created_at.desc'),
      supabaseRequest('contacts?select=*&order=created_at.desc'),
      supabaseRequest('publicity?select=*&order=created_at.desc'),
      supabaseRequest('newsletter_subscribers?select=*&order=created_at.desc'),
      supabaseRequest('site_events?select=*&event_type=eq.page_view&visitor_id=not.is.null&order=created_at.desc&limit=10000'),
      supabaseRequest(`site_events?select=id&event_type=eq.page_view&visitor_id=not.is.null&visit_day=eq.${new Date().toISOString().slice(0, 10)}`)
    ]);
    res.json({
      ok: true,
      counts: { articles: articles.length, contacts: contacts.length, publicity: publicity.length, newsletter: newsletter.length, visits: visits.length, todayVisits: todayVisits.length },
      articles: articles.map(mapArticle),
      contacts: contacts.map(mapContact),
      publicity: publicity.map(mapPublicity),
      newsletter,
      visits
    });
  } catch (error) { handleServerError(res, error); }
});

app.get('/api/public/articles', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    let rows;
    try {
      rows = await supabaseRequest('articles?select=*&status=eq.published&order=is_featured.desc,created_at.desc');
    } catch (error) {
      if (!String(error.message || '').toLowerCase().includes('is_featured')) throw error;
      rows = await supabaseRequest('articles?select=*&status=eq.published&order=created_at.desc');
    }
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
  const { status } = req.body || {};
  if (!requireAdmin(req, res)) return;
  if (!['pending', 'published', 'rejected'].includes(status)) return res.status(400).json({ ok: false, message: 'Statut invalide.' });
  if (!requireSupabase(res)) return;
  try {
    const currentRows = await supabaseRequest(`articles?id=eq.${encodeURIComponent(req.params.id)}&select=*`);
    if (!currentRows.length) return res.status(404).json({ ok: false, message: 'Article introuvable.' });
    const rows = await supabaseRequest(`articles?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status }) });
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Article introuvable.' });
    const article = mapArticle(rows[0]);
    const notificationSent = status === 'published' && currentRows[0].status !== 'published'
      ? await notifyArticlePublication(article)
      : false;
    res.json({ ok: true, article, notificationSent });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/articles/:id/featured', async (req, res) => {
  const { featured } = req.body || {};
  if (!requireAdmin(req, res)) return;
  if (!requireSupabase(res)) return;
  try {
    const shouldFeature = featured === true || featured === 'true';
    if (shouldFeature) {
      await supabaseRequest('articles?is_featured=eq.true', { method: 'PATCH', body: JSON.stringify({ is_featured: false }) });
    }
    const rows = await supabaseRequest(`articles?id=eq.${encodeURIComponent(req.params.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ is_featured: shouldFeature })
    });
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Article introuvable.' });
    res.json({ ok: true, article: mapArticle(rows[0]), message: shouldFeature ? 'Article mis à la une.' : 'Article retiré de la une.' });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/publicity/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!requireAdmin(req, res)) return;
  if (!['pending', 'published', 'rejected'].includes(status)) return res.status(400).json({ ok: false, message: 'Statut invalide.' });
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest(`publicity?id=eq.${encodeURIComponent(req.params.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status }) });
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Demande introuvable.' });
    res.json({ ok: true, publicity: mapPublicity(rows[0]) });
  } catch (error) { handleServerError(res, error); }
});

app.post('/api/admin/publicity/:id/update', async (req, res) => {
  const { companyName, company, email, websiteUrl, type, message, placement, plan, startsAt, endsAt } = req.body || {};
  if (!requireAdmin(req, res)) return;
  if (!companyName || !company || !email || !type || !message) return res.status(400).json({ ok: false, message: 'Tous les champs sont requis.' });
  if (websiteUrl && !/^https?:\/\/\S+$/i.test(String(websiteUrl).trim())) return res.status(400).json({ ok: false, message: 'Le lien du site doit commencer par http:// ou https://.' });
  const validPlacement = normalizePlacement(placement);
  const validPlan = normalizePlan(plan);
  const startDate = startsAt ? new Date(startsAt) : null;
  const endDate = endsAt ? new Date(endsAt) : null;
  if (startsAt && Number.isNaN(startDate.getTime())) return res.status(400).json({ ok: false, message: 'La date de début est invalide.' });
  if (endsAt && Number.isNaN(endDate.getTime())) return res.status(400).json({ ok: false, message: 'La date de fin est invalide.' });
  if (startDate && endDate && endDate < startDate) return res.status(400).json({ ok: false, message: 'La date de fin doit être après la date de début.' });
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest(`publicity?id=eq.${encodeURIComponent(req.params.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        company_name: String(companyName).trim(),
        company: String(company).trim(),
        email: String(email).trim(),
        website_url: websiteUrl ? String(websiteUrl).trim() : null,
        type: String(type).trim(),
        message: String(message).trim(),
        placement: validPlacement,
        plan: validPlan,
        starts_at: startsAt || null,
        ends_at: endsAt || null
      })
    });
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Demande introuvable.' });
    res.json({ ok: true, publicity: mapPublicity(rows[0]), message: 'Demande modifiée avec succès.' });
  } catch (error) { handleServerError(res, error); }
});

async function deleteAdminRow(table, id, req, res, label) {
  if (!requireAdmin(req, res)) return;
  if (!requireSupabase(res)) return;
  try {
    const rows = await supabaseRequest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
    if (!rows.length) return res.status(404).json({ ok: false, message: `${label} introuvable.` });
    res.json({ ok: true, message: `${label} supprimé.` });
  } catch (error) { handleServerError(res, error); }
}

app.post('/api/admin/articles/:id/delete', (req, res) => deleteAdminRow('articles', req.params.id, req, res, 'Article'));
app.post('/api/admin/contacts/:id/delete', (req, res) => deleteAdminRow('contacts', req.params.id, req, res, 'Message'));
app.post('/api/admin/publicity/:id/delete', (req, res) => deleteAdminRow('publicity', req.params.id, req, res, 'Demande'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'KalfouNouvel.html')));

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
