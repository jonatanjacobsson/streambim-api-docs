# deHighlightAllObjects

**Status:** ⚠️ works, promise never resolves · **Category:** Visibility & highlighting · [All methods](../README.md)

Clear the selection.

```ts
StreamBIM.API.deHighlightAllObjects(): Promise<never>
```

## Returns

`never`: The selection is cleared, but the promise **never resolves**. Do not `await` it.

## What StreamBIM does

`viewerController.unselectObjects()` and `selectionmanager.deselectAll()`, then `return true` without resolving.

## Workaround

`setViewportState({ highlightedObjects: [] })` clears the selection and resolves.

## Examples

#### Fire and forget

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
await StreamBIM.API.highlightObject(door);
StreamBIM.API.deHighlightAllObjects(); // no await
await new Promise((r) => setTimeout(r, 200));
return (await StreamBIM.API.getViewportState()).highlightedObjects;
```

<details open><summary>Output (verified 2026-11-01, 288 ms)</summary>

```json
[]
```

</details>

#### Awaitable alternative

```js
return await StreamBIM.API.setViewportState({ highlightedObjects: [] });
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
| normal call | `[]` | **never settled** | 6013 |
