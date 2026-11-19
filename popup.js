const KEYS = ['design', 'summary', 'tips', 'button', 'loader', 'modals', 'shortcuts'];
const boxes = Object.fromEntries(KEYS.map(k => [k, document.getElementById(k)]));
const na = document.getElementById('na');
let tabId = null;

async function send(msg) { return chrome.tabs.sendMessage(tabId, msg); }

function render(s) {
  KEYS.forEach(k => { boxes[k].checked = !!s[k]; });
  // the summary bar is part of the new design
  boxes.summary.disabled = !s.design;
  boxes.summary.closest('.row').classList.toggle('dis', !s.design);
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
    render(r.settings);
  } catch (e) { disableAll(); }   // not a Rentway tab, or page loaded before install/update
})();

KEYS.forEach(k => boxes[k].addEventListener('change', () => set({ [k]: boxes[k].checked })));
document.getElementById('all').onclick = () => set(Object.fromEntries(KEYS.map(k => [k, true])));
document.getElementById('none').onclick = () => set(Object.fromEntries(KEYS.map(k => [k, false])));
