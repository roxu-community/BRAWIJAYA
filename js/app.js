/* =========================================================
   BRAWIJAYA — Platform Penangkalan Siber
   Application Logic
   ========================================================= */

'use strict';

/* ============ UTIL ============ */
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const now = () => new Date().toLocaleTimeString('id-ID', { hour12: false });
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

/* ============ CLOCK ============ */
setInterval(() => { $('#clock').textContent = new Date().toLocaleString('id-ID'); }, 1000);

/* ============ TOAST ============ */
function toast(msg, type = 'ok') {
  const icons = { ok: '✓', warn: '⚠', err: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
  $('#toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 220);
  }, 3000);
}

/* ============ MODAL ============ */
const modalBackdrop = $('#modal-backdrop');
const modalContent = $('#modal-content');

function openModal(html) {
  modalContent.innerHTML = html;
  modalBackdrop.classList.add('show');
}
function closeModal() {
  modalBackdrop.classList.remove('show');
}
modalBackdrop.addEventListener('click', e => {
  if (e.target === modalBackdrop) closeModal();
});

/* ============ SIDEBAR DRAWER ============ */
const sidebar = $('#sidebar');
const overlay = $('#overlay');

const openDrawer = () => {
  sidebar.classList.add('open');
  overlay.classList.add('show');
};
const closeDrawer = () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
};

$('#hamburger').addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
});
overlay.addEventListener('click', closeDrawer);

/* ============ NAVIGATION ============ */
const titles = {
  dashboard: 'Dashboard',
  ids: 'Smart IDS/IPS',
  intel: 'Threat Intelligence',
  soar: 'Incident Response',
  zeroday: 'Zero-Day Detection',
  crypto: 'Encryption Tool',
};

function navigate(v) {
  $$('.view').forEach(x => x.classList.toggle('active', x.id === `view-${v}`));
  $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#page-title').textContent = titles[v] || v;
  closeDrawer();
}

$$('nav button').forEach(b => b.addEventListener('click', () => navigate(b.dataset.view)));

/* ============ SETTINGS ============ */
const SETTINGS_KEY = 'brawijaya_settings_v1';
const settings = Object.assign(
  { sound: true, maxAlerts: 200 },
  JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
);
const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

/* ============ SOUND ============ */
let audioCtx = null;
function beep(freq = 880, dur = 150) {
  if (!settings.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur / 1000);
    o.start();
    o.stop(audioCtx.currentTime + dur / 1000);
  } catch {}
}

$('#sound-toggle').addEventListener('click', () => {
  settings.sound = !settings.sound;
  saveSettings();
  $('#sound-toggle').classList.toggle('active', settings.sound);
  $('#sound-toggle').textContent = settings.sound ? '🔔' : '🔕';
  toast(settings.sound ? 'Suara alert aktif' : 'Suara alert dimatikan', 'info');
});
$('#sound-toggle').classList.toggle('active', settings.sound);
$('#sound-toggle').textContent = settings.sound ? '🔔' : '🔕';

/* ============ ALERTS STORE ============ */
const ALERTS_KEY = 'brawijaya_alerts_v1';
const VALID_STATUS = ['new', 'investigating', 'resolved', 'false-positive'];

const IDS = {
  running: false,
  timer: null,
  blocked: 0,
  alerts: JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]')
    .filter(a => a && a.id)
    .slice(0, 500),
};

function saveAlerts() {
  try {
    localStorage.setItem(
      ALERTS_KEY,
      JSON.stringify(IDS.alerts.slice(0, settings.maxAlerts))
    );
  } catch {}
}

/* ============ SIGNATURES ============ */
const SIGNATURES = [
  { name: 'ET SCAN Potential SSH Brute Force', severity: 'tinggi' },
  { name: 'ET WEB_SERVER SQL Injection Attempt', severity: 'kritis' },
  { name: 'ET POLICY Suspicious User-Agent', severity: 'rendah' },
  { name: 'ET TROJAN Emotet C2 Beacon', severity: 'kritis' },
  { name: 'ET SCAN Nmap Port Scan Detected', severity: 'sedang' },
  { name: 'ET EXPLOIT Apache Log4j RCE Attempt', severity: 'kritis' },
  { name: 'ET MALWARE Cobalt Strike Beacon', severity: 'tinggi' },
  { name: 'ET POLICY Outbound DNS Tunneling', severity: 'sedang' },
  { name: 'ET DOS SYN Flood Detected', severity: 'tinggi' },
  { name: 'ET INFO HTTP Request to Suspicious TLD', severity: 'rendah' },
];

function makeAlert() {
  const sig = pick(SIGNATURES);
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : 'a' + Math.random().toString(36).slice(2),
    time: now(),
    timestamp: new Date().toISOString(),
    severity: sig.severity,
    signature: sig.name,
    src: `${rand(1, 223)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`,
    dst: `10.0.0.${rand(2, 254)}:${rand(1024, 65535)}`,
    status: 'new',
    blocked: false,
    note: '',
  };
}

/* ============ RENDER ============ */
function updateStats() {
  $('#stat-threats').textContent = IDS.alerts.filter(a => a.status === 'new').length;
  $('#stat-blocked').textContent = IDS.blocked;
  $('#stat-alerts').textContent = IDS.alerts.length;

  const lvl =
    IDS.alerts.filter(a => a.status === 'new' && a.severity === 'kritis').length > 2 ? 'Tinggi' :
    IDS.alerts.filter(a => a.status === 'new').length > 3 ? 'Sedang' :
    IDS.alerts.filter(a => a.status === 'new').length > 0 ? 'Rendah' : 'Aman';

  $('#threat-level').textContent = lvl;
  $('#threat-level').style.color =
    lvl === 'Tinggi' ? 'var(--danger)' :
    lvl === 'Sedang' ? 'var(--warn)' :
    'var(--accent)';
}

function getFilteredAlerts() {
  const sev = $('#ids-severity-filter').value;
  const q = $('#ids-search').value.trim().toLowerCase();
  return IDS.alerts.filter(a => {
    if (sev !== 'all' && a.severity !== sev) return false;
    if (q &&
      !a.src.toLowerCase().includes(q) &&
      !a.signature.toLowerCase().includes(q) &&
      !a.dst.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderAlertsTable() {
  const list = getFilteredAlerts();
  if (!list.length) {
    $('#ids-tbody').innerHTML = `<tr class="empty"><td colspan="7">Tidak ada alert${IDS.alerts.length ? ' yang cocok dengan filter' : ''}.</td></tr>`;
    return;
  }
  $('#ids-tbody').innerHTML = list.slice(0, 200).map(a => `
    <tr data-id="${a.id}">
      <td class="mono" style="color:var(--muted)">${a.time}</td>
      <td><span class="sev ${a.severity}">${a.severity}</span></td>
      <td>${esc(a.signature)}</td>
      <td class="mono">${a.src}</td>
      <td class="mono">${a.dst}</td>
      <td><span class="status-badge ${a.status}">${a.status.replace('-', ' ')}</span></td>
      <td onclick="event.stopPropagation()">${a.blocked
        ? '<span style="color:var(--accent);font-size:11px">✓ Diblokir</span>'
        : `<button class="btn tiny" onclick="blockAlert('${a.id}', this)">Blokir</button>`}</td>
    </tr>
  `).join('');

  $$('#ids-tbody tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => openAlertDetail(tr.dataset.id));
  });
}

function renderDashboardFeed() {
  const feed = $('#dashboard-feed');
  const items = IDS.alerts.slice(0, 30);
  if (!items.length) {
    feed.innerHTML = '<li style="color:var(--muted);padding:20px;text-align:center;border:none;background:none">Belum ada alert.</li>';
    return;
  }
  feed.innerHTML = items.map(a => `
    <li class="sev-${a.severity}">
      <span>
        <b style="color:var(--danger)">[${a.severity.toUpperCase()}]</b> ${esc(a.signature)}
        <br><small style="color:var(--muted)">${a.src}</small>
      </span>
      <span class="time">${a.time}</span>
    </li>
  `).join('');
}

function refreshAll() {
  updateStats();
  renderAlertsTable();
  renderDashboardFeed();
}

/* ============ ALERT DETAIL MODAL ============ */
function openAlertDetail(id) {
  const a = IDS.alerts.find(x => x.id === id);
  if (!a) return;
  openModal(`
    <h3>Detail Alert <button onclick="closeModal()" title="Tutup">×</button></h3>
    <div class="field-row">
      <div><div class="field-label">Waktu</div><div class="field-value">${a.time}</div></div>
      <div><div class="field-label">Severity</div><div><span class="sev ${a.severity}">${a.severity}</span></div></div>
    </div>
    <div class="field"><div class="field-label">Signature</div><div class="field-value">${esc(a.signature)}</div></div>
    <div class="field-row">
      <div><div class="field-label">Source</div><div class="field-value">${a.src}</div></div>
      <div><div class="field-label">Destination</div><div class="field-value">${a.dst}</div></div>
    </div>
    <hr />
    <label class="form">Status
      <select id="modal-status">
        ${VALID_STATUS.map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s.replace('-', ' ')}</option>`).join('')}
      </select>
    </label>
    <label class="form" style="margin-top:12px">Catatan Investigator
      <textarea id="modal-note" rows="3" placeholder="Tambahkan analisis atau tindak lanjut…">${esc(a.note || '')}</textarea>
    </label>
    <div class="actions">
      <button class="btn ghost" onclick="closeModal()">Batal</button>
      <button class="btn primary" onclick="saveAlertDetail('${a.id}')">Simpan Perubahan</button>
    </div>
  `);
}

window.closeModal = closeModal;
window.openAlertDetail = openAlertDetail;
window.saveAlertDetail = id => {
  const a = IDS.alerts.find(x => x.id === id);
  if (!a) return;
  a.status = $('#modal-status').value;
  a.note = $('#modal-note').value.trim();
  saveAlerts();
  refreshAll();
  closeModal();
  toast('Detail alert diperbarui', 'ok');
};

window.blockAlert = (id, btn) => {
  const a = IDS.alerts.find(x => x.id === id);
  if (!a || a.blocked) return;
  a.blocked = true;
  IDS.blocked++;
  saveAlerts();
  refreshAll();
  toast(`IP ${a.src} diblokir`, 'warn');
};

/* ============ SIMULASI ============ */
function appendAlert(a) {
  IDS.alerts.unshift(a);
  if (IDS.alerts.length > settings.maxAlerts) IDS.alerts.length = settings.maxAlerts;
  if (a.severity === 'kritis') beep(1200, 120);
  else if (a.severity === 'tinggi') beep(800, 100);
  saveAlerts();
  refreshAll();
}

$('#ids-toggle').addEventListener('click', () => {
  if (IDS.running) {
    clearInterval(IDS.timer);
    IDS.running = false;
    $('#ids-toggle').textContent = '▶ Mulai Simulasi';
    toast('Simulasi dihentikan', 'info');
  } else {
    IDS.running = true;
    $('#ids-toggle').textContent = '■ Hentikan Simulasi';
    appendAlert(makeAlert());
    IDS.timer = setInterval(() => {
      if (Math.random() < 0.75) appendAlert(makeAlert());
    }, 2200);
    toast('Simulasi dimulai', 'ok');
  }
});

$('#ids-severity-filter').addEventListener('change', renderAlertsTable);
$('#ids-search').addEventListener('input', renderAlertsTable);

$('#ids-clear').addEventListener('click', () => {
  if (!confirm('Hapus semua alert dari tampilan lokal?')) return;
  IDS.alerts = [];
  saveAlerts();
  refreshAll();
  toast('Semua alert dihapus', 'info');
});

/* ============ EXPORT ============ */
function download(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows, cols) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    cols.join(','),
    ...rows.map(r => cols.map(c => escape(r[c])).join(',')),
  ].join('\n');
}

$('#ids-export').addEventListener('click', () => {
  openModal(`
    <h3>Export Alert <button onclick="closeModal()" title="Tutup">×</button></h3>
    <p class="hint" style="margin-bottom:16px">Pilih format export. Data berasal dari tampilan lokal.</p>
    <div class="btn-row" style="flex-direction:column">
      <button class="btn primary" onclick="doExport('json')">📄 JSON (${IDS.alerts.length} alert)</button>
      <button class="btn" onclick="doExport('csv')">📊 CSV (${IDS.alerts.length} alert)</button>
    </div>
  `);
});

window.doExport = fmt => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  if (fmt === 'json') {
    download(`brawijaya-alerts-${ts}.json`, JSON.stringify(IDS.alerts, null, 2));
  } else {
    const csv = toCSV(IDS.alerts, [
      'id', 'time', 'timestamp', 'severity', 'signature',
      'src', 'dst', 'status', 'blocked', 'note',
    ]);
    download(`brawijaya-alerts-${ts}.csv`, csv, 'text/csv');
  }
  closeModal();
  toast(`Export ${fmt.toUpperCase()} berhasil`, 'ok');
};

/* ============ RULES ============ */
const RULES = [
  { id: 'SID 2001219', name: 'ET SCAN Potential SSH Brute Force', enabled: true },
  { id: 'SID 2013028', name: 'ET WEB_SERVER SQL Injection Attempt', enabled: true },
  { id: 'SID 2024218', name: 'ET TROJAN Emotet C2 Beacon', enabled: true },
  { id: 'SID 2034647', name: 'ET EXPLOIT Apache Log4j RCE Attempt', enabled: true },
  { id: 'SID 2018959', name: 'ET POLICY Outbound DNS Tunneling', enabled: false },
];

function renderRules() {
  $('#rules-list').innerHTML = RULES.map(r => `
    <li>
      <span><code>${r.id}</code> — ${r.name}</span>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" ${r.enabled ? 'checked' : ''} data-rule="${r.id}">
        <span style="color:var(--muted);font-size:11.5px">${r.enabled ? 'AKTIF' : 'NONAKTIF'}</span>
      </label>
    </li>
  `).join('');

  $$('input[data-rule]').forEach(cb => cb.addEventListener('change', e => {
    const r = RULES.find(x => x.id === e.target.dataset.rule);
    r.enabled = e.target.checked;
    renderRules();
    toast(`Rule ${r.id} ${r.enabled ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
  }));
}

/* ============ THREAT INTEL ============ */
const INTEL_KEY = 'brawijaya_intel_v2';
const DEFAULT_INTEL = [
  { value: '185.220.101.45', score: 95, tags: ['TOR exit node', 'Scanner'], source: 'MISP' },
  { value: 'malware-c2.example.com', score: 88, tags: ['C2', 'Emotet'], source: 'OpenCTI' },
  { value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', score: 92, tags: ['Trojan'], source: 'MISP' },
  { value: '91.219.236.166', score: 76, tags: ['Phishing'], source: 'OpenCTI' },
  { value: 'evil-payload.xyz', score: 82, tags: ['Malware host'], source: 'MISP' },
  { value: '45.155.205.233', score: 89, tags: ['Brute force'], source: 'MISP' },
];

const loadIntel = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(INTEL_KEY) || '[]');
    return [...saved, ...DEFAULT_INTEL];
  } catch {
    return [...DEFAULT_INTEL];
  }
};
let INTEL_DB = loadIntel();

function renderIntelFeed() {
  $('#intel-feed').innerHTML = INTEL_DB.slice(0, 20).map(i => `
    <li class="sev-${i.score >= 85 ? 'kritis' : i.score >= 70 ? 'tinggi' : 'sedang'}">
      <span>
        <b class="mono" style="word-break:break-all">${esc(i.value)}</b>
        <br><small style="color:var(--muted)">${i.tags.join(', ')} · ${i.source}</small>
      </span>
      <span class="time" style="color:${i.score >= 85 ? 'var(--danger)' : 'var(--warn)'}">${i.score}</span>
    </li>
  `).join('');
}

function searchIoC() {
  const q = $('#ioc-input').value.trim().toLowerCase();
  const box = $('#ioc-result');
  box.classList.remove('empty');
  if (!q) {
    box.innerHTML = '<span class="nomatch">Masukkan indikator terlebih dahulu.</span>';
    return;
  }
  const hits = INTEL_DB.filter(i => i.value.toLowerCase().includes(q));
  if (!hits.length) {
    box.innerHTML = `<div class="nomatch">✓ Tidak ditemukan indikator untuk <b class="mono">${esc(q)}</b>.</div>`;
    return;
  }
  box.innerHTML = hits.map(h => `
    <div style="margin-bottom:10px">
      <div class="match">⚠ Ditemukan: <span class="mono" style="word-break:break-all">${esc(h.value)}</span></div>
      <div>Threat Score: <b>${h.score}/100</b> · Sumber: ${h.source}</div>
      <div class="score-bar"><div style="width:${h.score}%"></div></div>
      <div style="color:var(--muted)">Tag: ${h.tags.join(', ')}</div>
    </div>
  `).join('');
  toast(`${hits.length} indikator cocok`, 'warn');
}

$('#ioc-search').addEventListener('click', searchIoC);
$('#ioc-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchIoC();
});

$('#ioc-form').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const value = String(fd.get('value')).trim();
  const score = Math.max(0, Math.min(100, +fd.get('score')));
  const tags = String(fd.get('tags') || '').split(',').map(t => t.trim()).filter(Boolean);
  if (!value) return;
  if (INTEL_DB.some(i => i.value.toLowerCase() === value.toLowerCase())) {
    toast('Indikator sudah ada', 'warn');
    return;
  }
  const saved = JSON.parse(localStorage.getItem(INTEL_KEY) || '[]');
  saved.unshift({
    value,
    score,
    tags: tags.length ? tags : ['custom'],
    source: 'Manual',
  });
  localStorage.setItem(INTEL_KEY, JSON.stringify(saved));
  INTEL_DB = loadIntel();
  renderIntelFeed();
  e.target.reset();
  toast(`Indikator "${value}" ditambahkan`, 'ok');
});

$('#intel-export').addEventListener('click', () => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csv = toCSV(
    INTEL_DB.map(i => ({ ...i, tags: i.tags.join(';') })),
    ['value', 'score', 'tags', 'source']
  );
  download(`brawijaya-ioc-${ts}.csv`, csv, 'text/csv');
  toast('Export IoC berhasil', 'ok');
});

/* ============ SOAR ============ */
const PLAYBOOKS = [
  {
    name: 'Blokir IP Berbahaya',
    desc: 'Blokir source IP di firewall selama 24 jam.',
    steps: [
      'Validasi IP terhadap feed intelijen',
      'Kirim rule ke firewall API',
      'Catat aksi ke audit log',
      'Notifikasi ke Slack #soc',
    ],
  },
  {
    name: 'Isolasi Endpoint Terinfeksi',
    desc: 'Putuskan host dari jaringan dan karantina proses.',
    steps: [
      'Identifikasi hostname dari alert',
      'Kirim perintah isolasi ke EDR',
      'Snapshot memori untuk forensik',
      'Buat tiket di sistem ticketing',
    ],
  },
  {
    name: 'Karantina Email Phishing',
    desc: 'Hapus email phishing dari semua inbox.',
    steps: [
      'Cari email berdasarkan hash lampiran',
      'Karantina email di seluruh tenant',
      'Blokir domain pengirim di gateway',
      'Beri tahu pengguna terdampak',
    ],
  },
  {
    name: 'Enrichment IoC Otomatis',
    desc: 'Perkaya IoC dengan data MISP + VirusTotal.',
    steps: [
      'Query MISP untuk IoC terkait',
      'Query VirusTotal untuk reputasi',
      'Gabungkan hasil ke incident record',
      'Perbarui threat score',
    ],
  },
];

function renderPlaybooks() {
  $('#playbooks').innerHTML = PLAYBOOKS.map((p, i) => `
    <div class="playbook">
      <h4>${p.name}</h4>
      <p>${p.desc}</p>
      <button class="btn primary" data-playbook="${i}">▶ Eksekusi</button>
    </div>
  `).join('');

  $$('button[data-playbook]').forEach(btn => {
    btn.addEventListener('click', () => runPlaybook(+btn.dataset.playbook, btn));
  });
}

async function runPlaybook(idx, btn) {
  const p = PLAYBOOKS[idx];
  const log = $('#soar-log');
  if (log.querySelector('.muted')) log.innerHTML = '';
  btn.disabled = true;

  const write = (msg, cls = '') => {
    const line = document.createElement('div');
    line.className = `log-line ${cls}`;
    line.textContent = `[${now()}] ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  };

  write(`▶ Memulai playbook: ${p.name}`, 'warn');
  for (const step of p.steps) {
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    write(`  ✓ ${step}`, 'ok');
  }
  await new Promise(r => setTimeout(r, 400));
  write(`✔ Playbook selesai — status: SUCCESS`, 'ok');
  $('#stat-playbooks').textContent = +$('#stat-playbooks').textContent + 1;
  btn.disabled = false;
  toast(`Playbook "${p.name}" selesai`, 'ok');
}

$('#clear-log').addEventListener('click', () => {
  $('#soar-log').innerHTML = '<div class="log-line muted">Log dibersihkan.</div>';
});

/* ============ ZERO-DAY ============ */
$('#threshold').addEventListener('input', e => {
  $('#threshold-val').textContent = e.target.value;
});

$('#analyze-btn').addEventListener('click', () => {
  const threshold = +$('#threshold').value;
  const samples = Array.from({ length: 40 }, (_, i) => {
    const anom = Math.random() < 0.25;
    return {
      id: i + 1,
      score: anom ? rand(55, 100) : rand(5, 45),
      features: {
        reqRate: anom ? rand(300, 900) : rand(5, 80),
        payloadEntropy: anom
          ? (Math.random() * 0.3 + 0.7).toFixed(2)
          : (Math.random() * 0.4 + 0.2).toFixed(2),
        pktSize: anom ? rand(1400, 1500) : rand(64, 800),
      },
    };
  });

  $('#anomaly-chart').innerHTML = samples.map(s =>
    `<div class="anomaly-bar ${s.score >= threshold ? 'anomaly' : ''}" style="height:${s.score}%" title="Sampel #${s.id} — ${s.score}"></div>`
  ).join('');

  const anomalies = samples.filter(s => s.score >= threshold);
  const box = $('#anomaly-summary');
  box.classList.remove('empty');

  if (!anomalies.length) {
    box.innerHTML = `<div class="nomatch">✓ Tidak ada anomali di atas ambang ${threshold}.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="match">⚠ ${anomalies.length} sampel anomali (ambang ≥ ${threshold}).</div>
    <div class="score-bar"><div style="width:${(anomalies.length / samples.length) * 100}%"></div></div>
    <div class="table-scroll" style="margin-top:10px">
      <table class="data-table">
        <thead><tr><th>#</th><th>Skor</th><th>Req/detik</th><th>Entropi</th><th>Paket</th></tr></thead>
        <tbody>
          ${anomalies.map(a => `
            <tr>
              <td class="mono">${a.id}</td>
              <td><span class="sev kritis">${a.score}</span></td>
              <td class="mono">${a.features.reqRate}</td>
              <td class="mono">${a.features.payloadEntropy}</td>
              <td class="mono">${a.features.pktSize} B</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  toast(`${anomalies.length} anomali terdeteksi`, 'warn');
});

/* ============ CRYPTO ============ */
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64e = b => btoa(String.fromCharCode(...b));
const b64d = s => new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0)));

async function deriveKey(pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    k,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(t, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pw, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(t));
  const out = new Uint8Array(28 + ct.byteLength);
  out.set(salt, 0);
  out.set(iv, 16);
  out.set(new Uint8Array(ct), 28);
  return b64e(out);
}

async function decryptText(b64, pw) {
  const d = b64d(b64.trim());
  if (d.length < 28) throw new Error('Ciphertext tidak valid');
  const key = await deriveKey(pw, d.slice(0, 16));
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: d.slice(16, 28) },
    key,
    d.slice(28)
  );
  return dec.decode(pt);
}

$('#encrypt-btn').addEventListener('click', async () => {
  const t = $('#crypto-text').value;
  const p = $('#crypto-pass').value;
  if (!t || !p) {
    $('#crypto-output').value = '⚠ Isi teks & password';
    return;
  }
  try {
    $('#crypto-output').value = await encryptText(t, p);
    toast('Enkripsi berhasil', 'ok');
  } catch (e) {
    $('#crypto-output').value = '⚠ ' + e.message;
  }
});

$('#decrypt-btn').addEventListener('click', async () => {
  const t = $('#crypto-text').value;
  const p = $('#crypto-pass').value;
  if (!t || !p) {
    $('#crypto-output').value = '⚠ Isi ciphertext & password';
    return;
  }
  try {
    $('#crypto-output').value = await decryptText(t, p);
    toast('Dekripsi berhasil', 'ok');
  } catch {
    $('#crypto-output').value = '⚠ Gagal: password salah / data rusak';
    toast('Dekripsi gagal', 'err');
  }
});

$('#hash-btn').addEventListener('click', async () => {
  const t = $('#hash-text').value;
  const algo = $('#hash-algo').value;
  if (!t) {
    $('#hash-output').value = '⚠ Masukkan teks';
    return;
  }
  const buf = await crypto.subtle.digest(algo, enc.encode(t));
  $('#hash-output').value = [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  toast('Hash dihasilkan', 'ok');
});

/* ============ SETTINGS MODAL ============ */
$('#settings-btn').addEventListener('click', () => {
  openModal(`
    <h3>Pengaturan <button onclick="closeModal()" title="Tutup">×</button></h3>
    <label class="form">Suara Alert
      <select id="set-sound">
        <option value="on" ${settings.sound ? 'selected' : ''}>Aktif</option>
        <option value="off" ${!settings.sound ? 'selected' : ''}>Nonaktif</option>
      </select>
    </label>
    <label class="form" style="margin-top:12px">Maksimum Alert Disimpan
      <input id="set-max" type="number" min="50" max="1000" value="${settings.maxAlerts}" />
    </label>
    <hr />
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
      <b style="color:var(--text)">Data tersimpan:</b><br>
      ${IDS.alerts.length} alert · ${INTEL_DB.length} IoC · ${IDS.blocked} IP diblokir
    </div>
    <div class="actions" style="justify-content:flex-start">
      <button class="btn" onclick="exportAllData()">📦 Export Semua Data</button>
      <button class="btn danger" onclick="clearAllData()">🗑 Hapus Semua Data</button>
    </div>
    <div class="actions">
      <button class="btn ghost" onclick="closeModal()">Tutup</button>
      <button class="btn primary" onclick="saveSettingsFromModal()">Simpan</button>
    </div>
  `);
});

window.saveSettingsFromModal = () => {
  settings.sound = $('#set-sound').value === 'on';
  settings.maxAlerts = Math.max(50, Math.min(1000, +$('#set-max').value));
  saveSettings();
  $('#sound-toggle').classList.toggle('active', settings.sound);
  $('#sound-toggle').textContent = settings.sound ? '🔔' : '🔕';
  saveAlerts();
  closeModal();
  toast('Pengaturan disimpan', 'ok');
};

window.exportAllData = () => {
  const data = {
    alerts: IDS.alerts,
    intel: INTEL_DB,
    blocked: IDS.blocked,
    settings,
  };
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  download(`brawijaya-backup-${ts}.json`, JSON.stringify(data, null, 2));
  toast('Backup lengkap diunduh', 'ok');
};

window.clearAllData = () => {
  if (!confirm('Hapus SEMUA data (alert, IoC kustom, pengaturan)?')) return;
  localStorage.removeItem(ALERTS_KEY);
  localStorage.removeItem(INTEL_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  IDS.alerts = [];
  IDS.blocked = 0;
  INTEL_DB = [...DEFAULT_INTEL];
  refreshAll();
  renderIntelFeed();
  closeModal();
  toast('Semua data dihapus. Refresh halaman untuk reset penuh.', 'warn');
};

/* ============ KEYBOARD SHORTCUTS ============ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' &&
      document.activeElement.tagName !== 'INPUT' &&
      document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    const s = $('#ids-search');
    if (s) { navigate('ids'); s.focus(); }
  }
});

/* ============ BOOT ============ */
renderRules();
renderIntelFeed();
renderPlaybooks();
refreshAll();
navigate('dashboard');
