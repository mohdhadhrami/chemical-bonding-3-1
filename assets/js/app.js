/* ============================================================
   الترابط الكيميائي 3-1 — Interactive Lesson App
   Single-file IIFE — no frameworks. Built on the structure of
   the halogenoalkanes 9-3 lesson (slides, store, quiz, certificate).
   ============================================================ */
(function () {
  'use strict';

  // -----------------------------------------------------------------
  // Storage helper (every access guarded: private windows can throw)
  // -----------------------------------------------------------------
  const STORE_KEY = 'bonding_3_1_v1';
  let memory = {};
  const store = {
    read() {
      try { return JSON.parse(localStorage.getItem(STORE_KEY)) || memory; }
      catch { return memory; }
    },
    write(data) {
      memory = data;
      try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* memory only */ }
    },
    set(key, value) {
      const d = store.read();
      d[key] = value;
      store.write(d);
    },
    get(key, fallback) {
      const d = store.read();
      return key in d ? d[key] : fallback;
    },
    reset() {
      memory = {};
      try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    },
  };
  window.lessonStore = store;

  // -----------------------------------------------------------------
  // Points: 120 in total, each source awarded once.
  //   final quiz 10 × 5 = 50 · dot-and-cross builder 6 × 5 = 30
  //   four-way classifier 8 × 2 = 16 · octet explorer 6 × 2 = 12
  //   formative questions 5 × 2 = 10 · K₂O animation 1 × 2 = 2
  // -----------------------------------------------------------------
  const MAX_POINTS = 120;
  function awardOnce(key, amount) {
    const awarded = store.get('awarded', {});
    if (awarded[key]) return false;
    awarded[key] = amount;
    store.set('awarded', awarded);
    refreshDashboard();
    return true;
  }
  function totalPoints() {
    return Object.values(store.get('awarded', {})).reduce((a, b) => a + b, 0);
  }
  function earnBadge(id) {
    const b = store.get('badges', {});
    if (b[id]) return;
    b[id] = Date.now();
    store.set('badges', b);
    refreshDashboard();
    toast('🏅 حصلت على شارة جديدة: ' + (BADGE_NAMES[id] || id));
  }
  const BADGE_NAMES = {
    ions: 'صائد الأيونات',
    painter: 'رسّام الإلكترونات',
    rules: 'كاسر القواعد',
    sorter: 'سيد التصنيف',
    expert: 'خبير الترابط',
  };

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
  }

  // -----------------------------------------------------------------
  // 1. Theme + font
  // -----------------------------------------------------------------
  const themeToggle = document.getElementById('themeToggle');
  const root = document.body;
  const savedTheme = store.get('theme', 'light');
  root.dataset.theme = savedTheme;
  if (themeToggle) {
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
      store.set('theme', next);
    });
  }

  let fontStep = +store.get('fontStep', 0);
  function applyFontStep() {
    document.documentElement.style.fontSize = 16 + fontStep + 'px';
    store.set('fontStep', fontStep);
  }
  applyFontStep();
  document.getElementById('fontLarger')?.addEventListener('click', () => {
    if (fontStep < 4) { fontStep++; applyFontStep(); }
  });
  document.getElementById('fontSmaller')?.addEventListener('click', () => {
    if (fontStep > -2) { fontStep--; applyFontStep(); }
  });

  // -----------------------------------------------------------------
  // 2. Slide system (drawer + prev/next + active slide)
  // -----------------------------------------------------------------
  const sections = Array.from(document.querySelectorAll('.section'));
  const drawer = document.getElementById('drawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerLinks = Array.from(document.querySelectorAll('#drawerList a'));
  const menuBtn = document.getElementById('menuBtn');
  const slideNumEl = document.getElementById('slideNum');
  const slideTotalEl = document.getElementById('slideTotal');
  const prevSlideBtn = document.getElementById('prevSlide');
  const nextSlideBtn = document.getElementById('nextSlide');
  const readingProgress = document.getElementById('readingProgress');

  if (slideTotalEl) slideTotalEl.textContent = sections.length;

  let currentIdx = 0;
  const hash = (location.hash || '').replace('#', '');
  const hashIdx = sections.findIndex(s => s.id === hash);
  const savedIdx = +store.get('currentIdx', 0);
  if (hashIdx >= 0) currentIdx = hashIdx;
  else if (savedIdx >= 0 && savedIdx < sections.length) currentIdx = savedIdx;

  function openDrawer() {
    drawer.classList.add('open');
    drawerBackdrop?.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawerBackdrop?.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }
  menuBtn?.addEventListener('click', () => (drawer.classList.contains('open') ? closeDrawer() : openDrawer()));
  document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  const slideHooks = [];
  function onSlide(fn) { slideHooks.push(fn); }

  function showSlide(idx, opts = {}) {
    if (idx < 0 || idx >= sections.length) return;
    currentIdx = idx;
    sections.forEach((s, i) => s.classList.toggle('active', i === idx));
    if (slideNumEl) slideNumEl.textContent = idx + 1;
    if (readingProgress) readingProgress.style.width = ((idx + 1) / sections.length) * 100 + '%';

    const targetId = sections[idx].id;
    const visited = store.get('visited', {});
    visited[targetId] = true;
    store.set('visited', visited);
    store.set('currentIdx', idx);
    drawerLinks.forEach(a => {
      a.classList.toggle('active', a.dataset.slide === targetId);
      a.classList.toggle('visited', !!visited[a.dataset.slide]);
    });

    if (prevSlideBtn) prevSlideBtn.disabled = idx === 0;
    if (nextSlideBtn) nextSlideBtn.disabled = idx === sections.length - 1;
    if (!opts.silent && history.replaceState) history.replaceState(null, '', '#' + targetId);

    closeDrawer();
    sections[idx].scrollTop = 0;
    slideHooks.forEach(fn => fn(targetId));
    refreshDashboard();
  }
  window.lessonOnSlide = onSlide;

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const idx = sections.findIndex(s => s.id === id);
    if (idx >= 0) { e.preventDefault(); showSlide(idx); }
  });
  window.addEventListener('hashchange', () => {
    const idx = sections.findIndex(s => s.id === location.hash.slice(1));
    if (idx >= 0 && idx !== currentIdx) showSlide(idx, { silent: true });
  });
  prevSlideBtn?.addEventListener('click', () => showSlide(currentIdx - 1));
  nextSlideBtn?.addEventListener('click', () => showSlide(currentIdx + 1));

  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (document.querySelector('.vq-modal.open')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); showSlide(Math.min(sections.length - 1, currentIdx + 1)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); showSlide(Math.max(0, currentIdx - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); showSlide(0); }
    else if (e.key === 'End') { e.preventDefault(); showSlide(sections.length - 1); }
  });

  // -----------------------------------------------------------------
  // 3. Small shared widgets: reveal boxes, flip cards, tabs, "later" links
  // -----------------------------------------------------------------
  document.querySelectorAll('[data-reveal]').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const box = document.getElementById(btn.dataset.reveal);
      if (!box) return;
      box.hidden = !box.hidden;
      btn.setAttribute('aria-expanded', String(!box.hidden));
    });
  });

  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => {
      const on = card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', String(on));
    });
  });

  document.querySelectorAll('.prep-tabs:not(.builder-tabs):not(#octetTabs)').forEach(group => {
    const tabs = group.querySelectorAll('.prep-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.toggle('active', t === tab);
          document.getElementById(t.dataset.tab)?.classList.toggle('active', t === tab);
        });
      });
    });
  });

  document.querySelectorAll('[data-later]').forEach(btn => {
    btn.addEventListener('click', () => toast('سيُرفق الرابط لاحقاً من قِبل المعلّم'));
  });

  // Static diagrams
  document.querySelectorAll('.diagram[data-diagram]').forEach(el => {
    el.innerHTML = window.Diagrams.render(el.dataset.diagram);
  });

  // Clickable pairs: say what each pair is
  const PAIR_TEXT = {
    lone: '⚪ زوج منفرد: إلكترونان في المستوى الخارجي لا يشاركان في الترابط.',
    shared: '🔗 زوج مشترك: يمثّل رابطة تساهمية، إلكترون من كل ذرة.',
    coord: '➡️ زوج رابطة تناسقية: الإلكترونان كلاهما من الذرة المانحة.',
  };
  document.querySelectorAll('.diagram.clickable').forEach(el => {
    const info = el.parentElement.querySelector('.pair-info');
    const pick = g => {
      el.querySelectorAll('.pair.picked').forEach(p => p.classList.remove('picked'));
      g.classList.add('picked');
      if (info) info.textContent = PAIR_TEXT[g.dataset.kind] || '';
      if (el.dataset.diagram === 'NH3' && info) {
        info.textContent = g.dataset.kind === 'lone'
          ? '✅ صحيح! الزوج المنفرد على ذرة N — وهو الذي ستمنحه لاحقًا لأيون H⁺.'
          : '❌ هذا زوج مشترك (رابطة N–H). ابحث عن الزوج الذي لا يقع بين ذرتين.';
      }
    };
    el.addEventListener('click', e => { const g = e.target.closest('.pair'); if (g) pick(g); });
    el.addEventListener('keydown', e => {
      const g = e.target.closest('.pair');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(g); }
    });
  });

  // -----------------------------------------------------------------
  // 4. Inline quiz cards and true/false cards
  // -----------------------------------------------------------------
  document.querySelectorAll('.quiz-card').forEach(card => {
    const opts = card.querySelector('.options');
    if (!opts) return;
    const correct = opts.dataset.correct;
    const feedback = card.querySelector('.feedback');
    let answered = false;
    opts.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        opts.querySelectorAll('button').forEach(b => {
          b.disabled = true;
          if (b.dataset.opt === correct) b.classList.add('correct');
          else if (b === btn) b.classList.add('wrong');
        });
        if (!feedback) return;
        feedback.hidden = false;
        if (btn.dataset.opt === correct) {
          feedback.className = 'feedback success';
          feedback.textContent = '✅ ممتاز! إجابة صحيحة.';
          if (card.dataset.award) awardOnce('formative:' + card.dataset.award, 2);
        } else {
          feedback.className = 'feedback error';
          feedback.textContent = '❌ ' + (feedback.dataset.wrong || 'ليست الإجابة الصحيحة.') + ' الصواب مُحدَّد بالأخضر.';
        }
      });
    });
  });

  document.querySelectorAll('.tf-card').forEach(card => {
    const correct = card.dataset.correct;
    const buttons = card.querySelectorAll('.tf-buttons button');
    const fb = card.querySelector('.tf-feedback');
    let used = false;
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (used) return;
        used = true;
        buttons.forEach(b => (b.disabled = true));
        const ok = btn.dataset.ans === correct;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) buttons.forEach(b => { if (b.dataset.ans === correct) b.classList.add('correct'); });
        if (fb) {
          fb.hidden = false;
          fb.textContent = (ok ? '✅ صحيح! ' : '❌ ') + (fb.dataset.explain || '');
          fb.style.color = ok ? 'var(--accent-success)' : 'var(--accent-danger)';
        }
      });
    });
  });

  // -----------------------------------------------------------------
  // 5. K₂O step-by-step animation
  // -----------------------------------------------------------------
  const k2o = document.getElementById('k2oSvg');
  const k2oCaption = document.getElementById('k2oCaption');
  const k2oSteps = document.querySelectorAll('.k2o-steps li');
  const K2O_CAPTIONS = [
    '1) ذرتا K بتوزيع 2,8,8,1 وذرة O بتوزيع 2,6',
    '2) كل ذرة K تنقل إلكترونها الخارجي (×) إلى O',
    '3) أيونان K⁺ توزيع كل منهما [2,8,8] مثل Ar، وأيون O²⁻ [2,8] مثل Ne',
    '4) 2K⁺ + O²⁻ → K₂O — الشحنة الكلية صفر ✓',
  ];
  let k2oStep = -1;
  function setK2O(step) {
    k2oStep = step;
    if (!k2o) return;
    k2o.dataset.step = String(step);
    k2oSteps.forEach((li, i) => li.classList.toggle('active', i === step));
    k2oCaption.textContent = step < 0 ? 'جاهز للتشغيل…' : K2O_CAPTIONS[step];
    k2o.querySelectorAll('.k2o-move').forEach(g => {
      g.style.transform = step >= 1 ? `translate(${g.dataset.tx}px, ${g.dataset.ty}px)` : '';
    });
    document.getElementById('k2oCfgK1').textContent = step >= 2 ? '[2,8,8]⁺' : '2,8,8,1';
    document.getElementById('k2oCfgK2').textContent = step >= 2 ? '[2,8,8]⁺' : '2,8,8,1';
    document.getElementById('k2oCfgO').textContent = step >= 2 ? '[2,8]²⁻' : '2,6';
    document.getElementById('k2oSummary').hidden = step < 3;
    const next = document.getElementById('k2oNext');
    next.disabled = step >= 3;
    next.textContent = step < 0 ? '▶ ابدأ' : '▶ الخطوة التالية';
    if (step === 3) {
      awardOnce('k2o', 2);
      earnBadge('ions');
    }
  }
  document.getElementById('k2oNext')?.addEventListener('click', () => setK2O(Math.min(3, k2oStep + 1)));
  document.getElementById('k2oReset')?.addEventListener('click', () => setK2O(-1));
  setK2O(-1);

  // -----------------------------------------------------------------
  // 6. Dot-and-cross builder (lab1)
  // -----------------------------------------------------------------
  // a: first atom (• electrons), b: other atoms (× electrons); expected
  // electrons in each bin: shared (• and ×), loneA (•), loneB (×).
  const BUILDS = [
    { key: 'H2', title: 'H₂', a: 'H', aCount: 1, b: 'H', bCount: 1, shared: 1, loneA: 0, loneB: 0, aOctet: 2 },
    { key: 'Cl2', title: 'Cl₂', a: 'Cl', aCount: 7, b: 'Cl', bCount: 7, shared: 1, loneA: 6, loneB: 6, aOctet: 8 },
    { key: 'HCl', title: 'HCl', a: 'Cl', aCount: 7, b: 'H', bCount: 1, shared: 1, loneA: 6, loneB: 0, aOctet: 8 },
    { key: 'H2O', title: 'H₂O', a: 'O', aCount: 6, b: '2H', bCount: 2, shared: 2, loneA: 4, loneB: 0, aOctet: 8 },
    { key: 'NH3', title: 'NH₃', a: 'N', aCount: 5, b: '3H', bCount: 3, shared: 3, loneA: 2, loneB: 0, aOctet: 8 },
    { key: 'CH4', title: 'CH₄', a: 'C', aCount: 4, b: '4H', bCount: 4, shared: 4, loneA: 0, loneB: 0, aOctet: 8 },
  ];
  const bTabs = document.getElementById('builderTabs');
  const bPool = document.getElementById('bPool');
  const bResult = document.getElementById('bResult');
  const bDiagram = document.getElementById('bDiagram');
  const bBins = document.querySelectorAll('.bbin');
  let build = BUILDS[0];
  let selectedChip = null;
  let dragChip = null;

  function makeChip(kind, i) {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'e-chip ' + kind;
    c.dataset.kind = kind;
    c.draggable = true;
    c.textContent = kind === 'dot' ? '•' : '×';
    c.setAttribute('aria-label', (kind === 'dot' ? 'إلكترون من ' + build.a : 'إلكترون من ' + build.b) + ' ' + (i + 1));
    c.addEventListener('dragstart', e => { dragChip = c; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'e'); });
    c.addEventListener('click', e => {
      e.stopPropagation();
      if (c.parentElement.classList.contains('bbin-items')) { bPool.appendChild(c); clearSelection(); return; }
      if (selectedChip === c) { clearSelection(); return; }
      clearSelection();
      selectedChip = c;
      c.classList.add('selected');
      bBins.forEach(b => b.classList.add('ready'));
    });
    return c;
  }
  function clearSelection() {
    selectedChip?.classList.remove('selected');
    selectedChip = null;
    bBins.forEach(b => b.classList.remove('ready'));
  }
  function place(bin, chip) {
    bin.querySelector('.bbin-items').appendChild(chip);
    bResult.textContent = '';
    bResult.className = 'sorter-result';
  }
  bBins.forEach(bin => {
    bin.addEventListener('dragover', e => { e.preventDefault(); bin.classList.add('over'); });
    bin.addEventListener('dragleave', () => bin.classList.remove('over'));
    bin.addEventListener('drop', e => {
      e.preventDefault();
      bin.classList.remove('over');
      if (dragChip) place(bin, dragChip);
      dragChip = null;
    });
    const fromSelection = () => { if (selectedChip) { place(bin, selectedChip); clearSelection(); } };
    bin.addEventListener('click', fromSelection);
    bin.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fromSelection(); } });
  });

  function loadBuild(b) {
    build = b;
    clearSelection();
    bTabs.querySelectorAll('.prep-tab').forEach(t => t.classList.toggle('active', t.dataset.key === b.key));
    document.getElementById('bTitle').textContent = 'الجزيء: ' + b.title;
    document.getElementById('bInfo').textContent = `إلكترونات التكافؤ — ${b.a} (•): ${b.aCount} · ${b.b} (×): ${b.bCount}`;
    document.getElementById('bLoneALabel').textContent = '⚪ أزواج منفردة على ' + b.a;
    document.getElementById('bLoneBLabel').textContent = '⚪ أزواج منفردة على ' + b.b;
    bPool.innerHTML = '';
    for (let i = 0; i < b.aCount; i++) bPool.appendChild(makeChip('dot', i));
    for (let i = 0; i < b.bCount; i++) bPool.appendChild(makeChip('cross', i));
    bBins.forEach(bin => (bin.querySelector('.bbin-items').innerHTML = ''));
    bResult.textContent = '';
    bResult.className = 'sorter-result';
    const done = store.get('built', {})[b.key];
    bDiagram.hidden = !done;
    bDiagram.innerHTML = done ? window.Diagrams.render(b.key) : '';
  }
  function countIn(bin, kind) {
    return document.querySelectorAll(`.bbin[data-bin="${bin}"] .e-chip.${kind}`).length;
  }
  function checkBuild() {
    const b = build;
    const left = bPool.querySelectorAll('.e-chip').length;
    const sd = countIn('shared', 'dot'), sc = countIn('shared', 'cross');
    const ad = countIn('loneA', 'dot'), ac = countIn('loneA', 'cross');
    const bd = countIn('loneB', 'dot'), bc = countIn('loneB', 'cross');
    let msg = '';
    if (left) msg = `بقي ${left} إلكترونات لم توزَّع بعد.`;
    else if (sd !== sc) msg = 'كل زوج مشترك يتكوّن من إلكترون • واحد وإلكترون × واحد.';
    else if (ac || bd) msg = `الأزواج المنفردة على ${b.a} من إلكتروناتها (•) فقط، وعلى ${b.b} من (×) فقط.`;
    else if (ad % 2 || bc % 2) msg = 'الأزواج المنفردة تأتي أزواجًا: يجب أن يكون عدد الإلكترونات في كل خانة زوجيًا.';
    else if (sd !== b.shared || ad !== b.loneA || bc !== b.loneB) {
      msg = b.aOctet === 2
        ? 'راجع: يجب أن يحيط بكل ذرة H إلكترونان فقط.'
        : `راجع: هل يحيط بـ ${b.a} ثمانية إلكترونات (المشتركة + المنفردة)؟ وهل لكل H إلكترونان؟`;
    }
    if (msg) {
      bResult.textContent = '❌ ' + msg;
      bResult.className = 'sorter-result error';
      return;
    }
    bResult.textContent = `🎉 صحيح! ${b.title} — الأزواج المشتركة: ${b.shared} · الأزواج المنفردة على ${b.a}: ${b.loneA / 2}${b.loneB ? ' · على ' + b.b + ': ' + b.loneB / 2 : ''}.`;
    bResult.className = 'sorter-result success';
    bDiagram.innerHTML = window.Diagrams.render(b.key);
    bDiagram.hidden = false;
    const built = store.get('built', {});
    built[b.key] = true;
    store.set('built', built);
    awardOnce('build:' + b.key, 5);
    renderBuildProgress();
    if (BUILDS.every(x => built[x.key])) earnBadge('painter');
  }
  function renderBuildProgress() {
    const built = store.get('built', {});
    bTabs.querySelectorAll('.prep-tab').forEach(t => t.classList.toggle('done', !!built[t.dataset.key]));
    const n = BUILDS.filter(x => built[x.key]).length;
    document.getElementById('builderProgress').textContent = `✅ أتممت ${n} من ${BUILDS.length} جزيئات`;
  }
  if (bTabs) {
    BUILDS.forEach(b => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'prep-tab';
      t.dataset.key = b.key;
      t.setAttribute('role', 'tab');
      t.textContent = b.title;
      t.addEventListener('click', () => loadBuild(b));
      bTabs.appendChild(t);
    });
    document.getElementById('bCheck').addEventListener('click', checkBuild);
    document.getElementById('bReset').addEventListener('click', () => loadBuild(build));
    loadBuild(BUILDS[0]);
    renderBuildProgress();
  }

  // -----------------------------------------------------------------
  // 7. Bond order slider (Cl₂ / O₂ / N₂)
  // -----------------------------------------------------------------
  const ORDER = {
    1: { key: 'Cl2', text: 'Cl₂: زوج مشترك واحد ← رابطة أحادية Cl—Cl، وثلاثة أزواج منفردة على كل Cl.' },
    2: { key: 'O2', text: 'O₂: كل O (2,6) تحتاج إلكترونين ← زوجان مشتركان: رابطة ثنائية O=O، وزوجان منفردان على كل O.' },
    3: { key: 'N2', text: 'N₂: كل N (2,5) تحتاج ثلاثة إلكترونات ← ثلاثة أزواج مشتركة: رابطة ثلاثية N≡N، وزوج منفرد على كل N.' },
  };
  const orderInput = document.getElementById('bondOrder');
  function renderOrder() {
    const o = ORDER[orderInput.value];
    document.getElementById('bondOrderOut').textContent = orderInput.value;
    document.getElementById('orderDiagram').innerHTML = window.Diagrams.render(o.key);
    document.getElementById('orderText').textContent = o.text;
  }
  orderInput?.addEventListener('input', renderOrder);
  if (orderInput) renderOrder();

  // -----------------------------------------------------------------
  // 8. Octet explorer (lab2)
  // -----------------------------------------------------------------
  const OCTET = [
    { key: 'H2', title: 'H₂', center: 'H (1)', n: 2, verdict: 'إلكترونان حول كل H — توزيع He، وليس ثمانية.', kind: 'he' },
    { key: 'BF3', title: 'BF₃', center: 'B (2,3)', n: 6, verdict: 'ستة إلكترونات فقط حول B ← نقص في الإلكترونات.', kind: 'less' },
    { key: 'CH4', title: 'CH₄', center: 'C (2,4)', n: 8, verdict: 'ثمانية إلكترونات حول C ← تحقق قاعدة الثمانية ✓', kind: 'eight' },
    { key: 'PCl5', title: 'PCl₅', center: 'P (2,8,5)', n: 10, verdict: 'عشرة إلكترونات حول P ← تجاوز لقاعدة الثمانية.', kind: 'more' },
    { key: 'SF6', title: 'SF₆', center: 'S (2,8,6)', n: 12, verdict: 'اثنا عشر إلكترونًا حول S ← تجاوز لقاعدة الثمانية.', kind: 'more' },
    { key: 'SO2', title: 'SO₂', center: 'S (2,8,6)', n: 10, verdict: 'عشرة إلكترونات حول S (رابطتان ثنائيتان + زوج منفرد) ← تجاوز.', kind: 'more' },
  ];
  const octetTabs = document.getElementById('octetTabs');
  let octet = OCTET[0];
  function loadOctet(o) {
    octet = o;
    octetTabs.querySelectorAll('.prep-tab').forEach(t => t.classList.toggle('active', t.dataset.key === o.key));
    document.getElementById('octetDiagram').innerHTML = window.Diagrams.render(o.key);
    document.getElementById('octetTitle').textContent = o.title;
    document.getElementById('octetCenter').textContent = 'الذرة المركزية وتوزيعها: ' + o.center;
    document.getElementById('octetGuess').value = '';
    document.getElementById('octetFill').style.width = '0%';
    document.getElementById('octetFill').className = 'om-fill';
    document.getElementById('octetVerdict').textContent = '';
  }
  function revealOctet() {
    const guess = document.getElementById('octetGuess').value;
    const fill = document.getElementById('octetFill');
    fill.style.width = (octet.n / 14) * 100 + '%';
    fill.className = 'om-fill ' + octet.kind;
    const g = guess === '' ? '' : +guess === octet.n ? '🎯 توقّعك صحيح! ' : `توقّعت ${guess}. `;
    document.getElementById('octetVerdict').textContent = `${g}${octet.n} إلكترونات: ${octet.verdict}`;
    const seen = store.get('octet', {});
    seen[octet.key] = true;
    store.set('octet', seen);
    awardOnce('octet:' + octet.key, 2);
    renderOctetProgress();
    if (OCTET.every(x => seen[x.key])) earnBadge('rules');
  }
  function renderOctetProgress() {
    const seen = store.get('octet', {});
    octetTabs.querySelectorAll('.prep-tab').forEach(t => t.classList.toggle('done', !!seen[t.dataset.key]));
    document.getElementById('octetProgress').textContent = `✅ استكشفت ${OCTET.filter(x => seen[x.key]).length} من ${OCTET.length}`;
  }
  if (octetTabs) {
    OCTET.forEach(o => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'prep-tab';
      t.dataset.key = o.key;
      t.setAttribute('role', 'tab');
      t.textContent = o.title;
      t.addEventListener('click', () => loadOctet(o));
      octetTabs.appendChild(t);
    });
    document.getElementById('octetReveal').addEventListener('click', revealOctet);
    document.getElementById('octetGuess').addEventListener('keydown', e => { if (e.key === 'Enter') revealOctet(); });
    loadOctet(OCTET[0]);
    renderOctetProgress();
  }

  // -----------------------------------------------------------------
  // 9. Co-ordinate bond: NH₃ + H⁺ → NH₄⁺
  // -----------------------------------------------------------------
  const COORD = [
    () => window.Diagrams.render('NH3', { highlight: 'lone', extra: { s: 'H', label: 'H⁺', a: 270, dist: 150 } }),
    () => window.Diagrams.render('NH3', { highlight: 'lone', extra: { s: 'H', label: 'H⁺', a: 270, dist: 150, arrow: true } }),
    () => window.Diagrams.render('NH4', { highlight: 'coord' }),
    () =>
      '<svg class="dc-svg" viewBox="-110 -110 250 220" direction="ltr" role="img" aria-label="الصيغة البنائية لأيون الأمونيوم">' +
      '<defs><marker id="cArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10z" class="arrow-fill"/></marker></defs>' +
      '<text class="sym" x="0" y="8">N</text><text class="sym" x="-75" y="8">H</text><text class="sym" x="75" y="8">H</text><text class="sym" x="0" y="88">H</text><text class="sym" x="0" y="-70">H</text>' +
      '<path class="bond" d="M-14 0 H-60 M14 0 H60 M0 16 V66"/><path class="flow-arrow solid" d="M0 -16 V-52" marker-end="url(#cArr)"/>' +
      '<path class="bracket" d="M-90 -100 h-10 v200 h10 M100 -100 h10 v200 h-10"/><text class="charge" x="120" y="-88">+</text></svg>',
  ];
  let coordStep = 0;
  function setCoord(step) {
    coordStep = step;
    document.getElementById('coordDiagram').innerHTML = COORD[step]();
    document.querySelectorAll('.coord-steps li').forEach((li, i) => li.classList.toggle('active', i === step));
    document.getElementById('coordCaption').textContent = document.querySelectorAll('.coord-steps li')[step].textContent;
    document.getElementById('coordNext').disabled = step >= COORD.length - 1;
  }
  document.getElementById('coordNext')?.addEventListener('click', () => setCoord(Math.min(COORD.length - 1, coordStep + 1)));
  document.getElementById('coordReset')?.addEventListener('click', () => setCoord(0));
  if (document.getElementById('coordDiagram')) setCoord(0);

  // -----------------------------------------------------------------
  // 10. Metal complexes table
  // -----------------------------------------------------------------
  document.getElementById('complexCheck')?.addEventListener('click', () => {
    const sels = document.querySelectorAll('#complexTable select');
    let ok = 0;
    sels.forEach(s => {
      const right = s.value === s.dataset.answer;
      s.classList.toggle('sel-ok', right);
      s.classList.toggle('sel-bad', !right && s.value !== '');
      if (right) ok++;
    });
    const res = document.getElementById('complexResult');
    res.textContent = ok === sels.length ? '🎉 الجدول صحيح بالكامل!' : `${ok} من ${sels.length} صحيحة — راجع الخلايا الحمراء.`;
    res.className = 'sorter-result ' + (ok === sels.length ? 'success' : 'error');
  });

  // -----------------------------------------------------------------
  // 11. Metallic bonding: sea of electrons (canvas)
  // -----------------------------------------------------------------
  const canvas = document.getElementById('metalCanvas');
  const metal = { voltage: false, charge: 1, size: 3, elec: 1, ions: [], electrons: [], running: false };
  const SIZE_NAMES = { 1: 'صغير', 2: 'متوسط', 3: 'كبير' };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupMetal() {
    const cols = 8, rows = 4;
    const W = canvas.width, H = canvas.height;
    metal.ions = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        metal.ions.push({ x: ((c + 0.5) * W) / cols + (r % 2 ? W / cols / 4 : -W / cols / 4), y: ((r + 0.5) * H) / rows, p: Math.random() * 6 });
      }
    }
    metal.electrons = [];
    const n = metal.ions.length * metal.elec;
    for (let i = 0; i < n; i++) {
      metal.electrons.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 });
    }
  }
  function cssVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }
  function drawMetal(t) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = cssVar('--bg-soft') || '#eef5f0';
    ctx.fillRect(0, 0, W, H);
    const ionR = 10 + metal.size * 5;
    metal.ions.forEach(ion => {
      const wob = reduceMotion ? 0 : Math.sin(t / 300 + ion.p) * 1.5;
      ctx.beginPath();
      ctx.arc(ion.x + wob, ion.y, ionR, 0, Math.PI * 2);
      ctx.fillStyle = '#e6b8b8';
      ctx.fill();
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#8e1b1b';
      ctx.font = 'bold 15px Tajawal, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(metal.charge === 1 ? '+' : metal.charge + '+', ion.x + wob, ion.y);
    });
    metal.electrons.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1d4ed8';
      ctx.fill();
    });
    // arrow to show the current direction
    if (metal.voltage) {
      ctx.fillStyle = '#1d4ed8';
      ctx.font = 'bold 16px Tajawal, sans-serif';
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText('(−)   e⁻  → → →   (+)', 10, H - 12);
    }
  }
  function stepMetal() {
    const W = canvas.width, H = canvas.height;
    metal.electrons.forEach(e => {
      e.vx += (Math.random() - 0.5) * 0.6;
      e.vy += (Math.random() - 0.5) * 0.6;
      e.vx = Math.max(-2.5, Math.min(2.5, e.vx));
      e.vy = Math.max(-2.5, Math.min(2.5, e.vy));
      e.x += e.vx + (metal.voltage ? 1.6 : 0);
      e.y += e.vy;
      if (e.x > W) e.x -= W;
      if (e.x < 0) e.x += W;
      if (e.y < 0 || e.y > H) { e.vy *= -1; e.y = Math.max(0, Math.min(H, e.y)); }
    });
  }
  function loopMetal(t) {
    if (!metal.running) return;
    if (!reduceMotion) stepMetal();
    drawMetal(t);
    requestAnimationFrame(loopMetal);
  }
  function updateStrength() {
    // Stronger with larger ion charge, smaller ions and more delocalized electrons.
    const score = metal.charge + metal.elec + (4 - metal.size); // 3 … 9
    const pct = ((score - 2) / 7) * 100;
    document.getElementById('strengthFill').style.width = pct + '%';
    document.getElementById('strengthText').textContent = score <= 4 ? 'ضعيفة' : score <= 6 ? 'متوسطة' : 'قوية';
  }
  if (canvas) {
    setupMetal();
    drawMetal(0);
    updateStrength();
    onSlide(id => {
      const on = id === 'lesson3';
      if (on && !metal.running) { metal.running = true; requestAnimationFrame(loopMetal); }
      if (!on) metal.running = false;
    });
    document.getElementById('voltageBtn').addEventListener('click', e => {
      metal.voltage = !metal.voltage;
      e.currentTarget.setAttribute('aria-pressed', String(metal.voltage));
      e.currentTarget.textContent = metal.voltage ? '⏹ أوقف الجهد' : '⚡ طبّق جهدًا كهربائيًا';
      document.getElementById('metalNote').textContent = metal.voltage
        ? 'تنجرف الإلكترونات غير المتمركزة باتجاه واحد ← لهذا توصل الفلزات الكهرباء.'
        : 'الإلكترونات تتحرك عشوائيًا في كل الاتجاهات.';
      if (reduceMotion) drawMetal(0);
    });
    [['metalCharge', 'charge', 'chargeOut', v => '+' + v], ['metalSize', 'size', 'sizeOut', v => SIZE_NAMES[v]], ['metalElec', 'elec', 'elecOut', v => v]].forEach(([id, prop, out, label]) => {
      const input = document.getElementById(id);
      input.addEventListener('input', () => {
        metal[prop] = +input.value;
        document.getElementById(out).textContent = label(input.value);
        if (prop === 'elec') setupMetal();
        updateStrength();
        drawMetal(0);
      });
    });
  }

  // -----------------------------------------------------------------
  // 12. Four-way classifier with evidence
  // -----------------------------------------------------------------
  const TYPES = { ionic: 'أيوني', covalent: 'تساهمي', coord: 'تناسقي', metallic: 'فلزي' };
  const CLASSIFY = [
    { id: 'K2O', label: 'K₂O', type: 'ionic', ev: ['انتقال إلكترونات من K إلى O وتكوين K⁺ وO²⁻', 'زوج مشترك بين K وO', 'إلكترونات حرة الحركة بين أيونات K'], ok: 0 },
    { id: 'NaCl', label: 'NaCl', type: 'ionic', ev: ['زوج مُمنوح من Cl إلى Na', 'جذب بين Na⁺ وCl⁻ في شبكة', 'زوج مشترك بين ذرتين لا فلزيتين'], ok: 1 },
    { id: 'Cl2', label: 'Cl₂', type: 'covalent', ev: ['انتقال إلكترون من Cl إلى Cl', 'زوج مشترك بين ذرتين لا فلزيتين', 'بحر من الإلكترونات'], ok: 1 },
    { id: 'CO2', label: 'CO₂', type: 'covalent', ev: ['روابط ثنائية مشتركة بين C وO', 'أيونات C⁴⁺ وO²⁻', 'زوجان ممنوحان من C'], ok: 0 },
    { id: 'NH4', label: 'NH₄⁺', type: 'coord', ev: ['انتقال إلكترون من N إلى H', 'الزوج من N وحدها نحو H⁺', 'إلكترونات غير متمركزة'], ok: 1 },
    { id: 'CuAq', label: '[Cu(H₂O)₆]²⁺', type: 'coord', ev: ['الماء يمنح زوجًا منفردًا لـ Cu²⁺', 'Cu يمنح إلكترونات للماء', 'جذب بين أيونات Cu²⁺ وO²⁻'], ok: 0 },
    { id: 'Cu', label: 'Cu (نحاس نقي)', type: 'metallic', ev: ['أزواج مشتركة بين كل ذرتين', 'أيونات موجبة في بحر إلكترونات غير متمركزة', 'أيونات Cu⁺ وCu⁻'], ok: 1 },
    { id: 'Mg', label: 'Mg', type: 'metallic', ev: ['إلكترونات حرة الحركة تفسر التوصيل', 'انتقال إلكترونين إلى ذرة أخرى', 'زوج منفرد ممنوح'], ok: 0 },
  ];
  const classifyList = document.getElementById('classifyList');
  const classifyState = {};
  function renderClassifyResult() {
    const done = CLASSIFY.filter(c => classifyState[c.id]?.done).length;
    const first = CLASSIFY.filter(c => classifyState[c.id]?.firstTry).length;
    const res = document.getElementById('classifyResult');
    res.textContent = done < CLASSIFY.length
      ? `🧩 أنجزت ${done} من ${CLASSIFY.length}`
      : `🎉 أنهيت التصنيف — ${first} من ${CLASSIFY.length} صحيحة من المحاولة الأولى.`;
    res.className = 'sorter-result' + (done === CLASSIFY.length ? ' success' : '');
    if (done === CLASSIFY.length && first === CLASSIFY.length) earnBadge('sorter');
  }
  if (classifyList) {
    CLASSIFY.forEach(item => {
      const st = (classifyState[item.id] = { tries: 0, firstTry: false, done: false });
      const row = document.createElement('div');
      row.className = 'cls-row';
      const name = document.createElement('strong');
      name.className = 'cls-name';
      name.textContent = item.label;
      const types = document.createElement('div');
      types.className = 'cls-types';
      const ev = document.createElement('div');
      ev.className = 'cls-ev';
      ev.hidden = true;
      const fb = document.createElement('small');
      fb.className = 'cls-fb';
      fb.setAttribute('aria-live', 'polite');
      Object.entries(TYPES).forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'type-btn t-' + key;
        b.textContent = label;
        b.addEventListener('click', () => {
          if (st.typeOk) return;
          st.tries++;
          if (key === item.type) {
            st.typeOk = true;
            st.firstTryType = st.tries === 1;
            b.classList.add('correct');
            types.querySelectorAll('button').forEach(x => (x.disabled = true));
            fb.textContent = '✅ اختر الدليل:';
            ev.hidden = false;
          } else {
            b.classList.add('wrong');
            b.disabled = true;
            fb.textContent = '❌ فكّر في مصدر الإلكترونات وحركتها.';
          }
        });
        types.appendChild(b);
      });
      item.ev.forEach((text, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ev-btn';
        b.textContent = text;
        b.addEventListener('click', () => {
          if (st.done) return;
          if (i === item.ok) {
            st.done = true;
            st.firstTry = st.firstTryType && !st.evWrong;
            b.classList.add('correct');
            ev.querySelectorAll('button').forEach(x => (x.disabled = true));
            fb.textContent = '✅ ' + TYPES[item.type] + ' — دليل صحيح.';
            row.classList.add('done', 'c-' + item.type);
            awardOnce('classify:' + item.id, 2);
            renderClassifyResult();
          } else {
            st.evWrong = true;
            b.classList.add('wrong');
            b.disabled = true;
          }
        });
        ev.appendChild(b);
      });
      row.append(name, types, ev, fb);
      classifyList.appendChild(row);
    });
    renderClassifyResult();
  }

  // -----------------------------------------------------------------
  // 13. AI tutor (canned answers, scoped to the lesson)
  // -----------------------------------------------------------------
  const chatLog = document.getElementById('chatLog');
  const presetAnswers = {
    'ionic-covalent': {
      q: 'ما الفرق بين الأيوني والتساهمي؟',
      a: 'في الرابطة الأيونية تنتقل الإلكترونات من ذرة (عادة فلز) إلى أخرى (عادة لافلز)، فتتكوّن أيونات متعاكسة الشحنة يجذب بعضها بعضًا، مثل K₂O.\n\nفي الرابطة التساهمية تتشارك ذرتان (عادة لافلزان) زوجًا أو أكثر من الإلكترونات، مثل Cl₂.\n\nجرّب: في HCl، هل تنتقل الإلكترونات أم تُشارَك؟ 🤔',
    },
    draw: {
      q: 'كيف أرسم مخطط التمثيل النقطي؟',
      a: '1️⃣ اكتب عدد إلكترونات التكافؤ لكل ذرة.\n2️⃣ استخدم (•) لإلكترونات ذرة و(×) للأخرى.\n3️⃣ ارسم الإلكترونات أزواجًا: المشتركة في منطقة التداخل، والمنفردة خارجها.\n4️⃣ في المركّبات الأيونية: المستوى الخارجي فقط، مع أقواس مربعة حول كل أيون والشحنة أعلى يمين القوس.\n\nتدرّب في «منشئ المخطط النقطي» ⚛️',
    },
    lone: {
      q: 'ما الزوج المنفرد؟',
      a: 'زوج من إلكترونات المستوى الخارجي لا يشارك في الترابط. مثال: في NH₃ يوجد زوج منفرد واحد على ذرة N، وفي H₂O زوجان منفردان على O.\n\nهل تعرف لماذا يهمّنا الزوج المنفرد على N؟ (تلميح: NH₄⁺ 😉)',
    },
    octet: {
      q: 'لماذا لا تحقق BF₃ وSF₆ قاعدة الثمانية؟',
      a: 'ذرة B (2,3) لديها 3 إلكترونات تكافؤ فقط، فتكوّن ثلاث روابط ويحيط بها 6 إلكترونات ← نقص.\n\nذرة S (2,8,6) من الدورة الثالثة تستطيع استيعاب إلكترونات أكثر (أفلاك d شاغرة في المستوى الثالث)، فتكوّن ست روابط مع F ويحيط بها 12 إلكترونًا ← تجاوز.\n\nجرّب PCl₅: كم إلكترونًا حول P؟',
    },
    coord: {
      q: 'ما الرابطة التناسقية؟',
      a: 'رابطة تساهمية يأتي زوجها من ذرة مانحة واحدة إلى ذرة أو أيون لديه فلك شاغر. تُرسم بسهم من المانح نحو المستقبل.\n\nمثال: في NH₄⁺ تمنح ذرة N زوجها المنفرد لأيون H⁺ (N→H).',
    },
    metal: {
      q: 'لماذا توصل الفلزات الكهرباء؟',
      a: 'في الفلز أيونات موجبة في «بحر» من الإلكترونات غير المتمركزة. هذه الإلكترونات غير مرتبطة بذرة محددة، فعند تطبيق جهد كهربائي تتحرك عبر الشبكة كلها باتجاه واحد.\n\nجرّب زر ⚡ في محاكاة الحصة الثالثة.',
    },
  };
  function appendMsg(role, text) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  }
  function botReply(text) {
    const t = appendMsg('bot', '');
    t.classList.add('typing');
    setTimeout(() => {
      t.classList.remove('typing');
      t.textContent = text;
      chatLog.scrollTop = chatLog.scrollHeight;
    }, 700);
  }
  function routeQuestion(text) {
    const q = text.toLowerCase();
    if (/أيون|ايون|كاتيون|أنيون|انيون|انتقال/.test(q)) return presetAnswers['ionic-covalent'].a;
    if (/نقط|رسم|مخطط|أرسم|ارسم/.test(q)) return presetAnswers.draw.a;
    if (/منفرد/.test(q)) return presetAnswers.lone.a;
    if (/ثمان|bf3|bf₃|sf6|sf₆|pcl5|pcl₅/.test(q)) return presetAnswers.octet.a;
    if (/تناسق|مانح|nh4|nh₄|أمونيوم|امونيوم/.test(q)) return presetAnswers.coord.a;
    if (/فلز|توصيل|بحر|كهرب/.test(q)) return presetAnswers.metal.a;
    if (/تساهم|مشترك|مشاركة/.test(q)) return presetAnswers['ionic-covalent'].a;
    if (/مرحبا|أهلا|اهلا|سلام/.test(q)) return 'وعليكم السلام! 🙋 اسألني عن أنواع الروابط، أو استخدم الأسئلة الجاهزة.';
    if (/شكر/.test(q)) return 'العفو! 🌹 استمر في التعلّم.';
    return 'سؤال رائع! راجع الصفحات 77–86 من كتاب الطالب، أو اسأل معلّمك. ويمكنك تجربة أحد الأسئلة الجاهزة.';
  }
  document.getElementById('chatForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    appendMsg('user', text);
    input.value = '';
    botReply(routeQuestion(text));
  });
  document.querySelectorAll('.preset-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = presetAnswers[btn.dataset.q];
      if (!item) return;
      appendMsg('user', item.q);
      botReply(item.a);
    });
  });

  // -----------------------------------------------------------------
  // 14. Final quiz
  // -----------------------------------------------------------------
  const QUESTIONS = [
    { level: 'تذكُّر', q: 'الرابطة الأيونية هي:', opts: ['قوة جذب كهروستاتيكي بين كاتيونات وأنيونات', 'مشاركة زوج من الإلكترونات', 'جذب بين أيونات موجبة وإلكترونات حرة', 'رابطة بين جزيئات'], correct: 0, why: 'الأيوني: جذب بين أيونات متعاكسة الشحنة.' },
    { level: 'تذكُّر', q: 'شحنتا الأيونين في K₂O:', opts: ['K²⁺ وO²⁻', 'K⁺ وO²⁻', 'K⁺ وO⁻', 'K⁻ وO²⁺'], correct: 1, why: 'كل K يفقد إلكترونًا (K⁺)، وO تكسب اثنين (O²⁻).' },
    { level: 'فهم', q: 'يصل أيون K⁺ إلى توزيع:', opts: ['النيون [2,8]', 'الكريبتون', 'الأرغون [2,8,8]', 'الهيليوم'], correct: 2, why: 'K (2,8,8,1) يفقد إلكترونًا فيصبح [2,8,8]⁺ مثل Ar.' },
    { level: 'تطبيق', q: 'عدد الأزواج المشتركة في Cl₂ وO₂ وN₂ على الترتيب:', opts: ['1، 1، 1', '2، 2، 3', '1، 2، 2', '1، 2، 3'], correct: 3, why: 'أحادية، ثنائية، ثلاثية.' },
    { level: 'تطبيق', q: 'عدد الأزواج المنفردة على O في H₂O:', opts: ['2', '1', '0', '3'], correct: 0, why: 'O (2,6): زوجان مشتركان مع H وزوجان منفردان.' },
    { level: 'فهم', q: 'عدد الإلكترونات حول B في BF₃ وحول S في SF₆:', opts: ['8 و8', '6 و12', '6 و8', '8 و12'], correct: 1, why: 'B: نقص (6)، S: تجاوز (12).' },
    { level: 'فهم', q: 'سبب قدرة S وP على تجاوز قاعدة الثمانية:', opts: ['كبر كتلتهما', 'لأنهما فلزان', 'وجودهما في الدورة الثالثة مع أفلاك d شاغرة', 'لأنهما يكوّنان أيونات'], correct: 2, why: 'عناصر الدورة الثالثة تستوعب إلكترونات زائدة في أفلاك d الشاغرة.' },
    { level: 'تحليل', q: 'في NH₄⁺ الذرة المانحة لزوج الرابطة التناسقية:', opts: ['H⁺', 'N', 'كل ذرات H', 'لا يوجد مانح'], correct: 1, why: 'N تمنح زوجها المنفرد لأيون H⁺.' },
    { level: 'تحليل', q: 'الشحنة الكلية للمعقد [CuCl₄] هي 2− لأن:', opts: ['Cu²⁺ مع أربعة أيونات Cl⁻', 'Cu⁺ مع أربعة Cl⁻', 'الكلور متعادل', 'شحنة النحاس 2−'], correct: 0, why: '+2 + 4(−1) = −2.' },
    { level: 'تقويم', q: 'قال طالب: «في النحاس كل إلكترون محصور بين ذرتين». حكمك:', opts: ['صحيح', 'صحيح فقط في النحاس الصلب', 'خطأ؛ لأن النحاس أيوني', 'خطأ؛ الإلكترونات غير متمركزة تتحرك في الشبكة كلها'], correct: 3, why: 'الرابطة الفلزية: أيونات موجبة في بحر إلكترونات غير متمركزة.' },
  ];
  let qIdx = 0;
  let qAnswers = [];
  const quizIntro = document.getElementById('quizIntro');
  const quizStage = document.getElementById('quizStage');
  const quizResult = document.getElementById('quizResult');
  const qbox = document.getElementById('qbox');

  function renderQ() {
    const q = QUESTIONS[qIdx];
    qbox.innerHTML = '';
    const tag = document.createElement('span');
    tag.className = 'q-tag';
    tag.textContent = q.level;
    const title = document.createElement('p');
    title.className = 'q-title';
    title.textContent = qIdx + 1 + '. ' + q.q;
    const opts = document.createElement('div');
    opts.className = 'options';
    q.opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      if (qAnswers[qIdx] === i) b.classList.add('picked');
      b.addEventListener('click', () => {
        qAnswers[qIdx] = i;
        opts.querySelectorAll('button').forEach(x => x.classList.toggle('picked', x === b));
      });
      opts.appendChild(b);
    });
    qbox.append(tag, title, opts);
    document.getElementById('qPos').textContent = qIdx + 1;
    document.getElementById('qTotal').textContent = QUESTIONS.length;
    document.getElementById('qbarFill').style.width = ((qIdx + 1) / QUESTIONS.length) * 100 + '%';
    document.getElementById('qPrev').disabled = qIdx === 0;
    document.getElementById('qNext').textContent = qIdx === QUESTIONS.length - 1 ? '✔ إنهاء' : '→ التالي';
  }
  document.getElementById('startQuiz')?.addEventListener('click', () => {
    qIdx = 0;
    qAnswers = new Array(QUESTIONS.length).fill(null);
    quizIntro.hidden = true;
    quizStage.hidden = false;
    quizResult.hidden = true;
    renderQ();
  });
  document.getElementById('qPrev')?.addEventListener('click', () => { if (qIdx > 0) { qIdx--; renderQ(); } });
  document.getElementById('qNext')?.addEventListener('click', () => {
    if (qIdx < QUESTIONS.length - 1) { qIdx++; renderQ(); }
    else finishQuiz();
  });
  function finishQuiz() {
    let score = 0;
    QUESTIONS.forEach((q, i) => { if (qAnswers[i] === q.correct) score++; });
    const percent = Math.round((score / QUESTIONS.length) * 100);
    quizStage.hidden = true;
    quizResult.hidden = false;
    document.getElementById('qrTitle').textContent = percent >= 70 ? '🎉 أحسنت! اجتزت بنجاح' : 'استمر في المحاولة';
    document.getElementById('qrScore').textContent = percent + '%';
    document.getElementById('qrMsg').textContent =
      (percent >= 90 ? 'إتقان رائع!' : percent >= 70 ? 'أداء جيد! لقد اجتزت.' : 'راجع الدرس وحاول مرة أخرى.') +
      ` (${score} من ${QUESTIONS.length} إجابات صحيحة)`;
    document.getElementById('qrCert').style.display = percent >= 70 ? 'inline-block' : 'none';

    let review = document.getElementById('qrReview');
    if (!review) {
      review = document.createElement('ol');
      review.id = 'qrReview';
      review.className = 'qr-review';
      quizResult.insertBefore(review, quizResult.querySelector('.qr-actions'));
    }
    review.innerHTML = '';
    QUESTIONS.forEach((q, i) => {
      const li = document.createElement('li');
      const ok = qAnswers[i] === q.correct;
      li.className = ok ? 'ok' : 'bad';
      li.textContent = `${ok ? '✅' : '❌'} ${q.q} — الصحيح: ${q.opts[q.correct]}. ${q.why}`;
      review.appendChild(li);
    });

    // quiz points: the best attempt counts, up to 50
    const awarded = store.get('awarded', {});
    if ((awarded.quiz || 0) < score * 5) { awarded.quiz = score * 5; store.set('awarded', awarded); }
    if (percent > +store.get('quizBest', 0)) store.set('quizBest', percent);
    if (percent >= 90) earnBadge('expert');
    refreshCert();
    refreshDashboard();
  }
  document.getElementById('qrRetry')?.addEventListener('click', () => {
    quizResult.hidden = true;
    quizIntro.hidden = false;
  });

  // -----------------------------------------------------------------
  // 15. Certificate (unlocked at 70%)
  // -----------------------------------------------------------------
  function hijri(d) {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch { return '—'; }
  }
  function refreshCert() {
    const passed = +store.get('quizBest', 0) >= 70;
    document.getElementById('certLocked').hidden = passed;
    document.getElementById('certFormWrap').hidden = !passed;
    document.getElementById('certCard').hidden = !passed;
  }
  document.getElementById('renderCert')?.addEventListener('click', () => {
    const name = document.getElementById('certName').value.trim() || 'الطالب/ة';
    const score = +store.get('quizBest', 0);
    document.getElementById('certNameOut').textContent = name;
    document.getElementById('certScore').textContent = score + '%';
    const now = new Date();
    document.getElementById('certDateG').textContent = now.toLocaleDateString('ar-OM');
    document.getElementById('certDateH').textContent = hijri(now);
    const serial = 'BOND-3-1-' + Date.now().toString(36).toUpperCase().slice(-6);
    document.getElementById('certSerial').textContent = serial;
    const img = document.createElement('img');
    img.alt = 'رمز QR للتحقق';
    img.style.width = '100%';
    img.style.height = '100%';
    img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encodeURIComponent(serial + ' · ' + name + ' · ' + score + '%');
    document.getElementById('certQr').replaceChildren(img);
    store.set('certName', name);
  });
  document.getElementById('printCert')?.addEventListener('click', () => window.print());
  const savedName = store.get('certName', '');
  if (savedName) document.getElementById('certName').value = savedName;
  refreshCert();

  // -----------------------------------------------------------------
  // 16. Interactive video (YouTube IFrame API). Set the IDs below; while
  //     they are REPLACE_ME the questions are answered without the video.
  // -----------------------------------------------------------------
  const VIDEO_IDS = { video1: 'REPLACE_ME', video2: 'REPLACE_ME' };
  const VIDEO_QUESTIONS = {
    video1: [
      { time: 30, q: 'ما الجسيم الذي ينتقل عند تكوّن رابطة أيونية؟', opts: ['البروتون', 'الإلكترون (من الفلز إلى اللافلز)', 'النيوترون', 'النواة'], correct: 1, explain: 'تنتقل الإلكترونات من الفلز إلى اللافلز.' },
      { time: 60, q: 'ذرة Na تفقد إلكترونًا فتصبح…', opts: ['أنيون Na⁻', 'ذرة متعادلة', 'كاتيون Na⁺', 'جزيء Na₂'], correct: 2, explain: 'فقدان إلكترون ← شحنة موجبة ← كاتيون.' },
      { time: 105, q: 'لماذا نستخدم • و× في المخطط؟', opts: ['لتمييز مصدر الإلكترونات', 'لتمييز البروتونات', 'للزينة فقط', 'لتمييز المستويات الداخلية'], correct: 0, explain: '• لذرة و× لأخرى لمعرفة مصدر كل إلكترون.' },
      { time: 135, q: 'كم زوجًا مشتركًا في جزيء Cl₂؟', opts: ['صفر', 'زوج واحد', 'زوجان', 'ثلاثة'], correct: 1, explain: 'رابطة أحادية: زوج مشترك واحد.' },
    ],
    video2: [
      { time: 30, q: 'كم زوجًا مشتركًا في N₂؟', opts: ['1', '2', '3', '4'], correct: 2, explain: 'رابطة ثلاثية N≡N.' },
      { time: 60, q: 'ما الصيغة البنائية لـ CO₂؟', opts: ['O–C–O', 'O=C=O', 'O≡C–O', 'C=O=O'], correct: 1, explain: 'رابطتان ثنائيتان.' },
      { time: 105, q: 'كم إلكترونًا حول S في SF₆؟', opts: ['6', '8', '10', '12'], correct: 3, explain: 'ست روابط × 2 = 12.' },
      { time: 135, q: 'هل يحقق H₂ قاعدة الثمانية؟', opts: ['نعم', 'لا — لكل H إلكترونان مثل He'], correct: 1, explain: 'الهيدروجين يكتفي بإلكترونين.' },
    ],
  };
  const vqAnswered = { video1: new Set(), video2: new Set() };
  function vqProgress(id) {
    const el = document.getElementById('vqProg-' + id);
    if (el) el.textContent = `❓ ${vqAnswered[id].size}/${VIDEO_QUESTIONS[id].length} أسئلة`;
  }
  function buildQuestionCard(id, q, i, onDone) {
    const card = document.createElement('div');
    card.className = 'quiz-card vq-inline';
    const h = document.createElement('h4');
    h.textContent = `سؤال ${i + 1}${VIDEO_IDS[id] !== 'REPLACE_ME' ? ' · ⏱ ' + Math.floor(q.time / 60) + ':' + String(q.time % 60).padStart(2, '0') : ''}`;
    const p = document.createElement('p');
    p.textContent = q.q;
    const opts = document.createElement('div');
    opts.className = 'options';
    const fb = document.createElement('div');
    fb.className = 'feedback';
    fb.hidden = true;
    q.opts.forEach((o, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      b.addEventListener('click', () => {
        opts.querySelectorAll('button').forEach((x, k) => {
          x.disabled = true;
          if (k === q.correct) x.classList.add('correct');
          else if (x === b) x.classList.add('wrong');
        });
        fb.hidden = false;
        const ok = j === q.correct;
        fb.className = 'feedback ' + (ok ? 'success' : 'error');
        fb.textContent = (ok ? '✅ ' : '❌ ') + q.explain;
        vqAnswered[id].add(i);
        vqProgress(id);
        onDone && onDone(ok);
      });
      opts.appendChild(b);
    });
    card.append(h, p, opts, fb);
    return card;
  }
  Object.keys(VIDEO_QUESTIONS).forEach(id => {
    const host = document.querySelector(`.video-host[data-video="${id}"]`);
    const list = document.querySelector(`[data-vq-list="${id}"]`);
    if (!host || !list) return;
    if (VIDEO_IDS[id] === 'REPLACE_ME') {
      host.innerHTML = '<div class="placeholder-card"><div class="ph-icon">🎬</div><strong>الفيديو التفاعلي</strong><small>سيُرفق رابط الفيديو لاحقاً — أجب عن الأسئلة أدناه.</small></div>';
      VIDEO_QUESTIONS[id].forEach((q, i) => list.appendChild(buildQuestionCard(id, q, i)));
    } else {
      host.innerHTML = `<div class="video-player-wrap"><div id="player-${id}"></div></div>`;
    }
    vqProgress(id);
  });

  let ytLoading = false;
  const ytPlayers = {};
  let ytTimer = null;
  function ensureYT(cb) {
    if (window.YT && window.YT.Player) return cb();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); cb(); };
    if (!ytLoading) {
      ytLoading = true;
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  }
  function openVQ(id, q, i, player) {
    const modal = document.getElementById('vqModal');
    const card = document.createElement('div');
    card.className = 'vq-card';
    const close = document.createElement('button');
    close.className = 'vq-close';
    close.setAttribute('aria-label', 'إغلاق');
    close.textContent = '✕';
    const done = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); try { player.playVideo(); } catch { /* ignore */ } };
    close.addEventListener('click', done);
    card.append(close, buildQuestionCard(id, q, i, () => setTimeout(done, 2200)));
    modal.replaceChildren(card);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  onSlide(slideId => {
    Object.values(ytPlayers).forEach(p => { try { p.pauseVideo(); } catch { /* ignore */ } });
    if (ytTimer) { clearInterval(ytTimer); ytTimer = null; }
    if (!VIDEO_QUESTIONS[slideId] || VIDEO_IDS[slideId] === 'REPLACE_ME') return;
    ensureYT(() => {
      if (!ytPlayers[slideId]) {
        ytPlayers[slideId] = new YT.Player('player-' + slideId, {
          videoId: VIDEO_IDS[slideId],
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        });
      }
      const player = ytPlayers[slideId];
      ytTimer = setInterval(() => {
        if (!player.getCurrentTime || player.getPlayerState() !== 1) return;
        const t = player.getCurrentTime();
        VIDEO_QUESTIONS[slideId].forEach((q, i) => {
          if (!vqAnswered[slideId].has(i) && t >= q.time && !document.getElementById('vqModal').classList.contains('open')) {
            player.pauseVideo();
            openVQ(slideId, q, i, player);
          }
        });
      }, 300);
    });
  });

  // -----------------------------------------------------------------
  // 17. Dashboard
  // -----------------------------------------------------------------
  function refreshDashboard() {
    const visited = store.get('visited', {});
    const list = document.getElementById('dashSections');
    if (list) {
      list.innerHTML = '';
      drawerLinks.forEach(a => {
        const li = document.createElement('li');
        const id = a.dataset.slide;
        li.className = visited[id] ? 'done' : '';
        const label = document.createElement('span');
        label.textContent = a.querySelector('.dl-icon').textContent + ' ' + a.querySelector('.dl-text').textContent;
        const mark = document.createElement('span');
        mark.textContent = visited[id] ? '✅' : '⬜';
        li.append(label, mark);
        list.appendChild(li);
      });
    }
    const badges = store.get('badges', {});
    document.querySelectorAll('.d-badge').forEach(b => b.classList.toggle('earned', !!badges[b.dataset.badge]));
    const points = Math.min(MAX_POINTS, totalPoints());
    const dashScore = document.getElementById('dashScore');
    if (dashScore) dashScore.textContent = points;
    const bar = document.getElementById('dashScoreBar');
    if (bar) bar.style.width = (points / MAX_POINTS) * 100 + '%';
  }
  document.getElementById('resetProgress')?.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من إعادة تعيين تقدّمك؟ ستفقد جميع الشارات والنقاط.')) {
      store.reset();
      location.hash = '';
      location.reload();
    }
  });

  // -----------------------------------------------------------------
  // 18. Formulas inside Arabic text: a formula ending in ⁺/⁻ (O²⁻, [NH₄]⁺)
  //     is isolated left-to-right so its charge stays after the symbol.
  // -----------------------------------------------------------------
  const FORMULA = /[[(]?[A-Za-z0-9][A-Za-z0-9₀-₉⁰¹²³⁴-⁹()[\],]*[⁺⁻]/g;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT', 'CODE', 'PRE']);
  function fixBidi(rootEl) {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || SKIP.has(p.tagName) || p.closest('svg, .f')) return NodeFilter.FILTER_REJECT;
        FORMULA.lastIndex = 0;
        return FORMULA.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const text = n.nodeValue;
      const frag = document.createDocumentFragment();
      let last = 0;
      FORMULA.lastIndex = 0;
      let m;
      while ((m = FORMULA.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        span.className = 'f';
        span.dir = 'ltr';
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.replaceWith(frag);
    });
  }
  fixBidi(document.body);
  let fixing = false;
  new MutationObserver(records => {
    if (fixing) return;
    fixing = true;
    records.forEach(r => r.addedNodes.forEach(n => {
      if (n.nodeType === 3 && n.parentElement) fixBidi(n.parentElement);
      else if (n.nodeType === 1) fixBidi(n);
    }));
    fixing = false;
  }).observe(document.body, { childList: true, subtree: true });

  // -----------------------------------------------------------------
  // 19. Initial render (last, so every const above is ready)
  // -----------------------------------------------------------------
  showSlide(currentIdx, { silent: true });
})();
