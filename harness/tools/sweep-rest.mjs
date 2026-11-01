// Calls documented REST GET endpoints through the widget's makeApiRequest and records which
// ones work from inside a widget, with which Accept header, and what comes back.
// Usage: node tools/sweep-rest.mjs [--out file.json]   (server + widget must be running)
import { writeFileSync, mkdirSync } from 'node:fs';
import { VERIFICATION } from './paths.mjs';
import { dirname } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : `${VERIFICATION}/rest-sweep-${new Date().toISOString().slice(0, 10)}.json`;

// Read-only endpoints without ids beyond project/building. Streams (sse), downloads, login
// redirects and trigger endpoints are left out on purpose.
const ENDPOINTS = [
  '/api/v1/ping',
  '/mgw/api/v3/projects/{projectId}',
  '/mgw/api/v3/projects?page[limit]=2',
  '/mgw/api/v3/project-links?filter[active]=true&page[limit]=2',
  '/mgw/api/v3/project-members?page[limit]=2',
  '/mgw/api/v3/users?page[limit]=2',
  '/mgw/api/v3/user-organizations?page[limit]=2',
  '/mgw/api/v3/customer-projects?page[limit]=2',
  '/mgw/api/v2/user-profiles',
  '/bcf/2.1/projects',
  '/cmv3/converter-jobs?filter[project]={projectId}&page[limit]=2',
  '/project-{projectId}/api/v1/v2/projects/{projectId}',
  '/project-{projectId}/api/v1/v2/project-stats/{projectId}',
  '/project-{projectId}/api/v1/v2/configs',
  '/project-{projectId}/api/v1/v2/last-modifieds/{buildingId}',
  '/project-{projectId}/api/v1/v2/sync-statuses',
  '/project-{projectId}/api/v1/v2/project-members?page[limit]=2',
  '/project-{projectId}/api/v1/v2/users?page[limit]=2',
  '/project-{projectId}/api/v1/v2/groups',
  '/project-{projectId}/api/v1/v2/user-organizations',
  '/project-{projectId}/api/v1/v2/topics?page[limit]=2&page[skip]=0',
  '/project-{projectId}/api/v1/v2/topic-statuses',
  '/project-{projectId}/api/v1/v2/topic-labels',
  '/project-{projectId}/api/v1/v2/topic-priorities',
  '/project-{projectId}/api/v1/v2/workflows',
  '/project-{projectId}/api/v1/v2/checklists?page[limit]=2',
  '/project-{projectId}/api/v1/v2/documents?page[limit]=2',
  '/project-{projectId}/api/v1/v2/document-revisions?page[limit]=2',
  '/project-{projectId}/api/v1/v2/document-labels',
  '/project-{projectId}/api/v1/v2/folders?page[limit]=2',
  '/project-{projectId}/api/v1/v2/labels',
  '/project-{projectId}/api/v1/v2/label-groups',
  '/project-{projectId}/api/v1/v2/ifc-files?page[limit]=2',
  '/project-{projectId}/api/v1/v2/trains?page[limit]=2',
  '/project-{projectId}/api/v1/v2/attachments?page[limit]=2',
  '/project-{projectId}/api/v1/topics/export/json/',
  '/project-{projectId}/api/v1/documents/export/json/',
  '/project-{projectId}/api/v1/checklists/export/json/',
  '/project-{projectId}/api/v1/ifcfiles/export/json/',
  '/project-{projectId}/api/v1/users/export/json/',
  '/project-{projectId}/api/v1/sync',
  '/project-{projectId}/api/v1/microtoken',
];

const CODE = String.raw`
const projectId = await api.getProjectId();
const buildingId = await api.getBuildingId();
const summarize = (text) => {
  let body;
  try { body = JSON.parse(text); } catch { return { json: false, preview: String(text).slice(0, 160) }; }
  const data = body && body.data;
  return {
    json: true,
    topKeys: body && typeof body === 'object' ? Object.keys(body).slice(0, 10) : typeof body,
    dataIsArray: Array.isArray(data),
    count: Array.isArray(data) ? data.length : Array.isArray(body) ? body.length : undefined,
    firstType: Array.isArray(data) ? data[0] && data[0].type : data && data.type,
    firstAttributes: Array.isArray(data) ? data[0] && data[0].attributes && Object.keys(data[0].attributes).slice(0, 12) : data && data.attributes && Object.keys(data.attributes).slice(0, 12),
    meta: body && body.meta,
  };
};
const results = [];
for (const template of ENDPOINTS) {
  const url = template.replaceAll('{projectId}', projectId).replaceAll('{buildingId}', buildingId);
  const row = { template, url };
  for (const [label, accept] of [['jsonapi', undefined], ['json', 'application/json']]) {
    const t0 = performance.now();
    try {
      const text = await Promise.race([
        api.makeApiRequest(accept ? { url, accept } : { url }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]);
      row[label] = { ok: true, ms: Math.round(performance.now() - t0), ...summarize(text) };
    } catch (e) {
      row[label] = { ok: false, ms: Math.round(performance.now() - t0), error: /could not be cloned/.test(e.message) ? 'HTTP error (status hidden)' : e.message };
    }
  }
  results.push(row);
}
return { projectId, buildingId, results };
`.replace('ENDPOINTS', JSON.stringify(ENDPOINTS));

const client = new Client({ name: 'rest-sweep', version: '0.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.MCP_URL || 'http://localhost:3000/mcp')));
const res = await client.callTool({ name: 'streambim_execute_js', arguments: { code: CODE, timeoutMs: 290000 } }, undefined, { timeout: 300000 });
await client.close();
const body = JSON.parse(res.content[0].text);
if (res.isError) throw new Error(JSON.stringify(body, null, 2));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ sweptAt: new Date().toISOString(), ...body.result }, null, 2) + '\n');
console.log('wrote', out);
for (const r of body.result.results) {
  const fmt = (x) => (x.ok ? `ok ${x.json ? (x.count ?? '') : 'text'}`.trim() : 'ERR');
  console.log(fmt(r.jsonapi).padEnd(8), fmt(r.json).padEnd(8), r.template);
}
