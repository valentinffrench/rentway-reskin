/* Rentway Reskin — CaribeCar · v2.0.0
   Shared by Rentway v1 (rentwayv1.emotionmobility.com, content.js) and Rentway Pro (rentway.emotionmobility.com, pro.js).
   Runs at document_start, before Rentway draws anything: applies the saved settings as classes on <html>
   so every enabled enhancement is active from the very first paint — no flash.
   Owns the settings for both apps: ONE set of settings, kept in chrome.storage.local (key rwSettings), with a
   copy in each site's localStorage so the first paint can be applied synchronously. Answers the popup and keeps
   every Rentway tab (v1 and Pro) in sync. Exposes the settings API to content.js / pro.js as window.__rwCfg:
   cfg.is(key), cfg.set(patch), cfg.onChange(fn). */
(() => {
  if (window.__rwCfg) return;
  const KEY = 'rwSettings', OLD_KEY = 'rwReskin';
  // The manifest only injects this script on the two Rentway hosts (plus the local fixture in a dev copy, which is Pro)
  const SITE = location.hostname.startsWith('rentwayv1.') ? 'v1' : 'pro';
  // Each enhancement can be switched on/off independently from the extension popup. Same keys on both sites.
  const DEF = { design: true, summary: true, loader: true, tips: true, shortcuts: true, modals: true, button: true };
  // Class set on <html> for each enabled enhancement (every CSS rule is scoped to one of them).
  // Pro already owns the rw-* prefix for its own components: everything the extension adds there is rwr-*.
  // The summary bar is v1-only (Pro detail pages already have status tiles).
  const CLS = SITE === 'v1'
    ? { design: 'rw-on', summary: 'rw-sum', loader: 'rw-calm', tips: 'rw-tips', shortcuts: 'rw-kbd', modals: 'rw-modal', button: 'rw-btn' }
    : { design: 'rwr-design', loader: 'rwr-calm', tips: 'rwr-tips', shortcuts: 'rwr-kbd', modals: 'rwr-modal', button: 'rwr-btn' };
  let store = null;
  try { store = chrome.storage.local; } catch (e) {}

  const clean = s => { const out = {}; for (const k in DEF) out[k] = s && typeof s[k] === 'boolean' ? s[k] : DEF[k]; return out; };
  const same = (a, b) => Object.keys(DEF).every(k => a[k] === b[k]);

  // This site's local copy, or null if the site never stored anything
  function readLocal() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (s && typeof s === 'object') return s;
    // v1.0 stored a single ON/OFF flag: OFF meant "original Rentway screen" for all visual changes
    try { if (localStorage.getItem(OLD_KEY) === 'off') return { design: false, summary: false, loader: false, tips: false }; } catch (e) {}
    return null;
  }
  const load = () => clean(readLocal());
  function saveLocal(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.removeItem(OLD_KEY); } catch (e) {} }
  function save(s) {
    saveLocal(s);
    try { store && store.set({ [KEY]: { ...s } }, () => void chrome.runtime.lastError); } catch (e) {}
  }
  function applyClasses(s) {
    const root = document.documentElement;
    for (const k in CLS) root.classList.toggle(CLS[k], !!s[k]);
  }

  const listeners = new Set();
  const notify = () => listeners.forEach(fn => { try { fn(cfg.settings); } catch (e) {} });
  const cfg = { KEY, DEF, CLS, SITE, settings: load(), load, save, applyClasses };
  cfg.is = k => !!cfg.settings[k];
  cfg.onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  let dirty = false;   // changed here before the shared settings were read: the user's choice wins
  cfg.set = patch => {
    const next = { ...cfg.settings };
    for (const k in patch) if (k in DEF) next[k] = !!patch[k];
    dirty = true; cfg.settings = next; save(next); applyClasses(next); notify();
  };
  // Settings that came from elsewhere (first read, another tab, the other Rentway app): apply, never write back
  function adopt(raw) {
    const next = clean(raw);
    saveLocal(next);
    if (same(next, cfg.settings)) return;
    cfg.settings = next; applyClasses(next); notify();
  }

  cfg.applyClasses(cfg.settings);
  window.__rwCfg = cfg;

  if (store) {
    try {
      store.get(KEY, r => {
        if (chrome.runtime.lastError || dirty) return;
        const shared = r && r[KEY];
        if (shared && typeof shared === 'object') adopt(shared);
        else {
          // First run of v2: seed the shared settings from this site's v1.x choices, if it has any.
          // A site that never stored anything (e.g. Pro opened first) leaves the seeding to the other one.
          const local = readLocal();
          if (local) save(clean(local));
        }
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[KEY] && changes[KEY].newValue) adopt(changes[KEY].newValue);
      });
    } catch (e) {}
  }

  // Popup: read / change the settings of this tab (they apply to every Rentway tab through chrome.storage)
  try {
    chrome.runtime.onMessage.addListener((msg, _s, reply) => {
      if (!msg || (msg.type !== 'rw-get' && msg.type !== 'rw-set')) return;
      if (msg.type === 'rw-set') cfg.set(msg.settings || { design: !!msg.on });
      const res = { settings: { ...cfg.settings }, on: cfg.is('design'), site: SITE };
      if (SITE === 'pro') res.pro = { version: (document.querySelector('.menu-version')?.textContent || '').trim() };
      reply(res);
    });
  } catch (e) {}
})();
