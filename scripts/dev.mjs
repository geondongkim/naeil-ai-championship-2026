import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import analyze from '../api/analyze.mjs';
import { projectRoot } from './build.mjs';

const distDir = path.join(projectRoot, 'dist');
const port = Number.parseInt(process.env.PORT ?? '4173', 10);
const maxRequestBytes = 3_600_000;
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxRequestBytes) throw Object.assign(new Error('request too large'), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function serveStatic(request, response) {
  const url = new URL(request.url, 'http://local.naeil');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.statusCode = 400;
    response.end('Bad Request');
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const relativePath = pathname.replace(/^\/+/, '');
  const target = path.resolve(distDir, relativePath);
  if (!target.startsWith(`${path.resolve(distDir)}${path.sep}`)) {
    response.statusCode = 404;
    response.end('Not Found');
    return;
  }
  try {
    if (!(await stat(target)).isFile()) throw Object.assign(new Error('not found'), { code: 'ENOENT' });
    response.setHeader('Content-Type', contentTypes.get(path.extname(target)) ?? 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(await readFile(target));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    response.statusCode = 404;
    response.end('Not Found');
  }
}

const server = createServer(async (request, response) => {
  try {
    if (new URL(request.url, 'http://local.naeil').pathname === '/api/analyze') {
      request.body = await readBody(request);
      await analyze(request, response);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET, HEAD');
      response.end('Method Not Allowed');
      return;
    }
    await serveStatic(request, response);
  } catch (error) {
    response.statusCode = error?.statusCode ?? 500;
    response.setHeader('Cache-Control', 'no-store');
    response.end(error?.statusCode === 413 ? 'Payload Too Large' : 'Internal Server Error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`NAEIL development server: http://127.0.0.1:${port}`);
});
