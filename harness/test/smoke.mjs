// Smoke test against a running server: node test/smoke.mjs [toolName] [jsonArgs]
// Without args it lists tools and prints streambim_status. Set SAVE_IMAGES=<dir> to write images.
import { writeFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.env.MCP_URL || 'http://localhost:3000/mcp');
const client = new Client({ name: 'smoke', version: '0.0.0' });
await client.connect(new StreamableHTTPClientTransport(url));

const [tool, rawArgs] = process.argv.slice(2);
if (!tool) {
  const { tools } = await client.listTools();
  console.log('tools:', tools.map((t) => t.name).join(', '));
  const { resources } = await client.listResources();
  console.log('resources:', resources.length);
}
const res = await client.callTool({ name: tool || 'streambim_status', arguments: rawArgs ? JSON.parse(rawArgs) : {} });
let n = 0;
for (const c of res.content) {
  if (c.type === 'text') console.log(c.text);
  else if (process.env.SAVE_IMAGES) {
    const file = `${process.env.SAVE_IMAGES}/image-${++n}.${c.mimeType.split('/')[1]}`;
    writeFileSync(file, Buffer.from(c.data, 'base64'));
    console.log(`[${c.mimeType} saved to ${file}]`);
  } else console.log(`[${c.type} ${c.mimeType} ${c.data.length} b64 chars]`);
}
if (res.isError) process.exitCode = 1;
await client.close();
