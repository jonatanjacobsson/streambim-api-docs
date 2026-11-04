// Chat box in the widget -> a local coding-agent CLI wired to this server's /mcp.
// Backends: Claude Code (`claude -p`) and OpenAI Codex (`codex exec`). Either one only gets the
// streambim_* MCP tools (no shell, no file access) and runs in an empty working directory.
// Each widget keeps one conversation: follow-ups resume the same session until "New chat".
//
// Windows: cross-spawn handles npm's .cmd shims and argument quoting, the prompt goes over stdin
// (cmd.exe can't pass multi-line arguments), and Stop kills the whole process tree.
import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import crossSpawn from 'cross-spawn';

// One line: it is passed as a command-line argument.
const SYSTEM = [
  'You are driving a live StreamBIM viewer for the user through the streambim MCP tools.',
  'The user types prompts into the StreamBIM widget side panel (about 420 px wide) and reads your reply there.',
  "Act on the viewer directly; don't ask for confirmation for read-only or visual actions.",
  'Show tables, lists and dashboards with streambim_render_openui (or streambim_render_panel), not in your text reply.',
  'In streambim_render_panel HTML, never hard-code text or background colours (the panel may be dark); use var(--text), var(--muted), var(--surface), var(--border), var(--accent).',
  'Keep your text reply to one to three short sentences. Plain text, no Markdown tables.',
].join(' ');

const shortTool = (name) => name.replace(/^mcp__streambim__/, '').replace(/^streambim_/, '');

const BACKENDS = {
  claude: {
    label: 'Claude Code',
    bin: process.env.CLAUDE_BIN || 'claude',
    args({ mcpUrl, system, session }) {
      const args = [
        '-p',
        '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
        '--strict-mcp-config', '--mcp-config', JSON.stringify({ mcpServers: { streambim: { type: 'http', url: mcpUrl } } }),
        '--tools', '', '--allowedTools', 'mcp__streambim',
        '--append-system-prompt', system,
      ];
      if (process.env.CLAUDE_MODEL) args.push('--model', process.env.CLAUDE_MODEL);
      if (session) args.push('--resume', session);
      return args;
    },
    // Claude streams text deltas; a result line ends the run.
    parse(m, out) {
      if (m.session_id) out.session(m.session_id);
      if (m.type === 'stream_event') {
        const d = m.event?.delta;
        if (m.event?.type === 'content_block_delta' && d?.type === 'text_delta') out.send({ kind: 'text', text: d.text });
        else if (m.event?.type === 'content_block_start' && m.event.content_block?.type === 'text') out.send({ kind: 'text-start' });
      } else if (m.type === 'assistant') {
        for (const b of m.message?.content || []) if (b.type === 'tool_use') out.send({ kind: 'tool', name: shortTool(b.name) });
      } else if (m.type === 'result') {
        out.result(m.is_error ? { kind: 'error', message: m.result || m.subtype || 'Agent error' } : { kind: 'done' });
      }
    },
  },
  codex: {
    label: 'Codex',
    bin: process.env.CODEX_BIN || 'codex',
    args({ mcpUrl, system, session }) {
      const flags = [
        '--json', '--skip-git-repo-check',
        '--ignore-user-config', // no other MCP servers or profiles; login still comes from CODEX_HOME
        '-c', 'sandbox_mode="read-only"',
        '--disable', 'shell_tool', '--disable', 'unified_exec', '--disable', 'apps',
        '--disable', 'browser_use', '--disable', 'computer_use', '--disable', 'plugins',
        '-c', `mcp_servers.streambim.url=${JSON.stringify(mcpUrl)}`,
        // codex exec can't ask for approval, so the StreamBIM tools are pre-approved.
        '-c', 'mcp_servers.streambim.default_tools_approval_mode="approve"',
        '-c', `developer_instructions=${JSON.stringify(system)}`,
      ];
      if (process.env.CODEX_MODEL) flags.push('-m', process.env.CODEX_MODEL);
      return session ? ['exec', 'resume', ...flags, session, '-'] : ['exec', ...flags, '-'];
    },
    // Codex sends whole messages (no deltas) and one item per tool call.
    parse(m, out) {
      if (m.type === 'thread.started' && m.thread_id) out.session(m.thread_id);
      const item = m.item;
      if (m.type === 'item.started' && item?.type === 'mcp_tool_call') out.send({ kind: 'tool', name: shortTool(item.tool) });
      if (m.type === 'item.completed' && item?.type === 'agent_message' && item.text) {
        out.send({ kind: 'text-start' });
        out.send({ kind: 'text', text: item.text.trim() });
      }
      if (m.type === 'turn.completed') out.result({ kind: 'done' }, { final: true });
      if (m.type === 'turn.failed') out.result({ kind: 'error', message: m.error?.message || 'Codex turn failed' });
      // Can be transient (e.g. a reconnect notice); only shown if the turn never completes.
      if (m.type === 'error' && m.message) out.result({ kind: 'error', message: m.message });
    },
  },
};

function killTree(child) {
  if (process.platform === 'win32') execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
  else child.kill('SIGTERM');
}

export class AgentRunner {
  constructor({ mcpUrl, log = () => {} }) {
    this.mcpUrl = mcpUrl;
    this.log = log;
    this.cwd = join(tmpdir(), 'streambim-agent'); // empty on purpose; also keys Claude's sessions
    mkdirSync(this.cwd, { recursive: true });
    this.runs = new Map(); // clientId -> { child, stopped }
    this.chats = new Map(); // clientId -> { backend, session }
    this.available = []; // backends whose CLI answers --version
    this.ready = this.#detect();
  }

  async #detect() {
    const probe = (id) => new Promise((resolve) => {
      const child = crossSpawn(BACKENDS[id].bin, ['--version'], { stdio: 'ignore', windowsHide: true });
      const t = setTimeout(() => { killTree(child); resolve(false); }, 15000);
      child.on('error', () => { clearTimeout(t); resolve(false); });
      child.on('close', (code) => { clearTimeout(t); resolve(code === 0); });
    });
    const ids = Object.keys(BACKENDS);
    const ok = await Promise.all(ids.map(probe));
    this.available = ids.filter((_, i) => ok[i]);
    const preferred = process.env.AGENT_CLI;
    if (preferred) this.available.sort((a, b) => (b === preferred) - (a === preferred));
    this.log(`agent: chat backends ${this.available.length ? this.available.join(', ') : 'none (install claude or codex)'}`);
  }

  /** Tell a newly connected widget which backends it can pick. */
  async hello(ws) {
    await this.ready;
    if (ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'agent', kind: 'backends', backends: this.available.map((id) => ({ id, label: BACKENDS[id].label })) }));
  }

  handle(clientId, ws, msg) {
    const send = (body) => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'agent', ...body }));
    if (msg.type === 'agent-stop') return this.stop(clientId);
    if (msg.type === 'agent-reset') {
      this.stop(clientId);
      this.chats.delete(clientId);
      return send({ kind: 'reset' });
    }
    if (msg.type === 'agent-prompt' && typeof msg.text === 'string' && msg.text.trim()) {
      if (this.runs.has(clientId)) return send({ kind: 'error', message: 'The agent is still working. Stop it first.' });
      const backend = this.available.includes(msg.backend) ? msg.backend : this.available[0];
      if (!backend) return send({ kind: 'error', message: 'No agent CLI found. Install Claude Code (claude) or Codex (codex), log in, and restart the harness.' });
      this.#run(clientId, backend, msg.text.trim(), send);
    }
  }

  stop(clientId) {
    const run = this.runs.get(clientId);
    if (!run) return;
    run.stopped = true;
    killTree(run.child);
  }

  forget(clientId) {
    this.stop(clientId);
    this.chats.delete(clientId);
  }

  #run(clientId, backendId, text, send) {
    const backend = BACKENDS[backendId];
    // Switching backend mid-chat starts a fresh session for the new one.
    let chat = this.chats.get(clientId);
    if (chat?.backend !== backendId) this.chats.set(clientId, (chat = { backend: backendId, session: null }));

    const args = backend.args({
      mcpUrl: `${this.mcpUrl}?client=${encodeURIComponent(clientId)}`,
      system: `${SYSTEM} The prompt comes from widget ${clientId}; tools target it by default. Other connected widgets are not the user's.`,
      session: chat.session,
    });

    let child;
    try {
      child = crossSpawn(backend.bin, args, { cwd: this.cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    } catch (e) {
      return send({ kind: 'error', message: `Could not start ${backend.bin}: ${e.message}` });
    }
    const run = { child, stopped: false };
    this.runs.set(clientId, run);
    this.log(`agent: ${clientId} ${backendId} prompt (${chat.session ? 'resume ' + chat.session.slice(0, 8) : 'new session'})`);
    send({ kind: 'start', backend: backendId });
    child.stdin.on('error', () => {});
    child.stdin.end(text);

    let stderr = '';
    let outcome = null;
    let failed = false;
    child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-2000); });
    child.on('error', (e) => { failed = true; this.runs.delete(clientId); send({ kind: 'error', message: `Could not start ${backend.bin}: ${e.message}` }); });

    const out = {
      send,
      session: (id) => { chat.session = id; },
      // Reported on close, so a follow-up prompt can't race the exiting process on resume.
      result: (r, { final = false } = {}) => { if (final || !outcome?.final) outcome = { ...r, final }; },
    };
    createInterface({ input: child.stdout }).on('line', (line) => {
      let m;
      try { m = JSON.parse(line); } catch { return; }
      backend.parse(m, out);
    });

    child.on('close', (code) => {
      this.runs.delete(clientId);
      if (failed) return;
      if (run.stopped) send({ kind: 'stopped' });
      else if (outcome) send({ kind: outcome.kind, message: outcome.message });
      else send({ kind: 'error', message: stderr.trim().split('\n').slice(-3).join('\n') || `${backend.bin} exited with code ${code}` });
    });
  }
}
