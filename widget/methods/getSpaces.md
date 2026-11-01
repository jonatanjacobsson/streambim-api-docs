# getSpaces

**Status:** ✅ works · **Category:** Object & model info · [All methods](../README.md)

GUIDs of the IFC spaces the camera is currently inside.

```ts
StreamBIM.API.getSpaces(): Promise<string[]>
```

## Returns

`string[]`: Empty when the camera is outside all spaces (e.g. orbiting outside the building). It is not a list of all spaces: use `findObjects({ key: "@kind", value: "Space" })` for that.

## What StreamBIM does

`viewerController.getSpaceInfo()` mapped to ids.

## Errors

- `{ code: "unknown", debug }` if the space lookup fails.

## Examples

#### Which space am I in?

```js
const [space] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const outside = await StreamBIM.API.getSpaces();
if (space) await StreamBIM.API.gotoSpace(space);
return { outside, afterGotoSpace: await StreamBIM.API.getSpaces() };
```

<details open><summary>Output (verified 2026-11-01, 182 ms)</summary>

```json
{
  "outside": [],
  "afterGotoSpace": [
    "0A0ainOlD3Dg0Lq_ZFZGQI"
  ]
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `array` | 43 |
