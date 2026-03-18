# IFC Searches API

Server-side IFC model search and export endpoints. These endpoints allow querying IFC objects by properties, types, and spatial relationships, and exporting results as structured JSON.

**Base URL:** `https://{environment}.streambim.com`

**Authentication:** `Authorization: Bearer {idToken}`

**Content-Type:** `application/json`

> **Note:** These endpoints are available under two URL prefixes:
>
> - **Widget path:** `/pgw/project-{PROJECT_ID}/api/v1/` -- used by `StreamBIM.API.makeApiRequest()` from within embedded widgets.
> - **Direct API path:** `/project-{PROJECT_ID}/api/v1/` -- used by external integrations (scripts, automation tools, etc.) with a Bearer token.
>
> Both paths are functionally identical. Use the direct path for server-to-server integrations.

---

## Endpoints

### Create IFC Search

**`POST /project-{PROJECT_ID}/api/v1/ifc-searches`**

Also available at: `POST /pgw/project-{PROJECT_ID}/api/v1/ifc-searches`

Creates a search against the IFC model and returns a `searchId` that can be used to export results.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `rules` | `Rule[][]` | Nested array of search rules. Outer array = OR, inner array = AND |

**Rule fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | string | Yes | Building ID to search within (e.g. `"1000"`) |
| `propKey` | string | Yes | Property key to match. Use `@kind` for IFC type filtering, `GUID` for direct GUID lookup, or `checklistValue` for checklist group key resolution |
| `propValue` | string | Yes | Value to match against |
| `psetName` | string | No | IFC Property Set name (e.g. `"BaseQuantities"`, `"BUS 2 PARAMETERE"`) |
| `operator` | string | No | Comparison operator. Defaults to `=` |
| `checklistId` | string | No | Checklist ID. Required when `propKey` is `checklistValue` |

**Supported operators:**

| Operator | Description |
|----------|-------------|
| `=` | Exact match (default) |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `startsWith` | String prefix match |

**Response (200):**

```json
{
  "searchId": "abc123-def456"
}
```

**Example -- find all spaces:**

```javascript
const res = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-3464/api/v1/ifc-searches',
  method: 'POST',
  body: {
    rules: [[{ buildingId: '1000', propKey: '@kind', propValue: 'Space' }]]
  }
});
const { searchId } = JSON.parse(res);
```

**Example -- find all systems:**

```javascript
const res = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-3464/api/v1/ifc-searches',
  method: 'POST',
  body: {
    rules: [[{ buildingId: '1000', propKey: '@kind', propValue: 'System' }]]
  }
});
```

**Example -- find objects with specific property values (OR logic):**

```javascript
// Find objects whose TFM code starts with "SF" OR starts with "ST"
const rules = ['SF', 'ST'].map(code => ([{
  buildingId: '1000',
  operator: 'startsWith',
  propKey: 'BUS2_TFM',
  propValue: code,
  psetName: 'BUS 2 PARAMETERE'
}]));

const res = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-3464/api/v1/ifc-searches',
  method: 'POST',
  body: { rules }
});
```

**Example -- find objects with height > 2000 (AND logic):**

```javascript
const res = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-3464/api/v1/ifc-searches',
  method: 'POST',
  body: {
    rules: [[{
      buildingId: '1000',
      psetName: 'BaseQuantities',
      propKey: 'Height',
      propValue: '2000',
      operator: '>'
    }]]
  }
});
```

---

### Export IFC Search Results as JSON

**`GET /project-{PROJECT_ID}/api/v1/ifc-searches/export/json`**

Also available at: `GET /pgw/project-{PROJECT_ID}/api/v1/ifc-searches/export/json`

Exports the results of a previously created IFC search as JSON. Use this to retrieve structured object data for processing.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `searchId` | string | Yes | Search ID returned from the create search endpoint |
| `fieldNames` | string | Yes | Base64-encoded pipe-separated field names to include in results |
| `fieldUnion` | boolean | No | When `true`, returns the union of all fields across result objects |
| `jobFields` | boolean | No | Whether to include job-specific fields (default: `true`) |
| `fieldLimit` | number | No | Max number of field values per object (0 = unlimited) |
| `page[limit]` | number | No | Maximum results to return |
| `page[skip]` | number | No | Number of results to skip (for pagination) |
| `sortField` | string | No | Base64-encoded field name to sort by |
| `sortDescending` | boolean | No | Sort direction (`true` for descending, `false` for ascending) |
| `fromJob` | string | No | Filter results from a specific converter job |
| `toJob` | string | No | Filter results up to a specific converter job |
| `queue` | string | No | Queue name filter (e.g. `"powerBI"`) |

**Field Names Encoding:**

Field names are pipe (`|`) separated and then Base64-encoded. Unicode-safe encoding:

```javascript
function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    function(match, p1) {
      return String.fromCharCode('0x' + p1);
    }
  ));
}

const fieldNames = b64EncodeUnicode('GUID|Name|Long Name|Description');
```

**Common field names:**

| Field Name | Description |
|------------|-------------|
| `GUID` | IFC Global ID |
| `Name` | Object name |
| `Long Name` | Extended name |
| `Description` | Object description |
| `System Global Id` | GUID(s) of associated system(s) |
| `Space Global Id` | GUID(s) of containing space(s) |
| `Type Object Global Id` | GUID of the IFC type object |
| `Location~Floor by position` | Floor determined by object position |
| `{psetName}~{propKey}` | Custom property from a named property set |

**Response (200):**

```json
{
  "data": [
    {
      "GUID": "01WdkzDc55oA5oPFwqUbmR",
      "Name": "Room 101",
      "Long Name": "Meeting Room A",
      "Description": "Ground floor meeting room",
      "Space Global Id": "...",
      "Location~Floor by position": "Floor 1"
    },
    {
      "GUID": "028y6nXsvDv8AOsMQjaEZR",
      "Name": "Room 102",
      "Long Name": "Office B",
      "Description": "",
      "Space Global Id": "...",
      "Location~Floor by position": "Floor 1"
    }
  ]
}
```

**Example -- export spaces with location info:**

```javascript
const fieldNames = b64EncodeUnicode(
  'GUID|Name|Long Name|Description|Space Global Id|Location~Floor by position'
);

const res = await StreamBIM.API.makeApiRequest({
  url: `/pgw/project-3464/api/v1/ifc-searches/export/json` +
       `?searchId=${searchId}` +
       `&fieldUnion=true` +
       `&jobFields=false` +
       `&fieldLimit=0` +
       `&fieldNames=${fieldNames}` +
       `&page[limit]=1000&page[skip]=0`
});
const spaces = JSON.parse(res).data;
```

**Example -- export objects with custom property set fields:**

```javascript
const fieldNames = b64EncodeUnicode([
  'GUID',
  'Name',
  'System Global Id',
  'Space Global Id',
  'BUS 2 PARAMETERE~BUS2_TFM'
].join('|'));

const res = await StreamBIM.API.makeApiRequest({
  url: `/pgw/project-3464/api/v1/ifc-searches/export/json` +
       `?searchId=${searchId}` +
       `&fieldUnion=true` +
       `&fieldLimit=0` +
       `&fieldNames=${fieldNames}` +
       `&page[limit]=1000&page[skip]=0`
});
const objects = JSON.parse(res).data;
```

---

## Common Patterns

### Get all spaces with metadata

```javascript
// 1. Create search for spaces
const res1 = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-3464/api/v1/ifc-searches',
  method: 'POST',
  body: {
    rules: [[{ buildingId: '1000', propKey: '@kind', propValue: 'Space' }]]
  }
});
const { searchId } = JSON.parse(res1);

// 2. Export with desired fields
const fieldNames = b64EncodeUnicode(
  'GUID|Name|Long Name|Description|Space Global Id|Location~Floor by position'
);
const res2 = await StreamBIM.API.makeApiRequest({
  url: `/pgw/project-3464/api/v1/ifc-searches/export/json?searchId=${searchId}&fieldUnion=true&jobFields=false&fieldLimit=0&fieldNames=${fieldNames}&page[limit]=1000&page[skip]=0`
});
const spaces = JSON.parse(res2).data;
```

### Get all systems in a building

```javascript
const res1 = await StreamBIM.API.makeApiRequest({
  url: '/pgw/project-3464/api/v1/ifc-searches',
  method: 'POST',
  body: {
    rules: [[{ buildingId: '1000', propKey: '@kind', propValue: 'System' }]]
  }
});
const { searchId } = JSON.parse(res1);

const fieldNames = b64EncodeUnicode('GUID|Name');
const res2 = await StreamBIM.API.makeApiRequest({
  url: `/pgw/project-3464/api/v1/ifc-searches/export/json?searchId=${searchId}&fieldUnion=true&jobFields=false&fieldLimit=0&fieldNames=${fieldNames}&page[limit]=1000&page[skip]=0`
});
const systems = JSON.parse(res2).data;
```

### Map spaces to ventilation systems

```javascript
// 1. Get all spaces
const spaces = await getSpaces();
const spaceNameToSpace = {};
spaces.forEach(space => {
  spaceNameToSpace[space['Name'] + ' ' + space['Long Name']] = space;
});

// 2. Find ventilation components by TFM code
const rules = ['SF', 'ST'].map(code => ([{
  buildingId: '1000',
  operator: 'startsWith',
  propKey: 'BUS2_TFM',
  propValue: code,
  psetName: 'BUS 2 PARAMETERE'
}]));
// ... create search and export ...

// 3. Map each component's space to its system
components.forEach(component => {
  const spaceNames = component['Space Global Id'].split(', ');
  const matchedSpaces = spaceNames
    .map(name => spaceNameToSpace[name])
    .filter(Boolean);
  if (matchedSpaces[0]?.GUID) {
    systemForSpace[matchedSpaces[0].GUID] = component['System Global Id'].split(', ')[0];
  }
});

// 4. Color-code spaces by system
const data = {};
const legends = {};
Object.entries(systemForSpace).forEach(([spaceGuid, systemName]) => {
  const color = randomColor();
  legends[systemName] = color;
  data[spaceGuid] = color;
});
await StreamBIM.API.colorCodeSpacesWithLegends({ data, legends });
```

---

## IFC @kind Values

The special `@kind` property key filters by IFC entity type. Common values:

| Value | IFC Type |
|-------|----------|
| `Space` | IfcSpace -- rooms, zones |
| `Door` | IfcDoor |
| `Wall` | IfcWall |
| `Window` | IfcWindow |
| `System` | IfcSystem -- MEP systems |
| `Slab` | IfcSlab -- floors, roofs |

---

---

## IFC Queries

### Create IFC Query

**`POST /project-{PROJECT_ID}/api/v1/v2/ifc-queries`**

Creates an IFC query using the JSON:API format. This is a higher-level query interface compared to `ifc-searches`.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Request Body:** JSON:API formatted query object.

**Response:** `200 OK` -- Returns query results in JSON:API format.

---

## IFC Objects

### Get IFC Object

**`GET /project-{PROJECT_ID}/api/v1/v2/ifc-objects/{objectId}`**

Returns detailed information about a single IFC object, including its properties, relationships, and spatial context.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |
| `objectId` | string | The IFC object ID |

**Response** `200 OK`

```json
{
    "data": {
        "id": "12345",
        "type": "ifc-objects",
        "attributes": {
            "name": "Room 101",
            "kind": "Space",
            "guid": "01WdkzDc55oA5oPFwqUbmR",
            "properties": { ... }
        },
        "relationships": { ... }
    }
}
```

**Example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/v2/ifc-objects/12345"
```

---

### Get IFC Object Reference Sets

**`GET /project-{PROJECT_ID}/api/v1/v2/ifc-object-refs-sets`**

Returns IFC object references, optionally filtered by a search ID from a previously created IFC search. Each result's `id` is an IFC GUID that can be used to match objects in external systems (e.g. Revit's `IfcGUID` parameter).

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `searchId` | string | No | Search ID returned from `POST /project-{PROJECT_ID}/api/v1/ifc-searches`. Filters results to objects matching the search |
| `page[limit]` | number | No | Maximum number of results to return (default: all) |
| `page[skip]` | number | No | Number of results to skip |

**Response** `200 OK`

```json
{
    "data": [
        {
            "id": "01WdkzDc55oA5oPFwqUbmR",
            "type": "ifc-object-refs-sets"
        },
        {
            "id": "028y6nXsvDv8AOsMQjaEZR",
            "type": "ifc-object-refs-sets"
        }
    ]
}
```

Each item's `id` is an IFC GUID matching the object's Global ID in the IFC model.

**Example -- get all matching objects for a search**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/v2/ifc-object-refs-sets?searchId=abc123-def456&page[limit]=500"
```

**Example -- resolve checklist group key to IFC GUIDs**

This pattern is used when working with grouped [checklists](checklists.md):

```bash
# 1. Create a search for a checklist group key
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "rules": [[{
      "propKey": "checklistValue",
      "propValue": "Group A",
      "buildingId": "1000",
      "checklistId": "1004"
    }]]
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/ifc-searches"

# 2. Use the returned searchId to get matching IFC GUIDs
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/v2/ifc-object-refs-sets?searchId={searchId}&page[limit]=10000"
```

---

### Export IFC Search Results as IFC File

**`GET /project-{PROJECT_ID}/api/v1/ifc-searches/export/ifc`**

Also available at: `GET /pgw/project-{PROJECT_ID}/api/v1/ifc-searches/export/ifc`

Exports the results of a previously created IFC search as a downloadable IFC file. Returns a binary blob (`Export.ifc`). Requires a microtoken for authentication (obtained from `GET /microtoken`).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `searchId` | string | Yes* | Search ID returned from the create search endpoint |
| `objectId` | string | Yes* | Single IFC object ID to export (alternative to `searchId`) |
| `buildingId` | string | Conditional | Building ID. Required when using `objectId` |

*Provide either `searchId` (for search-based export) or `objectId` + `buildingId` (for single-object export).

**Response:** Binary IFC file (`application/octet-stream`)

**Example -- export search results as IFC:**

```bash
MICROTOKEN=$(curl -s -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/microtoken" | jq -r '.microtoken')

curl -o Export.ifc \
  "https://{environment}.streambim.com/project-42/api/v1/ifc-searches/export/ifc?searchId={searchId}&microtoken=$MICROTOKEN"
```

**Example -- export single object as IFC:**

```bash
curl -o Export.ifc \
  "https://{environment}.streambim.com/project-42/api/v1/ifc-searches/export/ifc?objectId=12345&buildingId=1000&microtoken=$MICROTOKEN"
```

---

## Freetext Search

### Query Builder Freetext

**`POST /project-{PROJECT_ID}/api/v1/query-builder/freetext`**

Also available at: `POST /pgw/project-{PROJECT_ID}/api/v1/query-builder/freetext`

Performs a freetext search across IFC objects, returning matches categorized by type (objects, properties, kinds, systems, type objects, classifications).

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `freetext` | string | Yes | Search string (trimmed) |
| `buildingId` | string | Yes | Building ID to search within |
| `searchId` | string | No | Optional search ID to narrow results within an existing search |
| `limit` | object | No | Per-category result limits |

**Limit object fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `object` | number | 100 | Max object results (-1 = unlimited) |
| `property` | number | 100 | Max property results |
| `kind` | number | -1 | Max IFC type (kind) results |
| `system` | number | 100 | Max system results |
| `typeObject` | number | 100 | Max type object results |
| `classification` | number | 0 | Max classification results |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "freetext": "meeting room",
    "buildingId": "1000",
    "limit": {"object": 50, "property": 50, "kind": -1, "system": 0, "typeObject": 0, "classification": 0}
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/query-builder/freetext"
```

---

## Octtree Color Codes

### Get IFC Class Color Codes

**`GET /project-{PROJECT_ID}/api/v1/octtree/colorcode`**

Returns the color coding scheme for IFC object classes in the 3D viewer's octree. Maps IFC types to display colors.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Response** `200 OK`

Returns a mapping of IFC class identifiers to color values.

**Example**

```bash
curl -X GET \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/octtree/colorcode"
```

---

### Get Property Value Color Codes

**`POST /project-{PROJECT_ID}/api/v1/octtree/colorcode`**

Also available at: `POST /pgw/project-{PROJECT_ID}/api/v1/octtree/colorcode`

Generates a color coding scheme based on property values of IFC objects. Returns a map of unique values to colors and a count of objects per value.

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `PROJECT_ID` | number | StreamBIM project ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `buildingId` | string | Yes | Building ID |
| `propKey` | string | Yes | Property key to color code by |
| `psetName` | string | No | Property set name (e.g. `"TAKT"`, `"BaseQuantities"`) |
| `searchId` | string | No | Limit to objects from a previous search |
| `propertyType` | string | No | Property type filter |
| `checklistId` | string | No | Checklist ID for checklist-based color coding |
| `checklistItemId` | string | No | Checklist item ID |
| `checklistSnapshotId` | string | No | Checklist snapshot ID |

**Response** `200 OK`

```json
{
  "data": { "value1": "#ff0000", "value2": "#00ff00" },
  "count": { "value1": 42, "value2": 18 },
  "type": "map"
}
```

**Example -- color code by TAKT property:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "buildingId": "1000",
    "propKey": "Navn",
    "psetName": "TAKT"
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/octtree/colorcode"
```

---

## Notes

- Search IDs are ephemeral and tied to the server session. Create a new search if a previous `searchId` becomes invalid.
- The `page[limit]` and `page[skip]` parameters support pagination for large result sets.
- Field values may be comma-separated when an object has multiple values for a property (e.g. multiple systems).
- The `fieldUnion=true` parameter ensures all requested fields appear in every result object, even if empty for some objects.
- The direct API path (`/project-{id}/api/v1/`) and widget path (`/pgw/project-{id}/api/v1/`) are interchangeable for all IFC search endpoints.
