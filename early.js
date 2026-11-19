/* Runs at document_start, before Rentway draws anything: applies the saved settings as classes
   on <html> so every enabled enhancement is active from the very first paint — no flash.
   Also exposes the settings helper to content.js (both scripts share the extension's isolated world). */
(() => {
  const KEY = 'rwSettings', OLD_KEY = 'rwReskin';
  // Each enhancement can be switched on/off independently from the extension popup.
  const DEF = { design: true, summary: true, loader: true, tips: true, shortcuts: true, modals: true, button: true };
  // Class set on <html> for each enabled enhancement (every CSS rule is scoped to one of them)
  const CLS = { design: 'rw-on', summary: 'rw-sum', loader: 'rw-calm', tips: 'rw-tips', shortcuts: 'rw-kbd', modals: 'rw-modal', button: 'rw-btn' };

  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') {
      s = {};
      // v1.0 stored a single ON/OFF flag: OFF meant "original Rentway screen" for all visual changes
      try { if (localStorage.getItem(OLD_KEY) === 'off') Object.assign(s, { design: false, summary: false, loader: false, tips: false }); } catch (e) {}
    }
    const out = {};
    for (const k in DEF) out[k] = typeof s[k] === 'boolean' ? s[k] : DEF[k];
    return out;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.removeItem(OLD_KEY); } catch (e) {} }
  function applyClasses(s) {
    const root = document.documentElement;
    for (const k in CLS) root.classList.toggle(CLS[k], !!s[k]);
  }

  const cfg = { KEY, DEF, CLS, settings: load(), load, save, applyClasses };
  cfg.applyClasses(cfg.settings);
  window.__rwCfg = cfg;
})();
