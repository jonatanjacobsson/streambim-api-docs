# Users and Organizations

This document describes the StreamBIM API endpoints for managing users, project members, invitations, organizations, and customer user profiles. Project-level endpoints operate within a specific project context; global management endpoints (enterprise) operate across the entire customer account.

---

## Authentication

All endpoints require Bearer token authentication. Obtain an `idToken` by calling **POST** `/auth/v1/login` with your username and password. Include the token in every request:

| Header | Value |
|--------|-------|
| **Authorization** | `Bearer {idToken}` |

---

## Content Type

All requests and responses use the JSON:API media type:

| Header | Value |
|--------|-------|
| **Content-Type** | `application/vnd.api+json` |
| **Accept** | `application/vnd.api+json` |

---

## Base URL

```
https://{environment}.streambim.com
```

**Environments:** `app`, `sweden`, `japan`, `australia`, `staging`, `dev`

---

## Privilege Levels

Project members have privilege levels that control access:

| Level | Role |
|-------|------|
| 0 | Inactive |
| 5 | Guest |
| 10 | User |
| 15 | Workflows admin |
| 20 | Project admin |
| 25 | Customer admin |
| 30 | Owner |

---

## User Schema

The User resource has the following structure:

| Field | Type | Description |
|-------|------|-------------|
| **id** | string (email) | User's unique identifier (email address) |
| **name** | string | Full display name |
| **first-name** | string | Given name |
| **last-name** | string | Family name |
| **organization** | string | Organization name |
| **title** | string | Job title |
| **phone** | string | Phone number |
| **language** | string | Preferred language |
| **guest** | boolean | Whether user has guest privilege level |
| **time-zone** | string | Time zone (e.g. `Europe/Oslo`) |
| **expiration-date** | string (date-time) | Account expiration date |
| **role** | string | `customer` or `rendra_staff` |

---

# Project-Level User Endpoints

## Get all project users

**GET** `/project-{projectId}/api/v1/v2/users`

Returns all users in the project. Supports filtering by groups, guest status, and expired users.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| filter[groups] | string | JSON array of group IDs, e.g. `["GROUPID_1", "GROUPID_2"]` |
| filter[withoutGuests] | boolean | If `true`, exclude users with guest privilege level |
| filter[onlyGuests] | boolean | If `true`, return only guests (admin+ only) |
| filter[expired] | boolean | If `true`, include expired users (admin+ only, requires `onlyGuests=true`) |

### Response

Returns `data` array of User objects.

### Error Codes

| Code | Description |
|------|-------------|
| 401 | Not authorized. Log in via POST /auth/v1/login |
| 403 | Permission denied. No access to this project |

### Example

```bash
curl -X GET "https://{environment}.streambim.com/project-123/api/v1/v2/users?filter[withoutGuests]=true" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Invite user to project

**POST** `/project-{projectId}/api/v1/v2/invites`

Sends an email invitation to a user identified by their email address.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.type | string | Yes | `invites` |
| data.attributes.email | string | Yes | Invitee's email address |
| data.attributes.sso-providers | array | No | List of SSO provider names to restrict auth (empty = all methods allowed) |
| data.relationships.project.data.id | string | Yes | Project ID |
| data.relationships.project.data.type | string | Yes | `projects` |

### Response

Returns the created Invite resource.

### Error Codes

| Code | Description |
|------|-------------|
| 401 | Not authorized. Log in via POST /auth/v1/login |
| 403 | Permission denied. No access to this project |
| 404 | The new user was not found in the database |

### Example

```bash
curl -X POST "https://{environment}.streambim.com/project-123/api/v1/v2/invites" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "invites",
      "attributes": {
        "email": "user@example.com",
        "sso-providers": []
      },
      "relationships": {
        "project": {
          "data": { "id": "123", "type": "projects" }
        }
      }
    }
  }'
```

---

## Get project members

**GET** `/project-{projectId}/api/v1/v2/project-members`

Returns a list of project members with their access levels (privilege levels 0–30).

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |

### Response

Returns `data` array of project member objects with attributes: `privilege-level`, `invited`, `guest`, `given-name`, `family-name`, `organization`, `phone`, `time-zone`, `title`, `sso-providers`, and relationships to `user`, `project`, `user-organization`.

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid URL/query format. Filter parameters not in proper format |

### Example

```bash
curl -X GET "https://{environment}.streambim.com/project-123/api/v1/v2/project-members" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Add user to project without invitation

**POST** `/project-{projectId}/api/v1/v2/project-members`

Adds a user to the project directly without sending an invitation email.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.id | string | Yes | Project member ID (e.g. `XXXXX-user@example.com`) |
| data.type | string | Yes | `project-members` |
| data.attributes.privilege-level | integer | Yes | 0, 5, 10, 15, 20, 25, or 30 |
| data.attributes.invited | boolean | No | Default: false |
| data.attributes.guest | boolean | No | Add as guest if true |
| data.attributes.password | string | No | Temporary password for login |
| data.attributes.given-name | string | No | Given name |
| data.attributes.family-name | string | No | Family name |
| data.attributes.title | string | No | Job title |
| data.attributes.organization | string | No | Organization name |
| data.attributes.phone | string | No | Phone number |
| data.attributes.time-zone | string | No | Time zone (e.g. `Europe/Oslo`) |
| data.attributes.sso-providers | array | No | SSO provider names (empty = all allowed) |
| data.relationships.user.data.id | string | Yes | User email (user ID) |
| data.relationships.user.data.type | string | Yes | `users` |
| data.relationships.project.data.id | string | Yes | Project ID |
| data.relationships.project.data.type | string | Yes | `projects` |
| data.relationships.user-organization.data.id | string | No | Organization ID |
| data.relationships.user-organization.data.type | string | No | `user-organizations` |

### Response

Returns the created project member resource.

### Example

```bash
curl -X POST "https://{environment}.streambim.com/project-123/api/v1/v2/project-members" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "project-members",
      "id": "123-user@example.com",
      "attributes": {
        "family-name": "Smith",
        "given-name": "John",
        "guest": false,
        "invited": false,
        "organization": "Acme Corp",
        "password": "<YOUR_PASSWORD>",
        "privilege-level": 10,
        "time-zone": "Europe/Oslo"
      },
      "relationships": {
        "project": { "data": { "id": "123", "type": "projects" } },
        "user": { "data": { "id": "user@example.com", "type": "users" } }
      }
    }
  }'
```

---

## Get project member details

**GET** `/project-{projectId}/api/v1/v2/project-members/{projectMemberID}`

Returns details for a specific project member.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |
| projectMemberID | string | Yes | The project member ID (e.g. `XXXXX-user@example.com`) |

### Response

Returns the project member resource.

### Error Codes

| Code | Description |
|------|-------------|
| 403 | No access to the project |
| 404 | Project member not found |

### Example

```bash
curl -X GET "https://{environment}.streambim.com/project-123/api/v1/v2/project-members/123-user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Change project membership

**PATCH** `/project-{projectId}/api/v1/v2/project-members/{projectMemberID}`

Modifies a project member's privilege level, user details, or organization.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |
| projectMemberID | string | Yes | The project member ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.type | string | Yes | `project-members` |
| data.attributes.privilege-level | integer | No | 5, 10, 15, 20, 25, or 30 |
| data.attributes.given-name | string | No | Given name |
| data.attributes.family-name | string | No | Family name |
| data.attributes.organization | string | No | Organization name |
| data.attributes.phone | string | No | Phone number |
| data.attributes.time-zone | string | No | Time zone |
| data.attributes.title | string | No | Job title |
| data.attributes.sso-providers | array | No | SSO provider names |
| data.relationships.project.data.id | string | Yes | Project ID |
| data.relationships.user.data.id | string | Yes | User email |
| data.relationships.user-organization.data.id | string | No | Organization ID (from `/user-organizations`) |

### Response

Returns the updated project member resource.

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Mismatch between project member ID and user ID or project ID |
| 403 | Cannot change own privilege level; cannot set level above project admin; only project admins+ can change privilege |
| 404 | User does not exist |

### Example

```bash
curl -X PATCH "https://{environment}.streambim.com/project-123/api/v1/v2/project-members/123-user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "project-members",
      "attributes": { "privilege-level": 15 },
      "relationships": {
        "project": { "data": { "id": "123", "type": "projects" } },
        "user": { "data": { "id": "user@example.com", "type": "users" } }
      }
    }
  }'
```

---

## Get customer organizations (project context)

**GET** `/project-{projectId}/api/v1/v2/user-organizations`

Returns all customer organizations (not specific to the project).

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |

### Response

Returns `data` array of organization objects with attributes: `name`, `number`, `country`, `external-id`, and `customer` relationship.

### Example

```bash
curl -X GET "https://{environment}.streambim.com/project-123/api/v1/v2/user-organizations" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Get organization details (project context)

**GET** `/project-{projectId}/api/v1/v2/user-organizations/{organizationID}`

Returns details for a specific customer organization.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID (minimum: 1) |
| organizationID | integer | Yes | The organization ID (minimum: 1) |

### Response

Returns the organization resource with attributes: `name`, `number`, `country`, `external-id`, and `customer` relationship.

### Example

```bash
curl -X GET "https://{environment}.streambim.com/project-123/api/v1/v2/user-organizations/100" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

# Global User Endpoints (Enterprise)

## Get all customer organizations

**GET** `/mgw/api/v3/user-organizations`

Returns all customer organizations for the enterprise account.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Response

Returns `data` array of organization objects.

### Example

```bash
curl -X GET "https://{environment}.streambim.com/mgw/api/v3/user-organizations" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Add customer organization

**POST** `/mgw/api/v3/user-organizations`

Creates a new customer organization. Requires `name`, `number`, `country`, and `external-id`.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.type | string | Yes | `user-organizations` |
| data.attributes.name | string | Yes | Organization name |
| data.attributes.number | string | Yes | Organization number |
| data.attributes.country | string | Yes | Country |
| data.attributes.external-id | string | Yes | External system identifier |
| data.relationships.customer.data.id | string | Yes | Customer ID (1–19 digits) |
| data.relationships.customer.data.type | string | Yes | `customers` |

### Response

Returns the created organization resource.

### Example

```bash
curl -X POST "https://{environment}.streambim.com/mgw/api/v3/user-organizations" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "user-organizations",
      "attributes": {
        "name": "Acme Corp",
        "number": "123456",
        "country": "NO",
        "external-id": "ext-001"
      },
      "relationships": {
        "customer": { "data": { "id": "10", "type": "customers" } }
      }
    }
  }'
```

---

## Get organization details (global)

**GET** `/mgw/api/v3/user-organizations/{organizationID}`

Returns details for a specific customer organization.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organizationID | integer | Yes | The organization ID (minimum: 1) |

### Response

Returns the organization resource.

### Example

```bash
curl -X GET "https://{environment}.streambim.com/mgw/api/v3/user-organizations/100" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Edit organization

**PATCH** `/mgw/api/v3/user-organizations/{organizationID}`

Updates an existing customer organization.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organizationID | integer | Yes | The organization ID (minimum: 1) |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.id | string | Yes | Organization ID |
| data.type | string | Yes | `user-organizations` |
| data.attributes.name | string | Yes | Organization name |
| data.attributes.number | string | Yes | Organization number |
| data.attributes.country | string | Yes | Country |
| data.attributes.external-id | string | Yes | External system identifier |
| data.relationships.customer.data.id | string | Yes | Customer ID |
| data.relationships.customer.data.type | string | Yes | `customers` |

### Response

Returns the updated organization resource.

### Example

```bash
curl -X PATCH "https://{environment}.streambim.com/mgw/api/v3/user-organizations/100" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "id": "100",
      "type": "user-organizations",
      "attributes": {
        "name": "Acme Corp Updated",
        "number": "123456",
        "country": "NO",
        "external-id": "ext-001"
      },
      "relationships": {
        "customer": { "data": { "id": "10", "type": "customers" } }
      }
    }
  }'
```

---

## Delete organization

**DELETE** `/mgw/api/v3/user-organizations/{organizationID}`

Deletes a customer organization.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| organizationID | integer | Yes | The organization ID (minimum: 1) |

### Response

Returns `data: null` on success.

### Example

```bash
curl -X DELETE "https://{environment}.streambim.com/mgw/api/v3/user-organizations/100" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Get all customers

**GET** `/mgw/api/v2/customers`

Returns all customers for the enterprise account.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Response

Returns `data` array of customer objects.

### Example

```bash
curl -X GET "https://{environment}.streambim.com/mgw/api/v2/customers" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Get users (enterprise)

**GET** `/mgw/api/v3/users`

Returns users filtered by customer or project. You must specify either `customerId` or `project`.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filter[customerId] | integer | No* | Filter by customer ID |
| filter[project] | integer | No* | Filter by project ID |
| filter[expired] | boolean | No | If `true`, return only expired guests |
| filter[withoutGuests] | boolean | No | If `true`, exclude guests |
| filter[onlyGuests] | boolean | No | If `true`, return only guests |
| filter[globalProfile] | boolean | No | If `true`, populate from global profile |

*At least one of `customerId` or `project` must be specified.

### Response

Returns `data` array of User objects.

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid filter format |
| 403 | Insufficient privileges |

### Example

```bash
curl -X GET "https://{environment}.streambim.com/mgw/api/v3/users?filter[customerId]=1&filter[withoutGuests]=true" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Get user info (enterprise)

**GET** `/mgw/api/v3/users/{userID}`

Returns details for a specific user. The requesting user must be an active member of a project that the requested user belongs to.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userID | string | Yes | User ID (email address) |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| filter[project] | integer | Project ID; when set, returns last login and guest status |
| filter[setLastLogin] | boolean | If `true`, updates last login date for the project |

When `filter[project]` is set and the userID is the current user: returns allowed providers, organization ID, and customer user profile info. If `filter[setLastLogin]=true`, updates last login date.

### Response

Returns User object with attributes: `first-name`, `last-name`, `name`, `phone`, `title`, `allowed-providers`, `expiration-date`, `language`, `last-login`, `guest`, `organization`, `role`, `time-zone`, and `user-organization` relationship.

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid filter format |
| 404 | Insufficient privileges or user not found |

### Example

```bash
curl -X GET "https://{environment}.streambim.com/mgw/api/v3/users/user@example.com?filter[project]=123" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Patch user (enterprise)

**PATCH** `/mgw/api/v3/users/{userID}`

Updates the current user's profile. You can only update your own user (userID must match the authenticated user).

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userID | string | Yes | User ID (email) — must be the current user |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.id | string | Yes | User ID (email) |
| data.type | string | Yes | `users` |
| data.attributes.first-name | string | No | Given name |
| data.attributes.last-name | string | No | Family name |
| data.attributes.title | string | No | Job title |
| data.attributes.phone | string | No | Phone (format: `+\d{6,15}`) |
| data.attributes.organization | string | No | Organization name (1–128 chars) |
| data.attributes.time-zone | string | No | Time zone (e.g. `Etc/GMT`) |
| data.attributes.language | string | No | Language (e.g. `en`) |

### Response

Returns the updated User resource.

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid format or attempting to update another user |
| 404 | User not found |

### Example

```bash
curl -X PATCH "https://{environment}.streambim.com/mgw/api/v3/users/user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "users",
      "id": "user@example.com",
      "attributes": {
        "first-name": "John",
        "last-name": "Smith",
        "title": "Engineer",
        "phone": "+4712345678",
        "organization": "Acme Corp",
        "time-zone": "Europe/Oslo",
        "language": "en"
      }
    }
  }'
```

---

# Customer User Profiles (Enterprise)

## Get customer user profiles

**GET** `/mgw/api/v3/customer-user-profiles`

Returns customer user profiles filtered by customer ID.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filter[customerId] | integer | Yes | Customer ID |

### Response

Returns `data` array of CustomerUserProfile objects.

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid filter format; organization does not belong to customer |
| 403 | Insufficient privileges |

### Example

```bash
curl -X GET "https://{environment}.streambim.com/mgw/api/v3/customer-user-profiles?filter[customerId]=1" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Add customer user profile

**POST** `/mgw/api/v3/customer-user-profiles`

Creates a new customer user profile.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.type | string | Yes | `customer-user-profiles` |
| data.id | string | Yes | Customer user profile ID |
| data.attributes.first-name | string | No | Given name (1–128 chars) |
| data.attributes.last-name | string | No | Family name (1–128 chars) |
| data.attributes.new-user-email | string | No | Email (alternative to user id) |
| data.attributes.phone | string | No | Phone (format: `+\d{6,15}`) |
| data.attributes.title | string | No | Job title |
| data.relationships.user.data.id | string | Yes | User email |
| data.relationships.user.data.type | string | Yes | `users` |
| data.relationships.customer.data.id | string | Yes | Customer ID |
| data.relationships.customer.data.type | string | Yes | `customers` |
| data.relationships.user-organization.data.id | string | No | Organization ID |
| data.relationships.user-organization.data.type | string | No | `user-organizations` |

### Response

Returns the created CustomerUserProfile resource.

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Organization does not belong to user's customer |
| 403 | Insufficient privileges |

### Example

```bash
curl -X POST "https://{environment}.streambim.com/mgw/api/v3/customer-user-profiles" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "customer-user-profiles",
      "id": "123-user@example.com",
      "attributes": {
        "first-name": "John",
        "last-name": "Smith",
        "new-user-email": "user@example.com",
        "phone": "+4712345678",
        "title": "Engineer"
      },
      "relationships": {
        "customer": { "data": { "id": "1", "type": "customers" } },
        "user": { "data": { "id": "user@example.com", "type": "users" } },
        "user-organization": { "data": { "id": "100", "type": "user-organizations" } }
      }
    }
  }'
```

---

## Get customer user profile

**GET** `/mgw/api/v3/customer-user-profiles/{id}`

Returns a specific customer user profile by ID.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Customer user profile ID (e.g. `XXXXX-user@example.com`) |

### Response

Returns the CustomerUserProfile resource with attributes: `first-name`, `last-name`, `new-user-email`, `phone`, `title`, `created-at`, `last-modified-at`, and relationships: `user`, `customer`, `user-organization`, `created-by`, `last-modified-by`.

### Error Codes

| Code | Description |
|------|-------------|
| 403 | Insufficient privileges |
| 404 | Customer user profile not found |

### Example

```bash
curl -X GET "https://{environment}.streambim.com/mgw/api/v3/customer-user-profiles/123-user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

## Update customer user profile

**PATCH** `/mgw/api/v3/customer-user-profiles/{id}`

Updates an existing customer user profile.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Customer user profile ID |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| data.type | string | Yes | `customer-user-profiles` |
| data.id | string | Yes | Customer user profile ID |
| data.attributes.first-name | string | No | Given name (1–128 chars) |
| data.attributes.last-name | string | No | Family name (1–128 chars) |
| data.attributes.phone | string | No | Phone (format: `+\d{6,15}`) |
| data.attributes.title | string | No | Job title |
| data.relationships.user.data.id | string | Yes | User email |
| data.relationships.customer.data.id | string | Yes | Customer ID |
| data.relationships.user-organization.data.id | string | No | Organization ID |

### Response

Returns the updated CustomerUserProfile resource.

### Error Codes

| Code | Description |
|------|-------------|
| 403 | Insufficient privileges |
| 404 | Customer user profile not found |

### Example

```bash
curl -X PATCH "https://{environment}.streambim.com/mgw/api/v3/customer-user-profiles/123-user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "customer-user-profiles",
      "id": "123-user@example.com",
      "attributes": {
        "first-name": "John",
        "last-name": "Smith",
        "phone": "+4712345678",
        "title": "Senior Engineer"
      },
      "relationships": {
        "customer": { "data": { "id": "1", "type": "customers" } },
        "user": { "data": { "id": "user@example.com", "type": "users" } },
        "user-organization": { "data": { "id": "100", "type": "user-organizations" } }
      }
    }
  }'
```

---

## Delete customer user profile

**DELETE** `/mgw/api/v3/customer-user-profiles/{id}`

Deletes a customer user profile.

### Headers

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |
| Accept | application/vnd.api+json |

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Customer user profile ID |

### Response

Returns `data: null` on success.

### Error Codes

| Code | Description |
|------|-------------|
| 403 | Insufficient privileges |
| 404 | Customer user profile not found |

### Example

```bash
curl -X DELETE "https://{environment}.streambim.com/mgw/api/v3/customer-user-profiles/123-user@example.com" \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json"
```

---

# Groups

Groups organize users within a project for topic sharing and access control. Topics can be shared with specific groups, and group membership controls visibility.

## Group Data Model

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Group display name |
| `organization` | string | Organization the group belongs to |
| `description` | string | Group description |
| `is-read-only` | boolean | Whether the group is system-managed |
| `is-imported` | boolean | Whether the group was imported (e.g. from Active Directory) |
| `enable-request-for-membership` | boolean | Whether users can request to join this group |

**Relationships:**

| Relationship | Type | Description |
|--------------|------|-------------|
| `group-members` | hasMany | Members of the group |
| `parent-groups` | hasMany | Parent groups (for nested group hierarchies) |
| `child-groups` | hasMany | Child groups |
| `custom-views` | hasMany | Custom views associated with this group |

---

## Get All Groups

**GET** `/project-{projectId}/api/v1/v2/groups`

Returns all groups for the project.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |

**Response** `200 OK`

```json
{
    "data": [
        {
            "id": "100",
            "type": "groups",
            "attributes": {
                "name": "Architects",
                "organization": "Example Org",
                "description": "Architecture team",
                "is-read-only": false,
                "is-imported": false,
                "enable-request-for-membership": true
            },
            "relationships": {
                "group-members": { "data": [...] },
                "parent-groups": { "data": [] },
                "child-groups": { "data": [] }
            }
        }
    ]
}
```

---

## Request Group Membership

**POST** `/project-{projectId}/api/v1/v2/groups/{groupId}/_requestMembership`

Sends a membership request for the current user to join a group. Only available when `enable-request-for-membership` is `true` on the group.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/vnd.api+json |

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |
| groupId | string | Yes | The group ID |

**Request Body:** None

**Response** `200 OK`

---

## Group Members

### Group Member Data Model

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Member display name |
| `email` | string | Member email |

**Relationships:**

| Relationship | Type | Description |
|--------------|------|-------------|
| `group` | belongsTo | Parent group |
| `user` | belongsTo | User reference |

---

# Admin Password Reset

## Reset User Password

**POST** `/project-{projectId}/api/v1/v2/resetPassword`

Resets the password for a user. Requires admin privileges. Returns the new temporary password.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | application/json |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userID` | string | Yes | Email address of the user whose password to reset |

**Response** `200 OK`

```json
{
    "password": "temporaryPassword123"
}
```

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer {idToken}" \
  -H "Content-Type: application/json" \
  -d '{"userID": "user@example.com"}' \
  "https://{environment}.streambim.com/project-42/api/v1/v2/resetPassword"
```

**Note:** Requires Customer Admin or Owner privileges.

---

# User Profiles

## Get User Profile

**GET** `/mgw/api/v2/user-profiles`

Returns the profile for the authenticated user.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Accept | application/vnd.api+json |

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter[profile]` | boolean | Yes | Set to `true` to return the current user's profile |

**Example:**

```bash
curl -X GET \
  -H "Authorization: Bearer {idToken}" \
  -H "Accept: application/vnd.api+json" \
  "https://{environment}.streambim.com/mgw/api/v2/user-profiles?filter%5Bprofile%5D=true"
```

---

# Email Settings

## Email Setting Data Model

| Attribute | Type | Description |
|-----------|------|-------------|
| `email-notification` | boolean | Whether email notifications are enabled |

Email settings are managed per-user within a project context via the standard JSON:API endpoints at `/project-{projectId}/api/v1/v2/email-settings`.

---

# Whitelisted IPs

## Whitelisted IP Data Model

IP whitelisting can restrict project access to specific IP addresses or ranges. Managed via `/project-{projectId}/api/v1/v2/whitelisted-ips`.
