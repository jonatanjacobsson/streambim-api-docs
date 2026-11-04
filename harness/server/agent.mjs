// Prompt box in the widget -> local Claude Code (`claude -p`) wired to this server's /mcp.
// The agent only gets the streambim_* MCP tools (no shell, no file access). Each widget keeps
// one conversation: follow-up prompts resume the same Claude session until "New chat".
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const SYSTEM = `You are driving a live StreamBIM viewer for the user through the streambim MCP tools.
The user types prompts into the StreamBIM widget side panel (about 420 px wide) and reads your reply there.
- Act on the viewer directly; don't ask for confirmation for read-only or visual actions.
- Show tables, lists and dashboards in the agent panel with streambim_render_openui (or streambim_render_panel), not in your text reply.
- Keep your text reply to one to three short sentences. Plain text, no Markdown tables.`;

export class AgentRunner {
  constructor({ mcpUrl, log = () => {} }) {
    this.mcpUrl = mcpUrl;
    this.log = log;
    this.bin = process.env.CLAUDE_BIN || 'claude';
    this.model = process.env.AGENT_MODEL || '';
    this.runs = new Map(); // clientId -> child process
    this.sessions = new Map(); // clientId -> Claude session id
  }

  handle(clientId, ws, msg) {
    const send = (body) => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'agent', ...body }));
    if (msg.type === 'agent-stop') return this.stop(clientId);
    if (msg.type === 'agent-reset') {
      this.stop(clientId);
      this.sessions.delete(clientId);
      return send({ kind: 'reset' });
    }
    if (msg.type === 'agent-prompt' && typeof msg.text === 'string' && msg.text.trim()) {
      if (this.runs.has(clientId)) return send({ kind: 'error', message: 'The agent is still working. Stop it first.' });
      this.#run(clientId, msg.text.trim(), send);
    }
  }

  stop(clientId) {
    this.runs.get(clientId)?.kill('SIGTERM');
  }

  forget(clientId) {
    this.stop(clientId);
    this.sessions.delete(clientId);
  }

  #run(clientId, text, send) {
    const url = `${this.mcpUrl}?client=${encodeURIComponent(clientId)}`;
    const mcp = JSON.stringify({ mcpServers: { streambim: { type: 'http', url } } });
    const args = [
      '-p', text,
      '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
      '--strict-mcp-config', '--mcp-config', mcp,
      '--tools', '', '--allowedTools', 'mcp__streambim',
      '--append-system-prompt', `${SYSTEM}\n- The prompt comes from widget ${clientId}; tools target it by default. Other connected widgets are not the user's.`,
    ];
    if (this.model) args.push('--model', this.model);
    const resume = this.sessions.get(clientId);
    if (resume) args.push('--resume', resume);

    let child;
    try {
      child = spawn(this.bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      return send({ kind: 'error', message: `Could not start ${this.bin}: ${e.message}` });
    }
    this.runs.set(clientId, child);
    this.log(`agent: ${clientId} prompt (${resume ? 'resume ' + resume.slice(0, 8) : 'new session'})`);
    send({ kind: 'start' });

    let stderr = '';
    let outcome = null;
    let failed = false;
    child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-2000); });
    child.on('error', (e) => { failed = true; send({ kind: 'error', message: `Could not start ${this.bin}: ${e.message}` }); });

    createInterface({ input: child.stdout }).on('line', (line) => {
      let m;
      try { m = JSON.parse(line); } catch { return; }
      if (m.session_id) this.sessions.set(clientId, m.session_id);
      if (m.type === 'stream_event') {
        const d = m.event?.delta;
        if (m.event?.type === 'content_block_delta' && d?.type === 'text_delta') send({ kind: 'text', text: d.text });
        else if (m.event?.type === 'content_block_start' && m.event.content_block?.type === 'text') send({ kind: 'text-start' });
      } else if (m.type === 'assistant') {
        for (const b of m.message?.content || []) {
          if (b.type === 'tool_use') send({ kind: 'tool', name: b.name.replace(/^mcp__streambim__(streambim_)?/, '') });
        }
      } else if (m.type === 'result') {
        // Reported on close, so a follow-up prompt can't race the exiting process on --resume.
        outcome = m.is_error
          ? { kind: 'error', message: m.result || m.subtype || 'Agent error' }
          : { kind: 'done', durationMs: m.duration_ms, turns: m.num_turns };
      }
    });

    child.on('close', (code, signal) => {
      this.runs.delete(clientId);
      if (failed) return;
      if (outcome) send(outcome);
      else if (signal) send({ kind: 'stopped' });
      else send({ kind: 'error', message: stderr.trim() || `claude exited with code ${code}` });
    });
  }
}
