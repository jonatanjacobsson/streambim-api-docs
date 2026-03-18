# Tileserver

Endpoints for serving 2D document images (PDF pages, floor plans) and 3D model tiles for the StreamBIM viewer. The tileserver renders document pages as images at various sizes and provides tiled 3D geometry for progressive loading.

**Base URL:** `https://{environment}.streambim.com`

**Authentication:** Tileserver endpoints use `id_token` as a query parameter rather than a Bearer header.

---

## Document Images

### Get Document Page Image

**`GET /project-{projectId}/api/v1/v2/tileserver/images/{fileId}`**

Returns a rendered image of a document page (e.g. a PDF page). Used for document thumbnails and previews in the viewer.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | integer | The project ID |
| `fileId` | string | The document file ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (0-indexed, default: 0) |
| `size` | number | No | Image height in pixels (e.g. `400`) |
| `t` | string | No | Last-modified timestamp for cache busting |
| `annotations` | boolean | No | Whether to include annotations |
| `id_token` | string | Yes | Authentication token (idToken from login) |

**Response:** Binary image (PNG/JPEG)

**Example:**

```bash
curl -o page.png \
  "https://{environment}.streambim.com/project-42/api/v1/v2/tileserver/images/1002?page=0&size=400&id_token={idToken}"
```

---

## 3D Model Tiles

### Get Model Tile

**`GET /project-{projectId}/api/v1/v2/tileserver/tiles/{fileId}`**

Returns a 3D geometry tile for progressive loading of IFC models in the viewer. Tiles are addressed by a level/z/x/y coordinate.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | integer | The project ID |
| `fileId` | string | The model file ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tile` | string | Yes | Tile coordinate in `{level}/{z}/{x}/{y}` format |
| `t` | string | No | Last-modified timestamp for cache busting |
| `id_token` | string | Yes | Authentication token |

**Response:** Binary tile data

**Example:**

```bash
curl -o tile.bin \
  "https://{environment}.streambim.com/project-42/api/v1/v2/tileserver/tiles/1000?tile=0/0/0/0&t=1234567890&id_token={idToken}"
```

---

## Document Viewer

### Open Document in Viewer

**`GET /project-{projectId}/api/v1/documents/{documentId}/_show`**

Opens a document in the StreamBIM document viewer. This is a browser-redirect endpoint, not a JSON API.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | integer | The project ID |
| `documentId` | integer | The document ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `revision` | integer | No | Document revision number |
| `microtoken` | string | Yes | Short-lived token from `GET /microtoken` |

**Example:**

```
https://{environment}.streambim.com/project-42/api/v1/documents/1002/_show?revision=1&microtoken={token}
```

---

## Notes

- Tileserver endpoints use `id_token` as a query parameter because they are loaded by `<img>` tags and other browser elements that cannot set custom HTTP headers.
- Document images are rendered server-side from uploaded PDFs and other document formats.
- Tile coordinates follow a quadtree/octree addressing scheme for progressive level-of-detail loading.
- Use `t` (timestamp) parameters for cache invalidation when documents or models are updated.
