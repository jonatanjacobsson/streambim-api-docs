// Runs a local .js file inside the connected StreamBIM widget, with `StreamBIM.API` in scope
// (the same way the documented examples run), and prints the result.
// Usage: node tools/run-js.mjs <file.js> [timeoutMs]
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const [file, timeout = '120000'] = process.argv.slice(2);
if (!file) throw new Error('usage: node tools/run-js.mjs <file.js> [timeoutMs]');
const code = 'const StreamBIM = { API: api };\n' + readFileSync(file, 'utf8');

const client = new Client({ name: 'run-js', version: '0.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL || 'http://localhost:3000/mcp')));
const res = await client.callTool({ name: 'streambim_execute_js', arguments: { code, timeoutMs: Number(timeout) } }, undefined, { timeout: Number(timeout) + 10000 });
await client.close();
for (const c of res.content) console.log(c.type === 'text' ? c.text : `[${c.mimeType} image]`);
if (res.isError) process.exitCode = 1;
