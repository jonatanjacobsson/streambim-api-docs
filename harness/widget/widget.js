// Runs inside the StreamBIM widget iframe. Connects to StreamBIM (widget API) and to the
// local MCP server (WebSocket /bridge), then executes agent requests against StreamBIM.API.
(function () {
  'use strict';

  const MAX_RESULT_CHARS = 200000;
  const MAX_LOG_ENTRIES = 200;
  // Fallback when the browser has no location.ancestorOrigins (Firefox).
  const STREAMBIM_ORIGIN = /^https:\/\/([a-z0-9-]+\.)?streambim\.com$/;
  const $ = (id) => document.getElementById(id);

  const state = {
    streambim: false,
    ws: null,
    clientId: null,
    info: {},
    events: [], // recent viewer events, exposed to agent code
    userState: {}, // ctx.state, persists between runs
  };

  // ---------- UI ----------

  function setPill(id, status, text) {
    const el = $(id);
    el.classList.toggle('ok', status === 'ok');
    el.classList.toggle('err', status === 'err');
    el.querySelector('b').textContent = text;
  }

  function renderMeta() {
    const rows = [
      ['Project', state.info.projectId],
      ['Building', state.info.buildingId],
      // No user e-mail here: the pane ends up in screenshots and screen recordings.
      ['Client', state.clientId],
    ].filter(([, v]) => v != null && v !== '');
    $('meta').replaceChildren(...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = String(v); dd.title = String(v);
      return [dt, dd];
    }));
  }

  function logEntry(kind, cls, msg, detail) {
    const li = document.createElement('li');
    li.className = cls;
    const row = document.createElement('div'); row.className = 'row';
    const t = document.createElement('time'); t.textContent = new Date().toLocaleTimeString();
    const k = document.createElement('span'); k.className = 'kind'; k.textContent = kind;
    const m = document.createElement('span'); m.className = 'msg'; m.textContent = msg; m.title = msg;
    row.append(t, k, m);
    li.append(row);
    if (detail) {
      const d = document.createElement('details');
      const s = document.createElement('summary'); s.textContent = 'details';
      const pre = document.createElement('pre'); pre.textContent = detail;
      d.append(s, pre);
      li.append(d);
    }
    const log = $('log');
    log.prepend(li);
    while (log.children.length > MAX_LOG_ENTRIES) log.lastChild.remove();
  }

  $('clear-log').onclick = () => $('log').replaceChildren();
  $('clear-panel').onclick = () => renderPanel('');
  $('mcp-url').textContent = location.origin + '/mcp';
  $('allow').onchange = (e) => logEntry(e.target.checked ? 'on' : 'off', e.target.checked ? 'ok' : 'err', e.target.checked ? 'Agent control enabled' : 'Agent control disabled; requests will be refused');

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
    return withTimeout(fn(api(), rest, ctx, makeConsole(logs), $('agent-panel'), state.events.slice(-100), sleep), timeoutMs);
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
    const panel = $('agent-panel');
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
    const panel = $('agent-panel');
    openui.root?.unmount();
    openui.root = null;
    openui.host = null;
    if (!html) {
      panel.innerHTML = '<p class="hint">Anything the agent renders with <code>streambim_render_panel</code> appears here.</p>';
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
      if (!$('allow').checked) throw new Error('The user has turned off "Agent control" in the StreamBIM widget.');
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
        renderPanel(msg.html);
        value = { rendered: msg.html.length };
      } else if (msg.type === 'openui') {
        label = 'openui';
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
      if (msg.id) handleRequest(msg);
    };
    ws.onclose = () => {
      setPill('pill-ws', 'err', 'offline, retrying');
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
