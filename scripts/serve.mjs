import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { distDir, renderPage } from './build.mjs';

export function createGuideServer({ preview = false } = {}) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }

    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/favicon.ico') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (!['/', '/index.html', '/dsa-interview-field-guide.html'].includes(pathname)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : 'Not found');
      return;
    }

    try {
      // Development reads the current sources on each refresh; preview reads the build.
      const html = preview
        ? await readFile(resolve(distDir, 'index.html'), 'utf8')
        : await renderPage();
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : html);
    } catch (error) {
      console.error(error);
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : 'Could not load the guide. Check the server terminal.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preview = process.argv.includes('--preview');
  const port = Number(process.env.PORT || 5173);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  if (preview) {
    try {
      await readFile(resolve(distDir, 'index.html'));
    } catch {
      console.error('No production build found. Run npm run build first.');
      process.exit(1);
    }
  }
  const server = createGuideServer({ preview });
  server.on('error', (error) => {
    console.error(`Could not start server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`${preview ? 'Preview' : 'Development'}: http://${host}:${port}`);
    if (!preview) console.log('Edit src/ files, then refresh the browser to see changes.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close());
  }
}
