# Sync

Trigger synchronization between StreamBIM and external file sources (e.g. Sharepoint, Interaxo). The sync process imports new and updated files from the configured external source into the StreamBIM project's document library.

**Base URL:** `https://{environment}.streambim.com`

**Authentication:** `Authorization: Bearer {idToken}`

**Content-Type:** `application/json` for sync endpoints; `application/vnd.api+json` for configs and sync-statuses endpoints.

---

## Endpoints

### Trigger Sync

**`POST /project-{projectId}/api/v1/sync`**

Starts a synchronization job for the specified project. This triggers the backend to pull files from the configured external source (e.g. a Sharepoint document library, an Interaxo room) and import them into StreamBIM.

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | integer | Yes | The project ID |

**Request Body**

```json
{}
```

**Response** `200 OK`

```json
{
    "status": "OK"
}
```

**Example**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{}' \
  "https://{environment}.streambim.com/project-13588/api/v1/sync"
```

---

### Get Sync Status

**`GET /project-{projectId}/api/v1/sync`**

Returns the current sync job state for the project. When a sync is running, `started-at` contains a timestamp; when idle it is `null`.

**Headers**

| Header | Value |
|---|---|
| `Authorization` | `Bearer {idToken}` |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `projectId` | integer | Yes | The project ID |

**Response** `200 OK`

```json
{
    "started-at": "2026-03-18T06:09:26.718195378Z"
}
```

When no sync is running:

```json
{
    "started-at": null
}
```

---

### List Configs

**`GET /project-{projectId}/api/v1/v2/configs`**

Returns all project configuration key-value pairs as a JSON:API collection. Includes integration-specific keys (Interaxo, Sharepoint) and general project settings.

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
    "data": [
        {
            "id": "INTERAXO_COMMUNITY",
            "type": "configs",
            "attributes": {
                "value": "example.com",
                "version": 1
            }
        }
    ]
}
```

**Known Interaxo config keys**

| Key | Description |
|---|---|
| `INTERAXO_COMMUNITY` | Interaxo community/tenant name |
| `INTERAXO_ROOM` | Interaxo room (workspace) name |
| `INTERAXO_FOLDER_ID` | Optional folder filter within the room |
| `INTERAXO_STEPS_TO_BE_INCLUDED` | Comma-separated document workflow steps to sync |
| `INTERAXO_FILE_EXTENSIONS` | File extensions to include in sync (e.g. `.ifc,.pdf,.ids`) |
| `INTERAXO_REFRESH_TOKEN` | OAuth refresh token for Interaxo API |
| `RECONVERT_AFTER_SYNC` | Whether to auto-reconvert models after sync (`"true"` / `"false"`) |

**Other config keys observed**

| Key | Description |
|---|---|
| `DISPLAY_UNITS` | Unit system (e.g. `"metric"`) |
| `BCF_BUILDING_ID` | Default building ID for BCF |
| `PDF_TEXT_SEARCH_PATTERN` | Regex pattern for PDF text extraction |
| `BCF_WORKFLOW_ID` | Default BCF workflow ID |

---

### Update Config

**`PATCH /project-{projectId}/api/v1/v2/configs/{configKey}`**

Updates a single project configuration value. Uses JSON:API format with optimistic concurrency via the `version` field.

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
| `configKey` | string | Yes | The config key (e.g. `INTERAXO_COMMUNITY`) |

**Request Body**

```json
{
    "data": {
        "id": "INTERAXO_COMMUNITY",
        "attributes": {
            "value": "example.com",
            "version": 1
        },
        "type": "configs"
    }
}
```

The `version` field must match the current version from `GET /v2/configs` for optimistic concurrency control.

**Response** `200 OK`

```json
{
    "data": {
        "id": "INTERAXO_COMMUNITY",
        "type": "configs",
        "attributes": {
            "value": "example.com",
            "version": 1
        }
    }
}
```

---

### List Sync Statuses

**`GET /project-{projectId}/api/v1/v2/sync-statuses`**

Returns sync status records as a JSON:API collection, showing the most recent sync start/end times per integration type.

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
    "data": [
        {
            "id": "INTERAXO_60",
            "type": "sync-statuses",
            "attributes": {
                "integration": "INTERAXO",
                "last-sync-ended": "2026-03-18T01:12:17.432989Z",
                "last-sync-started": "2026-03-18T01:12:00.002358Z",
                "source": null,
                "target": 60
            }
        }
    ]
}
```

**Attribute Details**

| Attribute | Type | Description |
|---|---|---|
| `integration` | string | Integration type (e.g. `"INTERAXO"`) |
| `last-sync-ended` | string/null | ISO 8601 timestamp of last sync completion |
| `last-sync-started` | string/null | ISO 8601 timestamp of last sync start |
| `source` | string/null | Source identifier (if applicable) |
| `target` | number | Target project ID |

The `id` follows the pattern `{INTEGRATION}_{projectId}`.

---

## Typical Usage Pattern

### Basic sync + conversion monitoring

1. **Authenticate** -- `POST /auth/v1/login`
2. **Trigger sync** -- `POST /project-{projectId}/api/v1/sync`
3. **Monitor conversion** -- Poll `GET /cmv3/converter-jobs?filter[project]={projectId}` until jobs complete

See [converter-jobs.md](converter-jobs.md) for converter job monitoring details.

### Interaxo sync with config and status monitoring

The StreamBIM web app performs the following sequence when a user configures and triggers an Interaxo sync:

1. **Load sync panel** -- Parallel fetch of `GET /sync`, `GET /v2/configs`, `GET /v2/sync-statuses` to populate the configuration UI.
2. **Save configuration** -- Six parallel `PATCH /v2/configs/{configKey}` calls update Interaxo integration settings (community, room, folder ID, steps, file extensions, reconvert flag). Each PATCH echoes back the `version` from the previous GET for optimistic concurrency.
3. **Reload sync panel** -- Same three GETs re-fetched after config save.
4. **Trigger sync** -- `POST /sync` with empty JSON body `{}`. Returns `{"status": "OK"}`.
5. **Confirm sync started** -- `GET /sync` returns a non-null `started-at` timestamp.
6. **Poll for changes** -- The app polls `GET /v2/last-modifieds/{buildingId}` and `GET /v2/projects/{projectId}` every ~30 seconds to detect when new data arrives.
7. **Detect sync completion** -- `GET /v2/sync-statuses` shows updated `last-sync-started`/`last-sync-ended` timestamps, and `GET /sync` returns `started-at: null`.

---

## Notes

- The sync endpoint requires the project to have an external file source configured (e.g. Sharepoint integration, Interaxo integration).
- Sync is an asynchronous operation. The endpoint returns immediately; use converter job monitoring or sync-status polling to track progress.
- Requires Project Admin privileges or higher.
- **Security note:** `GET /v2/configs` returns `INTERAXO_REFRESH_TOKEN` as a plain-text value. Any user with read access to project configs can see the Interaxo OAuth refresh token.
