# IFC Files

API endpoints for managing IFC model file assignments within buildings. IFC files link documents to buildings in specific layers/sublayers and track their conversion status.

**Base URL:** `https://{environment}.streambim.com`

**Authentication:** `Authorization: Bearer {idToken}`

**Content-Type:** `application/vnd.api+json`

---

## Key Concepts

### Composite IDs

IFC file resources use composite IDs in the format `{buildingId}-{documentId}` (e.g. `1000-1021`). This ties a specific document to a specific building.

### Sublayer Notation

IFC files use a tilde-separated layer string to represent sublayer assignments:

- `"M"` -- assigned to layer M only
- `"M~E"` -- assigned to both layers M and E

The `active-layer` attribute in responses always mirrors the `layer` value after a PATCH.

---

## Endpoints

### List IFC Files

**`GET /project-{projectId}/api/v1/v2/ifc-files`**

Lists all IFC file records associated with a building.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filter[building]` | integer | Yes | Building ID to scope results |

**Response** `200 OK`

```json
{
    "data": [
        {
            "id": "1000-1021",
            "type": "ifc-files",
            "attributes": {
                "active-layer": "M",
                "currently-active": true,
                "errors": null,
                "layer": "M",
                "marked-for-deletion": false
            },
            "relationships": {
                "building": { "data": { "id": "1000", "type": "buildings" } },
                "document": { "data": { "id": "1021", "type": "documents" } }
            }
        }
    ]
}
```

**Attribute Details**

| Attribute | Type | Description |
|---|---|---|
| `active-layer` | string | Currently active layer assignment |
| `currently-active` | boolean | Whether this IFC file is currently active in conversions |
| `errors` | string/null | Error message if processing failed |
| `layer` | string | Layer assignment (tilde-separated for multiple sublayers) |
| `marked-for-deletion` | boolean | Whether the file is marked for deletion |

---

### Create IFC File

**`POST /project-{projectId}/api/v1/v2/ifc-files`**

Creates a new IFC file record linking a document to a building in a specific layer.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Request Body**

```json
{
    "data": {
        "attributes": {
            "layer": "M",
            "marked-for-deletion": false
        },
        "relationships": {
            "document": { "data": { "type": "documents", "id": "1022" } },
            "building": { "data": { "type": "buildings", "id": "1000" } }
        },
        "type": "ifc-files"
    }
}
```

**Response** `200 OK`

Returns the created IFC file record with its composite ID.

```json
{
    "data": {
        "id": "1000-1022",
        "type": "ifc-files",
        "attributes": {
            "active-layer": "M",
            "currently-active": false,
            "errors": null,
            "layer": "M",
            "marked-for-deletion": false
        },
        "relationships": {
            "building": { "data": { "id": "1000", "type": "buildings" } },
            "document": { "data": { "id": "1022", "type": "documents" } }
        }
    }
}
```

---

### Update IFC File

**`PATCH /project-{projectId}/api/v1/v2/ifc-files/{buildingId}-{documentId}`**

Updates an IFC file record's layer assignment or deletion status.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | integer | Yes | The project ID |
| `buildingId` | integer | Yes | Building ID (composite ID prefix) |
| `documentId` | integer | Yes | Document ID (composite ID suffix) |

**Request Body**

```json
{
    "data": {
        "id": "1000-1021",
        "attributes": {
            "layer": "M~E",
            "marked-for-deletion": false
        },
        "relationships": {
            "document": { "data": { "type": "documents", "id": "1021" } },
            "building": { "data": { "type": "buildings", "id": "1000" } }
        },
        "type": "ifc-files"
    }
}
```

**Response** `200 OK`

Returns the updated IFC file record.

---

## Typical Usage Pattern

The following sequence is a typical flow when managing IFC model file assignments and starting a conversion:

1. **Mark existing IFC file for deletion** -- `PATCH ifc-files/1000-1021` sets `marked-for-deletion: true`
2. **Load document picker** -- `GET document-labels`, `GET label-groups`, `GET documents` (filtered by model file extensions like `ifc,ply,las,laz,e57,dwg,xml`) to populate a selection UI
3. **Filter documents by label** -- `GET documents` with `filter[labels]=["1025"]`
4. **Add new document to building sublayer** -- `POST ifc-files` links a document to a building in a layer
5. **Reassign sublayers** -- `PATCH ifc-files/{id}` updates layer values (e.g. `"M"` to `"M~E"`)
6. **Start conversion** -- `POST /cmv3/converter-jobs` to process the updated model (see [converter-jobs.md](converter-jobs.md))
7. **Poll conversion** -- `GET converter-jobs` and `GET converter-statuses/{jobId}` to check progress

After each mutation (PATCH or POST), the app refreshes:
- `GET ifc-files?filter[building]=…`
- `GET converter-jobs?filter[project]=…&filter[building]=…`
- `GET projects/{id}`
- `GET project-stats/{id}`
- `GET folders/0`
- `GET converter-statuses/{jobId}`
- `GET last-modifieds/{buildingId}`

---

## Notes

- IFC files are scoped to a project + building + document combination.
- The composite ID `{buildingId}-{documentId}` is generated server-side on creation.
- Layer values use tilde (`~`) as a separator for multi-sublayer assignments.
- `currently-active` reflects whether the file is included in the current active conversion.
- Requires Project Admin privileges or higher.
