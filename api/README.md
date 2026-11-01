# StreamBIM REST API (unofficial reference)

Reference for the StreamBIM backend API. Each section file is self-contained with all required
context, so it works well as input for coding agents. [Back to the kit](../README.md)

## Two ways to call it

| From | Auth | How |
|---|---|---|
| **A widget** (inside StreamBIM) | The signed-in user's session, no token handling | `StreamBIM.API.makeApiRequest({ url, method, body, accept, contentType })`. See [REST from a widget](../widget/guides/rest-api-from-widgets.md) |
| **Your own backend / script** | Bearer token from `/auth/v1/login` | Plain HTTPS, see below |

From a widget, verified on app.streambim.com:

- JSON:API endpoints (`/mgw/api/v3/…`, `/project-{id}/api/v1/v2/…`) only work with the default Accept (`application/vnd.api+json`). BCF (`/bcf/2.1/…`) needs `accept: 'application/json'`.
- Use `/project-{id}/api/v1/…`. The `/pgw/project-{id}/…` form shown in some examples below failed from the widget.
- `makeApiRequest` reports **201 Created and 204 No Content as errors** (`DataCloneError`) even though the request succeeded. Real HTTP errors look the same. Re-read the resource to confirm a write.
- The [endpoint compatibility table](../widget/guides/rest-api-from-widgets.md#endpoint-compatibility-swept-2026-11-01) lists which GET endpoints work from a widget.

## Base URL

```
https://{environment}.streambim.com
```

| Environment | URL |
|-------------|-----|
| Production | `https://{environment}.streambim.com` (e.g. `app`) |
| Sweden | `https://sweden.streambim.com` |
| Japan | `https://japan.streambim.com` |
| Australia | `https://australia.streambim.com` |
| Staging | `https://staging.streambim.com` |
| Dev | `https://dev.streambim.com` |

## Authentication

All API requests (except login) require a Bearer token in the `Authorization` header:

```
Authorization: Bearer {idToken}
```

**Authentication flow:**

1. Call `POST /auth/v1/login` with `username` and `password` to obtain tokens.
2. If the response `result` is `SUCCESS`, use the returned `idToken` as the Bearer token.
3. If the response `result` is `CHALLENGE_REQUESTED` (MFA enabled), call `POST /auth/v1/mfa/verify` with the `session` and a TOTP `code` to complete authentication.
4. When the `idToken` expires (see `expiresIn`), call `POST /auth/v1/refresh` with the expired `idToken` and your `refreshToken` to obtain a new `idToken`.

See [authentication.md](authentication.md) for full endpoint details.

## Content Types

| Endpoint prefix | Content-Type |
|-----------------|-------------|
| `/auth/v1/*` | `application/json; charset=utf-8` (request) / `application/json` (response) |
| `/mgw/api/*` | `application/vnd.api+json` (JSON:API format) |
| `/project-{id}/api/v1/v2/*` | `application/vnd.api+json` (JSON:API format) |
| `/project-{id}/api/v1/*` (ifc-searches, exports, microtoken) | `application/json` |
| `/cmv3/*` | `application/vnd.api+json` (JSON:API format) |
| `/bcf/2.1/*` | `application/json` |

## URL Variables

- **`{environment}`**: the region subdomain (see table above).
- **`{projectId}`**: the numeric project ID. Obtain via `GET /mgw/api/v3/projects` or `GET /mgw/api/v3/project-links`. In a widget: `await StreamBIM.API.getProjectId()`.
- **`{projectUUID}`**: the project BCF UUID. Obtain via `GET /bcf/2.1/projects`.

## Pagination

Project-level endpoints that return lists support limit-offset pagination:

```
?page[skip]=0&page[limit]=10
```

Some list endpoints ignore `page[limit]` and return everything (e.g. `/mgw/api/v3/projects`, `/v2/checklists`).

## Filtering

Many list endpoints accept `filter` query parameters in deep-object style, e.g. `?filter[checklist]=1632`.

## Rate Limiting and Fair Use

The StreamBIM backend is optimized for loads matching the StreamBIM app. Be cautious with
overriding default pagination limits, high-frequency polling and large batch operations.
Misuse may result in client blocking. Contact `cto@rendra.io` with questions.

## API Sections

| Section | File | Description |
|---------|------|-------------|
| Authentication | [authentication.md](authentication.md) | Login, token refresh, MFA, federation, OAuth2 providers, password management |
| Users | [users.md](users.md) | User management, groups, organizations, customer user profiles, password reset |
| Projects | [projects.md](projects.md) | Project CRUD, members, links, templates |
| Topics | [topics.md](topics.md) | Topics (issues/RFIs), viewpoints, comments, labels, statuses, priorities, trends |
| Workflows | [workflows.md](workflows.md) | Workflow configuration and management |
| Checklists | [checklists.md](checklists.md) | Checklist management, export, grouped checklist resolution. Creating checklists and filling answers: [checklist guide](../widget/guides/checklists-and-colour-by-value.md) |
| Documents | [documents.md](documents.md) | Document management, revisions, download links, stars, labels, label groups, folders |
| Attachments | [attachments.md](attachments.md) | File attachments, upload tickets, S3 uploads, downloads, microtokens, floor downloads |
| Exports | [exports.md](exports.md) | JSON/XLSX export endpoints for documents, topics, checklists, users, IFC files (PowerBI) |
| IFC Searches | [ifc-searches.md](ifc-searches.md) | IFC model search, JSON/IFC export, freetext search, color coding |
| IFC objects / annotations | [annotations guide](../widget/guides/annotations-custom-objects.md) | Creating, reading and deleting custom objects (`/v2/ifc-objects`) |
| Converter Jobs | [converter-jobs.md](converter-jobs.md) | IFC model conversion job management and monitoring |
| Sync | [sync.md](sync.md) | External file source synchronization (e.g. Sharepoint, Interaxo) |
| Takt Planning | [takt-planning.md](takt-planning.md) | Trains and wagons for lean construction scheduling |
| Tileserver | [tileserver.md](tileserver.md) | 2D document images, 3D model tiles, document viewer |
| Realtime Events | [realtime.md](realtime.md) | Server-Sent Events (SSE) for status updates and notifications |
| Infrastructure | [infrastructure.md](infrastructure.md) | Health check, client logging, batch requests, cache invalidation |
| BCF | [bcf.md](bcf.md) | BCF 2.1 API for BIM Collaboration Format |
| Regions | [regions.md](regions.md) | Region/environment discovery |
| Widget API | [../widget/README.md](../widget/README.md) | Verified widget API reference (the older notes in [widget-api.md](widget-api.md) are superseded) |

## Privilege Levels

Used across user and project-member endpoints:

| Level | Role |
|-------|------|
| 0 | Inactive |
| 5 | Guest |
| 10 | User |
| 15 | Workflows Admin |
| 20 | Project Admin |
| 25 | Customer Admin |
| 30 | Owner |
