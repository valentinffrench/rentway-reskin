// DEV ONLY — serves test/pro-fixture.html at every path, like Pro's single-page app (history mode):
// http://localhost:8765/subscriptions/demo/vehicle-details/1001 · …/dashboard · …/dashboard/rental-agreements
// Usage: node test/serve.mjs [port]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const port = Number(process.argv[2]) || 8765;
const file = new URL('./pro-fixture.html', import.meta.url);
createServer((req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(readFileSync(file));   // read on each request: edits show on reload
}).listen(port, '127.0.0.1', () => console.log(`Fixture Rentway Pro : http://localhost:${port}/subscriptions/demo/vehicle-details/1001`));
