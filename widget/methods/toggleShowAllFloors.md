# toggleShowAllFloors

**Status:** 🚫 not available · **Category:** Documented elsewhere, not available · [All methods](../README.md)

Multi-floor grid view. Not exposed by the default webapp (app.streambim.com/webapp/default). Not in the taskctrl build either (2026-11-01).

```ts
StreamBIM.API.toggleShowAllFloors(show: boolean)  // not available
```

## Returns

`rejection`: penpal rejects with `Error: Method \`toggleShowAllFloors\` is not found.`

## What StreamBIM does

Not in the default build's methodsForWidget(). Not present in the taskctrl build (it has toggleHideNoResultsFloors / toggleShowSpaceFootprints instead).

## Errors

- `PenpalError: Method \`toggleShowAllFloors\` is not found.`

## Workaround

None in the widget API.

## Examples

#### Detect whether it exists

```js
try {
  await StreamBIM.API.toggleShowAllFloors();
  return 'available';
} catch (err) {
  return err.message;
}
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
"Method `toggleShowAllFloors` is not found."
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| expected missing | `["048mvnhWPDHefuPHQ5uMBr"]` | rejected `"Method `toggleShowAllFloors` is not found."` | 2 |
