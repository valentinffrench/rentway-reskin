/* Rentway Reskin — CaribeCar · v2.1.0
   Rentway Pro module: runs on rentway.emotionmobility.com only (Rentway v1: see content.js).
   Pro is Vue 3 + DevExtreme, a different app from v1 (Vue 2 + Vuetify): none of the v1 hooks apply here.
   Same rules as v1:
   - never replace or remove a Pro element: restyle it, add rwr- attributes/classes, or add our own overlay elements;
   - trigger a Pro action only by .click() on Pro's own control, so Pro runs the same code as for a manual click;
   - every feature switches off on its own and switching it off restores Pro exactly;
   - a hook that stops matching after a Pro update quietly does nothing.
   Hooks: component classes (rw-*, dx-*), icon classes (mdi-*, dx-icon-*) and routes only. Never visible text
   (labels follow the user's language) and never data-v-* attributes (they change with every Pro release).
   Everything the extension adds is prefixed rwr- (Pro already owns rw-*). Settings: early.js (shared with v1).
   A feature runs only when its setting is on AND the route is inside the app (/subscriptions/<id>/…), so the
   /company-selector boot screen that opens every full page load is never touched. */
(() => {
  if (window.__rwrRemove) window.__rwrRemove();
  const cfg = window.__rwCfg;
  if (!cfg || cfg.SITE !== 'pro') return;
  const root = document.documentElement;

  /* ---------- Shared helpers ---------- */
  const IN_APP = /^\/subscriptions\/[^/]+\//;
  // Some report paths contain a space (/reports/rental agreements): always compare decoded paths
  const path = () => { try { return decodeURIComponent(location.pathname); } catch (e) { return location.pathname; } };
  const inApp = () => IN_APP.test(path());
  const route = () => path().replace(/^\/subscriptions\/[^/]+/, '').replace(/\/+$/, '');   // "/dashboard", "/vehicle-details/12368"…
  const safe = fn => { try { fn(); } catch (e) { console.warn('Rentway Reskin:', e); } };
  const setAttr = (el, k, v) => { if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
  const visible = el => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const zOf = el => parseInt(getComputedStyle(el).zIndex, 10) || 0;
  // Icon classes of a button: <i class="dx-icon mdi mdi-eye-outline"> or <i class="dx-icon dx-icon-close">
  const iconOf = el => { const i = el && el.querySelector('i, .dx-icon'); return i ? [...i.classList].filter(c => /^(mdi-|dx-icon-)/.test(c)) : []; };
  // Pro's loader: a white veil added to the DOM during route / tab / record loads, then removed
  const loading = () => !!document.querySelector('.loading-wrapper');
  // Our own elements (their mutations must not wake the page observer)
  const isOwn = n => { const el = n && (n.nodeType === 1 ? n : n.parentElement); return !!(el && el.closest('[id^="rwr-"]')); };

  // DevExtreme popups are attached to <body>. Dropdowns, calendars, menus, tooltips and load panels are overlays
  // too, but they belong to a field or a grid: they are never "the popup", and while one is open we stay out of the way.
  const POPUP = '.dx-overlay-wrapper.dx-popup-wrapper';
  const HELPER = '.dx-dropdowneditor-overlay, .dx-dropdownbutton-popup-wrapper, .dx-dropdownmenu-popup-wrapper, '
    + '.dx-tooltip-wrapper, .dx-loadpanel-wrapper, .dx-context-menu, .dx-header-filter-menu';
  const isOpen = w => {
    const c = w.querySelector(':scope > .dx-overlay-content');
    return !!c && !c.classList.contains('dx-state-invisible') && visible(c);
  };
  const helperOpen = () => [...document.querySelectorAll('.dx-overlay-wrapper')].some(w => w.matches(HELPER) && isOpen(w));
  // Confirmation / alert boxes ask the user to decide: the extension never answers for them
  const isDialog = w => w.matches('.dx-dialog, .dx-dialog-wrapper, .dx-dialog-root') || !!w.querySelector('.dx-dialog, .dx-dialog-message');
  // Topmost open popup (dialogs included): highest z-index, then last in the page
  function topPopup() {
    let best = null, bestZ = -Infinity;
    for (const w of document.querySelectorAll(POPUP)) {
      if (w.matches(HELPER) || !isOpen(w)) continue;
      const z = zOf(w);
      if (z >= bestZ) { best = w; bestZ = z; }
    }
    return best;
  }

  // Tab strips: div.rw-tabs > a.rw-tab (.rw-tab-selected / .rw-tab-disabled). Clicking a tab swaps content in place.
  const tabsOf = strip => [...strip.querySelectorAll('.rw-tab')].filter(t => t.closest('.rw-tabs') === strip);
  // The strip the shortcuts drive: the one in the open popup if any (none = do nothing behind it), else the page's
  function targetStrip() {
    const scope = topPopup() || document.querySelector('.app-content');
    return scope ? [...scope.querySelectorAll('.rw-tabs')].find(visible) || null : null;
  }
  // Scroll a tab's strip sideways so the tab is fully visible, clear of the fade on the cut-off side (P5a).
  // Horizontal only: the page itself never jumps.
  const FADE = 38;
  function revealTab(tab) {
    const strip = tab.closest('.rw-tabs');
    if (!strip || strip.scrollWidth <= strip.clientWidth + 1) return;
    const s = strip.getBoundingClientRect(), t = tab.getBoundingClientRect();
    if (t.left < s.left + FADE) strip.scrollLeft -= s.left + FADE - t.left;
    else if (t.right > s.right - FADE) strip.scrollLeft += t.right - (s.right - FADE);
  }

  /* ---------- Modules ----------
     Each module: { key (setting), apply(), remove(), onMutate?(), onRoute?(), onSettings?() }.
     remove() undoes everything apply() and the hooks did. */
  const modules = [];

  /* ----- P1 · Calm loading (setting "loader", html.rwr-calm) -----
     Pro covers the whole screen with a 65% white veil for ~1 s on every route or tab change: the page "blinks".
     pro.css makes the veil see-through (it stays in place, so clicks on a half-loaded screen are still blocked);
     here we show instead one thin progress bar under the app header, with v1's timing: nothing for loads under
     300 ms, back-to-back loads (gaps < 250 ms) count as one, the bar stays at least 450 ms, and a discreet
     "Chargement…" chip appears only past 1.5 s. DevExtreme's own grid load panel is left alone. */
  modules.push((() => {
    const SHOW_DELAY = 300, HIDE_GRACE = 250, CHIP_DELAY = 1500, MIN_VISIBLE = 450;
    let bar = null, chip = null, busy = false, session = 0, shownAt = 0, showT = 0, chipT = 0, hideT = 0, endT = 0;
    const placeBar = () => {
      // the survey banner above the header can be dismissed: measure each time
      const r = document.querySelector('header.header-component')?.getBoundingClientRect();
      bar.style.top = (r && r.height ? Math.max(0, Math.round(r.bottom)) : 0) + 'px';
    };
    const show = () => { if (!busy || shownAt) return; shownAt = performance.now(); placeBar(); bar.classList.add('on'); };
    const showChip = () => { if (busy && shownAt) chip.classList.add('on'); };
    const end = () => {
      clearTimeout(showT); clearTimeout(chipT); session = 0;
      if (!shownAt) return;
      const wait = Math.max(0, MIN_VISIBLE - (performance.now() - shownAt));   // never flash the bar
      clearTimeout(endT);
      endT = setTimeout(() => { if (session) return; bar.classList.remove('on'); chip.classList.remove('on'); shownAt = 0; }, wait);
    };
    function check() {
      const active = loading();
      if (active && !busy) {
        busy = true; clearTimeout(hideT);
        const now = performance.now();
        if (!session) { session = now; showT = setTimeout(show, SHOW_DELAY); chipT = setTimeout(showChip, CHIP_DELAY); }
        else if (now - session >= SHOW_DELAY) show();
      } else if (!active && busy) {
        busy = false; hideT = setTimeout(end, HIDE_GRACE);
      }
    }
    return {
      key: 'loader',
      apply() {
        bar = document.createElement('div'); bar.id = 'rwr-progress';
        chip = document.createElement('div'); chip.id = 'rwr-busy'; chip.setAttribute('role', 'status');
        chip.append(document.createElement('i'), 'Chargement…');
        document.body.append(bar, chip);
        check();
      },
      remove() {
        [showT, chipT, hideT, endT].forEach(clearTimeout);
        bar.remove(); chip.remove(); bar = chip = null;
        busy = false; session = shownAt = 0;
      },
      onMutate: check
    };
  })());

  /* ----- P2 · Tab shortcuts Alt+1…0 (setting "shortcuts", html.rwr-kbd) -----
     Alt+1…9 = tabs 1–9, Alt+0 = tab 10, counted by position including disabled tabs so numbers never shift.
     e.code, not e.key: on AZERTY the top row gives &é"'… without Shift. Ctrl+K (Pro's search) is untouched. */
  modules.push((() => {
    let marked = [];
    // data-rwr-kbd on the first 10 tabs of the strip the shortcuts drive (read by the P3 tooltip)
    function mark() {
      const strip = targetStrip();
      const want = strip ? tabsOf(strip).slice(0, 10) : [];
      marked.forEach(t => { if (!want.includes(t)) t.removeAttribute('data-rwr-kbd'); });
      want.forEach((t, i) => setAttr(t, 'data-rwr-kbd', `Alt+${(i + 1) % 10}`));
      marked = want;
    }
    const onKey = e => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !/^Digit\d$/.test(e.code)) return;
      const strip = targetStrip();
      if (!strip) return;
      const n = Number(e.code.slice(5));
      const tab = tabsOf(strip)[n === 0 ? 9 : n - 1];
      if (!tab) return;   // no such tab: let the key through
      e.preventDefault();
      if (e.repeat || tab.classList.contains('rw-tab-disabled') || loading()) return;
      tab.click();
      revealTab(tab);
    };
    return {
      key: 'shortcuts',
      apply() { window.addEventListener('keydown', onKey, true); mark(); },
      remove() {
        window.removeEventListener('keydown', onKey, true);
        document.querySelectorAll('[data-rwr-kbd]').forEach(t => t.removeAttribute('data-rwr-kbd'));
        marked = [];
      },
      onMutate: mark,
      onRoute: mark
    };
  })());

  /* ----- P3 · Tooltips (setting "tips", html.rwr-tips) -----
     Pro has no tooltip on its icon-only buttons, and cuts grid cells / status tiles with "…". One tooltip element
     of our own (#rwr-tip), shown after 400 ms of hover. Never writes a title attribute on Pro elements.
     Text, first rule that matches: 1. tab with a shortcut → the shortcut (+ the label if cut off);
     2. icon-only button → ICON_LABELS, else its aria-label when it reads like a name; 3. text cut off → full text. */
  modules.push((() => {
    // Icons marked "to check" in the spec: names expected from DevExtreme, confirm with test/pro-healthcheck.js
    const ICON_LABELS = {
      'mdi-eye-outline': 'Voir le détail',
      'mdi-bullhorn-outline': 'Nouveautés Rentway',
      'dx-icon-chevrondoubleright': 'Déplier le menu',
      'dx-icon-chevrondoubleleft': 'Replier le menu',        // to check
      'mdi-close': 'Fermer', 'dx-icon-close': 'Fermer',
      'mdi-magnify': 'Rechercher',
      'mdi-dots-vertical': 'Actions',
      'dx-icon-export': 'Exporter', 'dx-icon-xlsxfile': 'Exporter',   // to check
      'dx-icon-column-chooser': 'Choisir les colonnes'                // to check
    };
    const DELAY = 400, GAP = 6, EDGE = 9;
    const TRUNC = 'td[role=gridcell], .dx-datagrid-headers .dx-datagrid-text-content, .rw-card-status .value, .rw-tab';
    let tip = null, text = null, kbd = null, anchor = null, muted = null, timer = 0;

    const truncated = el => el.scrollWidth > el.clientWidth + 1 && !el.hasAttribute('title');
    // Pro often puts the icon name in aria-label ("mdi mdi-eye-outline", "chevrondoubleright"): not a name
    const readsLikeName = (s, icons) => !!s && !/^(mdi|dx-)/i.test(s) && !/^[a-z0-9_-]+$/.test(s)
      && !icons.some(c => c.replace(/^(mdi-|dx-icon-)/, '') === s);
    function resolve(t) {
      if (!t || !t.closest || isOwn(t)) return null;
      const tab = t.closest('a.rw-tab');
      if (tab && tab.hasAttribute('data-rwr-kbd')) {
        return { el: tab, text: truncated(tab) ? tab.textContent.trim() : '', kbd: tab.getAttribute('data-rwr-kbd') };
      }
      const btn = t.closest('.dx-button, button, [role=button]');
      if (btn && !btn.textContent.trim()) {
        if (btn.hasAttribute('title')) return null;   // the browser already shows a tooltip
        const icons = iconOf(btn);
        const aria = (btn.getAttribute('aria-label') || '').trim();
        const label = icons.map(c => ICON_LABELS[c]).find(Boolean) || (readsLikeName(aria, icons) ? aria : '');
        return label ? { el: btn, text: label } : null;
      }
      const cut = t.closest(TRUNC);
      if (cut && truncated(cut)) { const s = cut.textContent.trim(); if (s) return { el: cut, text: s }; }
      return null;
    }

    function show() {
      timer = 0;
      if (!anchor || !anchor.el.isConnected) return;
      const a = anchor.el.getBoundingClientRect();
      if (!a.width || !a.height) return;
      text.textContent = anchor.text || ''; kbd.textContent = anchor.kbd || '';
      tip.classList.remove('on', 'above', 'below');
      tip.style.left = '0px'; tip.style.top = '0px';   // measure at the origin: no wrap against the right edge
      const w = tip.offsetWidth, h = tip.offsetHeight, vw = root.clientWidth, vh = window.innerHeight;
      // below the anchor, centred; above it if there is no room; at least 9 px from the screen edges
      const below = a.bottom + GAP + h <= vh - EDGE;
      const top = below ? a.bottom + GAP : Math.max(EDGE, a.top - GAP - h);
      const left = Math.max(EDGE, Math.min(a.left + a.width / 2 - w / 2, vw - w - EDGE));
      tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(top) + 'px';
      tip.style.setProperty('--rwr-arrow-x', Math.round(Math.max(12, Math.min(w - 12, a.left + a.width / 2 - left))) + 'px');
      tip.classList.add(below ? 'below' : 'above', 'on');
    }
    function hide() { clearTimeout(timer); timer = 0; anchor = null; if (tip) tip.classList.remove('on'); }
    // a click or a key press hides the tooltip; it does not come back until the pointer leaves that element
    const dismiss = () => { muted = anchor ? anchor.el : muted; hide(); };

    const onOver = e => {
      const r = resolve(e.target);
      if (r && anchor && r.el === anchor.el) return;
      if (r && r.el === muted) return;
      muted = null; hide();
      if (r) { anchor = r; timer = setTimeout(show, DELAY); }
    };
    const onOut = e => { if (!e.relatedTarget) { muted = null; hide(); } };   // left the window
    const onScroll = () => { if (anchor) hide(); };

    return {
      key: 'tips',
      apply() {
        tip = document.createElement('div'); tip.id = 'rwr-tip'; tip.setAttribute('aria-hidden', 'true');
        text = document.createElement('span'); kbd = document.createElement('kbd');
        tip.append(text, kbd); document.body.append(tip);
        document.addEventListener('mouseover', onOver, true);
        document.addEventListener('mouseout', onOut, true);
        window.addEventListener('mousedown', dismiss, true);
        window.addEventListener('keydown', dismiss, true);
        document.addEventListener('scroll', onScroll, true);   // capture: Pro scrolls inside a DevExtreme container
        window.addEventListener('blur', hide);
      },
      remove() {
        hide();
        document.removeEventListener('mouseover', onOver, true);
        document.removeEventListener('mouseout', onOut, true);
        window.removeEventListener('mousedown', dismiss, true);
        window.removeEventListener('keydown', dismiss, true);
        document.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('blur', hide);
        tip.remove(); tip = text = kbd = null; muted = null;
      },
      onRoute: hide
    };
  })());

  /* ----- P4 · Close popups with Esc / an outside click, as a FALLBACK (setting "modals", html.rwr-modal) -----
     Pro often handles this itself (e.g. "What's new?"). The extension steps in only after Pro has had its chance:
     80 ms later, and only if the same popup is still the open one, it clicks that popup's OWN close button.
     It never calls preventDefault, so it can never block Pro's own handling. Never on a confirmation / alert box,
     never while a dropdown, calendar or menu is open, during a load, or in a grid cell being edited. */
  modules.push((() => {
    const WAIT = 80;
    const CLOSE_ICON = /^(mdi-close(-[a-z-]+)?|dx-icon-close)$/;
    let mod = null, keySnap = null, downSnap = null;
    const editingCell = t => !!(t && t.closest && t.closest('.dx-editor-cell') && !t.closest('.dx-datagrid-filter-row'));
    const busy = t => helperOpen() || loading() || editingCell(t);
    const usable = b => visible(b) && !b.disabled && !b.closest('.dx-state-disabled');
    // .dx-closebutton first, then an icon-only close button in the popup header. A labelled button
    // ("Cancel"…) is never used: it could discard an edit.
    function closeButton(w) {
      const own = el => el.closest(POPUP) === w;
      const x = [...w.querySelectorAll('.dx-closebutton')].find(b => own(b) && usable(b));
      if (x) return x;
      for (const head of w.querySelectorAll('.dx-popup-title, .rw-popup-header, [id$="-header"]')) {
        if (!own(head)) continue;
        const b = [...head.querySelectorAll('.dx-button, button, [role=button]')]
          .find(b => usable(b) && !b.textContent.trim() && iconOf(b).some(c => CLOSE_ICON.test(c)));
        if (b) return b;
      }
      return null;
    }
    // still open, still on top, nothing else going on: click its close button
    function closeIfStillOpen(w) {
      if (!mod.on || !w.isConnected || !isOpen(w) || topPopup() !== w || busy()) return;
      const b = closeButton(w);
      if (b) b.click();
    }
    // Snapshot BEFORE the page reacts (capture phase): a dropdown closed by this very Esc must not close the popup too
    const onKeyCapture = e => {
      keySnap = null;
      if (e.key !== 'Escape' || e.repeat) return;
      const w = topPopup();
      if (!w || isDialog(w) || busy(e.target)) return;
      const s = keySnap = { w, seen: false, prevented: false };
      setTimeout(() => { if (s.seen && !s.prevented) closeIfStillOpen(s.w); }, WAIT);
    };
    // Bubble phase: if Pro stopped the event or called preventDefault, it handled the key itself
    const onKey = e => { const s = keySnap; if (s && e.key === 'Escape') { s.seen = true; s.prevented = e.defaultPrevented; } };
    // Outside click: modal popups only (.dx-overlay-shader); press AND release on the dimmed area itself,
    // so a text selection that ends outside the popup never closes it
    const onDown = e => {
      downSnap = null;
      const w = e.target;
      if (e.button !== 0 || !w.matches || !w.matches(POPUP + '.dx-overlay-shader')) return;
      if (topPopup() !== w || isDialog(w) || busy()) return;
      downSnap = { w };
    };
    const onClick = e => {
      const s = downSnap; downSnap = null;
      if (!s || e.target !== s.w || e.button !== 0) return;
      setTimeout(() => closeIfStillOpen(s.w), WAIT);
    };
    return mod = {
      key: 'modals',
      apply() {
        window.addEventListener('keydown', onKeyCapture, true);
        window.addEventListener('keydown', onKey, false);
        window.addEventListener('mousedown', onDown, true);
        window.addEventListener('click', onClick, false);
      },
      remove() {
        window.removeEventListener('keydown', onKeyCapture, true);
        window.removeEventListener('keydown', onKey, false);
        window.removeEventListener('mousedown', onDown, true);
        window.removeEventListener('click', onClick, false);
        keySnap = downSnap = null;
      }
    };
  })());

  /* ----- P5 · Pro polish (setting "design", html.rwr-design) -----
     a. Tab strips that overflow fade on the cut-off side; the mouse wheel scrolls them sideways; the selected tab
        is scrolled into view.  b. Dashboard: only clickable lines look like links (CSS only).
     c. Empty read-only fields are dimmed, never in edit mode (CSS + html.rwr-editing).
     d. Dashboard drill-down grids fill the screen instead of a fixed 400 px (but stop above the P6 button). */
  modules.push((() => {
    const STRIPS = '.rw-tabs.scrollbar-horizontal';
    const SCROLLER = '.dx-drawer-content > .dx-scrollable > .dx-scrollable-wrapper > .dx-scrollable-container';
    const MIN_GRID = 400, GRID_GAP = 24;
    const lastSel = new WeakMap();
    let host = null, gridH = 0, gridTop = -1, viewH = -1;

    // a. data-rwr-overflow = left | right | both | none → pro.css fades the cut-off side(s)
    function overflowOf(strip) {
      const max = strip.scrollWidth - strip.clientWidth;
      if (max <= 1) return 'none';
      const l = strip.scrollLeft > 1, r = strip.scrollLeft < max - 1;
      return l && r ? 'both' : l ? 'left' : r ? 'right' : 'none';
    }
    function tabsPass() {
      document.querySelectorAll(STRIPS).forEach(strip => {
        const sel = strip.querySelector('.rw-tab-selected');
        if (sel && lastSel.get(strip) !== sel) { lastSel.set(strip, sel); revealTab(sel); }
        setAttr(strip, 'data-rwr-overflow', overflowOf(strip));
      });
    }
    const onScroll = e => { const t = e.target; if (t.matches && t.matches(STRIPS)) setAttr(t, 'data-rwr-overflow', overflowOf(t)); };
    const onWheel = e => {
      if (e.ctrlKey || !e.target.closest) return;   // Ctrl+wheel = zoom
      const strip = e.target.closest(STRIPS);
      if (!strip || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // sideways trackpad swipe: native
      const max = strip.scrollWidth - strip.clientWidth;
      if (max <= 1) return;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? strip.clientWidth : 1);
      const next = Math.max(0, Math.min(max, strip.scrollLeft + dy));
      if (next === strip.scrollLeft) return;   // already at that end: let the page scroll
      e.preventDefault();
      strip.scrollLeft = next;
    };

    // c. edit mode = Pro shows its Save button (mdi-content-save) in the page header
    const editPass = () => root.classList.toggle('rwr-editing', !!document.querySelector('.app-content .page-header-wrapper .mdi-content-save'));

    // d. The grid host (.data-table-margin) has an inline height: 400px. We never rewrite it: data-rwr-fill +
    //    pro.css override it with --rwr-grid-h, then one resize event lets DevExtreme lay the grid out again.
    function setGridH(px) { gridH = px; root.style.setProperty('--rwr-grid-h', px + 'px'); }
    function releaseGrid() {
      if (host) host.removeAttribute('data-rwr-fill');
      const had = !!gridH;
      host = null; gridH = 0; gridTop = viewH = -1;
      root.style.removeProperty('--rwr-grid-h');
      if (had) window.dispatchEvent(new Event('resize'));
    }
    function gridPass(force) {
      const h = root.classList.contains('rwr-drill')
        ? [...document.querySelectorAll('.app-content .data-table-margin')].find(visible) : null;
      const sc = h && document.querySelector(SCROLLER);
      if (!h || !sc) { if (host) releaseGrid(); return; }
      if (host && host !== h) host.removeAttribute('data-rwr-fill');
      const scR = sc.getBoundingClientRect();
      const top = h.getBoundingClientRect().top - scR.top + sc.scrollTop;   // grid top inside the page
      if (!force && h === host && Math.abs(top - gridTop) <= 1 && sc.clientHeight === viewH) return;
      const prev = gridH;
      host = h; gridTop = top; viewH = sc.clientHeight;
      const next = h.nextElementSibling;
      const pager = next && next.matches('.dx-datagrid-pager, .dx-pager') ? next.offsetHeight : 0;   // pager outside the host
      // bottom limit (inside the scroller's visible area): 24 px from the bottom, and above our ON/OFF button (P6)
      // when it is on — otherwise the button would cover the pager's left side
      let limit = sc.clientHeight - GRID_GAP;
      const tg = document.getElementById('rwr-toggle');
      if (tg) {
        const t = tg.getBoundingClientRect(), hr = h.getBoundingClientRect();
        if (t.height && t.right > hr.left && t.left < hr.right) limit = Math.min(limit, t.top - scR.top - 9);
      }
      const want = Math.max(MIN_GRID, Math.floor(limit - top - pager));
      setGridH(want); setAttr(h, 'data-rwr-fill', '');
      // page paddings below the grid: trim so the page itself does not scroll
      const over = sc.scrollHeight - sc.clientHeight;
      if (over > 0 && want > MIN_GRID) setGridH(Math.max(MIN_GRID, want - over));
      if (gridH !== prev) window.dispatchEvent(new Event('resize'));
    }
    const onResize = e => { if (e.isTrusted) { tabsPass(); gridPass(true); } };   // ignore our own resize event

    const pass = () => { tabsPass(); editPass(); gridPass(false); };
    return {
      key: 'design',
      apply() {
        document.addEventListener('scroll', onScroll, true);
        document.addEventListener('wheel', onWheel, { capture: true, passive: false });
        window.addEventListener('resize', onResize);
        pass();
      },
      remove() {
        document.removeEventListener('scroll', onScroll, true);
        document.removeEventListener('wheel', onWheel, { capture: true, passive: false });
        window.removeEventListener('resize', onResize);
        document.querySelectorAll('[data-rwr-overflow]').forEach(s => s.removeAttribute('data-rwr-overflow'));
        root.classList.remove('rwr-editing');
        releaseGrid();
      },
      onMutate: pass,
      onRoute() { tabsPass(); editPass(); gridPass(true); },
      onSettings() { gridPass(true); }   // the ON/OFF button (P6) appeared or went away
    };
  })());

  /* ----- P7 · Vehicle Allocation Control, the planning screen (setting "design", html.rwr-vac) -----
     Pro stacks its splitter (timeline above, reservations below) and gives it a fixed height of window height - 213 px,
     taken once when the screen opens. It ignores the banner and the page paddings: the splitter always runs past the
     bottom of the screen, the page scrolls around two panes that scroll themselves (nested scrolls), the timeline is
     short and the reservation rows sit below the fold.
     The planning is the work surface: it gets the whole height, by default.
     a. One screen, no page scroll: the splitter fills exactly the visible height, recomputed live (resize, banner
        closed, focus mode, our ON/OFF button). Each pane keeps its own scroll; they are side by side, never nested.
     b. Wide screen (splitter ≥ 1172 px: timeline 760 + panel 400 + gap): the reservations move to a panel on the right
        and the timeline takes the full height; the panel opens at the width its columns need (at most what leaves the
        timeline 760 px). Pro's handle is hidden (it only drags up/down); ours sits between the panes: drag (or ←/→) for the
        width, double-click for the default width, its chevron folds the panel into a 40 px rail (a click on the rail
        opens it again). Width and fold are remembered on this computer. In the panel, grid columns are sized to their
        content (our own <style>, recomputed when the rows change) and the cell padding is tightened.
     c. Narrow screen: Pro's stacked layout, fitted to the screen; the reservations keep at least their header + 2 rows,
        and once folded by Pro's ▼ they stay as a 44 px bar at the bottom that runs Pro's own ▲ on click.
     d. Focus mode, on by default (our button left of "Expand vehicles"): hides the survey banner and the app header
        (search, account) on this screen only. Esc or the button leaves it; the choice is remembered.
     The timeline (DayPilot) resizes its rows area only when told: we make the call Pro makes after a drag of its
     handle (dp.setHeight with the height of its box), only when the two differ.
     The splitter's inline styles and Pro's split ratio are never rewritten: pro.css overrides them with --rwr-vac-*
     variables and .rwr-vac-side, so switching the setting off gives Pro's screen back as it was. */
  modules.push((() => {
    const SCROLLER = '.dx-drawer-content > .dx-scrollable > .dx-scrollable-wrapper > .dx-scrollable-container';
    const GAP = 9, MIN_SPLIT = 300, RES_ROWS = 2;
    const TIMELINE_MIN = 760, PANEL_MIN = 400, SIDE_GAP = 12, SIDE_FROM = TIMELINE_MIN + PANEL_MIN + SIDE_GAP, RAIL = 40, STEP = 24;
    const K_FOCUS = 'rwrVacFocus', K_W = 'rwrVacSideW', K_RAIL = 'rwrVacSideRail';
    const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
    let h = 0, resMin = 0, measuredMin = 0, side = false, panelW = 0, colsKey = '', colsTotal = 0;
    let btn = null, icon = null, label = null, grip = null, fold = null, colsStyle = null, drag = null, dragT = 0;
    let ro = null, watched = [];
    const splitter = () => document.querySelector('.app-content #splitter-timeline');
    const lastPane = sp => sp.querySelector(':scope > .dx-splitter-item:last-child');
    const proFolded = pane => !!pane && pane.classList.contains('dx-splitter-item-hidden-content');
    const focusOn = () => root.classList.contains('rwr-vac-focus');
    const railOn = () => root.classList.contains('rwr-vac-rail');
    // saved width, else the width its columns need (+ the grid's scrollbar), else 40 % of the splitter
    const wantedW = spW => { const n = parseInt(read(K_W), 10); return n > 0 ? n : colsTotal ? colsTotal + 14 : Math.round(spW * 0.4); };
    const relayout = () => window.dispatchEvent(new Event('resize'));   // DayPilot and DevExtreme lay out again

    function setFocus(on) {
      if (on === focusOn()) return;
      root.classList.toggle('rwr-vac-focus', on);
      write(K_FOCUS, on ? '1' : '0');
      relayout();
      requestAnimationFrame(() => { fit(true); place(); });
    }
    function setRail(on) {
      root.classList.toggle('rwr-vac-rail', on);
      write(K_RAIL, on ? '1' : null);
      fit(true); place();
    }

    // a + b + c. Height = visible bottom of the page scroller (above our ON/OFF button when it overlaps) - splitter top
    function fit(force) {
      const sp = splitter(), sc = document.querySelector(SCROLLER);
      if (!root.classList.contains('rwr-vac') || !sp || !sc) { release(); return; }
      const scR = sc.getBoundingClientRect(), spR = sp.getBoundingClientRect();
      let limit = scR.bottom - GAP;
      const tg = document.getElementById('rwr-toggle');
      if (tg) {
        const t = tg.getBoundingClientRect();
        if (t.height && t.right > spR.left && t.left < spR.right) limit = Math.min(limit, t.top - GAP);
      }
      const nextH = Math.max(MIN_SPLIT, Math.floor(limit - spR.top));
      const nextSide = spR.width >= SIDE_FROM;
      cols(nextSide);
      let nextW = 0, nextMin = 0;
      if (nextSide) {
        const max = Math.floor(spR.width) - TIMELINE_MIN - SIDE_GAP;
        nextW = railOn() ? RAIL : Math.max(PANEL_MIN, Math.min(drag ? drag.w : wantedW(spR.width), max));
      } else {
        // floor of the open stacked reservations: their header and the grid headers + 2 rows, measured while open
        const pane = lastPane(sp), res = pane && pane.querySelector('.reservations'), rv = res && res.querySelector('.dx-datagrid-rowsview');
        if (res && rv && !proFolded(pane)) {
          const row = res.querySelector('.dx-data-row');
          const m = Math.ceil(rv.getBoundingClientRect().top - res.getBoundingClientRect().top + RES_ROWS * (row ? row.getBoundingClientRect().height : 28) + 4);
          if (m > 0) measuredMin = m;
        }
        nextMin = Math.min(measuredMin, Math.floor(nextH / 2));   // the timeline always keeps at least half
      }
      if (!force && nextH === h && nextSide === side && nextW === panelW && nextMin === resMin) { syncTimeline(); return; }
      const changed = nextH !== h || nextSide !== side || nextW !== panelW;
      h = nextH; side = nextSide; panelW = nextW; resMin = nextMin;
      root.classList.toggle('rwr-vac-side', side);
      root.style.setProperty('--rwr-vac-h', h + 'px');
      root.style.setProperty('--rwr-vac-res-min', resMin + 'px');
      if (side) root.style.setProperty('--rwr-vac-side-w', panelW + 'px'); else root.style.removeProperty('--rwr-vac-side-w');
      syncTimeline();
      if (changed && !drag) relayout();
    }
    // The timeline (DayPilot) sizes its rows area only when Pro tells it to, after a drag of Pro's handle: give it
    // the same call Pro makes (setHeight with the height of its own box), only when the box and the rows area differ.
    function syncTimeline() {
      const host = document.querySelector('.app-content #splitter-timeline #dp'), dp = host && host.dp;
      const rows = host && host.querySelector('.scheduler_default_scrollable');
      if (!dp || typeof dp.setHeight !== 'function' || !rows) return;
      const want = Math.floor(host.getBoundingClientRect().height);
      const now = parseFloat(rows.style.height) || rows.offsetHeight;
      if (want > rows.offsetTop && Math.abs(now - (want - rows.offsetTop - 1)) > 2) safe(() => dp.setHeight(want));
    }
    function release() {
      clearCols();
      if (!h) return;
      h = resMin = panelW = 0; side = false;
      root.classList.remove('rwr-vac-side');
      ['--rwr-vac-h', '--rwr-vac-res-min', '--rwr-vac-side-w'].forEach(p => root.style.removeProperty(p));
      relayout();
      requestAnimationFrame(syncTimeline);   // back to Pro's own height
    }

    // b. Side panel columns sized to their content: header label (capped) or the widest visible cell
    const textW = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    function clearCols() { if (colsStyle) { colsStyle.remove(); colsStyle = null; } colsKey = ''; colsTotal = 0; }
    function cols(sideNow) {
      const grid = sideNow && !railOn() && document.querySelector('.app-content #grid-reservations');
      const head = grid && grid.querySelector('.dx-datagrid-headers .dx-header-row');
      if (!head) { clearCols(); return; }
      const rows = [...grid.querySelectorAll('.dx-datagrid-rowsview .dx-data-row')];
      const key = head.children.length + '|' + rows.length + '|' + rows.slice(0, 40).map(r => r.textContent).join('¦');
      if (key === colsKey) return;
      colsKey = key;
      // a header label may be cut ("Requested g…", full text in the P3 tooltip); a value never is, up to 240 px
      const widths = [...head.children].map((th, i) => {
        if (i === 0 && th.offsetWidth <= 40) return 0;   // Pro's drag-handle column keeps its own 30 px
        const label = th.querySelector('.dx-datagrid-text-content');
        let w = Math.min(label ? textW(label) + 26 : 0, 64);   // label + filter icon, capped
        for (const r of rows.slice(0, 40)) { const td = r.children[i]; if (td) w = Math.max(w, textW(td) + 18); }
        return Math.ceil(Math.max(44, Math.min(w, 240)));
      });
      colsTotal = widths.reduce((a, w, i) => a + (w || head.children[i].offsetWidth), 0);
      if (!colsStyle) { colsStyle = document.createElement('style'); colsStyle.id = 'rwr-vac-cols'; document.head.append(colsStyle); }
      const sel = 'html.rwr-app.rwr-design.rwr-vac.rwr-vac-side:not(.rwr-vac-rail) #grid-reservations';
      colsStyle.textContent = widths.map((w, i) => w ? `${sel} col:nth-child(${i + 1}){width:${w}px!important}` : '').join('\n');
      relayout();   // the grid's own scrollbars measure the new table width
    }

    // b. Our handle between the panes, and d. the focus button: our own elements, fixed, placed on every pass
    function place() {
      if (!btn) return;
      const sp = splitter();
      const f = root.classList.contains('rwr-vac') && document.querySelector('.app-content .timeline-header .filters');
      const v = f && document.querySelector('.app-content .timeline-header .views');
      const fr = f && f.getBoundingClientRect();
      if (!fr || !fr.height || helperOpen()) setAttr(btn, 'data-rwr-show', 'no');
      else {
        setAttr(btn, 'data-rwr-show', 'yes');   // displayed before measuring; placed in the same frame, so no flash
        const on = focusOn();
        setAttr(icon, 'class', 'mdi ' + (on ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'));
        const text = on ? 'Quitter le plein écran' : 'Plein écran';
        if (label.textContent !== text) label.textContent = text;
        setAttr(btn, 'aria-pressed', String(on));
        setAttr(btn, 'aria-label', on ? 'Quitter le plein écran (Échap)' : 'Plein écran : plus de place pour le planning');
        setAttr(btn, 'data-rwr-compact', 'no');
        const room = fr.left - (v ? v.getBoundingClientRect().right : 0) - 2 * GAP;
        if (btn.offsetWidth > room) setAttr(btn, 'data-rwr-compact', 'yes');
        if (btn.getAttribute('data-rwr-compact') === 'yes') setAttr(btn, 'title', text); else btn.removeAttribute('title');
        btn.style.height = Math.round(fr.height) + 'px';
        btn.style.top = Math.round(fr.top) + 'px';
        btn.style.left = Math.round(fr.left - 16 - btn.offsetWidth) + 'px';
      }
      const pane = side && sp && lastPane(sp), pr = pane && pane.getBoundingClientRect();
      if (!pr || !pr.height || helperOpen()) { setAttr(grip, 'data-rwr-show', 'no'); return; }
      setAttr(grip, 'data-rwr-show', 'yes');
      const rail = railOn();
      grip.style.left = Math.round(pr.left - 12) + 'px';
      grip.style.top = Math.round(pr.top) + 'px';
      grip.style.height = Math.round(pr.height) + 'px';
      setAttr(grip, 'aria-valuenow', String(panelW));
      setAttr(fold, 'class', 'mdi ' + (rail ? 'mdi-chevron-left' : 'mdi-chevron-right'));
      setAttr(fold, 'title', rail ? 'Afficher les réservations' : 'Replier les réservations');
      setAttr(fold, 'aria-label', fold.getAttribute('title'));
      setAttr(fold, 'aria-expanded', String(!rail));
    }

    // b. Drag / keys on our handle
    const onGripDown = e => {
      if (e.button !== 0 || e.target === fold || railOn()) return;
      e.preventDefault();
      grip.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, from: panelW, w: panelW };
      grip.classList.add('drag');
    };
    const onGripMove = e => {
      if (!drag) return;
      const sp = splitter(); if (!sp) return;
      const max = Math.floor(sp.getBoundingClientRect().width) - TIMELINE_MIN - SIDE_GAP;
      drag.w = Math.max(PANEL_MIN, Math.min(max, drag.from + (drag.x - e.clientX)));
      root.style.setProperty('--rwr-vac-side-w', drag.w + 'px'); panelW = drag.w; place();
      if (!dragT) dragT = setTimeout(() => { dragT = 0; relayout(); }, 120);   // live, but not on every pixel
    };
    const onGripUp = () => {
      if (!drag) return;
      write(K_W, String(drag.w)); drag = null; grip.classList.remove('drag');
      clearTimeout(dragT); dragT = 0; fit(true); relayout();
    };
    const onGripKey = e => {
      if (e.target !== grip || railOn()) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        write(K_W, String(Math.max(PANEL_MIN, panelW + (e.key === 'ArrowLeft' ? STEP : -STEP))));
        fit(true); place();
      } else if (e.key === 'Home') { e.preventDefault(); write(K_W, null); fit(true); place(); }
    };
    const onGripDbl = e => { if (e.target !== fold && !railOn()) { write(K_W, null); fit(true); place(); } };

    // b. A click on the side rail opens the panel; c. a click on the stacked folded bar runs Pro's own ▲.
    // Never on Pro's "Clear" button.
    const onClick = e => {
      if (!e.target.closest || e.target.closest('.rw-button, .dx-button, button')) return;
      const pane = e.target.closest('#splitter-timeline > .dx-splitter-item:last-child');
      if (!pane) return;
      if (side) { if (railOn()) setRail(false); return; }
      if (!proFolded(pane)) return;
      const up = pane.parentElement.querySelector(':scope > .dx-resize-handle .dx-resize-handle-collapse-prev-pane');
      if (up) up.click();
    };
    // d. Esc leaves focus mode, only when nothing else could want the key (popup, dropdown, field, load)
    const onKey = e => {
      if (e.key !== 'Escape' || !focusOn() || e.defaultPrevented || topPopup() || helperOpen() || loading()) return;
      const a = document.activeElement;
      if (a && a.matches && a.matches('input, textarea, select, [contenteditable]:not([contenteditable=false])')) return;
      setFocus(false);
    };
    const onResize = e => { if (e.isTrusted) { fit(true); place(); } };   // ignore our own resize events
    // The page scroller and the splitter also change size without a window resize (banner closed, sidebar opened,
    // zoom): one ResizeObserver on both, re-attached when Pro replaces them
    function watch() {
      const els = [document.querySelector(SCROLLER), splitter()].filter(Boolean);
      if (els.length === watched.length && els.every((el, i) => el === watched[i])) return;
      if (ro) ro.disconnect();
      watched = els; ro = null;
      if (!window.ResizeObserver || !els.length) return;
      ro = new ResizeObserver(() => requestAnimationFrame(() => { if (btn) { fit(false); place(); } }));
      els.forEach(el => ro.observe(el));
    }
    const pass = () => { watch(); fit(false); place(); };

    return {
      key: 'design',
      apply() {
        btn = document.createElement('button'); btn.id = 'rwr-vac-focus'; btn.type = 'button';
        icon = document.createElement('i'); label = document.createElement('span');
        btn.append(icon, label); setAttr(btn, 'data-rwr-show', 'no');
        btn.addEventListener('click', () => setFocus(!focusOn()));
        grip = document.createElement('div'); grip.id = 'rwr-vac-grip'; grip.tabIndex = 0;
        grip.setAttribute('role', 'separator'); grip.setAttribute('aria-orientation', 'vertical');
        grip.setAttribute('aria-label', 'Largeur des réservations (← →, Début : par défaut)');
        grip.setAttribute('title', 'Glisser pour élargir ou réduire · double-clic : largeur par défaut');
        fold = document.createElement('button'); fold.type = 'button';
        fold.addEventListener('click', () => setRail(!railOn()));
        grip.append(fold); setAttr(grip, 'data-rwr-show', 'no');
        grip.addEventListener('pointerdown', onGripDown);
        grip.addEventListener('pointermove', onGripMove);
        grip.addEventListener('pointerup', onGripUp);
        grip.addEventListener('pointercancel', onGripUp);
        grip.addEventListener('keydown', onGripKey);
        grip.addEventListener('dblclick', onGripDbl);
        document.body.append(btn, grip);
        if (read(K_FOCUS) !== '0') root.classList.add('rwr-vac-focus');   // on by default
        if (read(K_RAIL) === '1') root.classList.add('rwr-vac-rail');
        document.addEventListener('click', onClick, true);
        window.addEventListener('keydown', onKey, false);
        window.addEventListener('resize', onResize);
        if (focusOn()) relayout();
        pass();
      },
      remove() {
        document.removeEventListener('click', onClick, true);
        window.removeEventListener('keydown', onKey, false);
        window.removeEventListener('resize', onResize);
        clearTimeout(dragT); dragT = 0; drag = null;
        if (ro) ro.disconnect(); ro = null; watched = [];
        btn.remove(); grip.remove(); btn = icon = label = grip = fold = null;
        root.classList.remove('rwr-vac-focus', 'rwr-vac-rail');   // the saved choices stay for next time
        release();
      },
      onMutate: pass,
      onRoute() { fit(true); place(); },
      onSettings() { fit(true); place(); }   // the ON/OFF button (P6) appeared or went away
    };
  })());

  /* ----- P6 · On-screen ON/OFF button (setting "button", html.rwr-btn) -----
     Same as v1's, moved right of the 60 px sidebar (v1's spot would cover its version label). Switches "design"
     only. Hidden while the sidebar is expanded, and below every popup (z-index in pro.css). */
  modules.push((() => {
    let btn = null, panel = null, ro = null;
    const label = () => { btn.textContent = cfg.is('design') ? 'Améliorations : ON' : 'Améliorations : OFF'; };
    const navState = () => { if (btn && panel) setAttr(btn, 'data-rwr-nav', panel.getBoundingClientRect().right > 80 ? 'open' : 'closed'); };
    function watchPanel() {
      const p = document.querySelector('.dx-drawer-panel-content');
      if (p !== panel) {
        if (ro) ro.disconnect();
        panel = p; ro = null;
        if (p && window.ResizeObserver) { ro = new ResizeObserver(navState); ro.observe(p); }
      }
      navState();
    }
    return {
      key: 'button',
      apply() {
        btn = document.createElement('button'); btn.id = 'rwr-toggle'; btn.type = 'button';
        btn.addEventListener('click', () => cfg.set({ design: !cfg.is('design') }));
        label(); document.body.append(btn); watchPanel();
      },
      remove() { if (ro) ro.disconnect(); ro = panel = null; btn.remove(); btn = null; },
      onMutate: watchPanel,
      onSettings: label
    };
  })());

  /* ---------- Controller: settings, route changes, one shared observer ---------- */
  function sync() {
    const app = inApp();
    for (const m of modules) {
      const want = app && cfg.is(m.key);
      if (want && !m.on) { m.on = true; safe(() => m.apply()); }
      else if (!want && m.on) { m.on = false; safe(() => m.remove()); }
    }
  }
  const each = hook => modules.forEach(m => { if (m.on && m[hook]) safe(() => m[hook]()); });

  // Route classes on <html>: rwr-app (in-app routes only), rwr-dash (/dashboard), rwr-drill (/dashboard/…),
  // rwr-vac (Vehicle Allocation Control, the planning screen)
  function onRoute() {
    const app = inApp(), r = route();
    root.classList.toggle('rwr-app', app);
    root.classList.toggle('rwr-dash', app && r === '/dashboard');
    root.classList.toggle('rwr-drill', app && r.startsWith('/dashboard/'));
    root.classList.toggle('rwr-vac', app && /\/vehicle-allocation-control$/.test(r));
    sync();
    each('onRoute');
  }
  // A content script cannot wrap the page's history.pushState: watch <title> (Pro sets it on every route),
  // popstate, and compare location.href on every DOM batch as a safety net.
  let href = location.href;
  const checkRoute = () => { if (location.href !== href) { href = location.href; onRoute(); } };

  let raf = 0;
  const tick = () => { raf = 0; checkRoute(); each('onMutate'); };
  // One observer for every module, batched per frame. Tab changes inside a page (no URL change) land here too.
  const bodyObs = new MutationObserver(muts => {
    if (raf) return;
    for (const m of muts) if (!isOwn(m.target)) { raf = requestAnimationFrame(tick); return; }
  });
  bodyObs.observe(document.body, { subtree: true, childList: true, characterData: true });
  const titleObs = new MutationObserver(checkRoute);
  titleObs.observe(document.head || root, { subtree: true, childList: true, characterData: true });
  window.addEventListener('popstate', checkRoute);
  const offChange = cfg.onChange(() => { sync(); each('onSettings'); });

  onRoute();

  window.__rwrRemove = () => {
    bodyObs.disconnect(); titleObs.disconnect(); offChange(); cancelAnimationFrame(raf);
    window.removeEventListener('popstate', checkRoute);
    modules.forEach(m => { if (m.on) { m.on = false; safe(() => m.remove()); } });
    root.classList.remove('rwr-app', 'rwr-dash', 'rwr-drill', 'rwr-vac', 'rwr-vac-focus', 'rwr-vac-rail', 'rwr-vac-side', 'rwr-editing');
    delete window.__rwrRemove;
  };
})();
