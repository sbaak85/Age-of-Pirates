import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = requested === '/' || requested === '/game/' ? 'game/index.html' : requested === '/ship-preview/' ? 'ship-preview/index.html' : requested.slice(1);
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep) || !['ship-preview', 'game', 'vendor'].includes(relative.split('/')[0])) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const body = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
server.listen(4317, '127.0.0.1', () => console.log('海戰紀元: http://127.0.0.1:4317/game/'));
