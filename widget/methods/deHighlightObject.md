# deHighlightObject

**Status:** ❌ broken in production · **Category:** Visibility & highlighting · [All methods](../README.md)

Intended to remove one object from the selection. Fails in production.

```ts
StreamBIM.API.deHighlightObject(guid: string): Promise<never>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `guid` | `string` | yes | 22-char GUID. |

## Returns

`rejection`: Always rejects with `{ code: "unknown", debug: TypeError("e.get(...).deSelectObject is not a function") }` (`debug` is a cloned `Error`; read `err.debug.message`). The selection manager deselect runs first, so the highlight may still be removed.

## What StreamBIM does

Calls `selectionmanager.deselectObject(guid)` then `viewerController.deSelectObject(guid)`, which does not exist in the current viewer.

## Errors

- Always `{ code: "unknown", debug: { error, stack } }`.

## Workaround

Use `setViewportState({ highlightedObjects: remaining })` to set the exact selection.

## Examples

#### The call rejects

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
await StreamBIM.API.highlightObject(door);
try {
  await StreamBIM.API.deHighlightObject(door);
} catch (err) {
  return { code: err.code, debug: err.debug && err.debug.message };
}
```

<details open><summary>Output (verified 2026-11-01, 92 ms)</summary>

```json
{
  "code": "unknown",
  "debug": "e.get(...).deSelectObject is not a function"
}
```

</details>

#### Workaround: set the selection explicitly

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
await StreamBIM.API.highlightObject(door);
const { highlightedObjects } = await StreamBIM.API.getViewportState();
await StreamBIM.API.setViewportState({ highlightedObjects: highlightedObjects.filter((g) => g !== door) });
return (await StreamBIM.API.getViewportState()).highlightedObjects;
```

<details open><summary>Output (verified 2026-11-01, 106 ms)</summary>

```json
[]
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["048mvnhWPDHefuPHQ5uMBr"]` | rejected `{"code":"unknown","debug":{"error":"e.get(...).deSelectObject is not a function","stack":"TypeError: e.get(...).deSelect` | 1 |
