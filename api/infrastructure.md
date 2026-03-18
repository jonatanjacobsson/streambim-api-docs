# Infrastructure

Internal and utility endpoints used by the StreamBIM web application. These endpoints are primarily for health checks, diagnostics, client logging, and batch operations. External integrations typically do not need these endpoints directly.

**Base URL:** `https://{environment}.streambim.com`

---

## Health Check

### Ping

**`GET /api/v1/ping`**

Health check endpoint that verifies the API server is running and returns build information.

**Headers**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json; charset=utf-8` |
| `Authorization` | `Bearer {idToken}` |

**Response** `200 OK`

```json
{
    "commitHash": "abc123def456",
    "buildDate": "2026-03-15T10:00:00Z"
}
```

The web application also uses an internal variant via `makeRequest("/ping")` with a 12-second timeout for connectivity detection.

---

## Client Logging

### Post Client Log

**`POST {mgwApi}/api/v2/client/log`**

Sends client-side log entries to the server for diagnostics and error tracking. Used by the web application to report errors, initialization events, and other telemetry.

**Headers**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json; charset=utf-8` |
| `Authorization` | `Bearer {idToken}` |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | Yes | Event name (e.g. `"Initializing webapp"`) |
| `route` | string | No | Current page URL (`window.location.href`) |
| `logLevel` | string | Yes | Log severity: `"INFO"`, `"ERROR"`, `"WARN"` |
| `message` | string | No | Stringified payload with additional context |
| `deviceFingerprint` | string | No | Device/browser fingerprint |
| `userId` | string | No | User email |
| `projectId` | string | No | Current project ID |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "event": "Initializing webapp",
    "logLevel": "INFO",
    "route": "https://{environment}.streambim.com/project-42",
    "message": "{\"cookies\":true,\"localStorage\":true}"
  }' \
  "https://{environment}.streambim.com/mgw/api/v2/client/log"
```

---

## Batch Requests

### Batch API Call

**`POST /project-{projectId}/api/v1/batch`**

Allows bundling multiple JSON:API requests into a single HTTP call. Uses the `ember-batch-request` format.

**Headers**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | integer | The project ID |

**Note:** The batch URL can be overridden via configuration (`apiBatchUrl`). The default is `/batch`.

---

## Cache Invalidation

### List Cache Invalidation Records

**`GET /cmv3/cache-invalidations`**

Returns cache invalidation records from the converter service namespace (`/cmv3/`). Used to detect when 3D model data has been updated and local caches should be refreshed.

**Headers**

| Header | Value |
|--------|-------|
| `Accept` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

---

## Notes

- The `/api/v1/ping` endpoint can be used as a readiness/liveness probe for monitoring.
- Client logging is rate-limited and intended for diagnostics only.
- Batch requests reduce HTTP overhead when multiple JSON:API calls need to be made simultaneously.
- Cache invalidation records help the frontend decide when to reload 3D geometry data.
