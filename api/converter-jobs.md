# Converter Jobs

Endpoints for managing and monitoring IFC model conversion jobs. When IFC files are uploaded or synced to a StreamBIM project, they need to be converted (processed) for 3D viewing. These endpoints allow you to list conversion jobs, start new conversions, and monitor their progress.

The converter service lives under the `/cmv3/` path prefix (converter v3), separate from the main project API.

**Base URL:** `https://{environment}.streambim.com`

**Authentication:** `Authorization: Bearer {idToken}`

**Content-Type:** `application/vnd.api+json`

---

## Endpoints

### List Converter Jobs

**`GET /cmv3/converter-jobs`**

Returns a list of conversion jobs, filtered by project and optionally by building.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Query Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `filter[project]` | integer | Yes | The project ID |
| `filter[building]` | integer | No | The building ID (filters to a specific building) |

**Response** `200 OK`

```json
{
    "data": [
        {
            "id": "12245",
            "type": "converter-jobs",
            "attributes": {
                "count-changes": 150,
                "count-deletes": 0,
                "count-inserts": 150,
                "count-updates": 0,
                "ended-at": "2024-03-15T14:30:00Z",
                "floor-import": true,
                "floorplan-layer": "M",
                "history": false,
                "job-status": "succeeded",
                "name": "Conversion 2024-03-15",
                "persist": false,
                "started-at": "2024-03-15T14:00:00Z",
                "template-faces": 1000
            },
            "relationships": {
                "building": {
                    "data": { "id": "1000", "type": "buildings" }
                },
                "converter-status": {
                    "data": { "id": "12245", "type": "converter-status" }
                },
                "project": {
                    "data": { "id": "42", "type": "projects" }
                },
                "started-by": {
                    "data": { "id": "user@example.com", "type": "users" }
                }
            }
        }
    ]
}
```

**Job Status Values**

| Status | Description |
|---|---|
| `initializing` | Job has been created, processing not yet started |
| `succeeded` | Conversion completed successfully |
| `cancelled` | Job was cancelled |

**Attribute Details**

| Attribute | Type | Description |
|---|---|---|
| `count-changes` | number | Total number of changes processed |
| `count-deletes` | number | Number of objects deleted (-1 if not yet computed) |
| `count-inserts` | number | Number of objects inserted (-1 if not yet computed) |
| `count-updates` | number | Number of objects updated (-1 if not yet computed) |
| `ended-at` | string/null | ISO 8601 completion timestamp |
| `floor-import` | boolean | Whether floor plan import is included |
| `floorplan-layer` | string | Layer used for floor plan generation |
| `history` | boolean | Whether this is a historical job |
| `job-status` | string | Current job status |
| `name` | string | Job name/label |
| `persist` | boolean | Whether to persist conversion results |
| `started-at` | string/null | ISO 8601 start timestamp |
| `template-faces` | number | Number of template faces processed |

**Example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/cmv3/converter-jobs?filter[project]=42&filter[building]=1000"
```

---

### Create Converter Job

**`POST /cmv3/converter-jobs`**

Starts a new model conversion job for a building.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Content-Type` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Request Body**

```json
{
    "data": {
        "type": "converter-jobs",
        "attributes": {
            "floorplan-layer": "M",
            "name": "Conversion 2024-03-15",
            "persist": false
        },
        "relationships": {
            "building": {
                "data": { "type": "buildings", "id": "1000" }
            },
            "project": {
                "data": { "type": "projects", "id": "42" }
            }
        }
    }
}
```

**Response** `200 OK`

Returns the newly created converter job object with `job-status: "initializing"`.

**Example**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
        "type": "converter-jobs",
        "attributes": {
            "floorplan-layer": "M",
            "name": "My conversion",
            "persist": false
        },
        "relationships": {
            "building": { "data": { "type": "buildings", "id": "1000" } },
            "project": { "data": { "type": "projects", "id": "42" } }
        }
    }
  }' \
  "https://{environment}.streambim.com/cmv3/converter-jobs"
```

---

### Get Converter Status

**`GET /cmv3/converter-statuses/{jobId}`**

Returns detailed conversion pipeline status for a job, including per-layer, per-file processing steps. The response can be large (~100+ KB) as it contains the full pipeline state.

**Headers**

| Header | Value |
|---|---|
| `Accept` | `application/vnd.api+json` |
| `Authorization` | `Bearer {idToken}` |

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `jobId` | integer | Yes | The converter job ID (from `converter-jobs` response) |

**Response** `200 OK`

```json
{
    "data": {
        "id": "12245",
        "type": "converter-status",
        "attributes": {
            "layers": [
                {
                    "layer": "M",
                    "files": [
                        {
                            "filename": "Model_ARK.ifc",
                            "DocumentID": 1022,
                            "RevisionID": 1,
                            "steps": [
                                {
                                    "program-name": "ifc2sql-ifc",
                                    "program-version": "1.0",
                                    "step-name": "Parse IFC",
                                    "status": "succeeded",
                                    "started-at": "2024-03-15T14:01:00Z",
                                    "ended-at": "2024-03-15T14:05:00Z",
                                    "inputs": [],
                                    "outputs": [],
                                    "error": null
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    }
}
```

**Step Status Values**

| Status | Description |
|---|---|
| `succeeded` | Step completed successfully |
| `from-cache` | Results reused from a previous conversion |
| `failed` | Step failed (check `error` field) |

**Example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/cmv3/converter-statuses/12245"
```

---

## Typical Usage: Polling for Completion

```bash
# 1. Start a conversion
JOB_ID=$(curl -s -X POST ... | jq -r '.data.id')

# 2. Poll until complete
while true; do
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://{environment}.streambim.com/cmv3/converter-jobs?filter[project]=42&filter[building]=1000" \
    | jq -r ".data[] | select(.id == \"$JOB_ID\") | .attributes.\"job-status\"")
  
  if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "cancelled" ]; then
    break
  fi
  sleep 30
done
```

---

---

### Converter Job Finished Callback

**`POST /api/v1/converter/_jobfinished`**

Internal webhook endpoint called by the converter service when a conversion job completes. The frontend listens for this callback to update the UI.

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json; charset=utf-8` |
| `Authorization` | `Bearer {idToken}` |

**Note:** This is primarily an internal endpoint used by the converter pipeline. External integrations should poll `GET /cmv3/converter-jobs` instead.

---

## Notes

- Converter jobs are scoped to a project + building combination.
- The `count-inserts`, `count-updates`, `count-deletes` attributes show `-1` for jobs that have not yet completed processing.
- The converter status response includes internal S3 storage paths in step `inputs` and `outputs` -- these are not directly accessible URLs.
- Requires Project Admin privileges or higher to create converter jobs.
