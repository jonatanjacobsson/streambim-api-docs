# Projects

API documentation for project-related endpoints in the StreamBIM API. These endpoints allow you to manage projects, project members, project templates, and project links.

**Authentication:** All endpoints require a Bearer token (ID token) in the Authorization header.

**Content Type:** `application/vnd.api+json` for request and response bodies.

**Base URL:** `https://{environment}.streambim.com` (e.g., `https://dev.streambim.com`, `https://sweden.streambim.com`)

---

## Global Project Members

### Get all project members

**GET** `/mgw/api/v3/project-members`

Retrieves all project members. You must filter by either `customerId` or `project` (one is required).

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| filter[customerId] | query | integer | One of filter params required | Filter project members by customer ID |
| filter[project] | query | integer | One of filter params required | Filter project members by project ID |

**Response schema**

Returns an object with `data` array of `GlobalProjectMembersPayload`:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Project member ID (e.g., XXXXX-user@example.com) |
| type | string | `project-members` |
| attributes.email | string | User email |
| attributes.expiration-date | string (date-time) | Expiration date for guests (privilege-level = 5) |
| attributes.last-login | string (date-time) | Last login timestamp |
| attributes.privilege-level | integer | 0, 5, 10, 15, 20, 25, or 30 |
| attributes.send-invitation | boolean | Whether to send invitation |
| attributes.sso-providers | array | SSO provider strings |
| relationships.user | object | User reference |
| relationships.project | object | Project reference |
| relationships.customer | object | Customer reference |

**Error codes**

| Code | Description |
|------|-------------|
| 400 | Invalid URL/query format. Filter parameters not in proper format, or customer ID not set/invalid. |
| 403 | Insufficient privileges to get the list of project members |

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/project-members?filter[customerId]=1" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

### Add project member

**POST** `/mgw/api/v3/project-members`

Adds a project member. Creates a new user if needed.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Request body parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| family-name | string | No | Surname |
| given-name | string | No | Given name |
| email | string | Yes* | User email (used to identify user) |
| phone | string | No | Phone number |
| title | string | No | User title |
| organization | string | No | Organization title |
| privilege-level | integer | No | 0, 5, 10, 15, 20, 25, or 30 |
| expiration-date | string (date-time) | No | Expiration date for guests (privilege-level = 5) |
| sso-providers | array | No | SSO provider strings, e.g. `["Provider_Name_1", "Provider_Name_2"]` |
| send-invitation | boolean | No | Send email invitation if needed |

**Relationships**

| Relationship | Type | Required | Description |
|--------------|------|----------|-------------|
| customer | object | Yes | `data.id` = project ID, `data.type` = `projects` |
| user-organization | object | No | `data.id` = user organization ID, `data.type` = `user-organizations` |

**Request schema (GlobalProjectMemberPostPayload)**

```json
{
  "data": {
    "type": "project-members",
    "attributes": {
      "family-name": "FAMILY_NAME",
      "given-name": "GIVEN_NAME",
      "email": "USER_EMAIL",
      "phone": "USER_PHONE",
      "title": "USER_TITLE",
      "organization": "USER_ORGANIZATION_TITLE",
      "privilege-level": 10,
      "expiration-date": "2025-12-31T23:59:59Z",
      "sso-providers": ["Provider_Name_1"],
      "send-invitation": true
    },
    "relationships": {
      "customer": {
        "data": { "id": "1552", "type": "projects" }
      },
      "user-organization": {
        "data": { "id": "ORG_ID", "type": "user-organizations" }
      }
    }
  }
}
```

**Response schema**

Returns `data` as `GlobalProjectMembersPayload`.

**Error codes**

| Code | Description |
|------|-------------|
| 400 | Invalid URL/query format |
| 403 | Insufficient privileges to post a project member record |

**curl example**

```bash
curl -X POST "https://dev.streambim.com/mgw/api/v3/project-members" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "project-members",
      "attributes": {
        "family-name": "Doe",
        "given-name": "Jane",
        "email": "jane@example.com",
        "privilege-level": 10,
        "send-invitation": true
      },
      "relationships": {
        "customer": {
          "data": { "id": "1552", "type": "projects" }
        }
      }
    }
  }'
```

---

### Get project member

**GET** `/mgw/api/v3/project-members/{projectMemberID}`

Retrieves a single project member by ID.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| projectMemberID | path | string | Yes | The project member ID (e.g., XXXXX-user@example.com) |

**Response schema**

Returns `data` as `GlobalProjectMembersPayload`.

**Error codes**

| Code | Description |
|------|-------------|
| 403 | Insufficient privileges to get the project member info |
| 404 | Project member not found; check projectMemberID |

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/project-members/XXXXX-user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

### Patch project member

**PATCH** `/mgw/api/v3/project-members/{projectMemberID}`

Updates a project member.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| projectMemberID | path | string | Yes | The project member ID |

**Request body parameters (GlobalProjectMemberPatchPayload)**

| Parameter | Type | Description |
|-----------|------|-------------|
| privilege-level | integer | User privilege level |
| expiration-date | string (date-time) | Expiration date for guests (privilege-level = 5) |
| sso-providers | array | SSO provider strings |
| send-invitation | boolean | Send email invitation if needed |

**Relationships**

| Relationship | Type | Description |
|--------------|------|-------------|
| customer | object | `data.id` = project ID, `data.type` = `projects` |
| user-organization | object | `data.id` = user organization ID |
| user | object | `data.id` = user email, `data.type` = `users` |

**Request schema**

```json
{
  "data": {
    "type": "project-members",
    "attributes": {
      "privilege-level": 15,
      "expiration-date": "2025-12-31T23:59:59Z",
      "sso-providers": ["Provider_Name_1"],
      "send-invitation": false
    },
    "relationships": {
      "customer": { "data": { "id": "1552", "type": "projects" } },
      "user-organization": { "data": { "id": "ORG_ID", "type": "user-organizations" } },
      "user": { "data": { "id": "user@example.com", "type": "users" } }
    }
  }
}
```

**Response schema**

Returns `data` as `GlobalProjectMembersPayload`.

**Error codes**

| Code | Description |
|------|-------------|
| 400 | Invalid URL/query format |
| 403 | Insufficient privileges to patch the project member record |
| 404 | User not found |

**curl example**

```bash
curl -X PATCH "https://dev.streambim.com/mgw/api/v3/project-members/XXXXX-user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "project-members",
      "attributes": {
        "privilege-level": 15
      }
    }
  }'
```

---

## Projects

### Get all projects

**GET** `/mgw/api/v3/projects`

Retrieves all projects. Filter options can be combined.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| filter[active] | query | boolean | No | `true` = active only, `false` = inactive only, omit = all |
| filter[hibernated] | query | boolean | No | Filter by hibernated/revived state |
| filter[isLibrary] | query | boolean | No | `true` = libraries only, `false` = projects only |
| filter[externalId] | query | string | No | Filter by external ID |

**Response schema (Project)**

Returns `data` array of Project objects:

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Project ID |
| type | string | `projects` |
| attributes.bcf-id | string (uuid) | BCF ID |
| attributes.coords | string | Coordinates |
| attributes.created-at | string (date-time) | Creation timestamp |
| attributes.deleted-at | string (date-time) \| null | Deletion timestamp |
| attributes.description | string | Project description |
| attributes.external-id | string | External ID for integration |
| attributes.is-hibernated | boolean | Hibernated state (read-only, owner-only access) |
| attributes.is-inactive | boolean | Inactive state (hidden, deleted after 30 days) |
| attributes.is-library | boolean | Whether this is a library |
| attributes.name | string | Project name |
| attributes.project-uri | string (uri) | Project URI |
| attributes.salesforce-account-id | string \| null | Salesforce account ID |
| attributes.salesforce-account-name | string \| null | Salesforce account name |
| attributes.salesforce-project-id | string \| null | Salesforce project ID |
| attributes.status | string | `Running`, `Starting`, `Crashed`, or `Stopped` |
| attributes.sync_template | integer \| null | Sync template ID |
| relationships.customer | object | Customer reference |
| relationships.owner | object | Owner (user) reference |
| relationships.features | object | Features array |

**Example response**

```json
{
  "data": [
    {
      "id": 1552,
      "type": "projects",
      "attributes": {
        "bcf-id": "31e15de3-9992-4d53-b86d-48938c9eeafb",
        "coords": "",
        "created-at": "2023-11-14T09:20:31.263606Z",
        "deleted-at": null,
        "description": "This is a description",
        "external-id": "1111",
        "is-hibernated": false,
        "is-inactive": false,
        "is-library": false,
        "name": "Post test 1 Delete me",
        "project-uri": "dev.streambim.com/webapp/default/#/?projectId=1552",
        "salesforce-account-id": null,
        "salesforce-account-name": null,
        "salesforce-project-id": null,
        "status": "Running",
        "sync_template": null
      },
      "relationships": {
        "customer": { "data": { "id": 0, "type": "customers" } },
        "features": {
          "data": [
            {
              "id": "FEATURE_ID",
              "type": "features",
              "attributes": { "enabled": false }
            }
          ]
        },
        "owner": { "data": { "id": "OWNER_EMAIL", "type": "users" } }
      }
    }
  ]
}
```

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/projects?filter[active]=true&filter[hibernated]=false" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

### Create project

**POST** `/mgw/api/v3/projects`

Creates a new project.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Request body parameters (ProjectsPostPayload)**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Project name |
| is-library | boolean | No | `false` for projects, `true` for libraries |
| template-project-id | integer | No | ID of project to use as template |
| project-template-id | integer | No | Template ID for the new project |
| description | string | No | Project description |
| externalId | string | No | External ID for integration |
| is-hibernated | boolean | No | If `true`, project is read-only, owner-only |
| is-inactive | boolean | No | If `true`, project is hidden and deleted after 30 days |

**Relationships**

| Relationship | Type | Description |
|--------------|------|-------------|
| owner | object | `data.id` = owner email, `data.type` = `users`. If empty, request sender is owner. |
| customer | object | `data.id` = customer ID, `data.type` = `customers` |

**Request schema**

```json
{
  "data": {
    "type": "project-post-payload",
    "attributes": {
      "name": "My New Project",
      "is-library": false,
      "template-project-id": null,
      "project-template-id": null,
      "description": "Project description",
      "externalId": "EXT-001",
      "is-hibernated": false,
      "is-inactive": false
    },
    "relationships": {
      "owner": { "data": { "id": "owner@example.com", "type": "users" } },
      "customer": { "data": { "id": "1", "type": "customers" } }
    }
  }
}
```

**Response schema**

Returns `data` as array of `Project`.

**curl example**

```bash
curl -X POST "https://dev.streambim.com/mgw/api/v3/projects" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "project-post-payload",
      "attributes": {
        "name": "My New Project",
        "description": "Project description"
      }
    }
  }'
```

---

### Get project info

**GET** `/mgw/api/v3/projects/{projectID}`

Retrieves a single project by ID.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| projectID | path | integer | Yes | The project ID |

**Response schema**

Returns `data` as `Project`.

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/projects/1552" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

### Start inactive project

**GET** `/mgw/api/v1/projects/{projectID}/_starttrigger`

Starts a project that has been inactive for more than 2 weeks.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| projectID | path | integer | Yes | The project ID |

**Response schema**

Success returns 200 with "Project started".

**Error codes**

| Code | Description |
|------|-------------|
| 401 | Don't have access to the project |

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v1/projects/1552/_starttrigger" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

## Project-Scoped Project Info

These endpoints are accessed within a project context (using the `/project-{id}/api/` prefix) rather than via the global management gateway.

### Get project info (project-scoped)

**GET** `/project-{projectId}/api/v1/v2/projects/{projectId}`

Returns project information from within a project-scoped API context. This is an alternative to the global `GET /mgw/api/v3/projects/{projectID}` endpoint, accessible with project-level authentication.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | integer | Yes | The project ID (appears twice in the URL path) |

**Response** `200 OK`

Returns a project object in JSON:API format with project attributes and relationships.

**curl example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/v2/projects/42"
```

---

## Customer Projects (Enterprise)

These endpoints are for enterprise users to manage projects within their customer context.

### Get all projects (enterprise)

**GET** `/mgw/api/v3/customer-projects`

Returns all projects the user has access to. Only core properties are displayed.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| filter | query | object | No | Same filter options as GET /mgw/api/v3/projects |

**Response schema**

Returns `data` array of `CustomerProject` (similar to Project).

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/customer-projects" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

### Create project (enterprise)

**POST** `/mgw/api/v3/customer-projects`

Creates a new project for enterprise users. Allows setting another user as project owner.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Request body parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Project name |
| external-id | string | No | External ID for integration |
| description | string | No | Project description |
| is-inactive | boolean | No | If `true`, project is hidden and deleted after 30 days |
| is-hibernated | boolean | No | If `true`, project is read-only, owner-only |
| project-template-id | integer | No | Template ID for sync by sync template rule |

**Relationships**

| Relationship | Type | Description |
|--------------|------|-------------|
| owner | object | `data.id` = owner email. If empty, request sender is owner. |
| customer | object | `data.id` = customer ID |

**Request schema**

```json
{
  "data": {
    "type": "customer-projects",
    "attributes": {
      "name": "PROJECT_NAME",
      "external-id": "EXT-001",
      "description": "DESCRIPTION",
      "is-inactive": false,
      "is-hibernated": false,
      "project-template-id": 0
    },
    "relationships": {
      "owner": { "data": { "id": "OWNER_EMAIL", "type": "users" } },
      "customer": { "data": { "id": 0, "type": "customers" } }
    }
  }
}
```

**Response schema**

Returns `data` as array of `Project`.

**curl example**

```bash
curl -X POST "https://dev.streambim.com/mgw/api/v3/customer-projects" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "customer-projects",
      "attributes": {
        "name": "My Enterprise Project",
        "description": "Project description"
      },
      "relationships": {
        "customer": { "data": { "id": 0, "type": "customers" } }
      }
    }
  }'
```

---

### Get project by ID (enterprise)

**GET** `/mgw/api/v3/customer-projects/{projectID}`

Retrieves a single project by ID for enterprise users.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| projectID | path | integer | Yes | The project ID |

**Response schema**

Returns `data` as `CustomerProject`.

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/customer-projects/1552" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

### Modify project (enterprise)

**PATCH** `/mgw/api/v3/customer-projects/{projectID}`

Modifies a project. Allows hibernate/revive, activate/deactivate, change owner, name, and description.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| projectID | path | integer | Yes | The project ID |

**Request body parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Project ID (omit or same as path param) |
| name | string | Project name |
| external-id | string | External ID |
| description | string | Project description |
| is-inactive | boolean | If `true`, project is hidden and deleted after 30 days |
| is-hibernated | boolean | If `true`, project is read-only, owner-only |
| project-template-id | integer | Template ID for sync |

**Relationships**

| Relationship | Type | Description |
|--------------|------|-------------|
| owner | object | `data.id` = owner email |
| customer | object | `data.id` = customer ID |

**Request schema**

```json
{
  "data": {
    "id": "1552",
    "type": "customer-projects",
    "attributes": {
      "name": "Updated Project Name",
      "external-id": "EXT-001",
      "description": "Updated description",
      "is-inactive": false,
      "is-hibernated": false,
      "project-template-id": 0
    },
    "relationships": {
      "owner": { "data": { "id": "OWNER_EMAIL", "type": "users" } },
      "customer": { "data": { "id": 0, "type": "customers" } }
    }
  }
}
```

**Response schema**

Returns `data` as array of `CustomerProject`.

**Error codes**

| Code | Description |
|------|-------------|
| 403 | Insufficient privileges to make changes to the project |
| 404 | User or project not found |
| 500 | Unable to fetch data from database or internal server error |

**curl example**

```bash
curl -X PATCH "https://dev.streambim.com/mgw/api/v3/customer-projects/1552" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -d '{
    "data": {
      "id": "1552",
      "type": "customer-projects",
      "attributes": {
        "name": "Updated Project Name",
        "is-hibernated": false
      }
    }
  }'
```

---

## Project Links

### Get lightweight project info snippets

**GET** `/mgw/api/v3/project-links`

Returns lightweight project info snippets (id, name, description, external-id, project-uri, is-hibernated, is-library).

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Response schema (ProjectLinks)**

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Project ID |
| type | string | `project-links` |
| attributes.name | string | Project name |
| attributes.description | string | Project description |
| attributes.external-id | string | External ID |
| attributes.project-uri | string (uri) | Project URI |
| attributes.is-hibernated | boolean | Hibernated state |
| attributes.is-library | boolean | Whether this is a library |

**Example response**

```json
{
  "data": [
    {
      "id": 1552,
      "type": "project-links",
      "attributes": {
        "name": "PROJECT_NAME",
        "description": "DESCRIPTION",
        "external-id": "EXT-001",
        "is-hibernated": false,
        "is-library": false,
        "project-uri": "https://dev.streambim.com/webapp/default/#/?projectId=1552"
      }
    }
  ]
}
```

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/project-links" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

## Project Templates

### Get project templates

**GET** `/mgw/api/v3/project-templates`

Retrieves all project templates.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Response schema**

Returns `data` array of `ProjectTemplate`.

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/project-templates" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

### Get project template info

**GET** `/mgw/api/v3/project-templates/{projectTemplateID}`

Retrieves a single project template by ID.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Parameters**

| Parameter | Location | Type | Required | Description |
|-----------|----------|------|----------|-------------|
| projectTemplateID | path | integer | Yes | The project template ID |

**Response schema (ProjectTemplate)**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Template ID (1-6 digits) |
| type | string | `project-templates` |
| attributes.name | string | Template name |
| attributes.content | array | Content array (see Content schema below) |
| attributes.created-at | string (date-time) | Creation timestamp |
| attributes.last-modified-at | string (date-time) | Last modified timestamp |
| relationships.customer | object | Customer reference |
| relationships.created-by | object | Creator (user) reference |
| relationships.last-modified-by | object | Last modifier (user) reference |

**Content schema**

Each item in `attributes.content`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sourceProjectId | integer | Yes | Source project ID |
| key | string | Yes | Key |
| value | string | Yes | Value |
| renameTo | string | No | Rename target |

**curl example**

```bash
curl -X GET "https://dev.streambim.com/mgw/api/v3/project-templates/1" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json"
```

---

## Project Stats

### Get Project Stats

**`GET /project-{projectId}/api/v1/v2/project-stats/{projectId}`**

Fetches aggregate statistics for the project including document counts, model sizes, topic counts, and enabled features.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | integer | Yes | The project ID |

**Response** `200 OK`

```json
{
    "data": {
        "id": "60",
        "type": "project-stats",
        "attributes": {
            "custom-floorplans": 0,
            "error": null,
            "from-template-id": null,
            "ifc-file-size": 52428800,
            "num-actual-topics": 5,
            "num-buildings": 1,
            "num-checklists": 2,
            "num-closed-topics": 1,
            "num-documents": 15,
            "num-done-topics": 3,
            "num-folders": 4,
            "num-groups": 2,
            "num-ifc": 3,
            "num-ifc-models": 2,
            "num-open-topics": 1,
            "num-spaces": 10,
            "num-templates": 0,
            "num-topics": 5,
            "num-users": 8,
            "public-template-order": null,
            "successful-conversions": 12
        },
        "relationships": {
            "features": {
                "data": [
                    { "id": "3D", "type": "features" },
                    { "id": "INTERAXO", "type": "features" }
                ]
            },
            "project": {
                "data": { "id": "60", "type": "projects" }
            }
        }
    }
}
```

The `features` relationship lists enabled feature flags for the project (e.g. `3D`, `INTERAXO`, `CHECKLISTS`, `STREAMBIM`).

---

## Last-Modifieds

### Get Last-Modifieds for Building

**`GET /project-{projectId}/api/v1/v2/last-modifieds/{buildingId}`**

Returns the most recent modification timestamps for a building, tracking both app-level changes and model conversion changes separately. Used by the app for cache invalidation and polling.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | integer | Yes | The project ID |
| `buildingId` | integer | Yes | The building ID |

**Response** `200 OK`

```json
{
    "data": {
        "id": "1000",
        "type": "last-modifieds",
        "attributes": {
            "last-modified-app": "2026-03-16T11:02:35Z",
            "last-modified-conversion": "2026-03-14T01:38:36.006552866Z"
        }
    }
}
```

| Attribute | Type | Description |
|---|---|---|
| `last-modified-app` | string | ISO 8601 timestamp of last app-level change to the building |
| `last-modified-conversion` | string | ISO 8601 timestamp of last completed model conversion |
