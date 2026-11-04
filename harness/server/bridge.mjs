// Bridge between MCP tool calls and the widget(s) running inside StreamBIM.
// Each widget iframe opens a WebSocket to /bridge; tool calls become
// request/response messages over that socket.
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

const MAX_EVENTS = 500;

export class Bridge {
  constructor({ log = () => {}, agent = null } = {}) {
    this.log = log;
    this.agent = agent; // AgentRunner for prompts typed in the widget
    this.clients = new Map(); // clientId -> { ws, info, connectedAt, lastSeen }
    this.pending = new Map(); // requestId -> { resolve, reject, timer }
    this.events = []; // ring buffer of viewer events
    this.eventSeq = 0;
    this.eventWaiters = new Set();
  }

  attach(httpServer, { allowedOrigins }) {
    this.wss = new WebSocketServer({ noServer: true });
    httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, 'http://x');
      if (url.pathname !== '/bridge') return socket.destroy();
      // Only the widget page served by this process may connect.
      if (!allowedOrigins.includes(req.headers.origin)) {
        this.log(`bridge: rejected origin ${req.headers.origin}`);
        return socket.destroy();
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.#onConnection(ws));
    });
  }

  #onConnection(ws) {
    const clientId = randomUUID().slice(0, 8);
    const client = { ws, info: {}, connectedAt: Date.now(), lastSeen: Date.now() };
    this.clients.set(clientId, client);
    this.log(`bridge: widget ${clientId} connected`);
    ws.send(JSON.stringify({ type: 'welcome', clientId }));
    this.agent?.hello(ws);

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      client.lastSeen = Date.now();
      if (msg.type === 'hello' || msg.type === 'info') {
        client.info = { ...client.info, ...msg.info };
      } else if (msg.type === 'result') {
        const p = this.pending.get(msg.id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        msg.ok ? p.resolve(msg) : p.reject(Object.assign(new Error(msg.error?.message || 'Widget error'), { detail: msg.error, logs: msg.logs }));
      } else if (msg.type === 'event') {
        this.#pushEvent({ clientId, name: msg.name, data: msg.data, at: new Date().toISOString() });
      } else if (msg.type?.startsWith('agent-')) {
        this.agent?.handle(clientId, ws, msg);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      this.agent?.forget(clientId);
      this.log(`bridge: widget ${clientId} disconnected`);
    });
  }

  #pushEvent(ev) {
    ev.seq = ++this.eventSeq;
    this.events.push(ev);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    for (const w of this.eventWaiters) w();
  }

  listClients() {
    return [...this.clients.entries()].map(([id, c]) => ({
      clientId: id,
      ...c.info,
      connectedAt: new Date(c.connectedAt).toISOString(),
      lastSeen: new Date(c.lastSeen).toISOString(),
    }));
  }

  #pickClient(clientId) {
    if (clientId) {
      const c = this.clients.get(clientId);
      if (!c) throw new Error(`No widget with clientId ${clientId}. Connected: ${[...this.clients.keys()].join(', ') || 'none'}`);
      return [clientId, c];
    }
    // Default to the most recently connected widget that has a live StreamBIM connection.
    const all = [...this.clients.entries()].sort((a, b) => b[1].connectedAt - a[1].connectedAt);
    const best = all.find(([, c]) => c.info.streambimConnected) || all[0];
    if (!best) {
      throw new Error('No StreamBIM widget is connected. Open the StreamBIM project, open the "localhost" widget in the side panel, and make sure the widget server is running on the configured port.');
    }
    return best;
  }

  /** Send a request to a widget and wait for its result message. */
  request(type, payload, { clientId, timeoutMs = 30000 } = {}) {
    const [, client] = this.#pickClient(clientId);
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Widget did not respond within ${timeoutMs} ms`));
      }, timeoutMs + 2000);
      this.pending.set(id, { resolve, reject, timer });
      client.ws.send(JSON.stringify({ id, type, timeoutMs, ...payload }));
    });
  }

  /** Return events after `sinceSeq`, optionally waiting up to waitMs for at least one. */
  async getEvents({ sinceSeq = 0, names, waitMs = 0, limit = 100 }) {
    const filter = () => this.events.filter((e) => e.seq > sinceSeq && (!names?.length || names.includes(e.name)));
    let found = filter();
    if (!found.length && waitMs > 0) {
      await new Promise((resolve) => {
        const done = () => { clearTimeout(t); this.eventWaiters.delete(check); resolve(); };
        const check = () => { if (filter().length) done(); };
        const t = setTimeout(done, waitMs);
        this.eventWaiters.add(check);
      });
      found = filter();
    }
    return { events: found.slice(-limit), lastSeq: this.eventSeq };
  }
}
