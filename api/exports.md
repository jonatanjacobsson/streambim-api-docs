# Exports

The StreamBIM export endpoints allow you to export checklists and topics (with related objects) to JSON format. These exports are designed for integration with PowerBI and other analytics tools.

**Authentication:** Bearer token  
**Response content type:** `application/json`  
**Base URL:** `https://{environment}.streambim.com`

---

## 1. Export Checklists to JSON

Export checklists and related objects to JSON for PowerBI integration.

```
GET /project-{projectId}/api/v1/checklists/export/json/
```

### Path parameters

| Parameter   | Type    | Required | Description   |
|------------|---------|----------|---------------|
| `projectId`| integer | Yes      | The project ID (minimum: 1) |

### Query parameters

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `query`    | string | Yes      | A Base64-encoded JSON object representing the search query. Encode your query object (see schema below) using [Base64](https://www.base64encode.org/) and pass it here. |
| `queryJSON`| object | No       | Helper for Swagger UI only. The raw JSON query before encoding. In actual API calls, encode the JSON and use the `query` parameter instead. Set to `none` when using `query` to avoid adding it to the request. |

### Query schema (queryChecklistsExportJson)

The JSON object you encode for the `query` parameter has the following structure:

| Field    | Type    | Default | Description |
|----------|---------|---------|-------------|
| `version`| integer | 2       | Schema version. Current version is 2. |
| `skip`   | integer | —       | Number of records to skip (pagination) |
| `limit`  | integer | —       | Maximum number of records to return |
| `key`    | string  | —       | Export type: `"checklist"` for checklists, `"object"` for checklist objects |
| `filter` | object  | —       | Filter criteria (see below) |
| `sort`   | object  | —       | Sort configuration (e.g. `{ field: "title", descending: false }`) |
| `page`   | object  | —       | Pagination: `{ skip: integer, limit: integer }` |
| `expired`| boolean | false    | Include expired items |

**Filter object fields:**

| Field              | Type    | Description |
|--------------------|---------|-------------|
| `checklist`        | string  | Filter by checklist ID |
| `checklistitem`    | string  | Filter by checklist item |
| `checklistPrefix`  | string  | Filter by checklist prefix |
| `search`           | string  | Free-text search |
| `status`           | string  | Filter by status |
| `building`         | string  | Filter by building |
| `snapshotId`       | string  | Filter by snapshot ID |
| `objects`          | array   | Array of object IDs |
| `floors`           | array   | Array of floor IDs |
| `spaces`           | array   | Array of space IDs |
| `kinds`            | array   | Array of kind IDs |
| `statuses-in-array`| array   | Array of status IDs |
| `statuses`         | string  | Status filter |
| `allSnapshots`     | boolean | Include all snapshots |
| `includeTopics`    | boolean | Include related topics |
| `hasWagons`        | boolean | Filter by wagons |

Additional fields used in examples: `timeZone` (e.g. `"Europe/Oslo"`), `format` (e.g. `"json"`), `filename` (string).

### Examples

**All checklists:**
```json
{
  "key": "checklist",
  "sort": { "field": "title", "descending": false },
  "page": { "skip": 0, "limit": -1 },
  "filter": { "allSnapshots": true },
  "timeZone": "Europe/Oslo",
  "format": "json",
  "filename": "",
  "version": 2
}
```

**Checklist objects (objects of a specific checklist):**
```json
{
  "key": "object",
  "sort": { "field": "title", "descending": false },
  "page": { "skip": 0, "limit": -1 },
  "filter": { "checklist": "4", "allSnapshots": true },
  "timeZone": "Europe/Oslo",
  "format": "json",
  "filename": "",
  "version": 2
}
```

**Objects filtered by checklist and snapshot:**
```json
{
  "key": "object",
  "sort": { "field": "title", "descending": false },
  "page": { "skip": 0, "limit": -1 },
  "filter": {
    "checklist": "187",
    "allSnapshots": false,
    "snapshotId": "516"
  },
  "timeZone": "Europe/Copenhagen",
  "format": "json",
  "filename": "",
  "version": 2
}
```

### Response (200)

```json
{
  "data": [ ...objects ]
}
```

---

## 2. Export Topics to JSON

Export topics and related objects to JSON for PowerBI integration.

```
GET /project-{projectId}/api/v1/topics/export/json/
```

### Path parameters

| Parameter   | Type    | Required | Description   |
|------------|---------|----------|---------------|
| `projectId`| integer | Yes      | The project ID (minimum: 1) |

### Query parameters

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `query`    | string | Yes      | A Base64-encoded JSON object representing the search query. Encode your query object (see schema below) using [Base64](https://www.base64encode.org/) and pass it here. |
| `queryJSON`| object | No       | Helper for Swagger UI only. The raw JSON query before encoding. In actual API calls, encode the JSON and use the `query` parameter instead. Set to `none` when using `query` to avoid adding it to the request. |

### Query schema (queryTopicsExportJson)

The JSON object you encode for the `query` parameter has the following structure:

| Field       | Type   | Description |
|-------------|--------|-------------|
| `skip`      | integer| Number of records to skip (pagination) |
| `limit`     | integer| Maximum number of records to return |
| `selectors` | object | Search terms (SearchTerms) — see below |
| `filter`    | object | Additional filters (additionalProperties: string) |
| `timeZone`  | string | Time zone (e.g. `"Europe/Oslo"`) |

**Selectors object (SearchTerms):**

Missing selectors and empty string selectors are treated as wildcards.

| Selector               | Type    | Description |
|------------------------|---------|-------------|
| `freetext`             | string  | Free-text search |
| `creationAuthor`       | string  | Filter by creation author |
| `assignedToUser`       | string  | Filter by assigned user |
| `assignedToGroup`      | string  | Filter by assigned group |
| `unassigned`           | boolean | Filter for unassigned topics |
| `status`               | string  | Filter by status |
| `building`             | string  | Filter by building |
| `floor`                | string  | Filter by floor |
| `spaces`               | string  | Space GUID |
| `workflowClassifications` | string | Workflow classifications |
| `topicClassifications`   | string | Topic classifications |
| `labels`               | string  | Filter by labels |
| `mentions`             | string  | Filter by mentions |
| `starred`              | string  | Filter by starred |
| `sharedWithGroupIds`   | array   | Array of group IDs (integers) |
| `minDueDate`           | string  | Minimum due date |
| `maxDueDate`           | string  | Maximum due date |
| `minCreationDate`      | string  | Minimum creation date |
| `maxCreationDate`      | string  | Maximum creation date |
| `isDraft`              | boolean | Filter by draft status |
| `isDeleted`            | boolean | Filter by deleted status |
| `isLegacy`             | boolean | Filter by legacy status |
| `workflow`             | string  | Filter by workflow |
| `workflowPrefix`       | string  | Filter by workflow prefix |
| `object`               | string  | IFC object ID |
| `isPositionless`      | boolean | Filter for positionless topics |
| `topicId`              | integer | Specific topic ID |
| `topicIds`             | string  | Comma-separated topic IDs |
| `channel`              | string  | Filter by channel (e.g. `"workflows"`) |
| `checklist`            | string  | Checklist ID |
| `checklistItem`        | string  | Checklist item ID |
| `checklistItemInstance`| string  | Checklist item instance ID |
| `snapshotId`           | string  | Checklist snapshot ID |
| `publicId`             | string  | Public ID |
| `documentId`           | string  | Document ID |
| `priority`             | string  | Topic priority ID |
| `statuses`             | string  | Topic status IDs |
| `objectProperty`       | string  | Object property filter |
| `topicReport`          | string  | Filter by topic report |
| `type`                 | string  | Topic type: `topic`, `template`, `checklist_item`, `checklist_item_instance`, or `viewpoint` |

### Example

**Topics from a specific checklist snapshot:**
```json
{
  "selectors": {
    "channel": "workflows",
    "checklist": "197",
    "snapshotId": "522",
    "isDeleted": false
  }
}
```

**With time zone:**
```json
{
  "selectors": {
    "channel": "workflows",
    "checklist": "197",
    "snapshotId": "522",
    "isDeleted": false
  },
  "timeZone": "Europe/Oslo"
}
```

### Response (200)

```json
{
  "data": [ ...objects ]
}
```

---

## 3. Export Documents to JSON

Export document metadata to JSON for automation and analytics workflows. Use this endpoint to list documents before downloading them.

```
GET /project-{projectId}/api/v1/documents/export/json/
```

### Path parameters

| Parameter   | Type    | Required | Description   |
|------------|---------|----------|---------------|
| `projectId`| integer | Yes      | The project ID (minimum: 1) |

### Query parameters

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `query`    | string | No       | A Base64-encoded JSON object representing the search query. If omitted, returns all documents. |

### Query schema

The JSON object you encode for the `query` parameter has the following structure:

| Field       | Type   | Description |
|-------------|--------|-------------|
| `skip`      | integer| Number of records to skip (pagination) |
| `limit`     | integer| Maximum number of records to return |
| `selectors` | object | Search/filter criteria |
| `filter`    | object | Additional filters |

**Selectors:**

| Selector       | Type    | Description |
|----------------|---------|-------------|
| `freetext`     | string  | Free-text search across document names |
| `fileExtensions` | string | Filter by file extension (e.g. `"ifc"`, `"pdf"`) |
| `labelIds`     | string  | Filter by label IDs |
| `folderId`     | string  | Filter by folder ID |
| `isDeleted`    | boolean | Filter by deleted status |
| `building`     | string  | Filter by building |
| `starred`      | boolean | Filter for starred documents |

### Response (200)

```json
{
    "data": [
        {
            "id": 1002,
            "filename": "Model_ARK.ifc",
            "description": "",
            "revision": 1,
            "numRevisions": 1,
            "filesize": 45230912,
            "path": "MODELS/ARK",
            "uploadedDate": "2024-01-15T10:30:00Z",
            "lastModified": "2024-01-15T10:30:00Z",
            "isDeleted": false,
            "labels": ["ARK"],
            "folderId": 7
        }
    ]
}
```

> **Note:** The response format differs from the JSON:API format used by `/api/v1/v2/documents`. This export endpoint returns a flat JSON structure optimized for analytics tools.

### Example

```bash
curl -X GET \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/documents/export/json/"
```

**With a query (e.g. only IFC files):**

```bash
# Query JSON: {"selectors":{"fileExtensions":"ifc"}}
# Base64 encode it, then:
curl -X GET \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/documents/export/json/?query=eyJzZWxlY3RvcnMiOnsiZmlsZUV4dGVuc2lvbnMiOiJpZmMifX0="
```

> **See also:** To download individual documents after listing them, use `GET /project-{projectId}/api/v1/documents/{documentId}/downloadlink` documented in [documents.md](documents.md).

---

## 4. Export Users to JSON

Export user data to JSON for PowerBI integration.

```
GET /project-{projectId}/api/v1/users/export/json/
```

### Path parameters

| Parameter   | Type    | Required | Description   |
|------------|---------|----------|---------------|
| `projectId`| integer | Yes      | The project ID (minimum: 1) |

### Response (200)

Returns a JSON object with user data suitable for PowerBI.

### Example (PowerBI M)

```
Web.Contents("https://{environment}.streambim.com/project-42/api/v1/users/export/json",
  [Headers=[Authorization = "Bearer " & AccessToken]]
)
```

---

## 5. Export Users to XLSX

Export user data as an Excel spreadsheet download.

```
GET /project-{projectId}/api/v1/v2/users-export
```

### Path parameters

| Parameter   | Type    | Required | Description   |
|------------|---------|----------|---------------|
| `projectId`| integer | Yes      | The project ID (minimum: 1) |

### Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {idToken}` |
| `Accept` | `application/vnd.api+json` |

### Response

Returns a binary XLSX file (`Report.xlsx`).

---

## 6. Export IFC Files to JSON

Export IFC file metadata to JSON for PowerBI integration.

```
GET /project-{projectId}/api/v1/ifcfiles/export/json/
```

### Path parameters

| Parameter   | Type    | Required | Description   |
|------------|---------|----------|---------------|
| `projectId`| integer | Yes      | The project ID (minimum: 1) |

### Query parameters

| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `query`    | string | No       | Base64-encoded JSON filter object |

### Query schema

| Field    | Type    | Description |
|----------|---------|-------------|
| `filter` | object  | Filter criteria |

**Filter fields:**

| Field      | Type    | Description |
|------------|---------|-------------|
| `building` | string  | Building ID to filter by |

### Example (PowerBI M)

```
let
  Query = "{""filter"":{""building"":""1000""}}",
  Encoded = Binary.ToText(Text.ToBinary(Query), BinaryEncoding.Base64),
  Source = Web.Contents("https://{environment}.streambim.com/project-42/api/v1/ifcfiles/export/json/?query=" & Encoded,
    [Headers=[Authorization = "Bearer " & AccessToken]]
  )
in
  Source
```

---

## 7. Export Checklist Items to XLSX

Export checklist items as an Excel spreadsheet. Returns a downloadable XLSX file with checklist item definitions and configuration.

```
GET /project-{projectId}/api/v1/v2/export-checklist-items
```

### Path parameters

| Parameter   | Type    | Required | Description   |
|------------|---------|----------|---------------|
| `projectId`| integer | Yes      | The project ID (minimum: 1) |

### Query parameters (filter)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[checklist]` | string | Yes | Checklist ID to export items from |
| `filter[showIndentedStatus]` | boolean | No | Include indented status column |
| `filter[showControlMethod]` | boolean | No | Include control method column |
| `filter[showRequirePhoto]` | boolean | No | Include require photo column |
| `filter[showRequireComment]` | boolean | No | Include require comment column |
| `filter[showWorkflowPrefix]` | boolean | No | Include workflow prefix column |
| `filter[showAllowNA]` | boolean | No | Include allow N/A column |
| `filter[showAllowOther]` | boolean | No | Include allow other column |
| `filter[showInputType]` | boolean | No | Include input type column |

### Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {idToken}` |
| `Accept` | `application/vnd.api+json` |

### Response

Returns a binary XLSX file (`{checklistName}_items.xlsx`).

### Example

```bash
curl -X GET \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json" \
  -o items.xlsx \
  "https://{environment}.streambim.com/project-42/api/v1/v2/export-checklist-items?filter[checklist]=4&filter[showIndentedStatus]=true&filter[showControlMethod]=true"
```

---

## Usage notes

- The `query` parameter must always be a Base64-encoded JSON string. Build your query object, stringify it, then encode to Base64.
- The `queryJSON` parameter is a Swagger UI helper only — it is not used in production API calls.
- JSON export endpoints return an object with a `data` array containing the exported objects.
- XLSX export endpoints return binary file downloads.
