# Notes for coding agents

This repo documents StreamBIM's widget API and REST API (unofficially) and ships a harness
that lets you drive a live StreamBIM viewer.

- **Widget API:** read [`widget/README.md`](widget/README.md) and the page for each method in
  `widget/methods/<name>.md` before using it. Several methods behave differently from the
  official README (some never resolve, some are missing, errors are `{ code, debug }`).
- **REST from a widget:** [`widget/guides/rest-api-from-widgets.md`](widget/guides/rest-api-from-widgets.md)
  (paths, Accept headers, the 201/204 `DataCloneError` quirk). Endpoint reference: `api/*.md`.
- **Starting point for a new widget:** copy `examples/minimal-widget/index.html`. Connect with
  penpal directly (see the file), not with `streambim-widget-api`'s `connectToParent`.
- **Live viewer access:** if the user runs `cd harness && npm start` and opens a project with the
  `localhost` widget, the `streambim` MCP server (see `.mcp.json`) gives you `streambim_execute_js`,
  `streambim_rest`, `streambim_screenshot`, `streambim_render_openui` and docs search. Call
  `streambim_status` first.
- **Generated files:** `widget/methods/`, `widget/guides/`, `widget/README.md` and `widget/events.md`
  are generated. Edit `widget/spec/*.mjs`, verify with `npm run verify -- --only <name>` in
  `harness/`, then `npm run build-docs`.
- Code style: plain ES modules, no build step, no framework in widgets.
