# setCameraPosition

**Status:** ⚠️ works, promise never resolves · **Category:** Camera & viewport · [All methods](../README.md)

Move the camera to a point, keeping its orientation.

```ts
StreamBIM.API.setCameraPosition(position: [x, y, z]): Promise<never>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `position` | `[number, number, number]` | yes | World-space point in metres. |

## Returns

`never`: The camera moves, but the promise **never resolves** on success. Do not `await` it; fire and forget, or use `setCameraState` instead.

## What StreamBIM does

Sets `viewerController.cameraState.position` and syncs, then `return true` from the executor without calling `resolve`. Invalid input does reject.

## Errors

- `{ code: "invalid", debug: "position must be an array of 3 floats" }` (this rejection does arrive).

## Examples

#### Move without awaiting

```js
const { position } = await StreamBIM.API.getCameraState();
StreamBIM.API.setCameraPosition([position[0], position[1], position[2] + 5]); // no await: it never resolves
await new Promise((r) => setTimeout(r, 300));
const after = await StreamBIM.API.getCameraState();
await StreamBIM.API.setCameraState({ ...after, position }); // put it back
return { before: position[2], after: after.position[2] };
```

<details open><summary>Output (verified 2026-11-01, 317 ms)</summary>

```json
{
  "before": 10.097361940201292,
  "after": 15.097361940201292
}
```

</details>

#### Equivalent that resolves

```js
const cam = await StreamBIM.API.getCameraState();
const moved = { ...cam, position: [cam.position[0], cam.position[1], cam.position[2] + 5] };
await StreamBIM.API.setCameraState(moved);
return await StreamBIM.API.setCameraState(cam);
```

<details open><summary>Output (verified 2026-11-01, 8 ms)</summary>

```json
true
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["[circular]"]` | **never settled** | 6008 |
| invalid position | `[[1,2]]` | rejected `{"code":"invalid","debug":"position must be an array of 3 floats"}` | 1 |
