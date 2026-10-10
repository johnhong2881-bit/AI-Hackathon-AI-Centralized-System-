const http = require('http');
const fs = require('fs');
const path = require('path');
const port = 5174;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
http.createServer((req, res) => {
  const name = req.url.split('?')[0] === '/' ? 'index.html' : path.basename(req.url.split('?')[0]);
  const file = path.join(__dirname, name);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log('TaskFlow AI prototype on http://localhost:' + port));
