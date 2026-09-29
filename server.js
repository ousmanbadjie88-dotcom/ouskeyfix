import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {MARKETS, seedUsers, seedProfessionals} from './markets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA = path.join(__dirname, 'data', 'db.json');
const PUBLIC = path.join(__dirname, 'public');
const MAX_BODY = 750_000;

const seed = {
  users: seedUsers,
  professionals: seedProfessionals,
  jobs: [],
  quotes: [],
  bookings: [],
  messages: [],
  reviews: [],
  visits: [],
  agentRuns: []
};

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch {
    fs.mkdirSync(path.dirname(DATA), {recursive: true});
    fs.writeFileSync(DATA, JSON.stringify(seed, null, 2));
    return structuredClone(seed);
  }
}

let db = load();
function save() {
  fs.writeFileSync(DATA, JSON.stringify(db, null, 2));
}
function id(prefix) {
  return prefix + '_' + crypto.randomBytes(5).toString('hex');
}
function send(res, status, data, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS'
  });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}
async function body(req) {
  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_BODY) throw Object.assign(new Error('Payload too large'), {status: 413});
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Payload too large'), {status: 413});
    chunks.push(c);
  }
  const s = Buffer.concat(chunks).toString();
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    throw Object.assign(new Error('Invalid JSON'), {status: 400});
  }
}
function norm(s) {
  return String(s || '')
    .trim()
    .toLocaleLowerCase('sv-SE')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o');
}
function file(reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const clean = path.posix.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\//, '');
  const p = path.resolve(PUBLIC, rel);
  if (p !== PUBLIC && !p.startsWith(PUBLIC + path.sep)) return null;
  return p;
}
function currentUser(req) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : (req.headers['x-user-id'] || '');
  return db.users.find(u => u.id === token) || null;
}
const STOP = new Set(['and','the','a','an','for','with','from','to','of','in','on','or','help','need','service','services','home','local']);
function tokens(s) {
  return norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP.has(w));
}
function categoriesMatch(pro, category) {
  if (!category) return true;
  const cat = norm(category);
  const catTok = new Set(tokens(category));
  const aliases = {
    'furniture assembly': ['furniture', 'assemble', 'assembly', 'wardrobe', 'ikea', 'byra', 'hylla'],
    carpentry: ['carpentry', 'carpenter', 'wood', 'wooden', 'shelf', 'axe', 'yxa', 'yxskaft', 'handle', 'snickeri', 'snickare', 'tool'],
    'home repair': ['handyman', 'leak', 'door', 'hinge', 'socket', 'tap', 'kran', 'hantverkare'],
    cleaning: ['clean', 'cleaning', 'stada', 'stadning', 'stadare'],
    moving: ['move', 'moving', 'flytt', 'flytta', 'relocation'],
    'garden services': ['garden', 'tradgard', 'lawn', 'grass', 'hedge']
  };
  const services = [pro.service, ...(pro.services || [])];
  for (const svc of services) {
    const key = norm(svc);
    if (key === cat) return true;
    const svcTok = tokens(svc);
    const overlap = svcTok.filter(w => catTok.has(w));
    if (overlap.length) return true;
    const extra = aliases[key] || [];
    if (extra.some(a => cat === a || cat.split(/[^a-z0-9]+/).includes(a))) return true;
    if (aliases[cat] && aliases[cat].some(a => key.includes(a))) return true;
  }
  return false;
}
function market(code) {
  return MARKETS.find(m => m.code === String(code || '').toUpperCase()) || MARKETS[0];
}
function matchPros({country, city, category}) {
  return db.professionals.filter(p => {
    const countryOk = !country || String(p.country).toUpperCase() === String(country).toUpperCase();
    const cityOk = !city || norm(p.city) === norm(city);
    return countryOk && cityOk && categoriesMatch(p, category);
  });
}
async function ai(text, context = {}) {
  if (process.env.OPENAI_API_KEY) {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: 'You are OuskeyFix job-intake assistant for a multi-country local services marketplace. Extract a local service request. Return JSON only with category (one of: Furniture assembly, Carpentry, Home repair, Cleaning, Moving, Garden services), title, description, urgency, country (ISO2 if known), city, preferredTime, questions (array of short follow-ups). Never diagnose dangerous conditions or guarantee price. If the job sounds dangerous (gas, major electrical, structural collapse), set urgency to Safety review needed.'
            }]
          },
          {role: 'user', content: [{type: 'input_text', text: JSON.stringify({text, context})}]}
        ],
        text: {format: {type: 'json_object'}}
      })
    });
    if (r.ok) {
      const j = await r.json();
      const out = j.output_text || j.output?.map(x => x.content?.map(c => c.text).join('')).join('');
      try { return JSON.parse(out); } catch {}
    }
  }
  const t = text.toLowerCase();
  let category = 'Home repair';
  if (/(axe|yxa|yxskaft|handle|snick|carpentry|carpenter|wood handle|wooden)/.test(t)) category = 'Carpentry';
  else if (/(clean|städ|stada)/.test(t)) category = 'Cleaning';
  else if (/\b(move|moving|flytt|flytta|relocation)\b/.test(t)) category = 'Moving';
  else if (/(wardrobe|assemble|assembly|furniture|ikea|byrå)/.test(t)) category = 'Furniture assembly';
  else if (/(garden|trädgård|tradgard|lawn|grass)/.test(t)) category = 'Garden services';
  const questions = [];
  if (!context.city) questions.push('Which city should we search in?');
  if (!context.preferredTime) questions.push('When should the work be done?');
  return {
    category,
    title: text.slice(0, 70),
    description: text,
    urgency: /gas|electrical fire|collapse|eldsvåda/.test(t) ? 'Safety review needed' : 'Normal',
    city: context.city || 'Umeå',
    preferredTime: context.preferredTime || 'Flexible',
    questions
  };
}

async function route(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = u.pathname;
  const q = Object.fromEntries(u.searchParams.entries());

  if (p === '/api/health') return send(res, 200, {ok: true, service: 'OuskeyFix', version: '0.6.0', markets: MARKETS.length});
  if (p === '/api/markets' && req.method === 'GET') return send(res, 200, {markets: MARKETS});

  if (p === '/api/session' && req.method === 'POST') {
    const b = await body(req);
    const user = db.users.find(x => x.id === b.userId);
    if (!user) return send(res, 404, {error: 'User not found'});
    return send(res, 200, {user, token: user.id, note: 'Demo session only. Not production auth.'});
  }
  if (p === '/api/users' && req.method === 'GET') {
    return send(res, 200, {users: db.users.map(({id, name, role, city, country}) => ({id, name, role, city, country}))});
  }

  if (p === '/api/professionals' && req.method === 'GET') {
    return send(res, 200, {professionals: matchPros({country: q.country, city: q.city, category: q.category})});
  }

  if (p === '/api/ai/intake' && req.method === 'POST') {
    const b = await body(req);
    return send(res, 200, {job: await ai(b.text || '', b.context || {})});
  }

  if (p === '/api/jobs' && req.method === 'POST') {
    const b = await body(req);
    if (b.photo?.dataUrl && String(b.photo.dataUrl).length > 200_000) {
      return send(res, 413, {error: 'Photo too large for the demo database. Use a smaller image.'});
    }
    const job = {
      id: id('job'),
      customerId: b.customerId || currentUser(req)?.id || 'u_demo',
      status: 'open',
      createdAt: new Date().toISOString(),
      title: b.title || b.description || 'Service request',
      description: b.description || b.title || '',
      category: b.category || 'Home repair',
      country: (b.country || 'SE').toUpperCase(),
      city: b.city || market(b.country).cities[0],
      currency: b.currency || market(b.country).currency,
      preferredTime: b.preferredTime || 'Flexible',
      urgency: b.urgency || 'Normal',
      photo: b.photo ? {name: b.photo.name, attached: true} : null
    };
    db.jobs.push(job);
    save();
    return send(res, 201, {job});
  }
  if (p === '/api/jobs' && req.method === 'GET') {
    let jobs = db.jobs.slice();
    if (q.status) jobs = jobs.filter(j => j.status === q.status);
    if (q.city) jobs = jobs.filter(j => norm(j.city) === norm(q.city));
    if (q.country) jobs = jobs.filter(j => String(j.country || '').toUpperCase() === String(q.country).toUpperCase());
    if (q.category) jobs = jobs.filter(j => norm(j.category) === norm(q.category));
    if (q.customerId) jobs = jobs.filter(j => j.customerId === q.customerId);
    if (q.professionalId) {
      const pro = db.professionals.find(x => x.id === q.professionalId);
      jobs = jobs.filter(j => j.status === 'open' && pro && String(j.country || pro.country).toUpperCase() === String(pro.country).toUpperCase() && norm(j.city) === norm(pro.city) && categoriesMatch(pro, j.category));
    }
    return send(res, 200, {jobs});
  }
  if (p.startsWith('/api/jobs/') && req.method === 'GET') {
    const job = db.jobs.find(x => x.id === p.split('/')[3]);
    return job ? send(res, 200, {job}) : send(res, 404, {error: 'Job not found'});
  }

  if (p === '/api/quotes' && req.method === 'POST') {
    const b = await body(req);
    const job = db.jobs.find(x => x.id === b.jobId);
    if (!job) return send(res, 404, {error: 'Job not found'});
    const qte = {
      id: id('quote'),
      status: 'sent',
      createdAt: new Date().toISOString(),
      jobId: b.jobId,
      professionalId: b.professionalId,
      amount: b.amount == null ? null : Number(b.amount),
      currency: b.currency || market(job.country).currency,
      description: b.description || ''
    };
    db.quotes.push(qte);
    save();
    return send(res, 201, {quote: qte});
  }
  if (p === '/api/quotes' && req.method === 'GET') {
    let quotes = db.quotes.slice();
    if (q.jobId) quotes = quotes.filter(x => x.jobId === q.jobId);
    if (q.professionalId) quotes = quotes.filter(x => x.professionalId === q.professionalId);
    if (q.customerId) {
      const ids = new Set(db.jobs.filter(j => j.customerId === q.customerId).map(j => j.id));
      quotes = quotes.filter(x => ids.has(x.jobId));
    }
    return send(res, 200, {quotes});
  }
  if (p.startsWith('/api/quotes/') && p.endsWith('/accept') && req.method === 'POST') {
    const quoteId = p.split('/')[3];
    const quote = db.quotes.find(x => x.id === quoteId);
    if (!quote) return send(res, 404, {error: 'Quote not found'});
    quote.status = 'accepted';
    db.quotes.filter(x => x.jobId === quote.jobId && x.id !== quote.id && x.status === 'sent').forEach(x => { x.status = 'declined'; });
    const job = db.jobs.find(x => x.id === quote.jobId);
    if (job) job.status = 'booked';
    const booking = {
      id: id('book'),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      jobId: quote.jobId,
      quoteId: quote.id,
      professionalId: quote.professionalId,
      customerId: job?.customerId || 'u_demo',
      amount: quote.amount || 0,
      currency: quote.currency || 'SEK'
    };
    db.bookings.push(booking);
    save();
    return send(res, 200, {quote, booking});
  }

  if (p === '/api/bookings' && req.method === 'POST') {
    const b = await body(req);
    const booking = {
      id: id('book'),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      ...b
    };
    db.bookings.push(booking);
    const j = db.jobs.find(x => x.id === b.jobId);
    if (j) j.status = 'booked';
    save();
    return send(res, 201, {booking});
  }
  if (p === '/api/bookings' && req.method === 'GET') {
    let bookings = db.bookings.slice();
    if (q.customerId) bookings = bookings.filter(x => x.customerId === q.customerId);
    if (q.professionalId) bookings = bookings.filter(x => x.professionalId === q.professionalId);
    return send(res, 200, {bookings});
  }

  if (p === '/api/messages' && req.method === 'POST') {
    const b = await body(req);
    const m = {id: id('msg'), createdAt: new Date().toISOString(), ...b};
    db.messages.push(m);
    save();
    return send(res, 201, {message: m});
  }
  if (p === '/api/messages' && req.method === 'GET') {
    let messages = db.messages.slice();
    if (q.jobId) messages = messages.filter(x => x.jobId === q.jobId);
    return send(res, 200, {messages});
  }

  if (p === '/api/reviews' && req.method === 'POST') {
    const b = await body(req);
    const r = {id: id('rev'), createdAt: new Date().toISOString(), ...b};
    db.reviews.push(r);
    save();
    return send(res, 201, {review: r});
  }
  if (p === '/api/reviews' && req.method === 'GET') {
    let reviews = db.reviews.slice();
    if (q.professionalId) reviews = reviews.filter(x => x.professionalId === q.professionalId);
    return send(res, 200, {reviews});
  }

  if (p === '/api/payments/checkout' && req.method === 'POST') {
    const b = await body(req);
    return send(res, 200, {
      mode: 'demo',
      status: 'requires_provider_connection',
      amount: b.amount,
      currency: b.currency || 'SEK',
      message: 'Payment provider connection required before live charges. Booking can still be recorded as a demo reservation.'
    });
  }

  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'badjieart@gmail.com').toLowerCase();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMeNow';
  const AGENTS = {
    intake: 'Extract a local service request. JSON only.',
    match: 'Rank ONLY given professionals. JSON: {rankedIds, reasons}.',
    safety: 'JSON: {ok, level, message}.',
    quote: 'JSON: {amountHint, currency, hoursHint, text}.',
    owner: 'JSON: {headline, attention:[]}'
  };

  if (p === '/api/login' && req.method === 'POST') {
    const b = await body(req);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return send(res, 401, {error: 'Wrong email or password'});
    }
    let user = db.users.find(x => x.role === 'admin');
    if (!user) {
      user = {id: 'u_admin', name: 'Ousman Badjie', email: ADMIN_EMAIL, role: 'admin', city: 'Umeå', country: 'SE'};
      db.users.push(user);
      save();
    }
    return send(res, 200, {user, token: user.id});
  }

  if (p === '/api/visits' && req.method === 'POST') {
    const b = await body(req);
    db.visits = db.visits || [];
    db.visits.push({
      id: id('vis'),
      at: new Date().toISOString(),
      path: String(b.path || '/').slice(0, 120),
      country: String(b.country || '').slice(0, 8),
      city: String(b.city || '').slice(0, 60)
    });
    if (db.visits.length > 2000) db.visits = db.visits.slice(-2000);
    save();
    return send(res, 201, {ok: true});
  }

  if (p === '/api/profile' && req.method === 'PUT') {
    const usr = currentUser(req);
    if (!usr) return send(res, 401, {error: 'Login first'});
    const b = await body(req);
    if (b.photo && String(b.photo).length > 200000) return send(res, 413, {error: 'Photo too large'});
    if (b.cover && String(b.cover).length > 250000) return send(res, 413, {error: 'Cover too large'});
    usr.photo = b.photo || usr.photo || '';
    usr.cover = b.cover || usr.cover || '';
    usr.accent = b.accent || usr.accent || '#6d28d9';
    if (b.name) usr.name = b.name;
    const pro = db.professionals.find(x => x.id === usr.id);
    if (pro) {
      pro.photo = usr.photo;
      pro.cover = usr.cover;
      pro.accent = usr.accent;
      if (b.name) pro.name = b.name;
    }
    save();
    return send(res, 200, {user: usr, professional: pro || null});
  }

  if (p === '/api/ai/run' && req.method === 'POST') {
    const b = await body(req);
    const agent = AGENTS[b.agent] ? b.agent : 'intake';
    let result = {answer: 'Describe the job in your city. OuskeyFix will match a local professional.', agent};
    db.agentRuns = db.agentRuns || [];
    db.agentRuns.push({id: id('ai'), at: new Date().toISOString(), agent, userId: currentUser(req)?.id || null});
    save();
    return send(res, 200, {agent, result});
  }

  if (p === '/api/admin/summary' && req.method === 'GET') {
    const usr = currentUser(req);
    if (!usr || usr.role !== 'admin') return send(res, 403, {error: 'Admin only. Log in first.'});
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const visits = db.visits || [];
    return send(res, 200, {
      adminName: usr.name,
      visitsToday: visits.filter(v => String(v.at || '').slice(0, 10) === today).length,
      visits7d: visits.filter(v => now - Date.parse(v.at) < 7 * 86400000).length,
      visitsTotal: visits.length,
      signups: db.users.filter(x => x.role !== 'admin').length,
      companies: db.professionals.length,
      jobsOpen: db.jobs.filter(j => j.status === 'open').length,
      quotes: db.quotes.length,
      bookings: db.bookings.length,
      recentVisits: visits.slice(-50).reverse(),
      users: db.users.filter(x => x.role !== 'admin').map(({id, name, role, city, country}) => ({id, name, role, city, country})),
      recentJobs: db.jobs.slice(-30).reverse(),
      recentBookings: db.bookings.slice(-30).reverse()
    });
  }

  if (p.startsWith('/api/')) return send(res, 404, {error: 'API route not found'});

  const fp = file(p);
  if (!fp) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(fp, (e, d) => {
    if (e) return send(res, 404, 'Not found', 'text/plain');
    const ext = path.extname(fp);
    const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json'};
    send(res, 200, d, types[ext] || 'application/octet-stream');
  });
}

http.createServer((req, res) => route(req, res).catch(e => {
  console.error(e);
  send(res, e.status || 500, {error: e.message || 'Server error'});
})).listen(PORT, () => console.log(`OuskeyFix v0.6 running at http://localhost:${PORT}`));
