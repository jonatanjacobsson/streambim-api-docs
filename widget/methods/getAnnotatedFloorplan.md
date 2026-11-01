# getAnnotatedFloorplan

**Status:** ✅ works · **Category:** Screenshots, maps & floorplans · [All methods](../README.md)

URL of the floor plan for a 3D point, with a marker at that point.

```ts
StreamBIM.API.getAnnotatedFloorplan(position: [x, y, z]): Promise<string>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `position` | `[number, number, number]` | yes | World point, e.g. `pickedObject.point` or `getCameraState().position`. The floor is picked from this point. |

## Returns

`string`: Absolute URL to `/project-{id}/api/v1/annotated-files?fileId=…&markerX=…&markerY=…&microtoken=…`. The microtoken authorises the download without headers, so it works in `<img>`/`fetch`/new tab. (The old docs say data URL or blob URL; it is a plain https URL.)

## What StreamBIM does

Finds the floor and its plan alignment for the point, normalises the marker position, and returns `storeservice.microtokenUrl(fullUrl)`.

## Errors

- Throws (rejects) if no floor plan is aligned for that floor.

## Examples

#### Floor plan at the camera position

```js
const { position } = await StreamBIM.API.getCameraState();
const url = await StreamBIM.API.getAnnotatedFloorplan(position);
const res = await fetch(url);
return { url: url.replace(/microtoken=[^&]+/, 'microtoken=…'), status: res.status, contentType: res.headers.get('content-type') };
```

<details open><summary>Output (verified 2026-11-01, 1304 ms)</summary>

```json
{
  "url": "https://app.streambim.com/project-15974/api/v1/annotated-files?fileId=floorplans-1017&markerX=-45.914234375&markerY=-20.840810546875&microtoken=…",
  "status": 200,
  "contentType": "application/pdf"
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["[circular]"]` | resolved `string` | 45 |
