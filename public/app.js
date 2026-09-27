const state = {
  screen: 'home',
  user: {id: 'u_demo', name: 'Demo Customer', role: 'customer'},
  users: [],
  messages: [],
  job: null,
  selected: null,
  quotes: [],
  bookings: [],
  inbox: [],
  location: 'Umeå',
  country: 'SE',
  markets: [],
  photo: null,
  loading: false,
  followUps: []
};
let pros = [];
function market() {
  return state.markets.find(m => m.code === state.country) || state.markets[0] || {code: 'SE', name: 'Sweden', currency: 'SEK', cities: ['Umeå']};
}
function cities() {
  return market().cities || ['Umeå'];
}
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[c]));

async function api(url, opts = {}) {
  const r = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + state.user.id,
      'X-User-Id': state.user.id,
      ...(opts.headers || {})
    },
    ...opts
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

async function boot() {
  const [users, markets] = await Promise.all([api('/api/users'), api('/api/markets')]);
  state.users = users.users;
  state.markets = markets.markets;
  await refreshRoleData();
  render();
}

async function refreshRoleData() {
  if (state.user.role === 'professional') {
    const [jobs, quotes, bookings] = await Promise.all([
      api('/api/jobs?professionalId=' + encodeURIComponent(state.user.id)),
      api('/api/quotes?professionalId=' + encodeURIComponent(state.user.id)),
      api('/api/bookings?professionalId=' + encodeURIComponent(state.user.id))
    ]);
    state.inbox = jobs.jobs;
    state.quotes = quotes.quotes;
    state.bookings = bookings.bookings;
  } else {
    const [quotes, bookings, jobs] = await Promise.all([
      api('/api/quotes?customerId=' + encodeURIComponent(state.user.id)),
      api('/api/bookings?customerId=' + encodeURIComponent(state.user.id)),
      api('/api/jobs?customerId=' + encodeURIComponent(state.user.id))
    ]);
    state.quotes = quotes.quotes;
    state.bookings = bookings.bookings;
    state.myJobs = jobs.jobs;
  }
}

async function loadPros(category) {
  const url = '/api/professionals?country=' + encodeURIComponent(state.country) + '&city=' + encodeURIComponent(state.location) + (category ? '&category=' + encodeURIComponent(category) : '');
  const j = await api(url);
  pros = j.professionals;
}

function render() {
  document.getElementById('app').innerHTML = `<div class="app">
    <header class="topbar">
      <div class="logo" onclick="go('home')">Ouskey<span>Fix</span></div>
      <div class="stack">
        <span class="pill">${esc(market().name)} • ${esc(state.location)} • ${esc(market().currency)}</span>
        <select class="select compact" onchange="setCountry(this.value)">
          ${state.markets.map(m => `<option value="${esc(m.code)}" ${m.code === state.country ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        </select>
        <select class="select compact" onchange="switchUser(this.value)">
          ${state.users.map(u => `<option value="${esc(u.id)}" ${u.id === state.user.id ? 'selected' : ''}>${esc(u.role === 'customer' ? 'Customer' : 'Pro')}: ${esc(u.name)}</option>`).join('')}
        </select>
      </div>
    </header>
    ${state.user.role === 'customer' ? customer() : professional()}
    <div class="footer">OuskeyFix • Local matching by country and city • Payments coming next</div>
  </div>`;
}

function customer() {
  const screens = {home, ai, results, profile, booking, account};
  return `<div class="wrap">${(screens[state.screen] || home)()}</div>`;
}

function home() {
  return `<section class="hero">
    <div class="eyebrow">AI local service assistant • ${esc(market().name)}</div>
    <h1>Tell us what you need. We’ll match a professional in your city for that job.</h1>
    <p class="sub">Describe the job in your own words. OuskeyFix classifies it, then shows only professionals who cover that service in the selected city.</p>
    <div class="card" style="margin-top:24px">
      <h2>What do you need help with?</h2>
      <div class="stack" style="margin-top:14px">
        <button class="btn primary" onclick="startAI()">✨ Tell OuskeyFix</button>
        <button class="btn secondary" onclick="quick('Building construction')">🏗️ Construction</button>
        <button class="btn secondary" onclick="quick('Car mechanic')">🚗 Mechanic</button>
        <button class="btn secondary" onclick="quick('Carpentry')">🔨 Carpentry</button>
        <button class="btn secondary" onclick="quick('Cleaning')">🧹 Cleaning</button>
        <button class="btn secondary" onclick="quick('Home repair')">🏠 Home repair</button>
      </div>
    </div>
  </section>
  <section class="section">
    <h2>How it works</h2>
    <div class="grid">
      <div class="card"><div class="icon">✨</div><h3>1. Tell us</h3><p class="meta">Explain the job in your own words.</p></div>
      <div class="card"><div class="icon">🎯</div><h3>2. Match by job + city</h3><p class="meta">Only relevant, local professionals are listed.</p></div>
      <div class="card"><div class="icon">📅</div><h3>3. Quote and book</h3><p class="meta">Accept a quote. Payments stay demo until a provider is connected.</p></div>
    </div>
  </section>
  <section class="section">
    <h2>Popular services</h2>
    <div class="grid">${[['🏗️','Building construction'],['🚗','Car mechanic'],['🔨','Carpentry'],['🔧','Plumbing'],['⚡','Electrical'],['🎨','Painting'],['🔑','Locksmith'],['🌳','Garden services'],['🧹','Cleaning'],['📦','Moving'],['🏠','Home repair'],['🪑','Furniture assembly']].map(x => `<div class="card"><div class="icon">${x[0]}</div><h3>${x[1]}</h3><button class="btn ghost" onclick="quick('${x[1]}')">Find help →</button></div>`).join('')}</div>
  </section>`;
}

function startAI(initial = '') {
  state.screen = 'ai';
  state.messages = initial ? [{who: 'me', text: initial}] : [];
  state.followUps = [];
  render();
  if (initial) setTimeout(() => aiReply(initial), 150);
}
function quick(t) { startAI(`I need help with ${t.toLowerCase()}.`); }

function ai() {
  return `<div class="chat">
    <div class="eyebrow">OuskeyFix AI</div>
    <h2>Create your job request</h2>
    ${state.messages.length === 0 ? `<div class="bubble ai">Hi! Tell me what you need help with in ${esc(state.location)}, ${esc(market().name)}.</div>` : state.messages.map(m => `<div class="bubble ${m.who === 'ai' ? 'ai' : 'me'}">${esc(m.text)}</div>`).join('')}
    ${state.loading ? '<div class="bubble ai">Thinking…</div>' : ''}
    <div id="opts">${followUpHtml()}</div>
    <form onsubmit="sendAI(event)" class="card">
      <label class="label">Describe the job</label>
      <textarea id="aiinput" class="textarea" placeholder="Example: I need someone to assemble a large wardrobe tomorrow evening."></textarea>
      <div class="stack" style="margin-top:10px">
        <button class="btn primary">Send</button>
        <label class="btn secondary">📷 Add photo<input hidden type="file" accept="image/*" onchange="photo(event)"></label>
      </div>
    </form>
    <button class="btn ghost" onclick="go('home')">← Back</button>
  </div>`;
}

function followUpHtml() {
  if (!state.followUps.length) return '';
  return state.followUps.map(block => `<div class="option">${block}</div>`).join('');
}

async function sendAI(e) {
  e.preventDefault();
  const v = document.getElementById('aiinput').value.trim();
  if (!v) return;
  state.messages.push({who: 'me', text: v});
  render();
  await aiReply(v);
}

async function aiReply(text) {
  state.loading = true;
  render();
  try {
    const j = await api('/api/ai/intake', {method: 'POST', body: JSON.stringify({text, context: {city: state.location, country: state.country}})});
    state.job = {...j.job, customerId: state.user.id, photo: state.photo};
    const extra = (j.job.questions || []).filter(Boolean).slice(0, 2);
    const extraText = extra.length ? ' Also useful: ' + extra.join(' ') : '';
    state.messages.push({who: 'ai', text: `I understood this as ${j.job.category}. Which city should we search?${extraText}`});
    state.followUps = [cities().map(c => `<button onclick="locationChoice('${c}')">📍 ${c}</button>`).join('') + `<button onclick="showCityInput()">Another city</button>`];
  } catch {
    state.messages.push({who: 'ai', text: 'AI service unavailable. Using the built-in classifier instead.'});
    state.job = {category: 'Home repair', title: text.slice(0, 70), description: text, city: state.location, customerId: state.user.id};
    state.followUps = [cities().map(c => `<button onclick="locationChoice('${c}')">📍 ${c}</button>`).join('')];
  }
  state.loading = false;
  render();
}

function showCityInput() {
  state.followUps = [`<form onsubmit="customCity(event)" class="stack"><input id="cityin" class="input" placeholder="City in ${esc(market().name)}" value="${esc(state.location)}"><button class="btn primary">Use city</button></form>`];
  render();
}
function customCity(e) {
  e.preventDefault();
  locationChoice(document.getElementById('cityin').value.trim() || market().cities[0]);
}
function locationChoice(city) {
  state.location = city;
  if (state.job) state.job.city = city;
  state.messages.push({who: 'me', text: city});
  state.messages.push({who: 'ai', text: 'When would you like the work done?'});
  state.followUps = [['Today', 'Tomorrow', 'This week', 'Flexible'].map(t => `<button onclick="finishJob('${t}')">${t}</button>`).join('')];
  render();
}

async function finishJob(time) {
  state.job.preferredTime = time;
  state.job.country = state.country;
  state.job.city = state.location;
  state.job.currency = market().currency;
  state.messages.push({who: 'me', text: time});
  try {
    const j = await api('/api/jobs', {method: 'POST', body: JSON.stringify(state.job)});
    state.job = j.job;
  } catch (err) {
    alert(err.message);
  }
  await loadPros(state.job.category);
  state.screen = 'results';
  state.followUps = [];
  render();
}

function results() {
  const empty = !pros.length;
  return `<div class="eyebrow">Matched professionals</div>
    <h2>Professionals for ${esc(state.job?.category || 'your job')}</h2>
    <p class="meta">${esc(state.job?.title || state.job?.description || '')} • ${esc(market().name)} • ${esc(state.location)} • ${esc(state.job?.preferredTime)} • matched by country + city + service</p>
    ${empty ? `<div class="card" style="margin-top:20px"><p>No professionals in ${esc(state.location)}, ${esc(market().name)} cover <strong>${esc(state.job?.category)}</strong> yet. Demo supply exists only in selected launch cities.</p></div>` : ''}
    <div class="grid2" style="margin-top:20px">${pros.map(p => `<div class="card">
      <div class="professional"><div class="avatar">🔧</div><div>
        <h3>${esc(p.name)}</h3>
        <div class="stars">★ ${p.rating}</div>
        <div class="meta">${p.jobs} completed jobs • ${esc(p.distance)}</div>
      </div></div>
      <p>${esc(p.service)}</p>
      ${p.verified ? '<span class="status">✓ Verified</span>' : '<span class="status pending">Verification pending</span>'}
      <p class="meta">Available: ${esc(p.available)}</p>
      <div class="stack" style="justify-content:space-between;align-items:center">
        <span class="price">${esc(p.price)}</span>
        <button class="btn primary" onclick="selectPro('${p.id}')">View profile</button>
      </div>
    </div>`).join('')}</div>
    <button class="btn ghost" onclick="go('ai')">← Edit request</button>`;
}

function selectPro(id) {
  state.selected = pros.find(p => p.id === id);
  state.screen = 'profile';
  render();
}

function profile() {
  const p = state.selected;
  return `<div class="card">
    <div class="professional"><div class="avatar">🔧</div><div>
      <h2>${esc(p.name)}</h2>
      <div class="stars">★ ${p.rating} • ${p.jobs} jobs</div>
      <div class="meta">${esc(p.distance)} away • ${esc(p.available)}</div>
    </div></div>
    <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">
    <h3>Services</h3>
    <p>${esc((p.services || [p.service]).join(', '))}</p>
    <h3 style="margin-top:20px">Verification</h3>
    <p class="meta">${p.verified ? '✓ Identity and business checks recorded as complete in this demo.' : '🟡 This provider has not completed verification. Treat as unverified.'}</p>
    <div class="stack" style="margin-top:22px">
      <button class="btn primary" onclick="requestQuote()">Request quote</button>
      <button class="btn secondary" onclick="messagePro()">Message</button>
    </div>
  </div>
  <button class="btn ghost" onclick="go('results')">← Back</button>`;
}

async function requestQuote() {
  const p = state.selected;
  const guessed = p.price.includes('550') ? 550 : p.price.includes('450') ? 450 : null;
  const j = await api('/api/quotes', {method: 'POST', body: JSON.stringify({
    jobId: state.job.id,
    professionalId: p.id,
    amount: guessed,
    currency: p.currency || market().currency,
    description: guessed ? `Indicative price for ${state.job.category}` : 'Quote required from provider'
  })});
  state.booking = {quote: j.quote};
  state.screen = 'booking';
  render();
}

function booking() {
  const p = state.selected, q = state.booking?.quote;
  return `<div class="eyebrow">Booking</div>
    <h2>Review quote</h2>
    <div class="grid2">
      <div class="card">
        <h3>${esc(p.name)}</h3>
        <p class="meta">${esc(p.service)}</p>
        <p>📍 ${esc(state.location)}</p>
        <p>📅 ${esc(state.job?.preferredTime)}</p>
        <p>💬 Quote: ${q?.amount != null ? `${q.amount} ${q.currency}` : 'Waiting for a priced quote'}</p>
        ${p.verified ? '' : '<p class="meta">This provider is not verified.</p>'}
      </div>
      <div class="card">
        <h3>Payment</h3>
        <p class="meta">Checkout stays demo. Confirming records a reservation only. No card is charged.</p>
        <button class="btn primary" style="width:100%;margin-top:16px" onclick="acceptQuote()">Accept quote &amp; reserve</button>
      </div>
    </div>
    <button class="btn ghost" onclick="go('profile')">← Back</button>`;
}

async function acceptQuote() {
  const quote = state.booking?.quote;
  if (!quote) return;
  await api('/api/payments/checkout', {method: 'POST', body: JSON.stringify({amount: quote.amount || 0, currency: quote.currency || market().currency, jobId: state.job.id})});
  const j = await api('/api/quotes/' + quote.id + '/accept', {method: 'POST'});
  state.booking = {...state.booking, confirmed: true, record: j.booking};
  await refreshRoleData();
  go('account');
}

async function messagePro() {
  const text = document.getElementById('msgbox') ? document.getElementById('msgbox').value : '';
  const msg = text || 'Hi, I would like to ask about this job.';
  await api('/api/messages', {method: 'POST', body: JSON.stringify({jobId: state.job?.id, from: state.user.id, to: state.selected.id, text: msg})});
  alert('Message stored on the job. There is no live chat server in this demo.');
}

function account() {
  const jobs = state.myJobs || [];
  const quotes = state.quotes || [];
  const bookings = state.bookings || [];
  return `<div class="hero"><div class="eyebrow">Customer account</div><h1>My OuskeyFix</h1></div>
    <div class="grid2">
      <div class="card"><h3>📋 Jobs</h3>${jobs.length ? jobs.map(j => `<p class="meta">${esc(j.category)} • ${esc(j.city)} • ${esc(j.status)}</p>`).join('') : '<p class="meta">No jobs yet.</p>'}</div>
      <div class="card"><h3>💬 Quotes</h3>${quotes.length ? quotes.map(q => `<p class="meta">${esc(q.amount != null ? q.amount + ' ' + q.currency : 'Unpriced')} • ${esc(q.status)} ${q.status === 'sent' ? `<button class="btn ghost" onclick="acceptStored('${q.id}')">Accept</button>` : ''}</p>`).join('') : '<p class="meta">No quotes yet.</p>'}</div>
      <div class="card"><h3>📅 Bookings</h3>${bookings.length ? bookings.map(b => `<p class="meta">${esc(b.amount)} ${esc(b.currency)} • ${esc(b.status)}</p>`).join('') : '<p class="meta">No bookings yet.</p>'}</div>
      <div class="card"><h3>💳 Payments</h3><p class="meta">Demo mode. No live charges.</p></div>
    </div>
    <button class="btn primary" style="margin-top:18px" onclick="go('home')">Find another service</button>`;
}

async function acceptStored(id) {
  await api('/api/quotes/' + id + '/accept', {method: 'POST'});
  await refreshRoleData();
  render();
}

function professional() {
  const open = state.inbox || [];
  const quotes = state.quotes || [];
  const bookings = state.bookings || [];
  const month = bookings.reduce((s, b) => s + Number(b.amount || 0), 0);
  const ccy = market().currency;
  return `<div class="hero">
      <div class="eyebrow">Professional dashboard</div>
      <h1>${esc(state.user.name)}</h1>
      <p class="sub">Open jobs in your city and services, plus quotes and bookings from the database.</p>
    </div>
    <div class="kpis">
      <div class="card kpi"><span class="meta">Matching open jobs</span><strong>${open.length}</strong></div>
      <div class="card kpi"><span class="meta">Sent quotes</span><strong>${quotes.length}</strong></div>
      <div class="card kpi"><span class="meta">Bookings</span><strong>${bookings.length}</strong></div>
      <div class="card kpi"><span class="meta">Recorded volume</span><strong>${month.toLocaleString()} ${esc(ccy)}</strong></div>
    </div>
    <section class="section">
      <h2>Open jobs that match you</h2>
      ${open.length ? open.map(j => `<div class="card" style="margin-bottom:12px">
        <h3>${esc(j.title || j.category)}</h3>
        <p class="meta">${esc(j.category)} • ${esc(j.country || '')} • ${esc(j.city)} • ${esc(j.preferredTime)}</p>
        <p>${esc(j.description || '')}</p>
        <form class="stack" onsubmit="sendProQuote(event,'${j.id}')">
          <input class="input" name="amount" type="number" min="0" placeholder="Amount ${esc(ccy)}" required>
          <button class="btn primary">Send quote</button>
        </form>
      </div>`).join('') : '<div class="card"><p class="meta">No open jobs match your services in your city. Create one as the demo customer first.</p></div>'}
    </section>
    <section class="section">
      <h2>Your quotes</h2>
      <div class="card">${quotes.length ? quotes.map(q => `<p class="meta">${esc(q.jobId)} • ${q.amount != null ? q.amount + ' ' + (q.currency || ccy) : 'unpriced'} • ${esc(q.status)}</p>`).join('') : '<p class="meta">No quotes sent yet.</p>'}</div>
    </section>
    <section class="section">
      <h2>Verification</h2>
      <div class="card"><p class="meta">${esc(market().verifyHint)}. Some seed providers are unverified on purpose. This is still not a real KYC flow.</p></div>
    </section>`;
}

async function sendProQuote(e, jobId) {
  e.preventDefault();
  const amount = Number(new FormData(e.target).get('amount'));
  await api('/api/quotes', {method: 'POST', body: JSON.stringify({
    jobId,
    professionalId: state.user.id,
    amount,
    currency: market().currency,
    description: 'Provider quote'
  })});
  await refreshRoleData();
  render();
}

async function switchUser(id) {
  const j = await api('/api/session', {method: 'POST', body: JSON.stringify({userId: id})});
  state.user = j.user;
  if (j.user.country) {
    state.country = j.user.country;
    state.location = j.user.city || market().cities[0];
  }
  state.screen = 'home';
  await refreshRoleData();
  render();
}

function setCountry(code) {
  state.country = code;
  const m = market();
  if (!m.cities.includes(state.location)) state.location = m.cities[0];
  render();
}

function go(s) { state.screen = s; render(); }

function photo(e) {
  const f = e.target.files?.[0];
  if (!f) return;
  if (f.size > 160000) {
    alert('Use a smaller photo for this demo database (under ~160KB).');
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    state.photo = {name: f.name, dataUrl: r.result};
    alert('Photo attached to this job request.');
  };
  r.readAsDataURL(f);
}

boot().catch(err => {
  document.getElementById('app').innerHTML = `<div class="wrap"><h1>Could not start OuskeyFix</h1><p>${esc(err.message)}</p></div>`;
});
