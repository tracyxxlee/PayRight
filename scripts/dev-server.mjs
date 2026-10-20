import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT || 8080);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.gz': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const rootPrefix = root.endsWith(sep) ? root : root + sep;
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const filePath = normalize(join(root, relative || 'index.html'));
  if (!filePath.startsWith(rootPrefix)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  if (!stat.isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const type = types[extname(filePath).toLowerCase()] || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}`);
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`連接埠 ${port} 已被佔用，無法啟動。請關閉佔用程式，或先設定環境變數 PORT 再執行 npm run serve`);
    process.exit(1);
  }
  console.error(error.message);
  process.exit(1);
});
