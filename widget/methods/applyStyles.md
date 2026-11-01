# applyStyles

**Status:** ⚠️ works, promise never resolves · **Category:** UI & styling · [All methods](../README.md)

Undocumented older twin of `setStyles`. Injects CSS but never resolves.

```ts
StreamBIM.API.applyStyles(css: string): Promise<never>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `css` | `string` | yes | As for `setStyles`. |

## Returns

`never`: Never resolves. Use `setStyles`.

## What StreamBIM does

Same `<link>` injection as `setStyles`, without calling `resolve`.

## Examples

#### Use setStyles instead

```js
StreamBIM.API.applyStyles('/* never resolves */'); // no await
return await StreamBIM.API.setStyles('/* resolves */');
```

<details open><summary>Output (verified 2026-11-01, 2 ms)</summary>

```json
true
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| undocumented alias | `["/* probe */"]` | **never settled** | 6000 |
