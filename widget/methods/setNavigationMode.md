# setNavigationMode

**Status:** ✅ works · **Category:** UI & styling · [All methods](../README.md)

Walk (person) or orbit (spin) navigation.

```ts
StreamBIM.API.setNavigationMode(mode: 0 | 1): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `mode` | `number` | yes | `0` person/walk, `1` spin/orbit. |

## Returns

`true`

## What StreamBIM does

`viewerController.send("setNavigationMode", mode)`.

## Examples

#### Switch to orbit

```js
return await StreamBIM.API.setNavigationMode(1);
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
| normal call | `[1]` | resolved `boolean` | 1 |
