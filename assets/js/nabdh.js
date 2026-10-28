/* ============================================================
   Nabdh activities and games inside the lesson.
   Reads nabdh-setup.json (copied from the Noor extension after
   sending the lesson package) and fills every .nabdh-slot:
     data-nabdh="activity" data-index="N"  → the class's activity N
     data-nabdh="game"     data-phase="…"  → the first game of that phase
     data-nabdh="games"                    → every game in the package
   Without the file every slot says the activity opens in class.
   ============================================================ */
(function () {
  'use strict';

  const ALLOWED_ORIGINS = ['https://nabdh-edu.com', 'http://127.0.0.1:8000', 'http://localhost:8000'];
  const ACTIVITY_CODE = /^[a-z0-9]{4,12}$/;
  const GAME_CODE = /^[a-z0-9]{8,16}$/;
  const PHASES = ['introduction', 'during', 'closure'];
  const store = window.lessonStore;
  const slots = Array.from(document.querySelectorAll('.nabdh-slot'));
  let setup = null;
  let classIdx = 0;

  const isStr = v => typeof v === 'string';
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // Keep only well-formed codes and plain-text titles. A malformed activity becomes null
  // in place, so the activities after it keep their slot numbers.
  function clean(raw) {
    if (!raw || typeof raw !== 'object' || !ALLOWED_ORIGINS.includes(raw.nabdh)) return null;
    const classes = (Array.isArray(raw.classes) ? raw.classes : [])
      .filter(c => c && typeof c === 'object')
      .map(c => ({
        name: isStr(c.name) ? c.name.slice(0, 80) : '',
        activities: (Array.isArray(c.activities) ? c.activities : []).map(a =>
          a && isStr(a.code) && ACTIVITY_CODE.test(a.code)
            ? { code: a.code, title: isStr(a.title) ? a.title.slice(0, 200) : '', label: isStr(a.label) ? a.label.slice(0, 60) : '' }
            : null,
        ),
      }));
    const games = (Array.isArray(raw.games) ? raw.games : [])
      .filter(g => g && isStr(g.code) && GAME_CODE.test(g.code))
      .map(g => ({ code: g.code, title: isStr(g.title) ? g.title.slice(0, 120) : '', phase: PHASES.includes(g.phase) ? g.phase : 'during' }));
    if (!classes.length && !games.length) return null;
    return { nabdh: raw.nabdh, classes: classes.length ? classes : [{ name: '', activities: [] }], games };
  }

  function placeholder(slot, kind) {
    const card = el('div', 'nabdh-card locked');
    card.append(
      el('span', 'nabdh-badge', 'نبض'),
      el('strong', '', kind === 'game' ? '🔒 ستُشغَّل لعبة نبض في الحصة' : '🔒 سيُفتح هذا النشاط في الحصة'),
      el('small', '', 'يفتحه المعلّم من منصة نبض أثناء الدرس.'),
    );
    slot.replaceChildren(card);
  }

  function frame(src, title, cls) {
    const f = document.createElement('iframe');
    f.src = src;
    f.title = title;
    f.loading = 'lazy';
    f.className = cls;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    return f;
  }

  function actionButton(text, onClick) {
    const b = el('button', 'lab-btn ghost', text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function qrBox(url) {
    const box = el('div', 'nabdh-qr');
    box.hidden = true;
    const img = document.createElement('img');
    img.alt = 'رمز QR لصفحة النشاط';
    img.width = 160;
    img.height = 160;
    box.append(img, el('small', '', url));
    return {
      box,
      toggle() {
        if (!img.src) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(url);
        box.hidden = !box.hidden;
      },
    };
  }

  function renderActivity(slot, a) {
    const base = setup.nabdh;
    const participant = base + '/p/' + a.code;
    const card = el('div', 'nabdh-card');
    const head = el('div', 'nabdh-head');
    head.append(el('span', 'nabdh-badge', 'نبض'), el('strong', '', a.title || 'نشاط نبض'));
    if (a.label) head.append(el('small', 'nabdh-label', a.label));
    const iframe = frame(base + '/embed/' + a.code, a.title || 'نشاط نبض', 'nabdh-frame');
    let resultsOnly = false;
    const qr = qrBox(participant);
    const actions = el('div', 'nabdh-actions');
    const toggle = actionButton('📊 عرض النتائج فقط', () => {
      resultsOnly = !resultsOnly;
      iframe.src = base + '/embed/' + a.code + (resultsOnly ? '?view=results' : '');
      toggle.textContent = resultsOnly ? '✍️ عرض المشاركة' : '📊 عرض النتائج فقط';
    });
    actions.append(
      toggle,
      actionButton('↗ فتح في نافذة', () => window.open(participant, '_blank', 'noopener')),
      actionButton('📱 للطلاب', () => qr.toggle()),
    );
    card.append(head, iframe, actions, qr.box);
    slot.replaceChildren(card);
    markVisited('a' + a.code);
  }

  function renderGame(slot, g) {
    const url = setup.nabdh + '/g/' + g.code;
    const card = el('div', 'nabdh-card');
    const head = el('div', 'nabdh-head');
    head.append(el('span', 'nabdh-badge', 'نبض'), el('strong', '', '🎲 ' + (g.title || 'لعبة نبض')));
    const qr = qrBox(url);
    const actions = el('div', 'nabdh-actions');
    actions.append(actionButton('↗ فتح في نافذة', () => window.open(url, '_blank', 'noopener')), actionButton('📱 للطلاب', () => qr.toggle()));
    card.append(
      head,
      el('small', 'nabdh-note', 'تعمل اللعبة بعد أن يضغط المعلم ▶ تشغيل في نبض.'),
      frame(url, g.title || 'لعبة نبض', 'nabdh-frame game'),
      actions,
      qr.box,
    );
    slot.replaceChildren(card);
  }

  function markVisited(key) {
    if (!store) return;
    const seen = store.get('nabdhSeen', {});
    seen[key] = true;
    store.set('nabdhSeen', seen);
  }

  function fill() {
    const cls = setup ? setup.classes[classIdx] : null;
    slots.forEach(slot => {
      if (slot.dataset.nabdh === 'games') {
        // every game in the package, in its order
        const games = setup ? setup.games : [];
        if (!games.length) return placeholder(slot, 'game');
        const wrap = document.createElement('div');
        slot.replaceChildren(wrap);
        games.forEach(g => {
          const one = document.createElement('div');
          wrap.appendChild(one);
          renderGame(one, g);
        });
      } else if (slot.dataset.nabdh === 'game') {
        const g = setup && setup.games.find(x => x.phase === (slot.dataset.phase || 'during'));
        g ? renderGame(slot, g) : placeholder(slot, 'game');
      } else {
        const a = cls && cls.activities[+slot.dataset.index];
        a ? renderActivity(slot, a) : placeholder(slot, 'activity');
      }
    });
  }

  // The class comes from the link (?class=…) and is then locked; otherwise the student picks it.
  function pickClass() {
    const names = setup.classes.map(c => c.name);
    const fromUrl = new URLSearchParams(location.search).get('class');
    const urlIdx = fromUrl ? names.indexOf(fromUrl) : -1;
    if (urlIdx >= 0) {
      classIdx = urlIdx;
      if (store) store.set('nabdhClass', names[urlIdx]);
      showLockedClass(names[urlIdx]);
      return;
    }
    if (fromUrl && window.lessonToast) window.lessonToast('الفصل «' + fromUrl + '» غير موجود في إعداد نبض — اختر فصلك.');
    const saved = store ? store.get('nabdhClass', '') : '';
    classIdx = Math.max(0, saved ? names.indexOf(saved) : 0);
    if (setup.classes.length < 2) return;
    const picker = document.getElementById('classPicker');
    const select = document.getElementById('classSelect');
    if (!picker || !select) return;
    setup.classes.forEach((c, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = c.name || 'فصل ' + (i + 1);
      select.appendChild(o);
    });
    select.value = String(classIdx);
    picker.hidden = false;
    select.addEventListener('change', () => {
      classIdx = +select.value;
      if (store) store.set('nabdhClass', setup.classes[classIdx].name);
      fill();
    });
  }

  // A locked class shows its name; pressing it shows the class link as a QR code for students.
  function showLockedClass(name) {
    const badge = document.getElementById('classBadge');
    const panel = document.getElementById('classQr');
    if (!badge || !panel || !name) return;
    const link = new URL(location.href);
    link.hash = '';
    badge.textContent = '🏫 ' + name;
    badge.hidden = false;
    document.body.classList.add('class-locked');
    badge.addEventListener('click', () => {
      if (panel.hidden) {
        const img = panel.querySelector('img');
        if (!img.src) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(link.href);
        const title = panel.querySelector('strong');
        const bdi = document.createElement('bdi');
        bdi.textContent = name;
        title.replaceChildren('امسح للدخول إلى درس فصل ', bdi);
        let shown = link.href;
        try { shown = decodeURIComponent(link.href.replace(/\+/g, ' ')); } catch { /* keep encoded */ }
        panel.querySelector('small').textContent = shown;
      }
      panel.hidden = !panel.hidden;
      badge.setAttribute('aria-expanded', String(!panel.hidden));
    });
    panel.querySelector('button').addEventListener('click', () => {
      panel.hidden = true;
      badge.setAttribute('aria-expanded', 'false');
    });
  }

  // Auto-height from Nabdh's /embed/ pages (same message embed.js handles), but only from Nabdh.
  window.addEventListener('message', e => {
    const d = e.data;
    if (!setup || e.origin !== setup.nabdh || !d || d.source !== 'nabd' || d.type !== 'resize') return;
    const h = Number(d.height);
    if (!Number.isFinite(h)) return;
    document.querySelectorAll('.nabdh-frame').forEach(f => {
      if (f.contentWindow === e.source) f.style.height = Math.max(200, Math.min(h, 2000)) + 'px';
    });
  });

  fill();
  // file:// pages cannot fetch; run the lesson from a server (or GitHub Pages) to use Nabdh.
  if (location.protocol === 'file:') return;
  fetch('nabdh-setup.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(raw => {
      setup = clean(raw);
      if (!setup) return;
      pickClass();
      fill();
    })
    .catch(() => {
      /* no setup (or opened from file://): placeholders stay */
    });
})();
