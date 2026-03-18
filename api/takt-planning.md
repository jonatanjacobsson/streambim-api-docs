# Takt Planning (Trains & Wagons)

Endpoints for managing takt planning data in StreamBIM. Takt planning organizes construction work into "trains" (sequences of work) and "wagons" (individual work packages within a train). This feature is used for lean construction scheduling.

**Base URL:** `https://{environment}.streambim.com`

**Authentication:** `Authorization: Bearer {idToken}`

**Content-Type:** `application/vnd.api+json`

---

## Trains

Trains represent a sequence of work packages (wagons) that move through construction zones in a planned cadence.

### List Trains

**`GET /project-{projectId}/api/v1/v2/trains`**

Returns all trains for the project.

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

**Response** `200 OK`

Returns an array of train objects in JSON:API format.

```json
{
    "data": [
        {
            "id": "1",
            "type": "trains",
            "attributes": { ... },
            "relationships": { ... }
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
  "https://{environment}.streambim.com/project-42/api/v1/v2/trains"
```

---

### Create Train

**`POST /project-{projectId}/api/v1/v2/trains`**

Creates a new train.

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

**Request Body**

JSON:API formatted train object with attributes and relationships.

**Response** `200 OK`

Returns the created train object.

**Example**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
        "type": "trains",
        "attributes": { ... }
    }
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/v2/trains"
```

---

### Update Train

**`PATCH /project-{projectId}/api/v1/v2/trains/{trainId}`**

Updates an existing train.

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
| `trainId` | string | Yes | The train ID |

**Request Body**

JSON:API formatted train object with the fields to update.

**Response** `200 OK`

Returns the updated train object.

**Example**

```bash
curl -X PATCH \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
        "id": "1",
        "type": "trains",
        "attributes": { ... }
    }
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/v2/trains/1"
```

---

### Delete Train

**`DELETE /project-{projectId}/api/v1/v2/trains/{trainId}`**

Deletes a train and its associated wagons.

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
| `trainId` | string | Yes | The train ID |

**Response** `200 OK`

```json
{
    "data": null
}
```

**Example**

```bash
curl -X DELETE \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/v2/trains/1"
```

---

## Wagons

Wagons are individual work packages within a train. Each wagon represents a specific scope of work that moves through construction zones as part of the takt plan.

### Create Wagon

**`POST /project-{projectId}/api/v1/v2/wagons`**

Creates a new wagon within a train.

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

**Request Body**

JSON:API formatted wagon object. Must include a relationship to the parent train.

**Response** `200 OK`

Returns the created wagon object.

**Example**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
        "type": "wagons",
        "attributes": { ... },
        "relationships": {
            "train": {
                "data": { "type": "trains", "id": "1" }
            }
        }
    }
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/v2/wagons"
```

---

### Update Wagon

**`PATCH /project-{projectId}/api/v1/v2/wagons/{wagonId}`**

Updates an existing wagon.

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
| `wagonId` | string | Yes | The wagon ID |

**Request Body**

JSON:API formatted wagon object with the fields to update.

**Response** `200 OK`

Returns the updated wagon object.

**Example**

```bash
curl -X PATCH \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
        "id": "5",
        "type": "wagons",
        "attributes": { ... }
    }
  }' \
  "https://{environment}.streambim.com/project-42/api/v1/v2/wagons/5"
```

---

## Typical Usage: Import Takt Plan from Excel

A common integration pattern:

1. **Authenticate** -- `POST /auth/v1/login` or `POST /mgw/api/v2/login`
2. **List existing trains** -- `GET /project-{id}/api/v1/v2/trains`
3. **Delete old trains** -- `DELETE /project-{id}/api/v1/v2/trains/{trainId}` for each
4. **Create trains** -- `POST /project-{id}/api/v1/v2/trains` for each row in the Excel
5. **Create wagons** -- `POST /project-{id}/api/v1/v2/wagons` for each wagon in the plan
6. **Update as needed** -- `PATCH .../trains/{id}` or `.../wagons/{id}`

---

## Notes

- Trains and wagons follow the standard JSON:API format used across StreamBIM project-scoped endpoints.
- The takt planning feature must be enabled for the project.
- Attribute schemas for trains and wagons are not fully documented here as they were inferred from usage patterns. The actual request/response schemas follow JSON:API conventions.
