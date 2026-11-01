# applyViewpoint

**Status:** 🚫 not available · **Category:** Documented elsewhere, not available · [All methods](../README.md)

Apply a saved (BCF) viewpoint. Not exposed by the default webapp (app.streambim.com/webapp/default). **Available in the `taskctrl` flavour**: open `/webapp/taskctrl/#/viewer/...&forceFlavor=true`.

```ts
StreamBIM.API.applyViewpoint(viewpoint)  // not available
```

## Returns

`rejection`: penpal rejects with `Error: Method \`applyViewpoint\` is not found.`

## What StreamBIM does

Not in the default build's methodsForWidget(). Present in the taskctrl build (rendrao bundle under /webapp/taskctrl/), which also passes \`colorCodeByGuid.colorCoding\` (the legends) to the 3D search so GUID colours render on objects.

## Errors

- `PenpalError: Method \`applyViewpoint\` is not found.`

## Workaround

Store `getViewportState()` and restore it with `setViewportState()`.

## Examples

#### Detect whether it exists

```js
try {
  await StreamBIM.API.applyViewpoint();
  return 'available';
} catch (err) {
  return err.message;
}
```

<details open><summary>Output (verified 2026-11-01, 0 ms)</summary>

```json
"Method `applyViewpoint` is not found."
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| expected missing | `["048mvnhWPDHefuPHQ5uMBr"]` | rejected `"Method `applyViewpoint` is not found."` | 1 |
