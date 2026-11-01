# highlightObject

**Status:** ✅ works · **Category:** Visibility & highlighting · [All methods](../README.md)

Select (highlight) an object, as if the user clicked it.

```ts
StreamBIM.API.highlightObject(guid: string): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `guid` | `string` | yes | 22-char GUID. |

## Returns

`true`: Adds to the selection; previous highlights stay.

## What StreamBIM does

`selectionmanager.selectObject(guid)` and `viewerController.selectObject(guid, true)`. The object then appears in `getViewportState().highlightedObjects`.

## Errors

- `{ code: "invalid", debug: "guid must be a valid 22 characters GUID string" }`

## Examples

#### Highlight a door and read the selection back

```js
const [door] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Door', limit: 1 });
await StreamBIM.API.highlightObject(door);
const { highlightedObjects } = await StreamBIM.API.getViewportState();
await StreamBIM.API.setViewportState({ highlightedObjects: [] }); // clear it again
return { door, highlightedObjects };
```

<details open><summary>Output (verified 2026-11-01, 117 ms)</summary>

```json
{
  "door": "048mvnhWPDHefuPHQ5uMBr",
  "highlightedObjects": [
    "048mvnhWPDHefuPHQ5uMBr"
  ]
}
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `["048mvnhWPDHefuPHQ5uMBr"]` | resolved `boolean` | 6 |
| invalid GUID | `["bad"]` | rejected `{"code":"invalid","debug":"guid must be a valid 22 characters GUID string"}` | 0 |
