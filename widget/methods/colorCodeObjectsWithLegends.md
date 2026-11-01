# colorCodeObjectsWithLegends

**Status:** 🚫 not available · **Category:** Documented elsewhere, not available · [All methods](../README.md)

Colour objects with your own colours and show a legend. Not exposed by the default webapp (app.streambim.com/webapp/default). **Available in the `taskctrl` flavour**: open `/webapp/taskctrl/#/viewer/...&forceFlavor=true`.

```ts
StreamBIM.API.colorCodeObjectsWithLegends({ data, legends })  // not available
```

## Returns

`rejection`: penpal rejects with `Error: Method \`colorCodeObjectsWithLegends\` is not found.`

## What StreamBIM does

Not in the default build's methodsForWidget(). Present in the taskctrl build (rendrao bundle under /webapp/taskctrl/), which also passes \`colorCodeByGuid.colorCoding\` (the legends) to the 3D search so GUID colours render on objects.

## Errors

- `PenpalError: Method \`colorCodeObjectsWithLegends\` is not found.`

## Workaround

**Use the `taskctrl` flavour**: there it colours objects by GUID with your colours and StreamBIM draws the legend. Verified on 2026-11-01, see [the checklist guide](../guides/checklists-and-colour-by-value.md#colour-objects-by-checklist-value-taskctrl-flavour). `data` is GUID → `"rrggbb"` (`#` optional); `legends` is label → `"rrggbb"`. In the default flavour only spaces take custom colours (`colorCodeSpaces`).

## Examples

#### Detect whether it exists

```js
try {
  await StreamBIM.API.colorCodeObjectsWithLegends();
  return 'available';
} catch (err) {
  return err.message;
}
```

<details open><summary>Output (verified 2026-11-01, 6 ms)</summary>

```json
"Method `colorCodeObjectsWithLegends` is not found."
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| expected missing | `["048mvnhWPDHefuPHQ5uMBr"]` | rejected `"Method `colorCodeObjectsWithLegends` is not found."` | 8 |
