# Attachments, Uploads and Downloads

The StreamBIM attachment system allows you to attach files to topics, topic viewpoints, and comments. Files are stored in Amazon S3 and accessed through pre-signed URLs. The API uses a three-step upload flow: create an upload ticket, upload the file to S3, then create the attachment record.

---

## Authentication & Base Configuration

| Setting | Value |
|---------|-------|
| **Base URL** | `https://{environment}.streambim.com` |
| **Content-Type** | `application/vnd.api+json` |
| **Auth** | `Authorization: Bearer {idToken}` |

Replace `{environment}` with your environment (e.g. `app`, `sweden`, `dev`). Obtain `{idToken}` via the [Login](https://apidoc.streambim.com/#request-authorization-login) endpoint.

---

## Upload Flow

The attachment upload process is a **3-step flow**:

1. **Create an upload ticket** — `POST /project-PROJECT_ID/api/v1/v2/upload-tickets`  
   Request a pre-signed S3 URL. You must specify the exact filename and file size in bytes. The response includes `s3presignedurl` and the upload ticket `id`.

2. **Upload the file to S3** — `PUT {s3UploadUrl}`  
   Send a PUT request with the file in the request body directly to the pre-signed URL from step 1. This is a direct call to S3, not to the StreamBIM API. Include a `Content-Type` header matching the file type.

3. **Create the attachment record** — `POST /project-PROJECT_ID/api/v1/v2/attachments`  
   After the S3 upload completes, create the attachment record by referencing the upload ticket ID and the parent entity (topic, viewpoint, or comment). This links the uploaded file to your project data.

> **Important:** The POST attachments request must be sent strictly after the S3 upload has finished. Provide the correct filename and size in the upload ticket request; mismatches can cause upload failures.

---

## Endpoints

### Get attachments

**GET** `/project-PROJECT_ID/api/v1/v2/attachments`

Returns a list of attachment objects for a project. You must filter by topic, viewpoint, or comment—attachments cannot be listed without one of these filters.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filter[parentTopic] | string | Yes* | Topic ID to filter attachments by |
| filter[parentTopicViewpoint] | string | Yes* | Topic viewpoint ID to filter by |
| filter[parentTopicComment] | string | Yes* | Topic comment ID to filter by |
| filter[object] | string | Yes* | IFC object Global ID (or property-based virtual object ID) to filter attachments by. Use with `filter[building]`. |
| filter[building] | string | No | Building ID. Required when using `filter[object]`. |

*At least one filter is required.

**Response (200 OK)**

JSON:API document with `data` array of attachment resources.

```json
{
  "data": [
    {
      "id": "24",
      "type": "attachments",
      "attributes": {
        "filename": "takplan.pdf",
        "filesize": 4054,
        "last-modified": "2021-06-22T14:19:13.016649Z",
        "marker": [3.8774157, -8.954197],
        "metadata": { "floorplan": true },
        "s3-path": "buildings/building-1000/floorplans/floorplan-1000-1003-2129660483847212176.pdf",
        "uploaded-date": "2021-06-22T14:19:13.016649Z",
        "url": ""
      },
      "relationships": {
        "file": { "data": { "id": "attachments-24", "type": "files" } },
        "parent-topic": { "data": { "id": "1034", "type": "topics" } },
        "parent-topic-viewpoint": { "data": { "id": "19", "type": "topic-viewpoints" } }
      }
    }
  ]
}
```

**cURL example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments?filter[parentTopic]=1037"
```

---

### Get attachment

**GET** `/project-PROJECT_ID/api/v1/v2/attachments/{attachmentId}`

Returns a single attachment by ID.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| attachmentId | string | The attachment ID |

**Response (200 OK)**

JSON:API document with a single attachment resource.

```json
{
  "data": {
    "id": "24",
    "type": "attachments",
    "attributes": {
      "filename": "takplan.pdf",
      "filesize": 4054,
      "last-modified": "2021-06-22T14:19:13.016649Z",
      "marker": [3.8774157, -8.954197],
      "metadata": { "floorplan": true },
      "s3-path": "buildings/building-1000/floorplans/floorplan-1000-1003-2129660483847212176.pdf",
      "uploaded-date": "2021-06-22T14:19:13.016649Z",
      "url": ""
    },
    "relationships": {
      "file": { "data": { "id": "attachments-24", "type": "files" } },
      "parent-topic": { "data": { "id": "1034", "type": "topics" } },
      "parent-topic-viewpoint": { "data": { "id": "19", "type": "topic-viewpoints" } }
    }
  }
}
```

**cURL example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments/24"
```

---

### Get download link

**GET** `/project-PROJECT_ID/api/v1/v2/attachments/{attachmentId}/download-link`

Returns a pre-signed URL (or microtoken) for downloading the attachment file. The download link has a limited lifetime.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| attachmentId | string | The attachment ID |

**Response (200 OK)**

- **Content-Type:** `text/plain; charset=utf-8`  
- **Body:** The download path or URL (e.g. `/v2/attachments/91/download/filename.jpeg?microtoken=...`)

Full download URL: `https://{environment}.streambim.com/project-PROJECT_ID/api/v1{downloadLink}`

**cURL example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments/91/download-link"
```

---

### Download attachment

**GET** `/project-PROJECT_ID/api/v1/v2/attachments/{attachmentId}/download`

Direct download of the attachment file. The request redirects to S3. You typically obtain the full URL (including microtoken) from the **Get download link** endpoint first.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| attachmentId | string | The attachment ID |

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| microtoken | string | Yes | Short-lived token from Get download link |

**Response**

Redirects to the S3 pre-signed URL; the client receives the file bytes.

**cURL example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments/91/download/photo.jpeg?microtoken={microtoken}"
```

---

### Create new upload ticket

**POST** `/project-PROJECT_ID/api/v1/v2/upload-tickets`

Creates an upload ticket and returns a pre-signed S3 URL for uploading a file. Provide the exact filename and file size in bytes.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Request body**

```json
{
  "data": {
    "id": "0",
    "type": "attachments",
    "attributes": {
      "filename": "070e4e49da6921a4686be369662bec8f.jpg",
      "file-size": 65304
    }
  }
}
```

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| filename | string | Yes | Exact filename for the upload |
| file-size | number | Yes | File size in bytes |

**Response (200 OK)**

```json
{
  "data": {
    "id": "4e59d246-beca-4ee5-b47c-40c7f5ca2a19",
    "type": "upload-ticket",
    "attributes": {
      "awskey": "<YOUR_AWS_ACCESS_KEY_ID>",
      "awsregion": "eu-central-1",
      "awsurl": "https://s3-eu-central-1.amazonaws.com",
      "file-size": 65304,
      "filename": "070e4e49da6921a4686be369662bec8f.jpg",
      "last-modified": 0,
      "s3bucket": "rendra-eu-central-1",
      "s3key": "rendra-projects/development/project-1201/uploads/4e59d246-beca-4ee5-b47c-40c7f5ca2a19",
      "s3presignedurl": "https://rendra-eu-central-1.s3.eu-central-1.amazonaws.com/...",
      "signer-url": "https://dev.streambim.com/project-1201/api/v1/aws/_uploadsigner",
      "token": ""
    }
  }
}
```

Use `s3presignedurl` for the PUT upload in the next step. Use `id` as the upload ticket ID when creating the attachment.

**cURL example**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
      "id": "0",
      "type": "attachments",
      "attributes": {
        "filename": "070e4e49da6921a4686be369662bec8f.jpg",
        "file-size": 65304
      }
    }
  }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/upload-tickets"
```

---

### PUT Upload file to S3

**PUT** `{s3UploadUrl}`

Uploads the file directly to S3 using the pre-signed URL from the upload ticket. This is a direct S3 request, not a StreamBIM API call. No StreamBIM auth headers are required for this step.

**Headers**

| Header | Value |
|--------|-------|
| Content-Type | *MIME type of the file* (e.g. `image/jpeg`, `application/pdf`) |

**Request body**

Raw file bytes (binary).

**Response**

- **200 OK** — Upload succeeded.
- **4xx/5xx** — Upload failed (e.g. invalid URL, size mismatch).

**cURL example**

```bash
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  --data-binary @local-file.jpg \
  "https://rendra-eu-central-1.s3.eu-central-1.amazonaws.com/rendra-projects/development/project-1201/uploads/8b6ed287-8c2e-4f40-b99c-74d1dd1c5a28?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Date=...&X-Amz-Expires=300&X-Amz-SignedHeaders=host&X-Amz-Signature=..."
```

---

### Create new attachment

**POST** `/project-PROJECT_ID/api/v1/v2/attachments`

Creates an attachment record after the file has been uploaded to S3. Links the uploaded file to a topic, viewpoint, or comment. Must be called **after** the S3 upload completes.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Request body**

```json
{
  "data": {
    "id": "0",
    "type": "attachments",
    "attributes": {
      "category": "file",
      "metadata": { "floorplan": true },
      "url": ""
    },
    "relationships": {
      "upload-ticket": {
        "data": {
          "type": "upload-tickets",
          "id": "8b6ed287-8c2e-4f40-b99c-74d1dd1c5a28"
        }
      },
      "parent-topic": {
        "data": { "id": "1034", "type": "topics" }
      },
      "parent-topic-viewpoint": {
        "data": { "id": "19", "type": "topic-viewpoints" }
      },
      "parent-topic-comment": { "data": null },
      "linked-document": { "data": null },
      "linked-document-revision": { "data": null },
      "parent-checklist-item": { "data": null },
      "parent-ifc-object": { "data": null },
      "parent-workflow": { "data": null },
      "copy-attachment": { "data": null }
    }
  }
}
```

**Attributes**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | Yes | One of: `screenshot`, `file`, `floorplan`, `document`, `attachment` (copy reference), `url` (non-S3) |
| metadata | object | No | Custom metadata (e.g. `{ "floorplan": true }`, `{ "preview": true }`) |
| url | string | No | For `url` category: external URL |

**Relationships**

| Relationship | Required | Description |
|--------------|----------|-------------|
| upload-ticket | Yes* | Upload ticket ID from Create upload ticket (required for S3-based attachments; omit for `document` and `url` categories) |
| parent-topic | Yes** | Topic to attach to |
| parent-topic-viewpoint | Yes** | Topic viewpoint to attach to |
| parent-topic-comment | Yes** | Topic comment to attach to |
| parent-ifc-object | Yes** | IFC object to attach to (Global ID for a specific element, or an encoded property-based ID for a virtual element). Type is `ifc-object` in the request. |
| parent-project | Yes** | Project to attach to |
| parent-checklist | Yes** | Checklist to attach to |
| parent-checklist-item | Yes** | Checklist item to attach to |
| parent-checklist-item-instance | Yes** | Checklist item instance to attach to |
| parent-workflow | Yes** | Workflow to attach to |
| parent-topic-report-template | Yes** | Topic report template to attach to |
| linked-document | No | References an existing project document by ID (type `documents`). Used with `category: "document"` to link an already-uploaded document rather than uploading a new file. |
| linked-document-revision | No | References a specific document revision |
| copy-attachment | No | References another attachment to copy |

*`upload-ticket` is required for S3-based attachments (categories `file`, `screenshot`, `floorplan`). Omit for `document` (linked) and `url` categories.

**Exactly one parent is required.

**Response (200 OK)**

```json
{
  "data": {
    "id": "36",
    "type": "attachments",
    "attributes": {
      "filename": "070e4e49da6921a4686be369662bec8f.jpg",
      "filesize": 65304,
      "last-modified": "2021-06-24T13:10:10.717945Z",
      "marker": [0, 0],
      "metadata": { "floorplan": true },
      "s3-path": "topics/topic-1034/file-attachment-36.jpg",
      "uploaded-date": "2021-06-24T13:10:10.717945Z",
      "url": ""
    },
    "relationships": {
      "file": { "data": { "id": "attachments-36", "type": "files" } },
      "parent-topic": { "data": { "id": "1034", "type": "topics" } }
    }
  }
}
```

**cURL example**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
      "id": "0",
      "type": "attachments",
      "attributes": {
        "category": "file",
        "metadata": { "floorplan": true },
        "url": ""
      },
      "relationships": {
        "upload-ticket": {
          "data": { "type": "upload-tickets", "id": "8b6ed287-8c2e-4f40-b99c-74d1dd1c5a28" }
        },
        "parent-topic": { "data": { "id": "1034", "type": "topics" } },
        "parent-topic-viewpoint": { "data": null },
        "parent-topic-comment": { "data": null }
      }
    }
  }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments"
```

---

### Patch attachment

**PATCH** `/project-PROJECT_ID/api/v1/v2/attachments/{attachmentId}`

Updates attachment metadata.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| attachmentId | string | The attachment ID |

**Request body**

JSON:API partial update. Include only the attributes and relationships you want to change.

```json
{
  "data": {
    "id": "36",
    "type": "attachments",
    "attributes": {
      "metadata": { "floorplan": false }
    }
  }
}
```

**Response (200 OK)**

Returns the updated attachment resource.

**cURL example**

```bash
curl -X PATCH \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
      "id": "36",
      "type": "attachments",
      "attributes": {
        "metadata": { "floorplan": false }
      }
    }
  }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments/36"
```

---

### Delete attachment

**DELETE** `/project-PROJECT_ID/api/v1/v2/attachments/{attachmentId}`

Removes an attachment from the project.

**Headers**

| Header | Value |
|--------|-------|
| Accept | application/vnd.api+json |
| Content-Type | application/vnd.api+json |
| Authorization | Bearer {idToken} |

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| attachmentId | string | The attachment ID |

**Response (200 OK)**

Empty or minimal JSON body.

**cURL example**

```bash
curl -X DELETE \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments/36"
```

---

## Attachment object schema

| Attribute | Type | Description |
|-----------|------|-------------|
| filename | string | Original filename |
| filesize | number | File size in bytes |
| last-modified | string | ISO 8601 timestamp |
| marker | number[] | Optional 2D marker coordinates |
| metadata | object | Custom metadata (e.g. floorplan, preview) |
| s3-path | string | S3 object path |
| uploaded-date | string | ISO 8601 timestamp |
| url | string | External URL (for url category) |
| is-deleted | boolean | Soft-delete flag |
| deleted-at | string \| null | ISO 8601 timestamp of soft deletion |

Relationships also include `uploaded-by` and `deleted-by` (type `users`, id = user email).

## Category values

| Category | Description |
|----------|-------------|
| screenshot | Screenshot image |
| file | Generic file |
| floorplan | Floor plan |
| document | Links an existing project document (via `linked-document` relationship) |
| attachment | Copy of another attachment |
| url | External URL (not stored in S3) |

---

## Attaching Documents to IFC Objects

Documents can be attached to IFC objects (BIM elements) in two ways: to a **specific element** by its Global ID, or to a **property-based virtual element** representing all elements that share a property value. In both cases the attachment uses `category: "document"` and references the existing document via the `linked-document` relationship — no upload ticket or S3 upload is needed.

### Attach a document to a specific element

Links an existing project document to a single IFC element identified by its Global ID.

**POST** `/project-PROJECT_ID/api/v1/v2/attachments`

**Request body**

```json
{
  "data": {
    "type": "attachments",
    "attributes": {
      "category": "document",
      "url": null
    },
    "relationships": {
      "parent-ifc-object": {
        "data": { "id": "{ifcObjectGlobalId}", "type": "ifc-object" }
      },
      "linked-document": {
        "data": { "type": "documents", "id": "{documentId}" }
      },
      "parent-topic": { "data": null },
      "parent-topic-comment": { "data": null },
      "parent-topic-viewpoint": { "data": null },
      "parent-workflow": { "data": null },
      "parent-checklist-item": { "data": null },
      "parent-checklist-item-instance": { "data": null },
      "parent-project": { "data": null },
      "parent-checklist": { "data": null },
      "parent-topic-report-template": { "data": null }
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `parent-ifc-object.id` | The IFC element's Global ID (e.g. `2xVoYhqg9CBvb8FmWO83Zc`) |
| `linked-document.id` | The ID of an existing document in the project |

**Response (200 OK)**

```json
{
  "data": {
    "id": "52904",
    "type": "attachments",
    "attributes": {
      "category": "topic-image",
      "filename": "<string>",
      "filesize": "<number>",
      "guid": null,
      "last-modified": "<ISO 8601>",
      "marker": [0, 0],
      "metadata": {},
      "s3-path": "documents/document-{docId}-rev-{rev}.pdf",
      "uploaded-date": "<ISO 8601>",
      "url": ""
    },
    "relationships": {
      "file": { "data": { "id": "documents-{docId}-{rev}", "type": "files" } },
      "linked-document": { "data": { "id": "{documentId}", "type": "documents" } },
      "linked-document-revision": { "data": null },
      "parent-ifc-object": { "data": { "id": "{ifcObjectGlobalId}", "type": "ifc-objects" } },
      "parent-topic": { "data": null },
      "parent-topic-viewpoint": { "data": null },
      "parent-topic-comment": { "data": null },
      "parent-workflow": { "data": null }
    }
  }
}
```

> **Note:** The web client also sends `"is-deleted": false` in `attributes`; it is optional. Newer responses additionally include `deleted-at` / `is-deleted` attributes and `deleted-by` / `uploaded-by` relationships (type `users`, id = user email) — attachments are soft-deleted.

> **Note:** The `category` in the response may differ from the request value (e.g. `topic-image` instead of `document`). The `type` on `parent-ifc-object` is `ifc-objects` (plural) in the response vs `ifc-object` (singular) in the request.

**cURL example**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
      "type": "attachments",
      "attributes": { "category": "document", "url": null },
      "relationships": {
        "parent-ifc-object": { "data": { "id": "2xVoYhqg9CBvb8FmWO83Zc", "type": "ifc-object" } },
        "linked-document": { "data": { "type": "documents", "id": "14336" } },
        "parent-topic": { "data": null },
        "parent-topic-comment": { "data": null },
        "parent-topic-viewpoint": { "data": null }
      }
    }
  }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments"
```

---

### Attach a document by property (virtual element)

Links an existing project document to a **property-based virtual IFC object**. A virtual object represents all elements that share a specific property value (e.g. all doors of type "GPPD-UT"). The virtual object's ID is a **base64url-encoded** compound key with the structure:

```
ifcelement~{propertySetName}~{propertyName}~{valueType}~{propertyValue}
```

Fields are separated by `~`. For example, `aWZjZWxlbWVudH5CSVB-VHlwZUlEfnN0cn5HUFBELVVU` decodes to:

```
ifcelement~BIP~TypeID~str~GPPD-UT
```

| Segment | Meaning | Example |
|---------|---------|---------|
| `ifcelement` | Fixed prefix | `ifcelement` |
| `{propertySetName}` | The property set / group name | `BIP` |
| `{propertyName}` | The property key | `TypeID` |
| `{valueType}` | Data type of the value | `str` |
| `{propertyValue}` | The property value that groups the elements | `GPPD-UT` |

The encoding uses base64url (RFC 4648 §5), where `+` is replaced by `-` and `/` by `_`, with no padding.

The string is **UTF-8 encoded before base64url encoding**, so values with spaces and non-ASCII characters work as-is. For example, `aWZjZWxlbWVudH5CSVB-VHlwZURlc2NyaXB0aW9ufnN0cn5Bcm1lcmFkIHB1dHMgcMOlIHB1dHNiw6RyYXJlIHV0b21odXM` decodes to:

```
ifcelement~BIP~TypeDescription~str~Armerad puts på putsbärare utomhus
```

The request body is identical to attaching by element, except `parent-ifc-object.id` is the encoded property-based ID instead of a standard Global ID.

**POST** `/project-PROJECT_ID/api/v1/v2/attachments`

**Request body**

```json
{
  "data": {
    "type": "attachments",
    "attributes": {
      "category": "document",
      "url": null
    },
    "relationships": {
      "parent-ifc-object": {
        "data": { "id": "{encodedPropertyId}", "type": "ifc-object" }
      },
      "linked-document": {
        "data": { "type": "documents", "id": "{documentId}" }
      },
      "parent-topic": { "data": null },
      "parent-topic-comment": { "data": null },
      "parent-topic-viewpoint": { "data": null },
      "parent-workflow": { "data": null },
      "parent-checklist-item": { "data": null },
      "parent-checklist-item-instance": { "data": null },
      "parent-project": { "data": null },
      "parent-checklist": { "data": null },
      "parent-topic-report-template": { "data": null }
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `parent-ifc-object.id` | Base64url-encoded property ID (e.g. `aWZjZWxlbWVudH5CSVB-VHlwZUlEfnN0cn5HUFBELVVU` = `ifcelement~BIP~TypeID~str~GPPD-UT`). Obtain from IFC object details, property search results, or construct by base64url-encoding the `ifcelement~{set}~{key}~{type}~{value}` string. |
| `linked-document.id` | The ID of an existing document in the project |

**Response (200 OK)**

Same shape as the element attachment response, with the encoded property ID in `parent-ifc-object`.

**cURL example**

```bash
curl -X POST \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "data": {
      "type": "attachments",
      "attributes": { "category": "document", "url": null },
      "relationships": {
        "parent-ifc-object": { "data": { "id": "aWZjZWxlbWVudH5CSVB-VHlwZUlEfnN0cn5HUFBELVVU", "type": "ifc-object" } },
        "linked-document": { "data": { "type": "documents", "id": "13746" } },
        "parent-topic": { "data": null },
        "parent-topic-comment": { "data": null },
        "parent-topic-viewpoint": { "data": null }
      }
    }
  }' \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments"
```

---

### Get attachments for an IFC object

**GET** `/project-PROJECT_ID/api/v1/v2/attachments?filter[object]={ifcObjectId}&filter[building]={buildingId}`

Returns all attachments linked to a specific IFC object (element or property-based virtual object) within a building.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filter[object] | string | Yes | IFC object Global ID or encoded property-based ID |
| filter[building] | string | Yes | Building ID |
| withDeletedAttachments | boolean | No | `true` includes soft-deleted attachments (check `is-deleted` / `deleted-at`). Sent by the web client. |

**Response (200 OK)**

JSON:API document with `data` array of attachment resources. Each attachment includes `linked-document` and `parent-ifc-object` relationships.

```json
{
  "data": [
    {
      "id": "<string>",
      "type": "attachments",
      "attributes": {
        "category": "<string>",
        "filename": "<string>",
        "filesize": "<number>",
        "guid": null,
        "last-modified": "<ISO 8601>",
        "marker": ["<number>", "<number>"],
        "metadata": {},
        "s3-path": "<string>",
        "uploaded-date": "<ISO 8601>",
        "url": "<string>"
      },
      "relationships": {
        "file": { "data": { "id": "<string>", "type": "files" } },
        "linked-document": { "data": { "id": "<string>", "type": "documents" } },
        "linked-document-revision": { "data": null },
        "parent-ifc-object": { "data": { "id": "<string>", "type": "ifc-objects" } },
        "parent-checklist": { "data": null },
        "parent-checklist-item": { "data": null },
        "parent-project": { "data": null },
        "parent-topic": { "data": null },
        "parent-topic-comment": { "data": null },
        "parent-topic-report-template": { "data": null },
        "parent-topic-viewpoint": { "data": null },
        "parent-workflow": { "data": null }
      }
    }
  ]
}
```

**cURL example**

```bash
curl -X GET \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-PROJECT_ID/api/v1/v2/attachments?filter[object]=2xVoYhqg9CBvb8FmWO83Zc&filter[building]=1000"
```

---

### Observed in HAR — Document-to-element attachment flow

**Observed flow (attach document to a specific element):**

1. User selects an IFC element in the 3D viewer
2. **POST** `/project-{projectId}/api/v1/v2/attachments` with `category: "document"`, `parent-ifc-object` set to the element's Global ID, and `linked-document` set to the chosen document ID
3. **GET** `/project-{projectId}/api/v1/v2/attachments?filter[object]={globalId}&filter[building]={buildingId}` — the client re-fetches attachments for the element to confirm the new link
4. **GET** `/project-{projectId}/api/v1/v2/ifc-objects/{globalId}?building={buildingId}&lastModified={ts}` — the client re-fetches the IFC object to update its `relationships.attachments` list

**Observed flow (attach document by property / virtual element):**

1. User selects a property-based virtual element (e.g. all elements with `BIP: TypeID = GPPD-UT`)
2. **GET** `/project-{projectId}/api/v1/v2/ifc-objects/{encodedPropertyId}?building={buildingId}` — loads the virtual object details (no geometry, just property metadata)
3. **GET** `/project-{projectId}/api/v1/v2/attachments?filter[object]={encodedPropertyId}&filter[building]={buildingId}` — checks for existing attachments (initially empty)
4. **POST** `/project-{projectId}/api/v1/v2/attachments` with `parent-ifc-object.id` set to the encoded property ID and `linked-document` set to the document ID
5. **GET** `/project-{projectId}/api/v1/v2/ifc-objects/{encodedPropertyId}?building={buildingId}` — re-fetches to confirm the `relationships.attachments` array now includes the new attachment
6. **GET** `/project-{projectId}/api/v1/v2/attachments?filter[object]={encodedPropertyId}&filter[building]={buildingId}` — re-fetches attachment list

**Data reuse:**

| Produced by | Value | Consumed by |
|-------------|-------|-------------|
| IFC viewer / element selection | Element Global ID (e.g. `2xVoYhqg9CBvb8FmWO83Zc`) | `parent-ifc-object.id` in POST attachments, `filter[object]` in GET attachments |
| IFC viewer / property selection | Encoded property ID (e.g. `aWZjZWxlbWVudH5CSVB-...`) | `parent-ifc-object.id` in POST attachments, `filter[object]` in GET attachments, `ifc-objects/{id}` detail fetch |
| Document list / selection | Document ID (e.g. `14336`, `13746`) | `linked-document.id` in POST attachments |
| POST attachments response | Attachment ID (e.g. `52904`) | Appears in subsequent GET calls |
| Project context | Building ID (e.g. `1000`) | `filter[building]` in GET attachments, `building` param in GET ifc-objects |

---

# Microtokens

Short-lived tokens used to authenticate download and viewer URLs without passing the full Bearer token in the URL.

## Get Microtoken

**GET** `/project-{projectId}/api/v1/microtoken`

Returns a short-lived microtoken for use in download links, document viewer URLs, and tileserver requests.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |

**Response** `200 OK`

```json
{
    "microtoken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Usage:** Append `?microtoken={token}` to download, viewer, and tileserver URLs.

**Example:**

```bash
curl -X GET \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/project-42/api/v1/microtoken"
```

---

# Downloads

Generic file download endpoints used for reports, exports, and other generated files.

## Download File

**GET** `/project-{projectId}/api/v1/downloads/{downloadId}`

Downloads a file by its download ID. Typically used after creating a report or export-document record and receiving a completion event via SSE.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |
| downloadId | string | Yes | The download/report ID |

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| microtoken | string | Yes | Short-lived token from `GET /microtoken` |

**Response:** Binary file download

---

## Download File with Filename

**GET** `/project-{projectId}/api/v1/downloads/{downloadId}/{fileName}`

Same as above but includes the filename in the URL path, which sets the `Content-Disposition` header for browser downloads.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |
| downloadId | string | Yes | The download/report ID |
| fileName | string | Yes | Desired filename for the download |

**Typical Flow:**

1. Create a report or export-document record via JSON:API
2. Subscribe to SSE event (e.g. `report-export` with `ticket: {id}`)
3. When the event fires, build the download URL with a microtoken
4. Fetch the file from `/downloads/{id}/{fileName}`

---

# Floor Downloads

## Get Floor Download Link

**GET** `/project-{projectId}/api/v1/v2/floors/{floorId}/downloadlink`

Returns a download link for a floor plan file.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | integer | Yes | The project ID |
| floorId | string | Yes | The floor ID |

**Response** `200 OK`

Returns a download path that can be combined with a microtoken to download the floor plan file.

---

# Document Upload (Alternative)

## Upload Document via Form

**POST** `/project-{projectId}/api/v1/documents/_upload`

Alternative document upload endpoint using multipart form data. This is a simpler flow compared to the S3 pre-signed URL approach used by the attachment upload flow.

**Headers**

| Header | Value |
|--------|-------|
| Authorization | Bearer {idToken} |
| Content-Type | multipart/form-data |

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The file to upload |
| `id` | string | Yes | Upload ticket ID (from creating an upload-ticket record) |

**Flow:**

1. Create an upload ticket record
2. POST the file as multipart form data to `/documents/_upload` with the ticket ID
3. Alternative: Use the S3 pre-signed URL flow (see [Upload Flow](#upload-flow) above)

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer {idToken}" \
  -F "file=@document.pdf" \
  -F "id=ticket-uuid" \
  "https://{environment}.streambim.com/project-42/api/v1/documents/_upload"
```
