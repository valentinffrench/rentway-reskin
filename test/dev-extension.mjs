// DEV ONLY — builds a copy of the extension that ALSO runs on the local fixture (http://localhost:8765/*),
// treated as Rentway Pro. Never ship or publish this copy: the real manifest stays untouched.
// Usage: node test/dev-extension.mjs [output folder]   (default: ../rentway-reskin-dev next to the repo)
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(repo, '..', 'rentway-reskin-dev'));
const FILES = ['manifest.json', 'early.js', 'content.js', 'styles.css', 'pro.js', 'pro.css', 'popup.html', 'popup.js', 'icons'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of FILES) cpSync(join(repo, f), join(out, f), { recursive: true });

const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
manifest.name += ' (DEV — fixture locale)';
for (const cs of manifest.content_scripts) {
  if (cs.matches.includes('https://rentway.emotionmobility.com/*')) cs.matches.push('http://localhost:8765/*');
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Copie de dev prête : ${out}\nchrome://extensions → Charger l'extension non empaquetée → ce dossier.`);
