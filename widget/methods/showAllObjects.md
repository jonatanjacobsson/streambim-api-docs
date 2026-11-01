# showAllObjects

**Status:** ✅ works · **Category:** Visibility & highlighting · [All methods](../README.md)

Unhide everything hidden with `hideObject` / `setViewportState`, including objects hidden by the user.

```ts
StreamBIM.API.showAllObjects(): Promise<true>
```

## Returns

`true`

## What StreamBIM does

`selectionmanager.showAll()` and `hiddenObjects.clear()`.

## Examples

#### Unhide all, then restore what was hidden before

```js
const before = (await StreamBIM.API.getViewportState()).hiddenObjects;
await StreamBIM.API.showAllObjects();
const during = (await StreamBIM.API.getViewportState()).hiddenObjects.length;
await StreamBIM.API.setViewportState({ hiddenObjects: before });
return { hiddenBefore: before.length, hiddenAfterShowAll: during };
```

<details open><summary>Output (verified 2026-11-01, 2 ms)</summary>

```json
{
  "hiddenBefore": 0,
  "hiddenAfterShowAll": 0
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `boolean` | 1 |
