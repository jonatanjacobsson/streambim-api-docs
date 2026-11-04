// Runs inside the StreamBIM widget iframe. Connects to StreamBIM (widget API) and to the
// local MCP server (WebSocket /bridge), then executes agent requests against StreamBIM.API.
(function () {
  'use strict';

  const MAX_RESULT_CHARS = 200000;
  const MAX_LOG_ENTRIES = 200;
  // Fallback when the browser has no location.ancestorOrigins (Firefox).
  const STREAMBIM_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?streambim\.com$/;

  const state = {
    streambim: false,
    ws: null,
    clientId: null,
    info: {},
    events: [], // recent viewer events, exposed to agent code
    userState: {}, // ctx.state, persists between runs
  };

  // ---------- UI store ----------
  // The chat UI (app.js, Preact) renders this store through window.bridgeUI. The runtime below
  // only updates the store; it never touches the DOM, except the agent panel element.

  const panelEl = document.createElement('div'); // what the agent renders (HTML or OpenUI)
  panelEl.className = 'agent-panel';

  const ui = {
    conn: { viewer: ['pending', 'connecting…'], bridge: ['pending', 'connecting…'] },
    meta: [],
    log: [], // newest first
    unseen: 0,
    unseenErr: false,
    allow: true,
    busy: false,
    messages: [], // { id, role: 'user'|'assistant', text?, parts?, error?, snapshot? }
    panelOwner: null, // id of the assistant message that hosts panelEl
  };
  const listeners = new Set();
  let msgSeq = 0;
  let emitQueued = false;
  function emit() {
    if (emitQueued) return;
    emitQueued = true;
    queueMicrotask(() => { emitQueued = false; for (const fn of listeners) fn(); });
  }

  function setPill(id, status, text) {
    ui.conn[id === 'pill-sb' ? 'viewer' : 'bridge'] = [status, text];
    emit();
  }

  function renderMeta() {
    ui.meta = [
      ['Project', state.info.projectId],
      ['Building', state.info.buildingId],
      // No user e-mail here: the pane ends up in screenshots and screen recordings.
      ['Client', state.clientId],
      ['MCP', location.origin + '/mcp'],
    ].filter(([, v]) => v != null && v !== '');
    emit();
  }

  let logSeq = 0;
  function logEntry(kind, cls, msg, detail) {
    ui.log.unshift({ id: ++logSeq, time: new Date().toLocaleTimeString(), kind, cls, msg, detail });
    if (ui.log.length > MAX_LOG_ENTRIES) ui.log.length = MAX_LOG_ENTRIES;
    ui.unseen++;
    if (cls === 'err') ui.unseenErr = true;
    emit();
  }

  // ---------- Serialisation ----------

  // Converts arbitrary values to JSON-safe data and pulls image data URLs out so they can be
  // returned to the MCP client as image content.
  function serialize(value, images) {
    const seen = new WeakSet();
    const walk = (v, depth) => {
      if (v === undefined) return null;
      if (v === null || typeof v === 'number' || typeof v === 'boolean') return v;
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'string') {
        if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(v) && v.length > 200) {
          images.push(v);
          return `[image #${images.length} returned as image content]`;
        }
        return v;
      }
      if (typeof v === 'function') return `[function ${v.name || 'anonymous'}]`;
      if (v instanceof Error) return { error: v.message, stack: v.stack };
      if (typeof Node !== 'undefined' && v instanceof Node) return `[${v.nodeName}]`;
      if (depth > 12) return '[max depth]';
      if (typeof v === 'object') {
        if (seen.has(v)) return '[circular]';
        seen.add(v);
        if (v instanceof Map) return Object.fromEntries([...v].map(([k, x]) => [String(k), walk(x, depth + 1)]));
        if (v instanceof Set) return [...v].map((x) => walk(x, depth + 1));
        if (ArrayBuffer.isView(v)) return Array.from(v);
        if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
        const out = {};
        for (const k of Object.keys(v)) out[k] = walk(v[k], depth + 1);
        return out;
      }
      return String(v);
    };
    return walk(value, 0);
  }

  function packResult(value, logs) {
    const images = [];
    let data = serialize(value, images);
    let truncated = false;
    const text = JSON.stringify(data);
    if (text && text.length > MAX_RESULT_CHARS) {
      truncated = true;
      data = text.slice(0, MAX_RESULT_CHARS) + '… [truncated, return a smaller result]';
    }
    return { value: data, images, logs, truncated };
  }

  function normalizeError(err) {
    // Widget API rejects with { code, debug } (the official README says `detail`).
    if (err && typeof err === 'object' && 'code' in err && !(err instanceof Error)) {
      const debug = err.debug ?? err.detail;
      const why = debug instanceof Error ? debug.message : typeof debug === 'string' ? debug : '';
      return { message: `StreamBIM error ${err.code}${why ? ': ' + why : ''}`, code: err.code, debug: serialize(debug, []) };
    }
    return { message: err?.message || String(err), stack: err?.stack };
  }

  // ---------- Agent runtime ----------

  function api() {
    if (!state.streambim || !state.remote) throw new Error('Not connected to StreamBIM yet. Is the widget opened inside the StreamBIM viewer?');
    return state.remote;
  }

  // Authenticated REST via the viewer's session. JSON responses are parsed.
  async function rest(path, opts = {}) {
    const url = path.replaceAll('{projectId}', state.info.projectId ?? '').replaceAll('{buildingId}', state.info.buildingId ?? '');
    const req = { url, method: opts.method || 'GET' };
    if (opts.body !== undefined) req.body = opts.body;
    if (opts.accept) req.accept = opts.accept;
    if (opts.contentType) req.contentType = opts.contentType;
    else if (opts.body !== undefined && typeof opts.body === 'object') req.contentType = 'application/json';
    let raw;
    try {
      raw = await api().makeApiRequest(req);
    } catch (err) {
      // On HTTP errors StreamBIM rejects with the XHR itself, which postMessage cannot clone,
      // so the status code is lost. Say what that means instead of the DataCloneError text.
      if (/could not be cloned/.test(err?.message || '')) {
        throw new Error(`StreamBIM returned an HTTP error for ${req.method} ${url} (status not exposed by the widget API). Check the path (prefer /project-{projectId}/api/v1/... over /pgw/...), method, body and contentType.`);
      }
      throw err;
    }
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function makeConsole(logs) {
    const push = (level) => (...args) => {
      logs.push({ level, text: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(serialize(a, [])))).join(' ') });
      console[level](...args);
    };
    return { log: push('log'), info: push('info'), warn: push('warn'), error: push('error'), debug: push('debug') };
  }

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  function withTimeout(promise, ms) {
    let t;
    return Promise.race([promise, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`Timed out after ${ms} ms`)), ms); })]).finally(() => clearTimeout(t));
  }

  async function runCode(code, timeoutMs, logs) {
    const fn = new AsyncFunction('api', 'rest', 'ctx', 'console', 'panel', 'events', 'sleep', code);
    const ctx = { ...state.info, state: state.userState };
    return withTimeout(fn(api(), rest, ctx, makeConsole(logs), panelEl, state.events.slice(-100), sleep), timeoutMs);
  }

  // ---------- OpenUI (https://www.openui.com) ----------
  // The browser bundle (React + renderer + built-in component library) is ~3 MB, so it is only
  // loaded the first time an agent renders OpenUI Lang.

  let openuiLoading = null;
  function loadOpenUI() {
    if (window.__OpenUI) return Promise.resolve(window.__OpenUI);
    if (openuiLoading) return openuiLoading;
    openuiLoading = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'vendor/openui/openui-styles.css';
      document.head.append(css);
      const js = document.createElement('script');
      js.src = 'vendor/openui/openui-bundle.min.js';
      js.onload = () => (window.__OpenUI ? resolve(window.__OpenUI) : reject(new Error('OpenUI bundle loaded but window.__OpenUI is missing')));
      js.onerror = () => reject(new Error('Could not load vendor/openui/openui-bundle.min.js'));
      document.head.append(js);
    });
    return openuiLoading;
  }

  // `streambim://<method>/<arg>/<arg>` in an @OpenUrl action calls StreamBIM.API.<method>(...args).
  // Arguments are URL-decoded and JSON-parsed when they look like JSON.
  async function runViewerUrl(url) {
    const [method, ...rawArgs] = url.slice('streambim://'.length).split('/');
    const args = rawArgs.map((a) => {
      const s = decodeURIComponent(a);
      try { return /^[[{"\d-]|^(true|false|null)$/.test(s) ? JSON.parse(s) : s; } catch { return s; }
    });
    const fn = api()[method];
    if (typeof fn !== 'function') throw new Error(`StreamBIM.API.${method} is not a function`);
    return fn(...args);
  }

  // A viewer call can also ride in @ToAssistant's context: {streambim: {method, args: [...]}}.
  function findViewerCall(action) {
    const ctx = action?.context ?? action?.params?.context;
    const parsed = typeof ctx === 'string' ? (() => { try { return JSON.parse(ctx); } catch { return null; } })() : ctx;
    const call = parsed?.streambim;
    return call && typeof call.method === 'string' ? call : null;
  }

  function onOpenUIAction(action) {
    const url = action?.url ?? action?.params?.url;
    const isViewer = action?.type === 'open_url' && typeof url === 'string' && url.startsWith('streambim://');
    const call = !isViewer && findViewerCall(action);
    logEntry('ui', 'evt', isViewer ? url : call ? call.method : action?.type || 'action', JSON.stringify(action, null, 2));
    if (call) {
      const fn = api()[call.method];
      Promise.resolve(typeof fn === 'function' ? fn(...(call.args || [])) : Promise.reject(new Error(`StreamBIM.API.${call.method} is not a function`))).then(
        (value) => viewerEvent('openuiAction', { ...action, result: serialize(value, []) }),
        (err) => viewerEvent('openuiAction', { ...action, error: normalizeError(err).message }),
      );
      return;
    }
    if (isViewer) {
      runViewerUrl(url).then(
        (value) => viewerEvent('openuiAction', { ...action, result: serialize(value, []) }),
        (err) => viewerEvent('openuiAction', { ...action, error: normalizeError(err).message }),
      );
      return;
    }
    if (action?.type === 'open_url' && url) window.open(url, '_blank', 'noopener');
    // Everything else (@ToAssistant, custom actions) goes to the agent via streambim_get_events.
    viewerEvent('openuiAction', action);
  }

  const openui = { root: null, host: null, source: '' };

  async function renderOpenUI({ source, append = false, streamMs = 0 }) {
    const { React, createRoot, Renderer, openuiChatLibrary } = await loadOpenUI();
    const panel = panelEl;
    if (!openui.host || !panel.contains(openui.host)) {
      openui.root?.unmount();
      panel.innerHTML = '';
      openui.host = document.createElement('div');
      openui.host.className = 'openui-host';
      panel.append(openui.host);
      openui.root = createRoot(openui.host);
      openui.source = '';
    }
    const full = append ? openui.source + '\n' + source : source;
    const draw = (response, isStreaming) => openui.root.render(React.createElement(Renderer, {
      response, library: openuiChatLibrary, isStreaming, onAction: onOpenUIAction,
    }));
    if (streamMs > 0) {
      // Reveal line by line, the way a streaming LLM response would arrive.
      const lines = full.split('\n');
      for (let i = 1; i <= lines.length; i++) {
        draw(lines.slice(0, i).join('\n'), i < lines.length);
        await sleep(streamMs);
      }
    } else {
      draw(full, false);
    }
    openui.source = full;
    return { rendered: full.split('\n').filter((l) => l.trim()).length + ' statements' };
  }

  async function openUISpec({ prompt = true } = {}) {
    const { openuiChatLibrary: lib } = await loadOpenUI();
    const components = Object.fromEntries(Object.entries(lib.components || {}).map(([name, c]) => [name, c.signature || c.description || '']));
    return { root: lib.root, components, prompt: prompt && typeof lib.prompt === 'function' ? lib.prompt() : undefined };
  }

  function renderPanel(html) {
    const panel = panelEl;
    openui.root?.unmount();
    openui.root = null;
    openui.host = null;
    emit();
    if (!html) {
      panel.replaceChildren();
      return;
    }
    panel.innerHTML = html;
    // innerHTML does not execute scripts; re-create them so agent UIs can wire up buttons.
    for (const old of panel.querySelectorAll('script')) {
      const s = document.createElement('script');
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      s.textContent = old.textContent;
      old.replaceWith(s);
    }
  }

  // Globals for scripts rendered into the panel.
  Object.defineProperty(window, 'api', { get: () => state.remote });
  window.rest = rest;
  window.sleep = sleep;

  const preview = (s, n = 90) => (s.length > n ? s.slice(0, n) + '…' : s).replace(/\s+/g, ' ');

  async function handleRequest(msg) {
    const logs = [];
    const started = performance.now();
    const reply = (body) => send({ type: 'result', id: msg.id, durationMs: Math.round(performance.now() - started), ...body });
    let label = msg.type;
    try {
      if (!ui.allow) throw new Error('The user has turned off "Agent control" in the StreamBIM widget.');
      let value;
      if (msg.type === 'exec') {
        label = 'run';
        logEntry('run', '', preview(msg.code), msg.code);
        value = await runCode(msg.code, msg.timeoutMs || 30000, logs);
      } else if (msg.type === 'call') {
        label = msg.method;
        const fn = api()[msg.method];
        if (typeof fn !== 'function') throw new Error(`StreamBIM.API.${msg.method} is not a function`);
        value = await withTimeout(fn(...(msg.args || [])), msg.timeoutMs || 30000);
      } else if (msg.type === 'rest') {
        label = `${msg.opts?.method || 'GET'} ${msg.path}`;
        value = await withTimeout(rest(msg.path, msg.opts), msg.timeoutMs || 60000);
      } else if (msg.type === 'render') {
        label = 'render';
        claimPanel();
        renderPanel(msg.html);
        value = { rendered: msg.html.length };
      } else if (msg.type === 'openui') {
        label = 'openui';
        claimPanel();
        value = await withTimeout(renderOpenUI(msg), msg.timeoutMs || 60000);
      } else if (msg.type === 'openui-spec') {
        label = 'openui spec';
        value = await withTimeout(openUISpec(msg), 30000);
      } else {
        throw new Error(`Unknown request type ${msg.type}`);
      }
      const packed = packResult(value, logs);
      if (msg.type !== 'exec') logEntry(label, 'ok', 'ok');
      else logEntry('ok', 'ok', preview(JSON.stringify(packed.value) || 'undefined'), JSON.stringify(packed.value, null, 2));
      reply({ ok: true, ...packed });
    } catch (err) {
      const error = normalizeError(err);
      logEntry(label, 'err', error.message, error.detail ? JSON.stringify(error.detail, null, 2) : error.stack);
      reply({ ok: false, error, logs });
    }
  }

  // ---------- Chat (local Claude Code agent, see server/agent.mjs) ----------
  // A prompt adds a user message and an assistant message. The assistant message collects text
  // parts and a tool summary as they stream in. Output the agent renders lands in the message
  // that is running; when a later message takes the panel over, the old one keeps a snapshot.

  let current = null; // assistant message of the running prompt
  let textPart = null;

  function claimPanel() {
    let owner = current;
    const last = ui.messages[ui.messages.length - 1];
    // Renders from an outside MCP client (no prompt running) get their own message.
    if (!owner && last?.external && ui.panelOwner === last.id) owner = last;
    if (owner && ui.panelOwner === owner.id) return;
    const prev = ui.messages.find((m) => m.id === ui.panelOwner);
    if (prev && panelEl.childNodes.length) prev.snapshot = panelEl.innerHTML;
    if (!owner) {
      owner = { id: ++msgSeq, role: 'assistant', parts: [], external: true };
      ui.messages.push(owner);
    }
    ui.panelOwner = owner.id;
    emit();
  }

  function onAgentMessage(msg) {
    if (msg.kind === 'start') {
      ui.busy = true;
      current = { id: ++msgSeq, role: 'assistant', parts: [] };
      textPart = null;
      ui.messages.push(current);
    } else if (msg.kind === 'text-start') {
      textPart = null;
    } else if (msg.kind === 'text' && current) {
      if (!textPart) current.parts.push((textPart = { type: 'text', text: '' }));
      textPart.text += msg.text;
    } else if (msg.kind === 'tool' && current) {
      textPart = null;
      let tools = current.parts.find((p) => p.type === 'tools');
      if (!tools) current.parts.push((tools = { type: 'tools', counts: {} }));
      tools.counts[msg.name] = (tools.counts[msg.name] || 0) + 1;
    } else if (msg.kind === 'done' || msg.kind === 'stopped' || msg.kind === 'error') {
      ui.busy = false;
      const target = current ?? ui.messages[ui.messages.length - 1];
      if (msg.kind === 'stopped' && target) target.stopped = true;
      if (msg.kind === 'error') {
        if (target?.role === 'assistant') target.error = msg.message;
        else ui.messages.push({ id: ++msgSeq, role: 'assistant', parts: [], error: msg.message });
      }
      current = textPart = null;
    } else if (msg.kind === 'reset') {
      ui.busy = false;
      ui.messages = [];
      ui.panelOwner = null;
      current = textPart = null;
      renderPanel('');
    }
    emit();
  }

  function sendPrompt(text) {
    text = text.trim();
    if (!text || ui.busy) return false;
    ui.messages.push({ id: ++msgSeq, role: 'user', text });
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
      ui.messages.push({ id: ++msgSeq, role: 'assistant', parts: [], error: 'The MCP bridge is offline. Is the harness running?' });
    } else {
      send({ type: 'agent-prompt', text });
    }
    emit();
    return true;
  }

  window.bridgeUI = {
    get: () => ui,
    panel: panelEl,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    sendPrompt,
    stop: () => send({ type: 'agent-stop' }),
    newChat: () => (ui.busy ? null : send({ type: 'agent-reset' })),
    clearOutput: () => renderPanel(''),
    clearLog: () => { ui.log = []; emit(); },
    markSeen() {
      if (!ui.unseen && !ui.unseenErr) return;
      ui.unseen = 0;
      ui.unseenErr = false;
      emit();
    },
    setAllow(on) {
      ui.allow = on;
      logEntry(on ? 'on' : 'off', on ? 'ok' : 'err', on ? 'Agent control enabled' : 'Agent control disabled; requests will be refused');
    },
  };
  window.dispatchEvent(new Event('bridgeui'));

  // ---------- MCP bridge (WebSocket) ----------

  function send(obj) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(obj));
  }

  function publishInfo() {
    send({ type: 'info', info: { ...state.info, streambimConnected: state.streambim, href: location.href, referrer: document.referrer } });
  }

  let retry = 0;
  function connectBridge() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/bridge`);
    state.ws = ws;
    ws.onopen = () => { retry = 0; setPill('pill-ws', 'ok', 'connected'); publishInfo(); };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'welcome') { state.clientId = msg.clientId; renderMeta(); return; }
      if (msg.type === 'agent') return onAgentMessage(msg);
      if (msg.id) handleRequest(msg);
    };
    ws.onclose = () => {
      setPill('pill-ws', 'err', 'offline, retrying');
      if (ui.busy) onAgentMessage({ kind: 'error', message: 'Bridge disconnected; the agent run was stopped.' });
      setTimeout(connectBridge, Math.min(10000, 500 * 2 ** retry++));
    };
  }

  // ---------- StreamBIM ----------

  let lastCameraSent = 0;
  function viewerEvent(name, data) {
    const ev = { name, data: serialize(data, []), at: new Date().toISOString() };
    state.events.push(ev);
    if (state.events.length > 300) state.events.shift();
    if (name === 'cameraChanged') {
      // Camera events fire continuously while navigating; forward at most twice a second.
      const now = Date.now();
      if (now - lastCameraSent < 500) return;
      lastCameraSent = now;
    } else {
      logEntry(name, 'evt', name === 'pickedObject' ? data?.guid : JSON.stringify(ev.data));
    }
    send({ type: 'event', name, data: ev.data });
  }

  const callbacks = {
    pickedObject: (r) => viewerEvent('pickedObject', r),
    spacesChanged: (g) => viewerEvent('spacesChanged', g),
    floorChanged: (f) => viewerEvent('floorChanged', f),
    cameraChanged: (c) => viewerEvent('cameraChanged', c),
    didExpand: () => viewerEvent('didExpand', null),
    didContract: () => viewerEvent('didContract', null),
  };

  async function connectStreamBIM() {
    if (window.parent === window) {
      setPill('pill-sb', 'err', 'not inside StreamBIM');
      logEntry('info', 'err', 'Open this page as the "localhost" widget inside StreamBIM.');
      return;
    }
    try {
      // Same handshake as streambim-widget-api's connectToParent (penpal v7), but the origin
      // comes from ancestorOrigins: that library derives it from document.referrer, which
      // StreamBIM's referrer policy leaves empty, and it expects the parent window to be
      // readable cross-origin.
      const parentOrigin = location.ancestorOrigins?.[0];
      const messenger = new Penpal.WindowMessenger({
        remoteWindow: window.parent,
        allowedOrigins: [parentOrigin || STREAMBIM_ORIGIN],
      });
      state.remote = await Penpal.connect({ messenger, methods: callbacks, timeout: 20000 }).promise;
      state.streambim = true;
      setPill('pill-sb', 'ok', 'connected');
      const safe = (p) => p.catch(() => undefined);
      const [projectId, buildingId, userEmail] = await Promise.all([
        safe(state.remote.getProjectId()),
        safe(state.remote.getBuildingId()),
        safe(state.remote.getUserEmail()),
      ]);
      state.info = { projectId, buildingId, userEmail };
      renderMeta();
      publishInfo();
      logEntry('ready', 'ok', `Connected to project ${projectId ?? '?'}`);
    } catch (err) {
      setPill('pill-sb', 'err', 'failed');
      logEntry('error', 'err', 'StreamBIM connect failed: ' + normalizeError(err).message);
    }
  }

  connectBridge();
  connectStreamBIM();
})();
