# BCF 2.1 API

StreamBIM implements the [BIM Collaboration Format (BCF) 2.1](https://github.com/buildingSMART/BCF-XML) REST API for managing BCF topics and projects. Use these endpoints to list projects, list and filter topics, and create new topics.

**Base URL:** `https://{environment}.streambim.com`  
**Authentication:** Bearer token required (JWT)  
**Content-Type:** `application/json` for POST requests

---

## Authentication

All BCF endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

Obtain a token via the [authentication endpoint](/docs/api/authentication.md).

---

## Endpoints

### 1. List BCF Projects

Returns all BCF projects accessible to the authenticated user.

| Method | Path | Auth |
|--------|------|------|
| GET | `/bcf/2.1/projects` | Bearer token |

#### Response Schema

Array of `project_GET` objects:

| Field | Type | Description |
|-------|------|-------------|
| `project_id` | string | Unique project identifier |
| `name` | string | Project name |
| `authorization.project_actions` | array | Allowed actions: `"update"`, `"createTopic"`, `"createDocument"` |

#### cURL Example

```bash
curl -X GET "https://sweden.streambim.com/bcf/2.1/projects" \
  -H "Authorization: Bearer <your_access_token>"
```

#### Example Response

```json
[
  {
    "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "My BCF Project",
    "authorization": {
      "project_actions": ["update", "createTopic", "createDocument"]
    }
  }
]
```

---

### 2. List Topics

Lists BCF topics for a project with optional OData `$filter` support.

| Method | Path | Auth |
|--------|------|------|
| GET | `/bcf/2.1/projects/{projectUUID}/topics` | Bearer token |

**Path parameter:** `projectUUID` — The project's BCF UUID (obtained from `GET /bcf/2.1/projects`).

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `$filter` | string | OData filter expression. Example: `topic_status eq 'open'` |

#### Filter Parameters (OData)

| Parameter | Type | Description |
|-----------|------|-------------|
| `creation_author` | string | User ID of the creation author (from extensions) |
| `modified_author` | string | User ID of the modified author (from extensions) |
| `assigned_to` | string | User ID of the assigned person (from extensions) |
| `stage` | string | Stage this topic is part of (from extensions) |
| `topic_status` | string | Status of the topic (from extensions) |
| `topic_type` | string | Type of the topic (from extensions) |
| `creation_date` | datetime | Creation date of the topic |
| `modified_date` | datetime | Modification date of the topic |
| `labels` | array (string) | Labels of the topic (from extensions) |
| `priority` | string | Priority of the topic (from extensions) |

**Note:** Only one filter parameter can be used at a time.

#### Response Schema (topic_GET)

| Field | Type | Description |
|-------|------|-------------|
| `guid` | uuid | Unique topic identifier |
| `server_assigned_id` | string | Server-assigned ID |
| `topic_type` | string | Type/workflow of the topic |
| `topic_status` | string | Status (e.g. open, closed) |
| `reference_links` | string[] | Reference URLs |
| `title` | string | Topic title |
| `priority` | string | Priority level |
| `index` | integer | Sort index |
| `labels` | string[] | Topic labels |
| `creation_date` | datetime | Creation timestamp |
| `creation_author` | string | Creator user ID |
| `modified_date` | datetime | Last modification timestamp |
| `modified_author` | string | Last modifier user ID |
| `assigned_to` | string | Assigned user ID |
| `stage` | string | Stage identifier |
| `description` | string | Topic description |
| `bim_snippet` | object | BIM snippet (see below) |
| `due_date` | string | Due date |
| `authorization.topic_actions` | array | Allowed actions: `update`, `updateBimSnippet`, `updateRelatedTopics`, `updateDocumentServices`, `updateFiles`, `createComment`, `createViewpoint` |
| `authorization.topic_status` | string[] | Allowed status values |

**bim_snippet object:**

| Field | Type | Description |
|-------|------|-------------|
| `snippet_type` | string | e.g. `clash` |
| `is_external` | string | Whether the reference is external |
| `reference` | string | Reference URL |
| `reference_schema` | string | Schema URL (e.g. XSD) |

#### cURL Example

```bash
curl -X GET "https://sweden.streambim.com/bcf/2.1/projects/a1b2c3d4-e5f6-7890-abcd-ef1234567890/topics?\$filter=topic_status%20eq%20'open'" \
  -H "Authorization: Bearer <your_access_token>"
```

---

### 3. Create Topic

Creates a new BCF topic in a project.

| Method | Path | Auth |
|--------|------|------|
| POST | `/bcf/2.1/projects/{projectUUID}/topics` | Bearer token |

**Path parameter:** `projectUUID` — The project's BCF UUID (obtained from `GET /bcf/2.1/projects`).

#### Request Body (topic_POST)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | Topic title |
| `topic_type` | string | No | Workflow name (use to assign topic to a workflow) |
| `guid` | string | No | Custom GUID (optional) |
| `topic_status` | string | No | e.g. `open` |
| `reference_links` | string[] | No | Reference URLs |
| `priority` | string | No | e.g. `high`, `medium`, `low` |
| `index` | integer | No | Sort index |
| `labels` | string[] | No | Topic labels |
| `assigned_to` | string | No | User email/ID to assign |
| `stage` | string | No | Stage identifier |
| `description` | string | No | Topic description |
| `bim_snippet` | object | No | BIM snippet (snippet_type, is_external, reference, reference_schema) |
| `due_date` | string | No | Due date |

#### Example POST Body

```json
{
  "topic_type": "WORKFLOW_NAME",
  "topic_status": "open",
  "title": "Example topic",
  "priority": "high",
  "labels": ["Architecture", "Heating"],
  "assigned_to": "user@example.com",
  "bim_snippet": {
    "snippet_type": "clash",
    "is_external": true,
    "reference": "https://example.com/bcf/1.0/ADFE23AA11BCFF444122BB",
    "reference_schema": "https://example.com/bcf/1.0/clash.xsd"
  }
}
```

#### cURL Example

```bash
curl -X POST "https://sweden.streambim.com/bcf/2.1/projects/a1b2c3d4-e5f6-7890-abcd-ef1234567890/topics" \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_type": "WORKFLOW_NAME",
    "topic_status": "open",
    "title": "Example topic",
    "priority": "high",
    "labels": ["Architecture", "Heating"],
    "assigned_to": "user@example.com",
    "bim_snippet": {
      "snippet_type": "clash",
      "is_external": true,
      "reference": "https://example.com/bcf/1.0/ADFE23AA11BCFF444122BB",
      "reference_schema": "https://example.com/bcf/1.0/clash.xsd"
    }
  }'
```
