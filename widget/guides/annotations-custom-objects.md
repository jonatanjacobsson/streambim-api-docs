# Custom objects: annotations, zones and property sets

[Widget API docs](../README.md)

StreamBIM lets users and widgets add their own objects to a building. They are stored as IFC objects (`/v2/ifc-objects`) with an empty `layer` and no source `document`, so the UI calls them *user created*. There are two kinds:

- **Annotations** (`@kind: "Annotation"`): a named point. The widget API creates them with `createObject`.
- **Zones** (`@kind: "Space"`): a floor outline with a height, a name, a description and property sets. The UI creates them with **Object information → ⋯ → Add zone**. A widget creates them over REST.

Both kinds can carry **property sets** (groups) with typed values, and **attachments**. A widget can do everything the UI does through `makeApiRequest`: create, edit property sets and values, move, attach files and delete.

> These examples write to the project. They were run on the demo project used for verification (`npm run verify -- --include-writes` in `harness/`). The zone examples delete what they create. Annotations can't be deleted, see [Delete](#delete).

## What a widget can do

Verified on app.streambim.com, 2026-11-01:

| Task | How | Result |
|------|-----|--------|
| Create an annotation | `StreamBIM.API.createObject({ center, name })` | Resolves with the new GUID |
| Create a zone | `POST /v2/ifc-objects` (the same request the **Add zone** editor sends) | **200** with the full record |
| Read | `GET /v2/ifc-objects/{id}?building={buildingId}` | Full record with server-made groups |
| Edit name, property sets, values, outline | Full-record `PATCH /v2/ifc-objects/{id}?building={buildingId}` | **200** with the updated record |
| Attach a link or a file | `POST /v2/attachments` with `parent-ifc-object` (files: upload ticket → S3 `PUT` → attachment) | **200**; the S3 PUT works from the widget with `fetch` |
| Delete a zone | `DELETE /v2/ifc-objects/{id}?building={buildingId}` | **200** `{"data":null}`, then GET answers **404** |
| Delete an annotation | Same request | **200**, but the object stays (only its `Custom` group goes) |
| Find with search | `findObjects` | Found by `@kind` at once. Not found by other properties (e.g. `Name`) until the building is **reprocessed** |
| Show in 3D | n/a | A new zone was not drawn in 3D before reprocessing |

POST and PATCH answer with the record **as you sent it**. Read it back with GET to see what was stored (see [value types](#property-sets-and-value-types)).

**The UI tools and their requests.** In **Object information**, the panel's ⋯ menu has **Add zone**: draw the outline on the floor plan, pick a storey, height and offset from the floor, fill in Name, Long Name and Description, and add property sets and properties (+ New property set, + Add property). **Save** sends one `POST /v2/ifc-objects`. For a user-created object, the ⋯ menu also has **Edit** (the same editor, saved with a full-record `PATCH`), **Duplicate** (a `POST` of a copy named "<Name> Copy") and **Delete** (`DELETE`). A widget can make every one of these requests.

After **Add zone** the UI itself says: *"Zone created. You need to reprocess the model before you can search for objects within the new zone."* `getObjectInfo(id)` works at once, but it returns the viewer's cached copy. After a PATCH or DELETE it keeps showing the old record until the page reloads, so read over REST to see the current state.

## Data model

Ember model `ifc-object` (JSON:API type `ifc-objects`). Stored coordinates are metres in the building's coordinate system, z up: the same frame as every object's `bbox` and `center`. Points that the widget API hands out (`pickedObject.point`, `getCameraState().position`) use the viewer's axes instead: building `[x, y, z]` arrives as `[x, -z, y]`. A door at building `[-9.96, 7.92, 3.15]` was picked as `[-9.96, -3.15, 7.92]`.

| Field | Annotation | Zone |
|-------|------------|------|
| `id` | New 22-char IFC GUID from the backend | Same |
| `properties` | `{ "@kind": "Annotation", "Name" }` | `{ "Name", "Long Name", "@kind": "Space", "Description" }` |
| server-added properties | `Global Id`, `@Building Storey` (floor by position), `BaseType: "ifcelement"`, `uri`, `Timestamp`, … | Same, with `BaseType: "ifcspatialstructureelement"` |
| `center` | Point. `createObject` converts the widget point `[a, b, c]` to `[a, c, -b]` | `[cx, cy, (bottom + top) / 2]` |
| `boundary` | `[x, y]` | Flat outline `[x1, y1, x2, y2, …]` in plan |
| `bbox` | Degenerate box at the centre | `[minX, minY, bottom, maxX, maxY, top]` |
| `layer` | `""` (`null` on write) | Same |
| `relationships.floors` | Set by the server from the height | Set by the client. The editor uses the chosen storey |
| `groups` (property sets) | Your groups, plus server groups `Location`, `Geometry`, `Custom` | Your groups (the editor starts with `BaseQuantities:`), plus `Location` and `Custom` |

`Custom` holds Created/Updated At/By (with the user's email). `Location` holds *Floor by position*. The server recomputes both: send only your own groups when you write.

The **Add zone** editor fills `BaseQuantities:` from the outline: `GrossFloorArea` and `GrossCeilingArea` (`square_metre`) and `GrossPerimeter` (`millimetre`). The server doesn't compute them, so a widget that changes the outline should update them too.

## Helpers used below

The examples share these helpers. `save()` does what the StreamBIM UI does: it sends the whole user-editable part of the record. A partial PATCH isn't applied (the same as other `/v2` records). It also drops the server-made properties and groups, and re-types values, because GET returns every value as a string.

```js
const projectId = await StreamBIM.API.getProjectId();
const buildingId = await StreamBIM.API.getBuildingId();
const objects = '/project-' + projectId + '/api/v1/v2/ifc-objects';
const url = (id) => objects + '/' + encodeURIComponent(id) + '?building=' + buildingId;
const get = async (id) => JSON.parse(await StreamBIM.API.makeApiRequest({ url: url(id) + '&_=' + Date.now() })).data;
const exists = async (id) => { try { await get(id); return true; } catch (err) { return false; } };
const SERVER_PROPS = ['Global Id', '@Building Storey', '@Group Layer', '@Document Id', '@Building Id', 'Timestamp', 'groups', 'BaseType', 'uri'];
const SERVER_GROUPS = ['Location', 'Geometry', 'Custom'];
// One property in a property set. The server keeps the JSON type of value (see Property sets).
const prop = (key, value, measure = '', unit = '') =>
  ({ key, value, valueType: typeof value === 'number' ? 'float8' : typeof value === 'boolean' ? 'bool' : 'str', measure, unit, valueItem: '' });
const typed = (p) => p.valueType === 'float8' || p.valueType === 'int64' ? Number(p.value) : p.valueType === 'bool' ? p.value === 'true' : p.value;
// Full-record PATCH. change(attributes) edits name, groups or geometry in place.
async function save(id, change) {
  const cur = await get(id);
  const a = cur.attributes;
  const attributes = {
    layer: null,
    properties: Object.fromEntries(Object.entries(a.properties).filter(([k]) => !SERVER_PROPS.includes(k))),
    groups: a.groups.filter((g) => !SERVER_GROUPS.includes(g.label))
      .map((g) => ({ label: g.label, content: { properties: g.content.properties.map((p) => prop(p.key, typed(p), p.measure, p.unit)) } })),
    center: a.center, bbox: a.bbox, boundary: a.boundary,
  };
  change(attributes);
  const relationships = { building: cur.relationships.building, floors: cur.relationships.floors };
  return JSON.parse(await StreamBIM.API.makeApiRequest({ url: url(id), method: 'PATCH', body: { data: { id, type: 'ifc-objects', attributes, relationships } } })).data;
}
// The request the Add zone editor sends. outline is [x1, y1, x2, y2, ...] in metres.
async function createZone({ name, floorId, outline, bottom, top, groups = [] }) {
  const xs = outline.filter((v, i) => i % 2 === 0), ys = outline.filter((v, i) => i % 2 === 1);
  const bbox = [Math.min(...xs), Math.min(...ys), bottom, Math.max(...xs), Math.max(...ys), top];
  const attributes = { layer: null, properties: { Name: name, 'Long Name': '', '@kind': 'Space', Description: '' }, groups,
    boundary: outline, bbox, center: [(bbox[0] + bbox[3]) / 2, (bbox[1] + bbox[4]) / 2, (bottom + top) / 2] };
  const relationships = { building: { data: { type: 'buildings', id: String(buildingId) } }, floors: { data: [{ type: 'floors', id: String(floorId) }] } };
  return JSON.parse(await StreamBIM.API.makeApiRequest({ url: objects, method: 'POST', body: { data: { type: 'ifc-objects', attributes, relationships } } })).data;
}
const remove = async (id) => (await StreamBIM.API.makeApiRequest({ url: url(id), method: 'DELETE' })).trim();
const groupsOf = (record) => record.attributes.groups.filter((g) => g.label !== 'Custom')
  .map((g) => ({ label: g.label, values: Object.fromEntries(g.content.properties.map((p) => [p.key, p.value + ' : ' + p.valueType])) }));
```

## Create a zone

A zone needs a floor and a height range. This example borrows both from an existing room. It then draws a 2 × 2 m square around the room's centre, reads the zone back, and deletes it again.

#### Create, read and delete a zone

```js
// Uses the helpers above.
const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const [, , bottom, , , top] = room.attributes.bbox;
const zone = await createZone({
  name: 'Docs example zone',
  floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1],
  bottom, top,
  groups: [{ label: 'BaseQuantities:', content: { properties: [prop('GrossFloorArea', 4, 'area', 'square_metre'), prop('GrossPerimeter', 8000, 'length', 'millimetre')] } }],
});
const cached = await StreamBIM.API.getObjectInfo(zone.id);
const foundBySearch = {
  byName: (await StreamBIM.API.findObjects({ key: 'Name', value: 'Docs example zone', limit: 5 })).includes(zone.id),
  byKind: (await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 5000 })).includes(zone.id),
};
const deleteResponse = await remove(zone.id);
return {
  id: zone.id,
  properties: zone.attributes.properties,
  bbox: zone.attributes.bbox,
  floors: zone.relationships.floors.data.map((f) => f.id),
  groups: groupsOf(zone),
  getObjectInfoKind: cached.properties['@kind'],
  foundBySearch,
  deleteResponse,
  existsAfterDelete: await exists(zone.id),
};
```

<details open><summary>Output (verified 2026-11-01, 766 ms)</summary>

```json
{
  "id": "0jmPsCnvj6aPq4iNaYFqS3",
  "properties": {
    "@kind": "Space",
    "Description": "",
    "Long Name": "",
    "Name": "Docs example zone"
  },
  "bbox": [
    -21.312375606587533,
    14.735207810601292,
    2.5500000000000003,
    -19.312375606587533,
    16.735207810601292,
    4.95
  ],
  "floors": [
    "1000"
  ],
  "groups": [
    {
      "label": "BaseQuantities:",
      "values": {
        "GrossFloorArea": "4 : float8",
        "GrossPerimeter": "8000 : float8"
      }
    }
  ],
  "getObjectInfoKind": "Space",
  "foundBySearch": {
    "byName": false,
    "byKind": true
  },
  "deleteResponse": "{\"data\":null}",
  "existsAfterDelete": false
}
```

</details>

## Property sets and value types

A property set is a group: `{ label, content: { properties: [{ key, value, valueType, measure, unit, valueItem }] } }`. The UI's property editor offers **Decimal**, **Text**, **Integer** and **True/false** (`float8`, `str`, `int64`, `bool`), and lets you add, rename and delete properties and groups. All of it is saved with the same full-record PATCH.

**The server stores the JSON type of `value`, not `valueType`:** a number becomes `float8` (also when you ask for `int64`), a boolean becomes `bool`, and a string becomes `str`. The UI's own editor sends Decimal values as strings, so a Decimal typed in the UI is saved as `str`. Send real numbers and booleans. There is no way to store `int64`. GET returns every value as a string together with its stored `valueType`. The POST and PATCH responses echo your request, so only GET shows the stored types (compare `response` and `stored` below).

#### Add a property set, edit values, see the stored types

```js
// Uses the helpers above.
const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const zone = await createZone({
  name: 'Docs example zone (psets)', floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1], bottom: room.attributes.bbox[2], top: room.attributes.bbox[5],
  // What the UI editor sends for Decimal 4.5: a string with valueType float8.
  groups: [{ label: 'Widget_Pset', content: { properties: [{ key: 'Score', value: '4.5', valueType: 'float8', measure: '', unit: '', valueItem: '' }] } }],
});
// POST and PATCH responses echo the request: read back with GET to see what was stored.
const created = { response: groupsOf(zone), stored: groupsOf(await get(zone.id)) };
const response = await save(zone.id, (a) => {
  a.properties['Long Name'] = 'Edited by a widget';
  a.properties.Description = 'Status set from a widget';
  a.groups = [{ label: 'Widget_Pset', content: { properties: [
    prop('Status', 'Inspected'),
    prop('Score', 4.5),
    { key: 'Count', value: 7, valueType: 'int64', measure: '', unit: '', valueItem: '' },
    prop('Approved', true),
  ] } }];
});
const stored = await get(zone.id);
await remove(zone.id);
return {
  created,
  patched: { response: groupsOf(response), stored: groupsOf(stored) },
  names: [stored.attributes.properties.Name, stored.attributes.properties['Long Name']],
  existsAfterDelete: await exists(zone.id),
};
```

<details open><summary>Output (verified 2026-11-01, 742 ms)</summary>

```json
{
  "created": {
    "response": [
      {
        "label": "Widget_Pset",
        "values": {
          "Score": "4.5 : float8"
        }
      }
    ],
    "stored": [
      {
        "label": "Location",
        "values": {
          "Floor by position": "Plan 2 : "
        }
      },
      {
        "label": "Widget_Pset",
        "values": {
          "Score": "4.5 : str"
        }
      }
    ]
  },
  "patched": {
    "response": [
      {
        "label": "Widget_Pset",
        "values": {
          "Status": "Inspected : str",
          "Score": "4.5 : float8",
          "Count": "7 : int64",
          "Approved": "true : bool"
        }
      }
    ],
    "stored": [
      {
        "label": "Location",
        "values": {
          "Floor by position": "Plan 2 : "
        }
      },
      {
        "label": "Widget_Pset",
        "values": {
          "Count": "7 : float8",
          "Approved": "true : bool",
          "Status": "Inspected : str",
          "Score": "4.5 : float8"
        }
      }
    ]
  },
  "names": [
    "Docs example zone (psets)",
    "Edited by a widget"
  ],
  "existsAfterDelete": false
… (1 more lines)
```

</details>

## Move or reshape a zone

Change `boundary`, `bbox` and `center` together in one PATCH, and update `BaseQuantities:` if you keep them. To move a zone to another storey, change `relationships.floors` as well. The `save()` helper keeps the current floor.

#### Grow a zone from 2 × 2 m to 4 × 3 m

```js
// Uses the helpers above.
const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const [, , bottom, , , top] = room.attributes.bbox;
const zone = await createZone({ name: 'Docs example zone (move)', floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1], bottom, top });
const [x0, y0, x1, y1] = [cx - 2, cy - 1.5, cx + 2, cy + 1.5];
const moved = await save(zone.id, (a) => {
  a.boundary = [x0, y1, x0, y0, x1, y0, x1, y1];
  a.bbox = [x0, y0, bottom, x1, y1, top];
  a.center = [cx, cy, (bottom + top) / 2];
  a.groups = [{ label: 'BaseQuantities:', content: { properties: [prop('GrossFloorArea', (x1 - x0) * (y1 - y0), 'area', 'square_metre'), prop('GrossPerimeter', 2000 * ((x1 - x0) + (y1 - y0)), 'length', 'millimetre')] } }];
});
await remove(zone.id);
return { before: zone.attributes.bbox, after: moved.attributes.bbox, quantities: groupsOf(moved).find((g) => g.label === 'BaseQuantities:').values };
```

<details open><summary>Output (verified 2026-11-01, 605 ms)</summary>

```json
{
  "before": [
    -21.312375606587533,
    14.735207810601292,
    2.5500000000000003,
    -19.312375606587533,
    16.735207810601292,
    4.95
  ],
  "after": [
    -22.312375606587533,
    14.235207810601292,
    2.5500000000000003,
    -18.312375606587533,
    17.235207810601292,
    4.95
  ],
  "quantities": {
    "GrossFloorArea": "12 : float8",
    "GrossPerimeter": "14000 : float8"
  }
}
```

</details>

## Attachments

Custom objects can carry attachments, the same records topics use, with `parent-ifc-object`. See [attachments.md](../../api/attachments.md) for every field. From a widget:

- **Link:** `POST /v2/attachments` with `category: "url"` and a `url`.
- **File:** `POST /v2/upload-tickets` with `filename` and `file-size` → `PUT` the bytes to `s3presignedurl` with the widget's own `fetch` (S3 allows it) → `POST /v2/attachments` with the `upload-ticket`. A file sent with `category: "file"` was stored as `topic-image`.
- **Project document:** the UI's *add documents to object* sends `category: "document"` with a `linked-document` relationship.

All of these POSTs answered 200 with the record. `DELETE /v2/attachments/{id}` removes an attachment.

#### Attach a link and a file to a zone, list, clean up

```js
// Uses the helpers above.
const v2 = '/project-' + projectId + '/api/v1/v2/';
const [roomId] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Space', limit: 1 });
const room = await get(roomId);
const [cx, cy] = room.attributes.center;
const zone = await createZone({ name: 'Docs example zone (attachments)', floorId: room.relationships.floors.data[0].id,
  outline: [cx - 1, cy + 1, cx - 1, cy - 1, cx + 1, cy - 1, cx + 1, cy + 1], bottom: room.attributes.bbox[2], top: room.attributes.bbox[5] });
const parent = { 'parent-ifc-object': { data: { type: 'ifc-object', id: zone.id } } };
const post = async (path, data) => JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + path, method: 'POST', body: { data } })).data;

const link = await post('attachments', { type: 'attachments', attributes: { category: 'url', url: 'https://github.com/jonatanjacobsson/streambim-api-docs' }, relationships: parent });

const file = new Blob(['Written by a StreamBIM widget'], { type: 'text/plain' });
const ticket = await post('upload-tickets', { type: 'attachments', attributes: { filename: 'widget-note.txt', 'file-size': file.size } });
const s3 = await fetch(ticket.attributes.s3presignedurl, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: file });
const uploaded = await post('attachments', { type: 'attachments', attributes: { category: 'file' },
  relationships: { ...parent, 'upload-ticket': { data: { type: 'upload-tickets', id: ticket.id } } } });

const list = JSON.parse(await StreamBIM.API.makeApiRequest({ url: v2 + 'attachments?filter[object]=' + zone.id + '&filter[building]=' + buildingId })).data;
for (const a of list) await StreamBIM.API.makeApiRequest({ url: v2 + 'attachments/' + a.id, method: 'DELETE' });
await remove(zone.id);
return {
  s3Status: s3.status,
  attached: list.map((a) => ({ category: a.attributes.category, filename: a.attributes.filename, filesize: a.attributes.filesize, url: a.attributes.url })),
  linkId: link.id, fileId: uploaded.id,
};
```

<details open><summary>Output (verified 2026-11-01, 1069 ms)</summary>

```json
{
  "s3Status": 200,
  "attached": [
    {
      "category": "url",
      "filename": "",
      "filesize": 0,
      "url": "https://github.com/jonatanjacobsson/streambim-api-docs"
    },
    {
      "category": "topic-image",
      "filename": "widget-note.txt",
      "filesize": 29,
      "url": ""
    }
  ],
  "linkId": "24",
  "fileId": "25"
}
```

</details>

## Create an annotation

`createObject({ center, name })` builds the record in the StreamBIM page and saves it with the same `POST /v2/ifc-objects` (`properties: { Name, "@kind": "Annotation" }`, `groups: []`, no floor). It resolves with the new id. The centre is converted from `[a, b, c]` to `[a, c, -b]`, which turns a viewer point into building coordinates. So pass a `pickedObject.point` or the camera position as is. To place an annotation at building coordinates `[x, y, z]` (e.g. a zone's centre), pass `[x, -z, y]`. The server picks the floor from the resulting height, and a point below every floor makes later writes fail with *"floors get at height: no rows in result set"*.

You can then edit an annotation like a zone: rename it, give it property sets, attach files. This example leaves its annotation in the project, because annotations can't be deleted.

#### Create an annotation at the camera, then add a property set

```js
// Uses the helpers above.
const { position } = await StreamBIM.API.getCameraState();
const id = await StreamBIM.API.createObject({ center: position, name: 'Docs example annotation' });
const created = await get(id);
const edited = await save(id, (a) => {
  a.properties.Description = 'Placed by a widget';
  a.groups = [{ label: 'Widget_Pset', content: { properties: [prop('Status', 'Open'), prop('Priority', 2)] } }];
});
return {
  id,
  widgetPosition: position,
  storedCenter: created.attributes.center,
  properties: { Name: edited.attributes.properties.Name, Description: edited.attributes.properties.Description, kind: edited.attributes.properties['@kind'] },
  floors: edited.relationships.floors.data.map((f) => f.id),
  groups: groupsOf(edited),
};
```

<details open><summary>Output (verified 2026-11-01, 429 ms)</summary>

```json
{
  "id": "0qACYXK6jEdu9uh6BRIUT7",
  "widgetPosition": [
    -5.311,
    -6.468,
    17.349
  ],
  "storedCenter": [
    -5.311,
    17.349,
    6.468
  ],
  "properties": {
    "Name": "Docs example annotation",
    "Description": "Placed by a widget",
    "kind": "Annotation"
  },
  "floors": [
    "1012"
  ],
  "groups": [
    {
      "label": "Widget_Pset",
      "values": {
        "Status": "Open : str",
        "Priority": "2 : float8"
      }
    }
  ]
}
```

</details>

## Read the full record over REST

`getObjectInfo` returns the viewer's cached copy. The REST record has the current server-side groups and the attachments relationship.

#### GET /v2/ifc-objects/{id}

```js
const projectId = await StreamBIM.API.getProjectId();
const buildingId = await StreamBIM.API.getBuildingId();
const [id] = await StreamBIM.API.findObjects({ key: '@kind', value: 'Annotation', limit: 1 });
const { data } = JSON.parse(await StreamBIM.API.makeApiRequest({ url: '/project-' + projectId + '/api/v1/v2/ifc-objects/' + id + '?building=' + buildingId }));
return {
  id: data.id,
  properties: data.attributes.properties,
  groups: data.attributes.groups.map((g) => ({ label: g.label, keys: g.content.properties.map((p) => p.key) })),
  relationships: Object.fromEntries(Object.entries(data.relationships).map(([k, v]) => [k, v.data])),
};
```

<details open><summary>Output (verified 2026-11-01, 145 ms)</summary>

```json
{
  "id": "09kOeA2yv9swf1lMzXvRd7",
  "properties": {
    "@kind": "Annotation",
    "Name": "Model Lines:2588784",
    "Long Name": "",
    "Description": "",
    "uri": "",
    "Global Id": "09kOeA2yv9swf1lMzXvRd7",
    "@Group Layer": "GRNSAKSSTIGEN24",
    "@Document Id": 1000,
    "@Building Id": 0,
    "Timestamp": "2025-08-18 08:00:48 +0000 UTC",
    "groups": null,
    "BaseType": "ifcelement"
  },
  "groups": [
    {
      "label": "_Information",
      "keys": [
        "Höjd Bröstning",
        "Längd"
      ]
    },
    {
      "label": "Location",
      "keys": [
        "Global Y",
        "Global Z",
        "Global X"
      ]
    },
    {
      "label": "BIP",
      "keys": [
        "StatusConstruction",
        "Length"
      ]
    }
  ],
  "relationships": {
    "attachments": [],
    "building": {
      "id": "1000",
      "type": "buildings"
    },
    "classes": [],
    "document": {
      "id": "1000",
      "type": "documents"
    },
    "duplicates": [],
    "floors": [],
    "spaces": []
  }
}
```

</details>

## List annotations

Indexed annotations are searchable by `@kind`. Model files can also contain IFC annotations (e.g. Revit model lines exported as `IfcAnnotation`); tell them apart by `layer` (non-empty for model objects).

#### User-made vs model annotations

```js
const ids = await StreamBIM.API.findObjects({ key: '@kind', value: 'Annotation', limit: 100 });
const rows = [];
for (const id of ids) {
  const info = await StreamBIM.API.getObjectInfo(id);
  rows.push({ id, name: info.properties.Name, userCreated: !info.layer });
}
return rows;
```

<details open><summary>Output (verified 2026-11-01, 90 ms)</summary>

```json
[
  {
    "id": "09kOeA2yv9swf1lMzXvRd7",
    "name": "Model Lines:2588784",
    "userCreated": false
  },
  {
    "id": "0cNP0TnuH3tRVcgHb$44hd",
    "name": "Widget test annotation",
    "userCreated": true
  },
  {
    "id": "0iuKUCTUHE5v8ERBpXPzpM",
    "name": "Agent bridge test annotation",
    "userCreated": true
  },
  {
    "id": "0j_E2DTQz3DQRfP2MO4LOo",
    "name": "Docs example annotation",
    "userCreated": true
  },
  {
    "id": "0qACYXK6jEdu9uh6BRIUT7",
    "name": "Docs example annotation",
    "userCreated": true
  },
  {
    "id": "1Op$uFGPv2Kxe2w1_moHPI",
    "name": "Model Lines:2704768",
    "userCreated": false
  },
  {
    "id": "1RdkULdn961P83Qb7xhbwC",
    "name": "Model Lines:2512953",
    "userCreated": false
  },
  {
    "id": "2U2960tA58aff4lecI2G0y",
    "name": "Custom object",
    "userCreated": true
  },
  {
    "id": "2b798tP0HEpA23JeWb5sNX",
    "name": "Custom object",
    "userCreated": true
  },
  {
    "id": "2dgdFtTN1DdhKW$xJjtGva",
    "name": "Docs example (deleted)",
    "userCreated": true
  },
  {
    "id": "2g4ORfTSzCfw7U4moAc$Di",
    "name": "Docs example annotation",
    "userCreated": true
  },
  {
    "id": "2mmJy7vBf5sPM0D6ibTHHS",
    "name": "Delete test annotation",
    "userCreated": true
… (17 more lines)
```

</details>

## Delete

There is no widget method. The StreamBIM UI (**Object information → ⋯ → Delete**) calls Ember Data `destroyRecord()`, which sends `DELETE /project-{id}/api/v1/v2/ifc-objects/{id}?building={buildingId}`, and then reloads the floors' zone outlines. A widget can send the same request.

**Observed (2026-11-01):**

- **Zones** are deleted. The DELETE answers `{"data":null}`, and the next GET answers 404 *"no such object exists"*.
- **Annotations are not.** The DELETE answers `{"data":null}` as well, but only the `Custom` group (Created/Updated At/By) is removed. The object is still served by GET and found by search, with `jobdeleted: 0`, also after a second DELETE and hours later. To retire an annotation, rename it or mark it with a property instead, and filter those out in your widget.
- If the object's height is below every floor, the DELETE fails with 500 *"delete space geojson cache … floors get at height: sql: no rows in result set"*.
- `getObjectInfo` keeps returning the deleted object until the page reloads.

#### Delete an annotation, then check that it is still there

```js
// Uses the helpers above.
const { position } = await StreamBIM.API.getCameraState();
const id = await StreamBIM.API.createObject({ center: position, name: 'Docs example (deleted)' });
const groupsBefore = (await get(id)).attributes.groups.map((g) => g.label);
const deleteResponse = await remove(id);
let groupsAfter;
try { groupsAfter = (await get(id)).attributes.groups.map((g) => g.label); } catch (err) { groupsAfter = 'not found'; }
return { id, groupsBefore, deleteResponse, groupsAfterDelete: groupsAfter };
```

<details open><summary>Output (verified 2026-11-01, 353 ms)</summary>

```json
{
  "id": "2bHrqaPGH6HQC24btLqYFs",
  "groupsBefore": [
    "Location",
    "Geometry",
    "Custom"
  ],
  "deleteResponse": "{\"data\":null}",
  "groupsAfterDelete": [
    "Location",
    "Geometry"
  ]
}
```

</details>

## Project property catalogue (read only)

`GET /v2/ifc-properties?buildingId={buildingId}` lists every property set and property in the building: `pset`, `name`, `datatype`, `basetype`, how many objects use it, and admin flags (`promote`, `hide`, `optimizeForSearch`, `ignoreForHistory`). A widget can use it to offer existing pset and property names. The UI changes the flags with `POST /ifc-properties?buildingId=` in project admin. That's project configuration, so this guide doesn't write to it.

#### Property sets in this building

```js
const projectId = await StreamBIM.API.getProjectId();
const buildingId = await StreamBIM.API.getBuildingId();
const { data } = JSON.parse(await StreamBIM.API.makeApiRequest({ url: '/project-' + projectId + '/api/v1/v2/ifc-properties?buildingId=' + buildingId }));
const psets = {};
for (const p of data) psets[p.attributes.pset] = (psets[p.attributes.pset] || 0) + 1;
const [first] = data;
return { properties: data.length, psets: Object.keys(psets).length, largest: Object.entries(psets).sort((a, b) => b[1] - a[1]).slice(0, 5), sample: { pset: first.attributes.pset, name: first.attributes.name, datatype: first.attributes.datatype, basetype: first.attributes.basetype, objectsWithProperty: first.attributes.objectsWithProperty } };
```

<details open><summary>Output (verified 2026-11-01, 275 ms)</summary>

```json
{
  "properties": 572,
  "psets": 68,
  "largest": [
    [
      "BIP",
      206
    ],
    [
      "Material",
      60
    ],
    [
      "Other",
      38
    ],
    [
      "_Information",
      22
    ],
    [
      "BaseQuantities",
      21
    ]
  ],
  "sample": {
    "pset": "Pset_CoveringCommon",
    "name": "Reference",
    "datatype": "str",
    "basetype": "ifcelement",
    "objectsWithProperty": 8
  }
}
```

</details>

## Ideas for widgets

- **Work zones:** draw temporary areas (safety zones, deliveries, takt areas) from a widget form, with dates and a responsible person in a property set, and delete them when the work is done.
- **Status per room:** keep inspection or cleaning status in a zone's property set and colour the zones with `colorCodeSpaces` once they are indexed.
- **Point notes:** drop an annotation at the clicked point (`pickedObject` → `createObject`), then attach a photo or a link to a document.
- **Import:** create zones from a CSV or GIS outline, with `BaseQuantities:` computed in the widget.
- **Data entry:** use a zone's property sets as a small form backed by StreamBIM, with no extra server.

Plan for the limits above: new objects are found by `@kind` but not by their properties, and aren't drawn in 3D, until the building is reprocessed. Annotations can't be removed. Keep your own list of the GUIDs you create (e.g. in a property such as `Source: my-widget`, or in your widget's storage).
