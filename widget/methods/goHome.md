# goHome

**Status:** ✅ works · **Category:** Navigation · [All methods](../README.md)

Return to the project's home view.

```ts
StreamBIM.API.goHome(resetCamera?: boolean = true): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `resetCamera` | `boolean` | no | Passed to the viewer's `goHome` action. Defaults to `true` (undocumented parameter). |

## Returns

`true`

## What StreamBIM does

`viewerController.send("goHome", resetCamera)`.

## Examples

#### Back to the start view

```js
return await StreamBIM.API.goHome();
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
| normal call | `[]` | resolved `boolean` | 10 |
