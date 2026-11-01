# setShowExpandButton

**Status:** ✅ works · **Category:** UI & styling · [All methods](../README.md)

Show the expand button on the widget panel.

```ts
StreamBIM.API.setShowExpandButton(show: boolean): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `show` | `boolean` | yes |  |

## Returns

`true`: Resolves `true` even where the host has no expand button (then it is a no-op).

## What StreamBIM does

Calls the panel's `setShowExpandButton` if it exists.

## Examples

#### Offer the expand button

```js
return await StreamBIM.API.setShowExpandButton(true);
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
| normal call | `[true]` | resolved `boolean` | 2 |
