# Topics

Topics are used to communicate and track issues, deviations, RFIs, work orders and more in StreamBIM. The Topic data model is designed to be compatible with the [BCF (BIM Collaboration Format)](https://www.buildingsmart.org/standards/bsi-standards/bci-standards/) standard.

## General Information

### Authentication

All requests require a valid Bearer token in the `Authorization` header:

```
Authorization: Bearer {idToken}
```

### Base URL

```
https://{environment}.streambim.com
```

Replace `{environment}` with the appropriate environment (e.g., `app`, `sweden`, etc.).

### Content Type

All requests must include the JSON:API content type headers:

```
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json
```

### Pagination

List endpoints support pagination using query parameters:

| Parameter | Description |
|---|---|
| `page[limit]` | Maximum number of results to return |
| `page[skip]` | Number of results to skip |

Example: `?page[limit]=10&page[skip]=0`

### Response Meta

The response `meta` object on list endpoints includes:

| Field | Description |
|---|---|
| `total` | Total number of matching records |
| `labelIds` | Map of label IDs present in the result set |
| `workflowIds` | Map of workflow IDs present in the result set |
| `hasBasicPrivate` | Whether basic private topics exist |
| `hasBasicPublic` | Whether basic public topics exist |

---

## Topics

Topics are the core issue-tracking entities. Each topic has attributes for tracking status, assignments, due dates, costs, and more. Topics belong to workflows and can have viewpoints, comments, labels, and change history.

### Topic Data Model

**Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `access` | object | Per-field permission flags (each with `canEdit` boolean) |
| `channel` | string | Channel the topic belongs to (e.g., `"public"`, `"workflows"`) |
| `closed-date` | string/null | ISO 8601 date when the topic was closed |
| `cost` | string | Cost associated with the topic |
| `creation-date` | string | ISO 8601 creation timestamp |
| `description` | string | Detailed description of the topic |
| `due-date` | string/null | ISO 8601 due date |
| `guid` | string | BCF-compatible unique identifier (UUID) |
| `is-deleted` | boolean | Whether the topic is soft-deleted |
| `is-draft` | boolean | Whether the topic is still a draft |
| `last-modified` | string | ISO 8601 last modification timestamp |
| `public-id` | number | Human-readable sequential ID |
| `shared-with-groups` | array/null | Groups the topic is shared with |
| `starred` | boolean | Whether the topic is starred by the current user |
| `teaser-text` | string | Short preview text |
| `title` | string | Title of the topic |
| `topic-type` | string | Type classification (e.g., `"topic"`) |
| `unread` | boolean | Whether the topic has unread changes for the current user |

**Relationships:**

| Relationship | Type | Description |
|---|---|---|
| `assigned-to-group` | groups | Group the topic is assigned to |
| `assigned-to-user` | users | User the topic is assigned to |
| `attachments` | attachments[] | File attachments on the topic |
| `building` | buildings | Building the topic is associated with |
| `changes` | topic-changes[] | Change history log entries |
| `checklist-item-instance` | checklist-item-instances | Linked checklist item |
| `comments` | topic-comments[] | Comments on the topic |
| `creation-author` | users | User who created the topic |
| `document-revision` | document-revisions | Linked document revision |
| `labels` | topic-labels[] | Labels/tags applied to the topic |
| `preview-attachment` | attachments | Thumbnail/preview image |
| `priority` | topic-priorities | Priority level |
| `status` | topic-statuses | Current status |
| `viewpoints` | topic-viewpoints[] | 3D viewpoints saved on the topic |
| `workflow` | workflows | Workflow the topic belongs to |

**Access Control Fields:**

The `access` object contains per-field `canEdit` flags for: `comment`, `title`, `description`, `assignedTo`, `ifcObjectGuid`, `hiddenObjects`, `cameraState`, `status`, `setTopicDone`, `setTopicClosed`, `buildingId`, `floorId`, `labels`, `sharedWithGroups`, `dueDate`, `cost`, `priority`, `isDeleted`.

---

### Get all topics

**`GET /project-PROJECT_ID/api/v1/v2/topics?page[limit]=10&page[skip]=0`**

Returns a paginated list of topics matching the search filters.

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Query Parameters:**

| Parameter | Description |
|---|---|
| `page[limit]` | Maximum number of topics to return |
| `page[skip]` | Number of topics to skip |

**Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "1022",
            "type": "topics",
            "attributes": {
                "access": {
                    "comment": { "canEdit": true },
                    "title": { "canEdit": true },
                    "description": { "canEdit": true },
                    "assignedTo": { "canEdit": true },
                    "status": { "canEdit": true }
                },
                "channel": "workflows",
                "closed-date": null,
                "cost": "",
                "creation-date": "2021-06-17T12:39:47.047325Z",
                "description": "",
                "due-date": null,
                "guid": "978fd9a3-3922-4ad2-8e7f-65854394476a",
                "is-deleted": false,
                "is-draft": false,
                "last-modified": "2021-06-17T15:24:40.760082Z",
                "public-id": 13,
                "shared-with-groups": null,
                "starred": false,
                "teaser-text": "Kanaler senkes.",
                "title": "Kollisjon kanal-kanal og kanal-kabelbro",
                "topic-type": "",
                "unread": false
            },
            "relationships": {
                "assigned-to-group": { "data": null },
                "assigned-to-user": { "data": null },
                "attachments": { "data": [] },
                "building": { "data": { "id": "1000", "type": "buildings" } },
                "changes": { "data": [{ "id": "18", "type": "topic-changes" }] },
                "comments": { "data": [{ "id": "1015", "type": "topic-comments" }] },
                "creation-author": { "data": { "id": "user@example.com", "type": "users" } },
                "labels": { "data": [{ "id": "1007", "type": "topic-labels" }] },
                "priority": { "data": { "id": "2", "type": "topic-priorities" } },
                "status": { "data": { "id": "2000", "type": "topic-statuses" } },
                "viewpoints": { "data": [{ "id": "11", "type": "topic-viewpoints" }] },
                "workflow": { "data": { "id": "1004", "type": "workflows" } }
            }
        }
    ],
    "meta": {
        "hasBasicPrivate": false,
        "hasBasicPublic": false,
        "labelIds": { "1006": true, "1007": true, "1008": true },
        "total": 15,
        "workflowIds": { "1001": true, "1004": true }
    }
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topics?page[limit]=10&page[skip]=0"
```

---

### Get topic

**`GET /project-PROJECT_ID/api/v1/v2/topics/{topicId}`**

Returns a single topic by its internal ID.

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Description |
|---|---|
| `topicId` | Internal topic ID (not the `public-id`) |

**Response:** `200 OK` — Returns the topic object wrapped in `{ "data": { ... } }`.

**Error Response:** `404 Not Found`

```json
{
    "errors": [
        {
            "status": "404",
            "code": "topicDoesNotExist",
            "detail": "Topic 1048 does not exist",
            "meta": { "params": { "topicId": "1048" } }
        }
    ]
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topics/1048"
```

---

### Create new topic

**`POST /project-PROJECT_ID/api/v1/v2/topics`**

Creates a new topic. The topic is created with `is-draft: true` status. Use the PATCH endpoint to publish the topic by setting `is-draft` to `false`.

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Request Body:**

```json
{
    "data": {
        "type": "topics",
        "attributes": {
            "is-deleted": false,
            "channel": "public",
            "cost": "",
            "description": "",
            "title": "New topic",
            "due-date": null,
            "starred": false,
            "is-draft": true
        },
        "relationships": {
            "checklist-item-instance": { "data": null },
            "document-revision": { "data": null },
            "building": {
                "data": { "type": "buildings", "id": "1000" }
            },
            "assigned-to-user": { "data": null },
            "assigned-to-group": { "data": null },
            "status": {
                "data": { "type": "topic-statuses", "id": "2000" }
            },
            "workflow": { "data": null }
        }
    }
}
```

**Response:** `200 OK` — Returns the created topic object.

**Example:**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
        "type": "topics",
        "attributes": {
            "is-deleted": false,
            "channel": "public",
            "cost": "",
            "description": "",
            "title": "New topic",
            "due-date": null,
            "starred": false,
            "is-draft": true
        },
        "relationships": {
            "building": { "data": { "type": "buildings", "id": "1000" } },
            "status": { "data": { "type": "topic-statuses", "id": "2000" } },
            "workflow": { "data": null }
        }
    }
  }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topics"
```

---

### Patch topic

**`PATCH /project-PROJECT_ID/api/v1/v2/topics/{topicId}`**

Updates an existing topic. After creating a topic via POST, its `is-draft` flag is `true`. Use this method to change `is-draft` to `false` to make the topic visible to other users.

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Description |
|---|---|
| `topicId` | Internal topic ID |

**Request Body:**

```json
{
    "data": {
        "id": "1052",
        "type": "topics",
        "attributes": {
            "channel": "public",
            "cost": "",
            "description": "new description",
            "due-date": null,
            "guid": "0b5a671a-1561-4c96-9f6f-5ad6db31615a",
            "is-deleted": false,
            "is-draft": true,
            "starred": false,
            "title": "New topic"
        },
        "relationships": {
            "assigned-to-group": { "data": null },
            "assigned-to-user": { "data": null },
            "building": { "data": { "id": "1000", "type": "buildings" } },
            "labels": { "data": [] },
            "priority": { "data": { "id": "2", "type": "topic-priorities" } },
            "status": { "data": { "id": "2000", "type": "topic-statuses" } },
            "workflow": { "data": { "id": "1003", "type": "workflows" } }
        }
    }
}
```

**Response:** `200 OK` — Returns the updated topic object.

**Error Response:** `500 Internal Server Error` (wrong topic ID)

```json
{
    "errors": [
        {
            "status": "500",
            "code": "internalServerError",
            "detail": "sql: no rows in result set",
            "meta": { "params": { "innerError": "sql: no rows in result set" } }
        }
    ]
}
```

**Example:**

```bash
curl -X PATCH \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
        "id": "1052",
        "type": "topics",
        "attributes": {
            "description": "new description",
            "is-draft": false,
            "title": "New topic"
        }
    }
  }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topics/1052"
```

---

### Delete topic

**`DELETE /project-PROJECT_ID/api/v1/v2/topics/{topicId}`**

Deletes a topic by its internal ID (not `public-id`).

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Description |
|---|---|
| `topicId` | Internal topic ID |

**Request Body:** Include the full topic data object in the request body.

**Response:** `200 OK`

```json
{
    "data": null
}
```

**Error Response:** `500 Internal Server Error` (wrong topic ID)

**Example:**

```bash
curl -X DELETE \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "id": "1052", "type": "topics" } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topics/1052"
```

---

### Delete topic by public id

**`DELETE /project-PROJECT_ID/api/v1/v2/topics?filter[publicId]={publicId}`**

Deletes a topic by its human-readable `public-id`.

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Query Parameters:**

| Parameter | Description |
|---|---|
| `filter[publicId]` | The public ID of the topic |

**Request Body:** Include the full topic data object in the request body.

**Response:** `200 OK`

```json
{
    "data": null
}
```

**Error Response:** `500 Internal Server Error` (wrong public ID)

**Example:**

```bash
curl -X DELETE \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "id": "1052", "type": "topics" } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topics?filter[publicId]=22"
```

---

## Topic Viewpoints

Topics can have multiple viewpoints, which are compatible with BCF viewpoints. Viewpoints hold the camera state and object and layer visualizations.

### Viewpoint Data Model

**Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `camera-state` | object | Camera position, quaternion, scale, clipping planes, and highlighted layer |
| `creation-date` | string | ISO 8601 creation timestamp |
| `extra-data` | object/null | Additional viewpoint data |
| `guid` | string | BCF-compatible UUID |
| `hidden-layers` | array/null | IDs of layers hidden in this viewpoint |
| `index` | number | Order index of the viewpoint within the topic |
| `last-modified` | string | ISO 8601 last modification timestamp |

**Camera State Object:**

| Field | Type | Description |
|---|---|---|
| `position` | number[3] | Camera position [x, y, z] |
| `quaternion` | number[4] | Camera orientation as quaternion |
| `scale` | number[3] | Camera scale |
| `clippingPlanes` | object[] | Array of clipping planes with x, y, z, d, offset, etc. |
| `showGrid` | boolean | Whether to show the grid |
| `positionLess` | null/boolean | Position-less viewpoint flag |
| `highlightedLayer` | string/null | Highlighted layer ID |

**Relationships:**

| Relationship | Type | Description |
|---|---|---|
| `attachments` | attachments[] | File attachments (images, snapshots) |
| `building` | buildings | Associated building |
| `changes` | topic-changes[] | Change history for this viewpoint |
| `comments` | topic-comments[] | Comments on this viewpoint |
| `creation-author` | users | User who created the viewpoint |
| `floor` | floors | Associated floor |
| `hidden-objects` | objects[] | Objects hidden in this viewpoint |
| `object` | objects | Selected/focused object |
| `preview-attachment` | attachments | Preview thumbnail |
| `selected-objects` | objects[] | Objects selected/highlighted in this viewpoint |
| `spaces` | spaces[] | Associated spaces |
| `topic` | topics | Parent topic |

---

### Get all topic-viewpoints

**`GET /project-PROJECT_ID/api/v1/v2/topic-viewpoints?filter[topic]={topicId}`**

Returns all viewpoints for a given topic.

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Query Parameters:**

| Parameter | Description |
|---|---|
| `filter[topic]` | Topic ID to filter viewpoints for |

**Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "17",
            "type": "topic-viewpoints",
            "attributes": {
                "camera-state": {
                    "position": [54.43, -18.03, 135.46],
                    "quaternion": [0.696, -0.236, 0.263, 0.625],
                    "scale": [0, 0, 0],
                    "clippingPlanes": [],
                    "showGrid": false,
                    "highlightedLayer": null
                },
                "creation-date": "2021-06-22T12:08:16.22466Z",
                "extra-data": null,
                "guid": "e1208e1e-e428-4623-870e-7ca684b6101a",
                "hidden-layers": null,
                "index": 0,
                "last-modified": "2021-06-23T11:52:09.794268Z"
            },
            "relationships": {
                "attachments": { "data": [{ "id": "20", "type": "attachments" }] },
                "building": { "data": { "id": "1000", "type": "buildings" } },
                "floor": { "data": { "id": "1003", "type": "floors" } },
                "topic": { "data": { "id": "1034", "type": "topics" } }
            }
        }
    ]
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-viewpoints?filter[topic]=1044"
```

---

### Get topic-viewpoint

**`GET /project-PROJECT_ID/api/v1/v2/topic-viewpoints/{viewpointId}`**

Returns a single viewpoint by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `viewpointId` | Viewpoint ID |

**Response:** `200 OK` — Returns the viewpoint object wrapped in `{ "data": { ... } }`.

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-viewpoints/17"
```

---

### Create new viewpoint

**`POST /project-PROJECT_ID/api/v1/v2/topic-viewpoints`**

Creates a new viewpoint on a topic. Include the camera state, floor, building, and parent topic relationship.

**Headers:**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Request Body:**

```json
{
    "data": {
        "type": "topic-viewpoints",
        "attributes": {
            "camera-state": {
                "position": [54.43, -18.03, 135.46],
                "quaternion": [0.696, -0.236, 0.263, 0.625],
                "scale": [0, 0, 0],
                "clippingPlanes": [],
                "showGrid": false,
                "highlightedLayer": null
            },
            "hidden-layers": null,
            "index": 0
        },
        "relationships": {
            "building": { "data": { "type": "buildings", "id": "1000" } },
            "floor": { "data": { "type": "floors", "id": "1003" } },
            "topic": { "data": { "type": "topics", "id": "1034" } },
            "hidden-objects": { "data": [] },
            "selected-objects": { "data": [] }
        }
    }
}
```

**Response:** `200 OK` — Returns the created viewpoint object.

**Example:**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "type": "topic-viewpoints", "attributes": { "camera-state": { "position": [54.43, -18.03, 135.46], "quaternion": [0.696, -0.236, 0.263, 0.625], "scale": [0,0,0], "clippingPlanes": [] }, "index": 0 }, "relationships": { "topic": { "data": { "type": "topics", "id": "1034" } } } } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-viewpoints"
```

---

### Patch viewpoint

**`PATCH /project-PROJECT_ID/api/v1/v2/topic-viewpoints/{viewpointId}`**

Updates an existing viewpoint.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `viewpointId` | Viewpoint ID |

**Response:** `200 OK` — Returns the updated viewpoint object.

**Example:**

```bash
curl -X PATCH \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "id": "17", "type": "topic-viewpoints", "attributes": { "camera-state": { "position": [60, -20, 140], "quaternion": [0.7, -0.2, 0.3, 0.6], "scale": [0,0,0], "clippingPlanes": [] } } } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-viewpoints/17"
```

---

### Delete viewpoint

**`DELETE /project-PROJECT_ID/api/v1/v2/topic-viewpoints/{viewpointId}`**

Deletes a viewpoint by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `viewpointId` | Viewpoint ID |

**Response:** `200 OK`

```json
{
    "data": null
}
```

**Example:**

```bash
curl -X DELETE \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-viewpoints/17"
```

---

## Comments

Comments can be added to topics and topic viewpoints. Each comment is linked to a parent topic and optionally to a specific viewpoint.

### Comment Data Model

**Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `comment` | string | The comment text content |
| `creation-date` | string | ISO 8601 creation timestamp |
| `guid` | string | BCF-compatible UUID |
| `is-draft` | boolean | Whether the comment is a draft |
| `last-modified` | string | ISO 8601 last modification timestamp |
| `viewpoint_guid` | string | GUID of the associated viewpoint |

**Relationships:**

| Relationship | Type | Description |
|---|---|---|
| `attachments` | attachments[] | File attachments on the comment |
| `creation-author` | users | User who created the comment |
| `parent-checklist-item-instance` | checklist-item-instances | Linked checklist item |
| `parent-topic` | topics | Parent topic |
| `parent-topic-viewpoint` | topic-viewpoints | Parent viewpoint |

---

### Get topic comments

**`GET /project-PROJECT_ID/api/v1/v2/topic-comments?filter[topic]={topicId}`**

Returns all comments for a given topic.

**Query Parameters:**

| Parameter | Description |
|---|---|
| `page[limit]` | Maximum number of comments to return (0 for all) |
| `page[skip]` | Number of comments to skip |
| `filter[topic]` | Topic ID to filter comments for |

**Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "1016",
            "type": "topic-comments",
            "attributes": {
                "comment": "Example comment text",
                "creation-date": "2021-06-22T12:09:58.836082Z",
                "guid": "1f320840-685d-493f-94cc-f7576f3ff665",
                "is-draft": false,
                "last-modified": "2021-06-22T12:09:58.836082Z",
                "viewpoint_guid": "e1208e1e-e428-4623-870e-7ca684b6101a"
            },
            "relationships": {
                "attachments": { "data": [] },
                "creation-author": { "data": { "id": "user@example.com", "type": "users" } },
                "parent-checklist-item-instance": { "data": null },
                "parent-topic": { "data": { "id": "1034", "type": "topics" } },
                "parent-topic-viewpoint": { "data": { "id": "17", "type": "topic-viewpoints" } }
            }
        }
    ]
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-comments?page[limit]=0&page[skip]=0&filter[topic]=1034"
```

---

### Get topic comment

**`GET /project-PROJECT_ID/api/v1/v2/topic-comments/{commentId}`**

Returns a single comment by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `commentId` | Comment ID |

**Response:** `200 OK` — Returns the comment object wrapped in `{ "data": { ... } }`.

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-comments/1016"
```

---

### Create new comment

**`POST /project-PROJECT_ID/api/v1/v2/topic-comments`**

Creates a new comment on a topic viewpoint.

**Request Body:**

```json
{
    "data": {
        "type": "topic-comments",
        "attributes": {
            "comment": "New comment text",
            "is-draft": false
        },
        "relationships": {
            "parent-topic": {
                "data": { "type": "topics", "id": "1034" }
            },
            "parent-topic-viewpoint": {
                "data": { "type": "topic-viewpoints", "id": "17" }
            }
        }
    }
}
```

**Response:** `200 OK` — Returns the created comment object.

**Example:**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "type": "topic-comments", "attributes": { "comment": "New comment text", "is-draft": false }, "relationships": { "parent-topic": { "data": { "type": "topics", "id": "1034" } }, "parent-topic-viewpoint": { "data": { "type": "topic-viewpoints", "id": "17" } } } } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-comments"
```

---

### Patch comment

**`PATCH /project-PROJECT_ID/api/v1/v2/topic-comments/{commentId}`**

Updates an existing comment.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `commentId` | Comment ID |

**Request Body:**

```json
{
    "data": {
        "id": "1016",
        "type": "topic-comments",
        "attributes": {
            "comment": "Updated comment text"
        }
    }
}
```

**Response:** `200 OK` — Returns the updated comment object.

**Example:**

```bash
curl -X PATCH \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "id": "1016", "type": "topic-comments", "attributes": { "comment": "Updated comment text" } } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-comments/1016"
```

---

### Delete comment

**`DELETE /project-PROJECT_ID/api/v1/v2/topic-comments/{commentId}`**

Deletes a comment by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `commentId` | Comment ID |

**Response:** `200 OK`

```json
{
    "data": null
}
```

**Example:**

```bash
curl -X DELETE \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-comments/1016"
```

---

## Topic Labels

Labels are used to categorize and tag topics for filtering and organization.

### Label Data Model

**Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `accessible` | boolean | Whether the label is accessible/visible |
| `name` | string | Display name of the label |

---

### Get all topic labels

**`GET /project-PROJECT_ID/api/v1/v2/topic-labels`**

Returns all topic labels for the project.

**Query Parameters:**

| Parameter | Description |
|---|---|
| `filter[accessible]` | Filter by accessibility (`true`/`false`) |

**Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "1006",
            "type": "topic-labels",
            "attributes": {
                "accessible": true,
                "name": "ark"
            }
        },
        {
            "id": "1007",
            "type": "topic-labels",
            "attributes": {
                "accessible": true,
                "name": "rie"
            }
        }
    ]
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-labels?filter[accessible]=false"
```

---

### Get topic label

**`GET /project-PROJECT_ID/api/v1/v2/topic-labels/{labelId}`**

Returns a single topic label by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `labelId` | Label ID |

**Response:** `200 OK`

```json
{
    "data": {
        "id": "1006",
        "type": "topic-labels",
        "attributes": {
            "accessible": true,
            "name": "ark"
        }
    }
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-labels/1006"
```

---

### Create new topic label

**`POST /project-PROJECT_ID/api/v1/v2/topic-labels`**

Creates a new topic label. Label names must be unique — creating a label with a name too similar to an existing one returns a `409 Conflict` error.

**Request Body:**

```json
{
    "data": {
        "id": "0",
        "type": "topic-labels",
        "attributes": {
            "name": "new-label"
        }
    }
}
```

**Response:** `200 OK`

```json
{
    "data": {
        "id": "1010",
        "type": "topic-labels",
        "attributes": {
            "accessible": false,
            "name": "new-label"
        }
    }
}
```

**Error Response:** `409 Conflict` (duplicate/similar name)

```json
{
    "errors": [
        {
            "status": "409",
            "code": "conflictError",
            "detail": "The label \"new-ark\" is too similar to another label: \"new-ark\"",
            "meta": {
                "params": {
                    "innerError": "The label \"new-ark\" is too similar to another label: \"new-ark\""
                }
            }
        }
    ]
}
```

**Example:**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "id": "0", "type": "topic-labels", "attributes": { "name": "new-label" } } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-labels"
```

---

### Patch topic label

**`PATCH /project-PROJECT_ID/api/v1/v2/topic-labels/{labelId}`**

Updates a topic label. Only the name can be changed.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `labelId` | Label ID |

**Request Body:**

```json
{
    "data": {
        "id": "1010",
        "type": "topic-labels",
        "attributes": {
            "name": "new-ark-2"
        }
    }
}
```

**Response:** `200 OK`

```json
{
    "data": {
        "id": "1010",
        "type": "topic-labels",
        "attributes": {
            "accessible": false,
            "name": "new-ark-2"
        }
    }
}
```

**Example:**

```bash
curl -X PATCH \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{ "data": { "id": "1010", "type": "topic-labels", "attributes": { "name": "new-ark-2" } } }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-labels/1010"
```

---

## Topic Changes

Topic changes represent the audit/change log for topics. Each change records what field was modified, the old and new values, and who made the change.

### Change Data Model

**Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `change-time` | string | ISO 8601 timestamp of the change |
| `change-type` | string | Type of change (e.g., `"UPDATE"`) |
| `changed-field` | string | Name of the field that was changed (e.g., `"title"`, `"description"`, `"user_assigned"`, `"due_date"`) |
| `new-value` | string | The new value after the change |
| `old-value` | string | The previous value before the change |

**Relationships:**

| Relationship | Type | Description |
|---|---|---|
| `author` | users | User who made the change |
| `parent-checklist-item-instance` | checklist-item-instances | Linked checklist item |
| `parent-topic` | topics | Parent topic the change belongs to |

---

### Get topic changes

**`GET /project-PROJECT_ID/api/v1/v2/topic-changes?filter[topic]={topicId}`**

Returns the change log for a given topic.

**Query Parameters:**

| Parameter | Description |
|---|---|
| `filter[topic]` | Topic ID to filter changes for |

**Response:** `200 OK`

```json
{
    "data": [
        {
            "id": "58",
            "type": "topic-changes",
            "attributes": {
                "change-time": "2021-06-22T14:32:41.422194Z",
                "change-type": "UPDATE",
                "changed-field": "user_assigned",
                "new-value": "",
                "old-value": "@AlAl"
            },
            "relationships": {
                "author": { "data": { "id": "user@example.com", "type": "users" } },
                "parent-checklist-item-instance": { "data": null },
                "parent-topic": { "data": { "id": "1037", "type": "topics" } }
            }
        },
        {
            "id": "56",
            "type": "topic-changes",
            "attributes": {
                "change-time": "2021-06-22T14:32:41.422194Z",
                "change-type": "UPDATE",
                "changed-field": "due_date",
                "new-value": "",
                "old-value": "2021-06-08T00:00:00Z"
            },
            "relationships": {
                "author": { "data": { "id": "user@example.com", "type": "users" } },
                "parent-checklist-item-instance": { "data": null },
                "parent-topic": { "data": { "id": "1037", "type": "topics" } }
            }
        }
    ]
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-changes?filter[topic]=1037"
```

---

### Get topic change

**`GET /project-PROJECT_ID/api/v1/v2/topic-changes/{changeId}`**

Returns a single change log entry by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `changeId` | Change ID |

**Response:** `200 OK`

```json
{
    "data": {
        "id": "58",
        "type": "topic-changes",
        "attributes": {
            "change-time": "2021-06-22T14:32:41.422194Z",
            "change-type": "UPDATE",
            "changed-field": "user_assigned",
            "new-value": "",
            "old-value": "@AlAl"
        },
        "relationships": {
            "author": { "data": { "id": "user@example.com", "type": "users" } },
            "parent-checklist-item-instance": { "data": null },
            "parent-topic": { "data": { "id": "1037", "type": "topics" } }
        }
    }
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-changes/58"
```

---

## Topic Priorities

Returns all possible priority levels for topics. Priorities are predefined and read-only.

### Priority Data Model

**Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Priority name (`"low"`, `"medium"`, `"high"`) |

---

### Get topic priorities

**`GET /project-PROJECT_ID/api/v1/v2/topic-priorities`**

Returns all available topic priorities.

**Response:** `200 OK`

```json
{
    "data": [
        { "id": "1", "type": "topic-priorities", "attributes": { "name": "low" } },
        { "id": "2", "type": "topic-priorities", "attributes": { "name": "medium" } },
        { "id": "3", "type": "topic-priorities", "attributes": { "name": "high" } }
    ]
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-priorities"
```

---

### Get topic priority

**`GET /project-PROJECT_ID/api/v1/v2/topic-priorities/{priorityId}`**

Returns a single priority by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `priorityId` | Priority ID |

**Response:** `200 OK`

```json
{
    "data": {
        "id": "1",
        "type": "topic-priorities",
        "attributes": {
            "name": "low"
        }
    }
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-priorities/1"
```

---

## Topic Statuses

Returns all possible statuses for topics. Statuses are predefined and read-only.

### Status Data Model

**Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `name` | string | Status name (e.g., `"open"`) |

---

### Get all topic statuses

**`GET /project-PROJECT_ID/api/v1/v2/topic-statuses`**

Returns all available topic statuses.

**Response:** `200 OK` — Returns an array of status objects.

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-statuses"
```

---

### Get topic status

**`GET /project-PROJECT_ID/api/v1/v2/topic-statuses/{statusId}`**

Returns a single status by ID.

**Path Parameters:**

| Parameter | Description |
|---|---|
| `statusId` | Status ID |

**Response:** `200 OK`

```json
{
    "data": {
        "id": "2000",
        "type": "topic-statuses",
        "attributes": {
            "name": "open"
        }
    }
}
```

**Example:**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/topic-statuses/2000"
```

---

## Topic Trends

### Get Topic Trends

**`POST /project-{PROJECT_ID}/api/v1/topics/trends`**

Returns daily open/closed topic counts over a specified number of days, filtered by the given selectors. Used for dashboard trend charts.

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
| `days` | number | Yes | Number of days to include in the trend (e.g. 30, 90) |
| `selectors` | object | Yes | Filter criteria (same selector format as topic list/export -- see [Export Topics to JSON](exports.md)) |

**Response** `200 OK`

```json
{
  "open": [12, 14, 13, 15, 18, 20],
  "closed": [2, 3, 1, 4, 2, 5]
}
```

Each array element represents one day's count, ordered chronologically.

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "days": 30,
    "selectors": {
      "channel": "workflows",
      "isDeleted": false
    }
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/topics/trends"
```
