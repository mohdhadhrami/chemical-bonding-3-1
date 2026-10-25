/* ============================================================
   الترابط الكيميائي 3-1 — Dot-and-cross diagram renderer
   Draws outer-shell diagrams as inline SVG: the central atom's
   electrons are dots (•), the other atoms' electrons are crosses (×).
   Angles are SVG degrees: 0 = right, 90 = down.
   ============================================================ */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const radius = s => (s === 'H' ? 36 : 40);

  // Molecules from the textbook tables 3-2, 3-3 and 3-4.
  // lig: { s, a (angle), order (shared pairs), lp (lone pairs on it), coord (pair from the centre) }
  const MOLS = {
    H2: { title: 'H₂', center: { s: 'H', lone: [] }, lig: [{ s: 'H', a: 0, order: 1, lp: 0 }] },
    Cl2: { title: 'Cl₂', center: { s: 'Cl', lone: [90, 180, 270] }, lig: [{ s: 'Cl', a: 0, order: 1, lp: 3 }] },
    HCl: { title: 'HCl', center: { s: 'Cl', lone: [90, 180, 270] }, lig: [{ s: 'H', a: 0, order: 1, lp: 0 }] },
    H2O: {
      title: 'H₂O',
      center: { s: 'O', lone: [240, 300] },
      lig: [{ s: 'H', a: 30, order: 1, lp: 0 }, { s: 'H', a: 150, order: 1, lp: 0 }],
    },
    NH3: {
      title: 'NH₃',
      center: { s: 'N', lone: [270] },
      lig: [{ s: 'H', a: 0, order: 1, lp: 0 }, { s: 'H', a: 180, order: 1, lp: 0 }, { s: 'H', a: 90, order: 1, lp: 0 }],
    },
    CH4: {
      title: 'CH₄',
      center: { s: 'C', lone: [] },
      lig: [0, 90, 180, 270].map(a => ({ s: 'H', a, order: 1, lp: 0 })),
    },
    O2: { title: 'O₂', center: { s: 'O', lone: [140, 220] }, lig: [{ s: 'O', a: 0, order: 2, lp: 2 }] },
    N2: { title: 'N₂', center: { s: 'N', lone: [180] }, lig: [{ s: 'N', a: 0, order: 3, lp: 1 }] },
    CO2: {
      title: 'CO₂',
      center: { s: 'C', lone: [] },
      lig: [{ s: 'O', a: 0, order: 2, lp: 2 }, { s: 'O', a: 180, order: 2, lp: 2 }],
    },
    SO2: {
      title: 'SO₂',
      center: { s: 'S', lone: [270] },
      lig: [{ s: 'O', a: 35, order: 2, lp: 2 }, { s: 'O', a: 145, order: 2, lp: 2 }],
    },
    BF3: {
      title: 'BF₃',
      center: { s: 'B', lone: [] },
      lig: [270, 30, 150].map(a => ({ s: 'F', a, order: 1, lp: 3 })),
    },
    PCl5: {
      title: 'PCl₅',
      center: { s: 'P', lone: [] },
      lig: [270, 342, 54, 126, 198].map(a => ({ s: 'Cl', a, order: 1, lp: 3 })),
    },
    SF6: {
      title: 'SF₆',
      center: { s: 'S', lone: [] },
      lig: [0, 60, 120, 180, 240, 300].map(a => ({ s: 'F', a, order: 1, lp: 3 })),
    },
    NH4: {
      title: '[NH₄]⁺',
      charge: '+',
      center: { s: 'N', lone: [] },
      lig: [
        { s: 'H', a: 0, order: 1, lp: 0 },
        { s: 'H', a: 180, order: 1, lp: 0 },
        { s: 'H', a: 90, order: 1, lp: 0 },
        { s: 'H', a: 270, order: 1, lp: 0, coord: true },
      ],
    },
  };

  const rad = a => (a * Math.PI) / 180;
  const dir = a => [Math.cos(rad(a)), Math.sin(rad(a))];
  const f = n => Math.round(n * 10) / 10;

  function dot(x, y) {
    return `<circle class="e-dot" cx="${f(x)}" cy="${f(y)}" r="4.2"/>`;
  }
  function cross(x, y) {
    return `<path class="e-cross" d="M${f(x - 4)} ${f(y - 4)} l8 8 M${f(x + 4)} ${f(y - 4)} l-8 8"/>`;
  }
  function mark(kind, x, y) {
    return kind === 'dot' ? dot(x, y) : cross(x, y);
  }

  // A pair of electrons placed side by side across direction a, centred on (x, y).
  function lonePair(x, y, a, kind, extraClass = '') {
    const [dx, dy] = dir(a + 90);
    return `<g class="pair lone ${extraClass}" data-kind="lone" tabindex="0" role="button" aria-label="زوج منفرد">${mark(kind, x + dx * 5.5, y + dy * 5.5)}${mark(kind, x - dx * 5.5, y - dy * 5.5)}<circle class="hit" cx="${f(x)}" cy="${f(y)}" r="11"/></g>`;
  }

  /**
   * Render a molecule key (or spec) to an SVG string.
   * opts.extra: a free atom drawn apart, e.g. { s: 'H', label: 'H⁺', a: 270, dist: 140, arrow: true }
   * opts.highlight: 'coord' | 'lone' to emphasise those pairs.
   */
  function render(keyOrSpec, opts = {}) {
    const m = typeof keyOrSpec === 'string' ? MOLS[keyOrSpec] : keyOrSpec;
    if (!m) return '';
    const n = m.lig.length;
    const R = n >= 5 ? 60 : n === 4 && m.lig.every(l => l.s === 'H') ? 40 : radius(m.center.s) + (n === 3 && m.lig[0].s !== 'H' ? 6 : 0);
    const C = [0, 0];
    const parts = [];
    const ext = [];
    const grow = (x, y, r) => ext.push([x - r, y - r, x + r, y + r]);

    parts.push(`<circle class="shell center" cx="0" cy="0" r="${R}"/>`);
    grow(0, 0, R);

    m.lig.forEach(l => {
      const r = radius(l.s);
      const d = R + r - 22;
      const [ux, uy] = dir(l.a);
      const L = [ux * d, uy * d];
      parts.push(`<circle class="shell" cx="${f(L[0])}" cy="${f(L[1])}" r="${r}"/>`);
      parts.push(`<text class="sym" x="${f(L[0])}" y="${f(L[1] + 6)}">${l.s}</text>`);
      grow(L[0], L[1], r);

      // shared pairs in the overlap, spread across the bond axis
      const base = R - 11;
      const bx = ux * base;
      const by = uy * base;
      const [px, py] = dir(l.a + 90);
      for (let i = 0; i < l.order; i++) {
        const off = (i - (l.order - 1) / 2) * 12;
        const cx = bx + px * off;
        const cy = by + py * off;
        const coord = !!l.coord;
        const cls = coord ? 'pair shared coord' : 'pair shared';
        const kind = coord ? 'coord' : 'shared';
        parts.push(
          `<g class="${cls}${opts.highlight === 'coord' && coord ? ' hl' : ''}" data-kind="${kind}" tabindex="0" role="button" aria-label="${coord ? 'زوج رابطة تناسقية' : 'زوج مشترك'}">` +
            mark('dot', cx - ux * 4.5, cy - uy * 4.5) +
            mark(coord ? 'dot' : 'cross', cx + ux * 4.5, cy + uy * 4.5) +
            `<circle class="hit" cx="${f(cx)}" cy="${f(cy)}" r="11"/></g>`,
        );
      }
      // lone pairs on the outer atom, facing away from the centre
      const offs = l.lp === 1 ? [0] : l.lp === 2 ? [-55, 55] : l.lp === 3 ? [-85, 0, 85] : [];
      offs.forEach(o => {
        const [lx, ly] = dir(l.a + o);
        parts.push(lonePair(L[0] + lx * r, L[1] + ly * r, l.a + o, 'cross'));
      });
    });

    m.center.lone.forEach(a => {
      const [lx, ly] = dir(a);
      parts.push(lonePair(lx * R, ly * R, a, 'dot', opts.highlight === 'lone' ? 'hl' : ''));
    });
    parts.push(`<text class="sym" x="0" y="7">${m.center.s}</text>`);

    if (opts.extra) {
      const e = opts.extra;
      const [ex, ey] = dir(e.a);
      const X = ex * e.dist;
      const Y = ey * e.dist;
      const r = radius(e.s);
      parts.push(`<circle class="shell dashed" cx="${f(X)}" cy="${f(Y)}" r="${r}"/>`);
      parts.push(`<text class="sym" x="${f(X)}" y="${f(Y + 6)}">${e.label || e.s}</text>`);
      grow(X, Y, r);
      if (e.arrow) {
        const sx = ex * (R + 14);
        const sy = ey * (R + 14);
        const tx = X - ex * (r + 6);
        const ty = Y - ey * (r + 6);
        parts.push(`<path class="flow-arrow" d="M${f(sx)} ${f(sy)} L${f(tx)} ${f(ty)}" marker-end="url(#dArr)"/>`);
      }
    }

    let [x0, y0, x1, y1] = ext.reduce(
      (b, e) => [Math.min(b[0], e[0]), Math.min(b[1], e[1]), Math.max(b[2], e[2]), Math.max(b[3], e[3])],
      [Infinity, Infinity, -Infinity, -Infinity],
    );
    // lone pairs sit on the circle edge; leave room for them
    x0 -= 10; y0 -= 10; x1 += 10; y1 += 10;
    if (m.charge) {
      parts.push(
        `<path class="bracket" d="M${f(x0 + 8)} ${f(y0)} h-10 v${f(y1 - y0)} h10 M${f(x1 - 8)} ${f(y0)} h10 v${f(y1 - y0)} h-10"/>` +
          `<text class="charge" x="${f(x1 + 10)}" y="${f(y0 + 10)}">${m.charge}</text>`,
      );
      x0 -= 6; x1 += 26; y0 -= 6;
    }
    const pad = 8;
    const vb = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map(f).join(' ');
    return svgWrap(vb, parts.join(''), m.title);
  }

  function svgWrap(viewBox, body, title) {
    return (
      `<svg xmlns="${SVG_NS}" class="dc-svg" viewBox="${viewBox}" direction="ltr" role="img" aria-label="مخطط التمثيل النقطي ${title || ''}">` +
      `<defs><marker id="dArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" class="arrow-fill"/></marker></defs>` +
      body +
      `</svg>`
    );
  }

  // Ionic compound with every ion in its own bracket (outer shells only).
  function ion(x, sym, electrons, charge, coef) {
    const r = 40;
    let s = `<circle class="shell${electrons ? '' : ' dashed'}" cx="${x}" cy="0" r="${r}"/>`;
    s += `<text class="sym" x="${x}" y="7">${sym}</text>`;
    if (electrons) {
      [0, 90, 180, 270].forEach((a, i) => {
        const [ux, uy] = dir(a);
        const [px, py] = dir(a + 90);
        const cx = x + ux * r;
        const cy = uy * r;
        const kinds = electrons[i];
        s += mark(kinds[0], cx + px * 5.5, cy + py * 5.5) + mark(kinds[1], cx - px * 5.5, cy - py * 5.5);
      });
    }
    s += `<path class="bracket" d="M${x - r - 6} -52 h-8 v104 h8 M${x + r + 6} -52 h8 v104 h-8"/>`;
    s += `<text class="charge" x="${x + r + 18}" y="-42">${charge}</text>`;
    if (coef) s += `<text class="coef" x="${x - r - 30}" y="8">${coef}</text>`;
    return s;
  }

  function renderIonic(key) {
    if (key === 'CaF2') {
      const fl = [['dot', 'dot'], ['dot', 'dot'], ['dot', 'dot'], ['dot', 'cross']];
      const body = ion(0, 'Ca', null, '2+') + ion(170, 'F', fl, '−', '2');
      return svgWrap('-70 -70 310 140', body, 'CaF₂');
    }
    return '';
  }

  window.Diagrams = {
    MOLS,
    render(key, opts) {
      return key === 'CaF2' ? renderIonic(key) : render(key, opts);
    },
  };
})();
