# setStyles

**Status:** ✅ works · **Category:** UI & styling · [All methods](../README.md)

Inject CSS into the StreamBIM page (hide buttons, restyle panels).

```ts
StreamBIM.API.setStyles(css: string): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `css` | `string` | yes | A stylesheet. Each call adds another `<link>`; earlier styles stay until reload. Must be Latin-1 (the host uses `btoa`), so escape non-ASCII characters in `content:` strings. |

## Returns

`true`

## What StreamBIM does

Appends `<link rel="stylesheet" href="data:text/css;base64,…">` to the StreamBIM `<head>`.

## Errors

- Non-Latin-1 characters make `btoa` throw: `{ code: "unknown", debug }`.

## Examples

#### Add a stylesheet

```js
return await StreamBIM.API.setStyles('.intercom-launcher { display: none !important; }');
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
true
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["/* probe */"]` | resolved `boolean` | 10 |
