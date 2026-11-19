/* Rentway Reskin — CaribeCar · v1.1.0
   Runs on rentwayv1.emotionmobility.com only. Never replaces Rentway elements: it restyles them,
   adds labels/classes, and adds its own overlay elements, so every original interaction keeps working.
   Each enhancement can be switched on/off from the extension popup (settings: see early.js). */

/* ---------- 0. Settings ---------- */
// early.js (document_start) loaded the settings and set the matching classes on <html>.
// Here we add change notifications, the popup messaging and cross-tab sync.
(() => {
  const cfg = window.__rwCfg;
  if (!cfg || cfg.set) return;
  const listeners = new Set();
  cfg.is = k => !!cfg.settings[k];
  cfg.onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  const notify = () => listeners.forEach(fn => { try { fn(cfg.settings); } catch (e) {} });
  cfg.set = patch => {
    for (const k in patch) if (k in cfg.DEF) cfg.settings[k] = !!patch[k];
    cfg.save(cfg.settings); cfg.applyClasses(cfg.settings); notify();
  };
  try {
    chrome.runtime.onMessage.addListener((msg, _s, reply) => {
      if (!msg) return;
      if (msg.type === 'rw-set') cfg.set(msg.settings || { design: !!msg.on });
      if (msg.type === 'rw-get' || msg.type === 'rw-set') reply({ settings: { ...cfg.settings }, on: cfg.is('design') });
    });
  } catch (e) {}
  // a change made in another Rentway tab applies here too
  window.addEventListener('storage', e => {
    if (e.key !== cfg.KEY) return;
    cfg.settings = cfg.load(); cfg.applyClasses(cfg.settings); notify();
  });
})();

/* ---------- 1. Layout, labels, summary bar, shortcuts ---------- */
(() => {
  if (window.__rwRemove) window.__rwRemove();
  const cfg = window.__rwCfg;

  const TAB_LABELS = {
    'mdi-content-paste': 'Général', 'mdi-account-details-outline': 'Conducteurs',
    'mdi-shape-rectangle-plus': 'Options', 'mdi-ticket-percent-outline': 'Paiements',
    'mdi-car': 'Véhicule', 'mdi-clipboard-alert-outline': 'Remarques',
    'mdi-file-check': 'Commissions', 'mdi-emoticon-outline': 'Réclamations',
    'mdi-cash-register': 'Caisse', 'mdi-printer': 'Confirmation',
    'mdi-calculator': 'Fermeture', 'mdi-file-document-multiple': 'Documents'
  };
  // Primary actions get a text label; secondary ones stay icon-only (native tooltips remain)
  const ACTIONS = {
    'mdi-file-edit-outline': { label: 'Éditer', kind: 'primary' },
    'mdi-content-save-outline': { label: 'Sauvegarder', kind: 'primary' },
    'mdi-undo': { label: 'Annuler', kind: 'labelled' },
    'mdi-trash-can-outline': { label: '', kind: 'danger' }
  };

  const root = document.documentElement;
  const bar = document.createElement('div'); bar.id = 'rw-bar'; document.body.appendChild(bar);
  const toggle = document.createElement('button'); toggle.id = 'rw-toggle'; toggle.type = 'button'; document.body.appendChild(toggle);
  const setToggle = () => toggle.textContent = cfg.is('design') ? 'Nouveau design : ON' : 'Nouveau design : OFF';
  toggle.onclick = () => cfg.set({ design: !cfg.is('design') });
  const offChange = cfg.onChange(() => { setToggle(); apply(); });
  setToggle();

  const mdi = el => el && [...el.classList].find(c => c.startsWith('mdi-') && c !== 'mdi');
  const lbl = t => [...document.querySelectorAll('.v-input label')].find(x => x.textContent.trim() === t);
  const fieldInput = t => lbl(t)?.closest('.v-input')?.querySelector('input');
  const leaf = (r, t) => [...r.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent.trim() === t);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const timeAfter = inp => {
    if (!inp) return '';
    const r = inp.getBoundingClientRect();
    const sels = [...document.querySelectorAll('select')].filter(s => { const q = s.getBoundingClientRect(); return Math.abs(q.top - r.top) < 20 && q.left > r.left && q.left < r.right + 300; });
    return sels.length >= 2 ? `${sels[0].value}:${sels[1].value}` : '';
  };
  const setAttr = (el, k, v) => { if (el && el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const setCls = (el, c, on) => { if (el && el.classList.contains(c) !== on) el.classList.toggle(c, on); };

  function tagLayout() {
    // Modals (e.g. dashboard "Pré-Clos") reuse .mainNavbar for their title: only the page header is made sticky
    const pageEl = sel => [...document.querySelectorAll(sel)].find(e => !e.closest('.v-dialog__content, .v-dialog'));
    const mn = pageEl('.mainNavbar');
    const head = mn?.closest('.row');
    const tabs = pageEl('.secondNavbar')?.closest('.row');
    document.querySelectorAll('.rw-head').forEach(e => e !== head && e.classList.remove('rw-head'));
    document.querySelectorAll('.rw-tabs').forEach(e => e !== tabs && e.classList.remove('rw-tabs'));
    setCls(head, 'rw-head', true); setCls(tabs, 'rw-tabs', true);
    if (mn) root.style.setProperty('--rw-headh', (mn.getBoundingClientRect().height + 9) + 'px');
  }

  function labelButtons() {
    document.querySelectorAll('.secondNavbar__content button.btnnavbar').forEach((b, i) => {
      const k = mdi(b.querySelector('.v-icon'));
      if (!TAB_LABELS[k]) return;
      setAttr(b.querySelector('.v-btn__content'), 'data-rw-label', TAB_LABELS[k]);
      if (i < 10 && cfg.is('shortcuts')) setAttr(b, 'data-rw-kbd', `Alt+${(i + 1) % 10}`); else if (b.hasAttribute('data-rw-kbd')) b.removeAttribute('data-rw-kbd');
    });
    document.querySelectorAll('.mainNavbar__content_icons button').forEach(b => {
      const a = ACTIONS[mdi(b.querySelector('.v-icon'))];
      setAttr(b.querySelector('.v-btn__content'), 'data-rw-label', a ? a.label : '');
      setCls(b, 'rw-primary', a?.kind === 'primary');
      setCls(b, 'rw-labelled', a?.kind === 'labelled');
      setCls(b, 'rw-danger', a?.kind === 'danger');
    });
  }

  function formatPrices() {
    document.querySelectorAll('.frameSummaryStyles').forEach(r => {
      const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const v = n.nodeValue; if (/€-?\d+\.\d{3,}/.test(v)) n.nodeValue = v.replace(/€(-?\d+\.\d{3,})/g, (_, x) => '€' + Number(x).toFixed(2)); }
    });
  }

  function flagEmpty() {
    document.querySelectorAll('.pa5.v-card .v-input').forEach(vi => {
      const inp = vi.querySelector('input:not([type=hidden]), select');
      setCls(vi, 'rw-empty', !!(inp && !inp.value && !vi.classList.contains('v-input--is-dirty')));
    });
  }

  // Summary bar keeps the last known values so it stays visible on every tab of the same booking
  let cache = {}, lastBar = '';
  function updateBar() {
    const resa = fieldInput('Réservation nr.')?.value;
    const dep = fieldInput('Date départ');
    const headTitle = document.querySelector('.mainNavbar__content_title')?.textContent || '';
    const titleResa = (headTitle.match(/R[ée]servation:\s*(\d+)/) || [])[1];
    if (dep) {
      const ret = fieldInput('Date de retour');
      cache = {
        resa: resa || titleResa,
        client: fieldInput('Client')?.value,
        dep: `${dep.value} ${timeAfter(dep)}`, ret: `${ret?.value || ''} ${timeAfter(ret)}`,
        agDep: (fieldInput('Agence départ')?.value || '').split('/').pop().trim(),
        agRet: (fieldInput('Agence de retour')?.value || '').split('/').pop().trim(),
        cat: fieldInput('Catégorie louée')?.value,
        statut: [...document.querySelectorAll('.v-chip')].map(c => c.textContent.trim()).find(Boolean) || ''
      };
    }
    const solde = leaf(document, 'Solde')?.closest('.row')?.textContent.replace(/\s+/g, ' ').replace('Solde', '').trim();
    const jours = leaf(document, 'Nbre de jours:')?.parentElement?.textContent.replace(/\D+/g, '');
    if (solde) cache.solde = solde; if (jours) cache.jours = jours;
    const show = cfg.is('design') && cfg.is('summary') && cache.resa && titleResa && cache.resa === titleResa;
    setCls(bar, 'rw-show', !!show);
    if (!show) return;
    const c = cache, soldeNum = parseFloat(String(c.solde || '').replace(/[^\d.-]/g, '')) || 0;
    const html = `<span class="it strong"><span class="k">Résa</span>${esc(c.resa)}</span>${c.statut ? `<span class="pill">${esc(c.statut)}</span>` : ''}
      <span class="it">${esc(c.client)}</span>
      <span class="it"><span class="k">Départ</span><b>${esc(c.dep)}</b>&nbsp;· ${esc(c.agDep)}<span class="arrow">→</span><span class="k">Retour</span><b>${esc(c.ret)}</b>&nbsp;· ${esc(c.agRet)}</span>
      ${c.jours ? `<span class="it"><b>${esc(c.jours)}</b>&nbsp;jours</span>` : ''}<span class="it strong">${esc(c.cat)}</span><span class="sp"></span>
      ${c.solde ? `<span class="it ${soldeNum > 0 ? 'due' : 'paid'}"><span class="k" style="color:inherit">Solde</span>${esc(c.solde)}</span>` : ''}`;
    if (html !== lastBar) { bar.innerHTML = html; lastBar = html; }
  }

  function apply() { tagLayout(); labelButtons(); formatPrices(); flagEmpty(); updateBar(); }

  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); };
  const obs = new MutationObserver(muts => { if (!muts.every(m => bar.contains(m.target))) schedule(); });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  document.addEventListener('input', schedule, true);
  document.addEventListener('change', schedule, true);
  const onScroll = () => setCls(root, 'rw-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', schedule);

  const onKey = e => {
    if (!e.altKey || e.ctrlKey || e.metaKey || !/^Digit\d$/.test(e.code) || !cfg.is('shortcuts')) return;
    const n = Number(e.code.slice(5));
    const b = document.querySelectorAll('.secondNavbar__content button.btnnavbar')[n === 0 ? 9 : n - 1];
    if (b) { e.preventDefault(); b.click(); }
  };
  document.addEventListener('keydown', onKey, true);

  apply(); onScroll();

  window.__rwRemove = () => {
    obs.disconnect(); offChange();
    document.removeEventListener('input', schedule, true);
    document.removeEventListener('change', schedule, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', schedule);
    bar.remove(); toggle.remove();
    root.classList.remove('rw-scrolled');
    root.style.removeProperty('--rw-top'); root.style.removeProperty('--rw-headh');
    document.querySelectorAll('.rw-empty,.rw-head,.rw-tabs,.rw-primary,.rw-labelled,.rw-danger')
      .forEach(e => e.classList.remove('rw-empty', 'rw-head', 'rw-tabs', 'rw-primary', 'rw-labelled', 'rw-danger'));
    document.querySelectorAll('[data-rw-label],[data-rw-kbd]').forEach(e => { e.removeAttribute('data-rw-label'); e.removeAttribute('data-rw-kbd'); });
    delete window.__rwRemove;
  };
  return 'reskin applied';
})();

/* ---------- 2. Calm loading indicator ---------- */
// ===== Calm loading: replaces Rentway's flashing dark overlay =====
// Rentway toggles 2 overlays (dark scrim + animated squares) several times per navigation,
// producing a strobe effect. We keep the overlays (they still block clicks while data loads,
// preventing actions on half-loaded screens) but make them invisible, and show instead a
// debounced, thin progress bar: nothing for loads < 300 ms, one continuous bar otherwise,
// plus a discreet "Chargement…" chip only if the load exceeds 1.5 s.
(() => {
  if (window.__rwLoaderRemove) window.__rwLoaderRemove();
  const root = document.documentElement;
  const bar = document.createElement('div'); bar.id = 'rw-progress'; document.body.appendChild(bar);
  const chip = document.createElement('div'); chip.id = 'rw-busy'; chip.innerHTML = '<i></i>Chargement…'; document.body.appendChild(chip);

  const SHOW_DELAY = 300, HIDE_GRACE = 250, CHIP_DELAY = 1500, MIN_VISIBLE = 450;
  // A "session" groups back-to-back overlays (gaps < HIDE_GRACE) into a single load.
  let busy = false, session = 0, shownAt = 0, showT = 0, chipT = 0, hideT = 0;
  const show = () => { if (!busy || shownAt) return; shownAt = performance.now(); bar.classList.add('on'); };
  const showChip = () => { if (busy && shownAt) chip.classList.add('on'); };
  const end = () => {
    clearTimeout(showT); clearTimeout(chipT); session = 0;
    if (!shownAt) return;
    const wait = Math.max(0, MIN_VISIBLE - (performance.now() - shownAt));   // never flash the bar
    setTimeout(() => { if (session) return; bar.classList.remove('on'); chip.classList.remove('on'); shownAt = 0; }, wait);
  };
  const isLoader = o => o.classList.contains('above-all') || !!o.querySelector('.loading-image');
  function check() {
    let active = false;
    document.querySelectorAll('.v-overlay').forEach(o => {
      const l = isLoader(o);
      if (l !== o.classList.contains('rw-loader')) o.classList.toggle('rw-loader', l);
      if (l && o.classList.contains('v-overlay--active')) active = true;
    });
    if (active && !busy) {
      busy = true; clearTimeout(hideT);
      const now = performance.now();
      if (!session) { session = now; showT = setTimeout(show, SHOW_DELAY); chipT = setTimeout(showChip, CHIP_DELAY); }
      else if (now - session >= SHOW_DELAY) show();
    } else if (!active && busy) {
      busy = false; hideT = setTimeout(end, HIDE_GRACE);
    }
  }
  const obs = new MutationObserver(check);
  obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  check();

  window.__rwLoaderRemove = () => {
    obs.disconnect(); [showT, hideT, chipT].forEach(clearTimeout);
    bar.remove(); chip.remove();
    document.querySelectorAll('.rw-loader').forEach(o => o.classList.remove('rw-loader'));
    delete window.__rwLoaderRemove;
  };
})();

/* ---------- 3. Tooltips ---------- */
// ===== Tooltips & hover states =====
// Rentway's Vuetify tooltips have no direction set, so they render ON TOP of their button.
// We re-anchor each tooltip below its button (above if no room), centred, with an arrow,
// restyle it on the 9px golden grid, and append the keyboard shortcut when there is one.
// Tabs get a rounded, inset hover state consistent with the other controls.
(() => {
  if (window.__rwTipsRemove) window.__rwTipsRemove();
  const GAP = 6;

  let anchor = null;
  const onOver = e => {
    const a = e.target.closest && e.target.closest('button, .v-btn, a, [role=button], [role=tab]');
    if (!a) return;
    anchor = a;
    // a native title would show a second tooltip: keep it as the shortcut hint instead
    const t = a.getAttribute('title');
    if (t) { const m = t.match(/\((Alt\+\d)\)/); if (m) a.setAttribute('data-rw-kbd', m[1]); a.removeAttribute('title'); }
  };
  document.addEventListener('mouseover', onOver, true);

  function place(tip) {
    // bind each tooltip to the element hovered when it opened, so a tooltip fading out
    // never jumps to the next hovered button
    if (!tip.classList.contains('menuable__content__active')) { delete tip.__rwAnchor; return; }
    if (!tip.__rwAnchor) tip.__rwAnchor = anchor;
    const anchorEl = tip.__rwAnchor;
    if (!document.documentElement.classList.contains('rw-tips') || !anchorEl || !anchorEl.isConnected) return;
    const baseLeft = parseFloat(tip.style.left), baseTop = parseFloat(tip.style.top);
    if (isNaN(baseLeft) || isNaN(baseTop)) return;
    // containing block: a positioned offsetParent, or the document itself when it is a static <body>
    const opEl = tip.offsetParent;
    const op = opEl && (opEl !== document.body || getComputedStyle(opEl).position !== 'static')
      ? opEl.getBoundingClientRect() : { left: -window.scrollX, top: -window.scrollY };
    const a = anchorEl.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight, vw = document.documentElement.clientWidth;
    const below = a.bottom + GAP + h <= window.innerHeight - 9;
    const wantTop = below ? a.bottom + GAP : a.top - GAP - h;
    let wantLeft = a.left + a.width / 2 - w / 2;
    wantLeft = Math.max(9, Math.min(wantLeft, vw - w - 9));
    const dx = Math.round(wantLeft - (op.left + baseLeft)), dy = Math.round(wantTop - (op.top + baseTop));
    // only write when a value changes: every style write is itself observed
    const ax = Math.round(a.left + a.width / 2 - wantLeft);
    const key = `${baseLeft},${baseTop},${dx},${dy},${ax},${below}`;
    if (tip.__rwKey !== key) {
      tip.__rwKey = key;
      tip.style.setProperty('translate', `${dx}px ${dy}px`);
      tip.style.setProperty('--rw-arrow-x', `${ax}px`);
      tip.style.setProperty('transform-origin', below ? 'center top' : 'center bottom');
      tip.classList.toggle('rw-tip-below', below); tip.classList.toggle('rw-tip-above', !below);
    }
    const kbd = anchorEl.getAttribute('data-rw-kbd');
    if (kbd) { if (tip.getAttribute('data-rw-kbd') !== kbd) tip.setAttribute('data-rw-kbd', kbd); }
    else if (tip.hasAttribute('data-rw-kbd')) tip.removeAttribute('data-rw-kbd');
  }

  const obs = new MutationObserver(muts => {
    const tips = new Set();
    for (const m of muts) {
      const t = m.target;
      if (t.classList && t.classList.contains('v-tooltip__content')) tips.add(t);
      m.addedNodes && m.addedNodes.forEach(n => n.classList && n.classList.contains('v-tooltip__content') && tips.add(n));
    }
    tips.forEach(place);
  });
  obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });

  window.__rwTipsRemove = () => {
    obs.disconnect(); document.removeEventListener('mouseover', onOver, true);
    document.querySelectorAll('.v-tooltip__content').forEach(t => {
      t.style.translate = ''; t.style.transformOrigin = ''; delete t.__rwKey; delete t.__rwAnchor; t.style.removeProperty('--rw-arrow-x');
      t.classList.remove('rw-tip-below', 'rw-tip-above'); t.removeAttribute('data-rw-kbd');
    });
    delete window.__rwTipsRemove;
  };
})();

/* ---------- 4. Modals: close with Esc or a click outside ---------- */
// Rentway opens its modals as *persistent* Vuetify dialogs: Esc and clicks on the dark backdrop are
// ignored (the dialog just "bounces"). We close them by clicking the modal's OWN close button, so
// Rentway runs exactly the same code as a manual click. If no close button is recognised, nothing happens.
// Safety: never while a dropdown / date picker is open, while a grid cell is being edited, or while loading.
(() => {
  if (window.__rwModalRemove) window.__rwModalRemove();
  const root = document.documentElement;
  const enabled = () => root.classList.contains('rw-modal');
  const CLOSE_ICON = /^mdi-(close|close-box|close-box-outline|close-circle|close-circle-outline|close-thick|window-close)$/;
  const CLOSE_TEXT = /^(fermer|close)$/i;
  const mdi = el => el && [...el.classList].find(c => c.startsWith('mdi-') && c !== 'mdi');
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const zOf = el => parseInt(getComputedStyle(el).zIndex, 10) || 0;

  // Topmost open dialog (highest z-index, then last in the page)
  function topDialog() {
    let best = null, bestZ = -Infinity;
    document.querySelectorAll('.v-dialog__content--active > .v-dialog--active').forEach(d => {
      if (!visible(d)) return;
      const z = zOf(d.parentElement);
      if (z >= bestZ) { best = d; bestZ = z; }
    });
    return best;
  }
  // Something inside the modal that should take Esc / the outside click first
  const popupOpen = () =>
    [...document.querySelectorAll('.menuable__content__active:not(.v-tooltip__content)')].some(visible) ||
    [...document.querySelectorAll('.dx-dropdowneditor-overlay .dx-overlay-content, .dx-popup-wrapper .dx-overlay-content')].some(visible);
  const loading = () => !!document.querySelector('.v-overlay--active.rw-loader, .v-overlay--active.above-all');

  function closeButton(dlg) {
    const usable = b => visible(b) && !b.disabled && !b.classList.contains('v-btn--disabled')
      && !b.closest('.v-chip, .v-input, .dx-widget, .v-data-table tbody');   // chip / clear-field / grid icons are not the modal's close
    const cands = [...dlg.querySelectorAll('button, .v-btn, [role=button], .v-icon--link')].filter(usable);
    const byIcon = cands.filter(b => CLOSE_ICON.test(mdi(b.matches('.v-icon') ? b : b.querySelector('.v-icon')) || ''));
    // the header one if several (highest on screen, then right-most)
    byIcon.sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (ra.top - rb.top) || (rb.left - ra.left); });
    return byIcon[0] || cands.find(b => CLOSE_TEXT.test(b.textContent.trim())) || null;
  }

  function tryClose(dlg) {
    if (!dlg || !dlg.isConnected || !dlg.classList.contains('v-dialog--active')) return false;
    const btn = closeButton(dlg);
    if (!btn) return false;
    btn.click();
    return true;
  }

  // State is captured BEFORE the page reacts (capture phase): a dropdown closed by this very Esc/click
  // must not make the modal close as well.
  let keySnap = null, downSnap = null;
  const onKeyCapture = e => {
    keySnap = (e.key === 'Escape' && enabled()) ? { dlg: topDialog(), busy: popupOpen() || loading() } : null;
  };
  const onKey = e => {
    const s = keySnap; keySnap = null;
    if (!s || e.key !== 'Escape' || e.defaultPrevented || s.busy || !s.dlg) return;
    // non-persistent dialogs already close on Esc (Vuetify)
    if (!s.dlg.classList.contains('v-dialog--persistent')) return;
    // Esc in a grid cell being edited cancels the edit, not the modal (the filter row is fine)
    const t = e.target;
    if (t && t.closest && t.closest('.dx-editor-cell') && !t.closest('.dx-datagrid-filter-row')) return;
    if (tryClose(s.dlg)) e.preventDefault();
  };
  const onDown = e => {
    downSnap = null;
    if (!enabled() || e.button !== 0) return;
    const t = e.target;
    // the dark backdrop of a (non-loading) Vuetify overlay
    if (!t.closest || !t.closest('.v-overlay--active') || t.closest('.rw-loader, .above-all')) return;
    downSnap = { target: t, dlg: topDialog(), busy: popupOpen() || loading() };
  };
  const onClick = e => {
    const s = downSnap; downSnap = null;
    // press AND release on the backdrop: a text selection that ends outside never closes the modal
    if (!s || e.target !== s.target || s.busy || !s.dlg) return;
    // non-persistent dialogs already close on an outside click (Vuetify)
    if (!s.dlg.classList.contains('v-dialog--persistent')) return;
    tryClose(s.dlg);
  };
  window.addEventListener('keydown', onKeyCapture, true);
  window.addEventListener('keydown', onKey, false);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('click', onClick, false);

  window.__rwModalRemove = () => {
    window.removeEventListener('keydown', onKeyCapture, true);
    window.removeEventListener('keydown', onKey, false);
    window.removeEventListener('mousedown', onDown, true);
    window.removeEventListener('click', onClick, false);
    delete window.__rwModalRemove;
  };
})();
