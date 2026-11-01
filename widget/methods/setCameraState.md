# setCameraState

**Status:** ✅ works · **Category:** Camera & viewport · [All methods](../README.md)

Move the camera to a saved position and orientation.

```ts
StreamBIM.API.setCameraState(state: { position: [x, y, z], quaternion: [x, y, z, w] }): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `state` | `object` | yes | `position`: array of exactly 3 numbers. `quaternion`: array of exactly 4 numbers. Other keys are stored too but unused. |

## Returns

`true`: Resolves immediately after the camera is set (no animation).

## What StreamBIM does

Validates both arrays, sets `viewerController.cameraState`, then `sync3DState()`.

## Errors

- `{ code: "invalid", debug: "state must be of type object" }`
- `{ code: "invalid", debug: "state.position must be an array of 3 floats" }`
- `{ code: "invalid", debug: "state.quaternion must be an array of 4 floats" }`

## Examples

#### Round-trip the current view

```js
const cam = await StreamBIM.API.getCameraState();
return await StreamBIM.API.setCameraState(cam);
```

<details open><summary>Output (verified 2026-11-01, 9 ms)</summary>

```json
true
```

</details>

#### Validation error

```js
try {
  await StreamBIM.API.setCameraState({ position: [0, 0] });
} catch (err) {
  return err; // { code, debug }
}
```

<details open><summary>Output (verified 2026-11-01, 8 ms)</summary>

```json
{
  "code": "invalid",
  "debug": "state.position must be an array of 3 floats"
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["[circular]"]` | resolved `boolean` | 1 |
| invalid state | `[{"position":[0,0]}]` | rejected `{"code":"invalid","debug":"state.position must be an array of 3 floats"}` | 3 |
| restore camera | `["[circular]"]` | resolved `boolean` | 4 |
