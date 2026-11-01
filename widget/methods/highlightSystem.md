# highlightSystem

**Status:** 🚫 not available · **Category:** Documented elsewhere, not available · [All methods](../README.md)

Highlight every object in an IFC system. Not exposed by the default webapp (app.streambim.com/webapp/default). **Available in the `taskctrl` flavour**: open `/webapp/taskctrl/#/viewer/...&forceFlavor=true`.

```ts
StreamBIM.API.highlightSystem(guid: string)  // not available
```

## Returns

`rejection`: penpal rejects with `Error: Method \`highlightSystem\` is not found.`

## What StreamBIM does

Not in the default build's methodsForWidget(). Present in the taskctrl build (rendrao bundle under /webapp/taskctrl/), which also passes \`colorCodeByGuid.colorCoding\` (the legends) to the 3D search so GUID colours render on objects.

## Errors

- `PenpalError: Method \`highlightSystem\` is not found.`

## Workaround

Find the system members with `findObjects({ key: "System Global Id", value: systemGuid })`, then `applyObjectSearch` the same query.

## Examples

#### Detect whether it exists

```js
try {
  await StreamBIM.API.highlightSystem();
  return 'available';
} catch (err) {
  return err.message;
}
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
"Method `highlightSystem` is not found."
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| expected missing | `["048mvnhWPDHefuPHQ5uMBr"]` | rejected `"Method `highlightSystem` is not found."` | 12 |
