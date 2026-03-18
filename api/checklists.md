# Checklists

API endpoints for managing checklists within a StreamBIM project. Checklists are used for structured inspections, quality control, and data collection tied to IFC model objects. Each checklist can define items (properties) to fill in, and can be grouped by IFC objects.

## Common Information

### Authentication

All endpoints require a valid Bearer token in the `Authorization` header:

```
Authorization: Bearer {idToken}
```

### Base URL

```
https://{environment}.streambim.com
```

Replace `{environment}` with the target environment (e.g. `app`, `sweden`).

### Content Type

All requests and responses use the [JSON:API](https://jsonapi.org/) media type:

```
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json
```

---

## Get All Checklists

**GET** `/project-{projectId}/api/v1/v2/checklists`

Retrieve all checklists for a project.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | integer | Yes | The project ID (minimum 1) |

**Query Parameters -- Filters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `filter[isDraft]` | boolean | `null` | Filter by draft status. Use `false` to get only published checklists |

**Response** `200 OK`

```json
{
    "data": [
        {
            "id": "1004",
            "type": "checklists",
            "attributes": {
                "name": "Fire Safety Inspection",
                "group-by": "object"
            },
            "relationships": {
                "buildings": {
                    "data": [
                        { "id": "1000", "type": "buildings" }
                    ]
                }
            }
        }
    ]
}
```

**Example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/v2/checklists?filter[isDraft]=false"
```

---

## Checklist Schema

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Display name of the checklist |
| `group-by` | string | Grouping mode. When non-empty (e.g. `"object"`), checklist items are grouped by IFC object |

**Relationships**

| Relationship | Type | Description |
|---|---|---|
| `buildings` | array | Buildings associated with this checklist |

---

## Grouped vs Non-Grouped Checklists

Checklists with `group-by` set to a non-empty string (e.g. `"object"`) group their items by IFC object. When working with grouped checklists:

1. Each exported item has an `object` field containing the group key
2. To resolve a group key to actual IFC GUIDs, use the [IFC Searches API](ifc-searches.md):
   - Create a search with `POST /project-{projectId}/api/v1/ifc-searches` using a rule with `propKey: "checklistValue"`, `propValue: "{groupKey}"`, `buildingId`, and `checklistId`
   - Retrieve matching object GUIDs via `GET /project-{projectId}/api/v1/v2/ifc-object-refs-sets?searchId={searchId}`

Non-grouped checklists have their `object` field containing the IFC GUID directly.

---

## Checklist Export

For exporting checklist data (items, property values) as JSON, use the export endpoint documented in [exports.md](exports.md):

```
GET /project-{projectId}/api/v1/checklists/export/json/?query={base64query}
```

The `query` parameter is a Base64-encoded JSON object. When exporting checklist items (objects):

```json
{
    "key": "object",
    "sort": { "field": "title", "descending": false },
    "page": { "skip": 0, "limit": 10000 },
    "filter": {
        "checklist": "{checklistId}"
    },
    "timeZone": "Europe/Stockholm",
    "format": "json",
    "filename": ""
}
```

To filter by a specific checklist property, add a `properties` field to the filter:

```json
{
    "key": "object",
    "sort": { "field": "title", "descending": false },
    "page": { "skip": 0, "limit": 10000 },
    "filter": {
        "checklist": "{checklistId}",
        "properties": { "{propertyName}": { "$exists": true } }
    },
    "timeZone": "Europe/Stockholm",
    "format": "json",
    "filename": ""
}
```

**Export Response**

```json
{
    "data": [
        {
            "object": "GroupKey_or_GUID",
            "items": {
                "Property A": "value1",
                "Property B": "value2"
            }
        }
    ]
}
```

| Field | Type | Description |
|---|---|---|
| `object` | string | Group key (for grouped checklists) or IFC GUID (for non-grouped) |
| `items` | object | Key-value pairs of checklist property names to their values |

---

## Typical Integration Pattern

A common pattern for importing checklist data into external systems (e.g. Revit):

1. **Authenticate** -- `POST /auth/v1/login`
2. **Get projects** -- `GET /mgw/api/v3/project-links?filter[active]=true`
3. **Get checklists** -- `GET /project-{projectId}/api/v1/v2/checklists?filter[isDraft]=false`
4. **Export checklist items** -- `GET /project-{projectId}/api/v1/checklists/export/json/?query={base64query}`
5. **For grouped checklists, resolve group keys to IFC GUIDs:**
   - `POST /project-{projectId}/api/v1/ifc-searches` with checklist-specific rules
   - `GET /project-{projectId}/api/v1/v2/ifc-object-refs-sets?searchId={searchId}&page[limit]=10000`
6. **Map IFC GUIDs to elements** in the external system

See the [byggstyrning/pyByggstyrning.extension](https://github.com/byggstyrning/pyByggstyrning.extension) repository for a working implementation of this pattern in a Revit/pyRevit integration.
