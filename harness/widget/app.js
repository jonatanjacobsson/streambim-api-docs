// Chat UI for the agent bridge (Preact + htm, vendored, no build step).
// widget.js owns the StreamBIM connection, the MCP bridge and the agent runtime, and exposes
// its state as window.bridgeUI; this file only renders that state and forwards user input.
import { html, render, useEffect, useLayoutEffect, useReducer, useRef, useState } from './vendor/preact-htm.js';

const SUGGESTIONS = [
  'How many doors are there per storey?',
  'Colour the rooms by storey',
  'Show me the windows on Plan 12',
];

function useBridge() {
  const [, tick] = useReducer((n) => n + 1, 0);
  useEffect(() => window.bridgeUI.subscribe(tick), []);
  return window.bridgeUI.get();
}

function Dot({ name, state: [status, text] }) {
  return html`<span class="dot-label" title=${`${name}: ${text}`}><span class="dot ${status}"></span>${name}</span>`;
}

function Header({ ui, onActivity }) {
  return html`
    <header class="top">
      <div class="brand">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.8 3.8L12 11.8 5.2 8.1 12 4.3ZM5 9.8l6 3.3v6.6l-6-3.3V9.8Zm8 9.9v-6.6l6-3.3v6.6l-6 3.3Z"/></svg>
        <span>Agent</span>
      </div>
      <div class="status">
        <${Dot} name="Viewer" state=${ui.conn.viewer} />
        <${Dot} name="Bridge" state=${ui.conn.bridge} />
      </div>
      <label class="switch" title=${ui.allow ? 'Agent control is on' : 'Agent control is off: requests are refused'}>
        <input type="checkbox" checked=${ui.allow} onChange=${(e) => window.bridgeUI.setAllow(e.currentTarget.checked)} />
        <span class="track"><span class="thumb"></span></span>
      </label>
      <button class="icon" title="New chat" disabled=${ui.busy || !ui.messages.length} onClick=${() => window.bridgeUI.newChat()}>
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
      </button>
      <button class="icon" title="Activity log" onClick=${onActivity}>
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 6h16M4 12h16M4 18h10"/></svg>
        ${ui.unseen > 0 && html`<span class="badge ${ui.unseenErr ? 'err' : ''}">${ui.unseen > 99 ? '99+' : ui.unseen}</span>`}
      </button>
    </header>`;
}

// Hosts the live agent panel element (OpenUI/HTML rendered by widget.js) inside a message.
function LivePanel() {
  const ref = useRef();
  useLayoutEffect(() => {
    const panel = window.bridgeUI.panel;
    if (panel.parentNode !== ref.current) ref.current.append(panel);
  });
  return html`<div class="output-live" ref=${ref}></div>`;
}

function Output({ msg, ui }) {
  if (ui.panelOwner === msg.id) {
    return html`<div class="output" key="live">
      <${LivePanel} />
      <button class="link clear" onClick=${() => window.bridgeUI.clearOutput()}>Clear</button>
    </div>`;
  }
  if (msg.snapshot) {
    return html`<div class="output old" key="snapshot" inert dangerouslySetInnerHTML=${{ __html: msg.snapshot }}></div>`;
  }
  return null;
}

function Tools({ counts }) {
  const names = Object.entries(counts);
  const total = names.reduce((n, [, c]) => n + c, 0);
  return html`<details class="tools">
    <summary>${total} tool call${total === 1 ? '' : 's'}</summary>
    <div>${names.map(([n, c]) => html`<code>${n}${c > 1 ? ` ×${c}` : ''}</code>`)}</div>
  </details>`;
}

function Message({ msg, ui, running }) {
  if (msg.role === 'user') return html`<div class="msg user"><div class="bubble">${msg.text}</div></div>`;
  return html`<div class="msg assistant">
    ${msg.parts.map((p) => (p.type === 'text' ? html`<p class="text">${p.text}</p>` : html`<${Tools} counts=${p.counts} />`))}
    <${Output} msg=${msg} ui=${ui} />
    ${running && html`<div class="typing"><span></span><span></span><span></span></div>`}
    ${msg.stopped && html`<p class="note">Stopped.</p>`}
    ${msg.error && html`<p class="text error">${msg.error}</p>`}
  </div>`;
}

function Empty({ ui }) {
  const where = ui.meta.find(([k]) => k === 'Project');
  return html`<div class="empty">
    <p class="empty-title">Ask the agent about this model</p>
    <p class="empty-sub">It can search, colour, isolate and fly to objects, call the REST API, and build small dashboards right here${where ? ` (project ${where[1]})` : ''}.</p>
    <div class="chips">
      ${SUGGESTIONS.map((s) => html`<button class="chip" onClick=${() => window.bridgeUI.sendPrompt(s)}>${s}</button>`)}
    </div>
  </div>`;
}

function Messages({ ui }) {
  const ref = useRef();
  const stick = useRef(true);
  // Follow new content while the user is at the bottom; leave them alone if they scrolled up.
  useLayoutEffect(() => {
    const el = ref.current;
    if (stick.current) el.scrollTop = el.scrollHeight;
  });
  const onScroll = (e) => {
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };
  const last = ui.messages[ui.messages.length - 1];
  return html`<main class="messages" ref=${ref} onScroll=${onScroll}>
    ${ui.messages.length === 0
      ? html`<${Empty} ui=${ui} />`
      : ui.messages.map((m) => html`<${Message} key=${m.id} msg=${m} ui=${ui} running=${ui.busy && m === last && m.role === 'assistant'} />`)}
  </main>`;
}

function Composer({ ui }) {
  const [text, setText] = useState('');
  const ref = useRef();
  useLayoutEffect(() => {
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);
  const submit = (e) => {
    e?.preventDefault();
    if (ui.busy) return window.bridgeUI.stop();
    if (window.bridgeUI.sendPrompt(text)) setText('');
  };
  const offline = ui.conn.bridge[0] !== 'ok';
  return html`<form class="composer" onSubmit=${submit}>
    <textarea
      ref=${ref}
      rows="1"
      value=${text}
      placeholder=${offline ? 'Waiting for the MCP bridge…' : 'Message the agent'}
      aria-label="Message the agent"
      onInput=${(e) => setText(e.currentTarget.value)}
      onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) submit(e); }}
    ></textarea>
    <button class="send ${ui.busy ? 'stop' : ''}" type="submit" title=${ui.busy ? 'Stop' : 'Send (Enter)'} disabled=${!ui.busy && !text.trim()}>
      ${ui.busy
        ? html`<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>`
        : html`<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5 12l7-7 7 7"/></svg>`}
    </button>
  </form>`;
}

function Activity({ ui, onClose }) {
  useEffect(() => { window.bridgeUI.markSeen(); }, [ui.unseen]);
  return html`<div class="drawer" role="dialog" aria-label="Activity">
    <header class="top">
      <div class="brand"><span>Activity</span></div>
      <button class="link" onClick=${() => window.bridgeUI.clearLog()}>Clear</button>
      <button class="icon" title="Close" onClick=${onClose}>
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </header>
    <div class="drawer-body">
      <dl class="meta">${ui.meta.map(([k, v]) => html`<dt>${k}</dt><dd title=${String(v)}>${String(v)}</dd>`)}</dl>
      <ol class="log">
        ${ui.log.map((e) => html`<li key=${e.id} class=${e.cls}>
          <div class="row"><time>${e.time}</time><span class="kind">${e.kind}</span><span class="m" title=${e.msg}>${e.msg}</span></div>
          ${e.detail && html`<details><summary>details</summary><pre>${e.detail}</pre></details>`}
        </li>`)}
      </ol>
    </div>
  </div>`;
}

function App() {
  const ui = useBridge();
  const [activity, setActivity] = useState(false);
  return html`
    <${Header} ui=${ui} onActivity=${() => setActivity(true)} />
    <${Messages} ui=${ui} />
    <${Composer} ui=${ui} />
    ${activity && html`<${Activity} ui=${ui} onClose=${() => setActivity(false)} />`}`;
}

const start = () => render(html`<${App} />`, document.getElementById('app'));
if (window.bridgeUI) start();
else window.addEventListener('bridgeui', start, { once: true });
