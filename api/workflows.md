# Workflows

Workflows are templates that define topic behavior and permissions in StreamBIM. Topics are created within workflows, which hold preset values and control who can comment, assign, close, edit fields, and perform other actions on topics. Workflows can be of type `workflow` or `checklist`.

**Authentication:** All endpoints require a Bearer token (ID token) in the Authorization header.

**Content Type:** `application/vnd.api+json` for request and response bodies.

**Base URL:** `https://{environment}.streambim.com` (e.g. `app`, `sweden`)

---

## Endpoints overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/project-{projectId}/api/v1/v2/workflows` | Get all topic workflows |
| GET | `/project-{projectId}/api/v1/v2/workflows/{workflowId}` | Get a single workflow |
| POST | `/project-{projectId}/api/v1/v2/workflows` | Create a new workflow |
| PATCH | `/project-{projectId}/api/v1/v2/workflows/{workflowId}` | Update a workflow |
| DELETE | `/project-{projectId}/api/v1/v2/workflows/{workflowId}` | Delete a workflow |

---

## Get all workflows

**GET** `/project-{projectId}/api/v1/v2/workflows`

Retrieves all topic workflows for the project. Supports filtering by accessibility, creation eligibility, system workflows, type, and name prefix.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |

**Path parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |

**Query parameters (filter)**

The `filter` parameter is passed as a JSON-style deep object and converted to URL format, e.g. `?filter[accessible]=true`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| filter[accessible] | boolean | true | Filter by workflows the user can access |
| filter[forCreation] | boolean | true | Filter by workflows available for topic creation |
| filter[includeSystem] | boolean | true | Include system workflows |
| filter[workflowType] | string | workflow | `"workflow"` or `"checklist"` |
| filter[prefix] | string | "" | Filter workflows whose name starts with this prefix |

**Response**

Returns `200 OK` with a JSON:API document containing a `data` array of Workflow resources.

**curl example**

```bash
curl -X GET "https://{environment}.streambim.com/project-123/api/v1/v2/workflows?filter[accessible]=true&filter[workflowType]=workflow" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json"
```

---

## Get workflow

**GET** `/project-{projectId}/api/v1/v2/workflows/{workflowId}`

Retrieves a single workflow by ID.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |

**Path parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |
| workflowId | string | Yes | Workflow ID (pattern: `^\d{1,19}$`) |

**Response**

Returns `200 OK` with a JSON:API document containing a single Workflow resource in `data`.

**curl example**

```bash
curl -X GET "https://{environment}.streambim.com/project-123/api/v1/v2/workflows/1004" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json"
```

---

## Create workflow

**POST** `/project-{projectId}/api/v1/v2/workflows`

Creates a new workflow. You can optionally base it on an existing workflow via the `copy-workflow` relationship.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |

**Path parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |

**Request body**

JSON:API document with a single Workflow resource. Use `id: ""` for new resources.

**Attributes**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Workflow name |
| cost | string | Yes | Default cost value |
| description | string | No | Workflow description (nullable) |
| due-date | string (date-time) | No | Default due date (nullable) |
| title | string | No | Default title (nullable) |
| workflow-type | string | No | `"workflow"` or `"checklist"` (default: `"workflow"`) |

**Relationships**

| Relationship | Type | Description |
|--------------|------|-------------|
| assigned-to-group | object | Default assigned group (`data`: `{ id, type: "groups" }` or null) |
| assigned-to-user | object | Default assigned user (`data`: `{ id, type: "users" }` or null) |
| attachments | object | Attachments (`data`: array of `{ id, type: "attachments" }`) |
| copy-workflow | object | Source workflow to copy from (`data`: `{ id, type: "workflows" }` or null) |
| creation-author | object | User who created the workflow (`data`: `{ id, type: "users" }`) |
| editors | object | Users who can edit (`data`: array of `{ id, type: "users" }`) |
| general-access | object | Groups with general access (`data`: array of `{ id, type: "groups" }`) |
| labels | object | Topic labels (`data`: array of `{ id, type: "topic-labels" }`) |
| priority | object | Default priority (`data`: `{ id, type: "topic-priorities" }`) |
| can-be-assigned | object | Groups that can be assigned |
| can-close | object | Groups that can close topics |
| can-comment | object | Groups that can comment |
| can-edit-assigned-to-and-due-date | object | Groups that can edit assignee and due date |
| can-set-cost | object | Groups that can set cost |
| can-set-priority | object | Groups that can set priority |

**Response**

Returns `200 OK` with the created Workflow resource in `data`.

**curl example**

```bash
curl -X POST "https://{environment}.streambim.com/project-123/api/v1/v2/workflows" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "id": "",
      "type": "workflows",
      "attributes": {
        "cost": "",
        "description": "",
        "due-date": null,
        "name": "My Workflow",
        "title": "",
        "workflow-type": "workflow"
      },
      "relationships": {
        "assigned-to-group": { "data": null },
        "assigned-to-user": { "data": null },
        "attachments": { "data": [] },
        "copy-workflow": { "data": null },
        "creation-author": { "data": { "id": "user@example.com", "type": "users" } },
        "editors": { "data": [{ "id": "user@example.com", "type": "users" }] },
        "labels": { "data": [] },
        "priority": { "data": { "id": "2", "type": "topic-priorities" } }
      }
    }
  }'
```

---

## Patch workflow

**PATCH** `/project-{projectId}/api/v1/v2/workflows/{workflowId}`

Updates an existing workflow. Include the workflow `id` in the request body and send only the attributes and relationships you want to change (partial update).

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |

**Path parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |
| workflowId | string | Yes | Workflow ID to update |

**Request body**

JSON:API document with the Workflow resource. Must include `id` and `type`. Include only attributes and relationships to update.

**Response**

Returns `200 OK` with the updated Workflow resource in `data`.

**curl example**

```bash
curl -X PATCH "https://{environment}.streambim.com/project-123/api/v1/v2/workflows/1005" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "id": "1005",
      "type": "workflows",
      "attributes": {
        "name": "Updated Workflow Name",
        "description": "Updated description"
      },
      "relationships": {
        "general-access": {
          "data": [{ "id": "1", "type": "groups" }]
        }
      }
    }
  }'
```

---

## Delete workflow

**DELETE** `/project-{projectId}/api/v1/v2/workflows/{workflowId}`

Deletes a workflow.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |

**Path parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |
| workflowId | string | Yes | Workflow ID to delete |

**Response**

Returns `200 OK` with an empty or minimal response body.

**curl example**

```bash
curl -X DELETE "https://{environment}.streambim.com/project-123/api/v1/v2/workflows/1006" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json"
```

---

## Workflow schema

Workflow resources follow the JSON:API format with `type: "workflows"`.

### Top-level fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Workflow ID (pattern: `^\d{1,19}$`) |
| type | string | Always `"workflows"` |
| attributes | object | Workflow attributes |
| relationships | object | Related resources |

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| access | object | TopicFieldsAccess – per-field edit permissions (see below) |
| can-edit | boolean | Whether the current user can edit the workflow |
| cost | string | Default cost value |
| description | string | Workflow description (nullable) |
| due-date | string (date-time) | Default due date (nullable) |
| for-creation | boolean | Whether the workflow is available for topic creation |
| name | string | Workflow name |
| send-notification | boolean | Whether to send notifications |
| title | string | Default title (nullable) |
| workflow-type | string | `"workflow"` or `"checklist"` |

### TopicFieldsAccess (access object)

The `access` object defines which topic fields can be edited. Each property is an object with `canEdit: boolean`:

| Field | Description |
|-------|-------------|
| comment | Can edit comments |
| title | Can edit title |
| description | Can edit description |
| assignedTo | Can edit assignee |
| ifcObjectGuid | Can edit IFC object GUID |
| hiddenObject | Can edit hidden objects |
| cameraState | Can edit camera state |
| status | Can edit status |
| setTopicDone | Can mark topic as done |
| setTopicClosed | Can close topic |
| buildingId | Can edit building ID |
| floorId | Can edit floor ID |
| labels | Can edit labels |
| sharedWithGroups | Can edit shared groups |
| dueDate | Can edit due date |
| cost | Can edit cost |
| priority | Can edit priority |
| isDeleted | Can mark as deleted |
| setTopicNotRelevant | Can mark topic as not relevant |

### Relationships

| Relationship | Type | Description |
|--------------|------|-------------|
| assigned-to-group | object | Default assigned group (`data`: `{ id, type: "groups" }` or null) |
| assigned-to-user | object | Default assigned user (`data`: `{ id, type: "users" }` or null) |
| attachments | object | Attachments (`data`: array) |
| can-be-assigned | object | Groups that can be assigned to topics |
| can-close | object | Groups that can close topics |
| can-comment | object | Groups that can add comments |
| can-edit-assigned-to-and-due-date | object | Groups that can edit assignee and due date |
| can-set-cost | object | Groups that can set cost |
| can-set-priority | object | Groups that can set priority |
| copy-workflow | object | Source workflow if copied (`data`: `{ id, type: "workflows" }` or null) |
| creation-author | object | User who created the workflow |
| editors | object | Users who can edit the workflow |
| general-access | object | Groups with general access to the workflow |
| labels | object | Topic labels (`data`: array of `{ id, type: "topic-labels" }`) |
| priority | object | Default topic priority (`data`: `{ id, type: "topic-priorities" }`) |
| topic-classifications | object | Topic classifications |
| workflow-classification | object | Workflow classification |

### Relationship reference types

| Type | ID pattern | Description |
|------|------------|-------------|
| groups | `^\d{1,19}$` | Group ID |
| users | string | User identifier (e.g., email) |
| attachments | `^\d{1,19}$` | Attachment ID |
| workflows | `^\d{1,19}$` | Workflow ID |
| topic-labels | `^\d{1,19}$` | Topic label ID |
| topic-priorities | `^\d{1,19}$` | Topic priority ID (default: `"2"`) |
| topic-classifications | `^\d{1,19}$` | Topic classification ID |
| workflow-classifications | `^\d{1,19}$` | Workflow classification ID |
