#!/usr/bin/env node
// StreamBIM MCP widget server.
//   - serves the widget page that StreamBIM loads as its "localhost" widget (http://localhost:3000/)
//     (--serve <dir> serves another folder instead, e.g. one of ../examples)
//   - accepts the widget's WebSocket on /bridge
//   - exposes MCP over Streamable HTTP on /mcp, and over stdio with --stdio
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, extname, dirname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { Bridge } from './bridge.mjs';
import { loadDocs } from './docs.mjs';
import { createMcpServer } from './mcp.mjs';
import { AgentRunner } from './agent.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HARNESS_WIDGET = join(ROOT, 'widget');
const serveIdx = process.argv.indexOf('--serve');
const WIDGET_DIR = serveIdx > 0 ? resolve(process.argv[serveIdx + 1]) : HARNESS_WIDGET;
// Vendored browser libraries (penpal, OpenUI) are available to every served folder at /vendor/.
const VENDOR_DIR = join(HARNESS_WIDGET, 'vendor');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const STDIO = process.argv.includes('--stdio');
const VERSION = '0.1.0';

// In stdio mode stdout belongs to the MCP protocol, so all logging goes to stderr.
const log = (...a) => console.error('[streambim-mcp]', ...a);

// Docs live at the repository root: api/ (REST), widget/ (widget API), openui/.
const docs = ['api', 'widget', 'openui'].flatMap((dir) => loadDocs(join(ROOT, '..', dir), dir));
const agent = new AgentRunner({ mcpUrl: `http://localhost:${PORT}/mcp`, log });
const bridge = new Bridge({ log, agent });

const LOCAL_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
const WIDGET_ORIGINS = [...LOCAL_HOSTS].map((h) => `http://${h}`);

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };

async function serveStatic(req, res, pathname) {
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^([/\\])+/, '');
  const base = rel.startsWith('vendor') ? VENDOR_DIR : WIDGET_DIR;
  const file = join(base, rel.startsWith('vendor') ? rel.slice('vendor'.length) : rel);
  if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    // Vendored libraries are immutable per version; everything else is served fresh during development.
    const cache = rel.startsWith('vendor') ? 'public, max-age=86400' : 'no-store';
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : undefined;
}

function scopedBridge(clientId) {
  const scoped = Object.create(bridge);
  scoped.request = (type, payload, opts = {}) => bridge.request(type, payload, { ...opts, clientId: opts.clientId || clientId });
  return scoped;
}

// Streamable HTTP sessions: one transport + McpServer per session id.
const sessions = new Map();

async function handleMcp(req, res) {
  // DNS-rebinding / cross-site protection: only local Host, and no foreign browser Origin.
  if (!LOCAL_HOSTS.has(req.headers.host) || (req.headers.origin && !WIDGET_ORIGINS.includes(req.headers.origin))) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  const sessionId = req.headers['mcp-session-id'];
  let transport = sessionId && sessions.get(sessionId);

  if (req.method === 'POST') {
    const body = await readJson(req).catch(() => null);
    if (!transport) {
      if (sessionId || !isInitializeRequest(body)) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'No valid session. Send initialize first.' }, id: null }));
        return;
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => { sessions.set(id, transport); log(`mcp: session ${id} opened`); },
      });
      transport.onclose = () => { if (transport.sessionId) sessions.delete(transport.sessionId); };
      // /mcp?client=<id> (used by the widget prompt box) makes that widget the default target.
      const client = new URL(req.url, 'http://x').searchParams.get('client');
      await createMcpServer({ bridge: client ? scopedBridge(client) : bridge, docs, version: VERSION }).connect(transport);
    }
    await transport.handleRequest(req, res, body);
    return;
  }
  if (!transport) { res.writeHead(400).end('Unknown session'); return; }
  await transport.handleRequest(req, res); // GET (SSE stream) / DELETE (end session)
}

const httpServer = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname === '/mcp') return await handleMcp(req, res);
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, version: VERSION, widgets: bridge.listClients() }));
    }
    if (req.method === 'GET') return await serveStatic(req, res, pathname);
    res.writeHead(405).end();
  } catch (e) {
    log('http error', e);
    if (!res.headersSent) res.writeHead(500).end(String(e.message || e));
  }
});

bridge.attach(httpServer, { allowedOrigins: WIDGET_ORIGINS });

httpServer.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    log(`port ${PORT} is already in use. Another instance is probably running; point your MCP client at http://localhost:${PORT}/mcp instead, or set PORT.`);
  } else log('server error', e);
  if (!STDIO) process.exit(1);
});

httpServer.listen(PORT, HOST, () => {
  log(`widget:  http://localhost:${PORT}/   (StreamBIM "localhost" widget, serving ${WIDGET_DIR})`);
  log(`mcp:     http://localhost:${PORT}/mcp (Streamable HTTP)${STDIO ? ' + stdio' : ''}`);
  log(`docs:    ${docs.length} files loaded`);
});

if (STDIO) {
  await createMcpServer({ bridge, docs, version: VERSION }).connect(new StdioServerTransport());
}
