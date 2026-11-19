const KEYS = ['design', 'summary', 'tips', 'button', 'loader', 'modals', 'shortcuts'];
const boxes = Object.fromEntries(KEYS.map(k => [k, document.getElementById(k)]));
const na = document.getElementById('na');
let tabId = null, site = 'v1';

async function send(msg) { return chrome.tabs.sendMessage(tabId, msg); }

// The settings are shared by both apps; only the wording (and the v1-only summary bar) depends on the tab's site
function showSite(r) {
  site = r.site === 'pro' ? 'pro' : 'v1';   // a v1.x content script does not send "site": it is v1
  const ver = site === 'pro' && r.pro && r.pro.version ? ' ' + r.pro.version : '';
  document.getElementById('site').textContent = site === 'pro' ? ` · Rentway Pro${ver}` : ' · Rentway v1';
  if (site === 'pro') document.querySelectorAll('[data-pro]').forEach(el => { el.textContent = el.dataset.pro; });
}

function render(s) {
  KEYS.forEach(k => { boxes[k].checked = !!s[k]; });
  // v1: the summary bar is part of the new design · Pro: no summary bar (status tiles already do it)
  const summaryOff = site === 'pro' || !s.design;
  boxes.summary.disabled = summaryOff;
  boxes.summary.closest('.row').classList.toggle('dis', summaryOff);
}

function disableAll() {
  KEYS.forEach(k => { boxes[k].disabled = true; boxes[k].closest('.row').classList.add('dis'); });
  document.querySelectorAll('.presets button').forEach(b => b.disabled = true);
  na.style.display = 'block';
}

async function set(patch) {
  try { const r = await send({ type: 'rw-set', settings: patch }); if (r && r.settings) render(r.settings); }
  catch (e) { disableAll(); }
}

(async () => {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = t && t.id;
  try {
    const r = await send({ type: 'rw-get' });
    if (!r || !r.settings) throw new Error('old version');
    showSite(r);
    render(r.settings);
  } catch (e) { disableAll(); }   // not a Rentway tab, or page loaded before install/update
})();

KEYS.forEach(k => boxes[k].addEventListener('change', () => set({ [k]: boxes[k].checked })));
// "Tout activer" / "Rentway d'origine": one shared setting, so they apply to Rentway v1 and Pro alike
document.getElementById('all').onclick = () => set(Object.fromEntries(KEYS.map(k => [k, true])));
document.getElementById('none').onclick = () => set(Object.fromEntries(KEYS.map(k => [k, false])));
