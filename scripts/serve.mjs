import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = normalize(join(process.cwd(), requested));
    if (!file.startsWith(process.cwd()) || !(await stat(file)).isFile()) throw new Error('Not found');
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404); response.end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Prototype: http://127.0.0.1:${port}`));
