# setExpanded

**Status:** ✅ works · **Category:** UI & styling · [All methods](../README.md)

Expand or collapse the widget panel.

```ts
StreamBIM.API.setExpanded(expanded: boolean): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `expanded` | `boolean` | yes |  |

## Returns

`true`: No-op (still `true`) if the panel does not support it. Fires `didExpand` / `didContract` when the state changes.

## What StreamBIM does

Calls the panel's `setExpanded` if it exists.

## Examples

#### Collapse

```js
return await StreamBIM.API.setExpanded(false);
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
| normal call | `[false]` | resolved `boolean` | 0 |
