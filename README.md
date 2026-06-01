# StreamBIM API Documentation

Comprehensive reference for the StreamBIM public API. This documentation is intended for agentic and programmatic use -- each section file is self-contained with all required context.

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

See [authentication.md](api/authentication.md) for full endpoint details.

## Content Types

The API uses two content type conventions depending on the endpoint group:

| Endpoint prefix | Content-Type |
|-----------------|-------------|
| `/auth/v1/*` | `application/json; charset=utf-8` (request) / `application/json` (response) |
| `/mgw/api/*` | `application/vnd.api+json` (JSON:API format) |
| `/project-{id}/api/*` | `application/vnd.api+json` (JSON:API format) |
| `/cmv3/*` | `application/vnd.api+json` (JSON:API format) |
| `/bcf/2.1/*` | `application/json` |

## URL Variables

- **`{environment}`** -- The region subdomain (see table above).
- **`{projectId}`** -- The numeric project ID. Obtain via `GET /mgw/api/v3/projects` or `GET /mgw/api/v3/project-links`.
- **`{projectUUID}`** -- The project BCF UUID. Obtain via `GET /bcf/2.1/projects`.

## Pagination

Project-level endpoints that return lists support limit-offset pagination:

```
?page[skip]=0&page[limit]=10
```

- `page[skip]` -- Number of items to skip (default: 0).
- `page[limit]` -- Maximum number of items to return (default: all).

## Filtering

Many list endpoints accept `filter` query parameters in deep-object style:

```
?filter[fieldName]=value
```

Multiple filters can be combined. See individual endpoint documentation for available filter options.

## Rate Limiting and Fair Use

The StreamBIM backend is optimized for loads matching the StreamBIM app. Be cautious with:
- Overriding default pagination limits
- High-frequency polling
- Large batch operations

Misuse may result in client blocking. Contact `cto@rendra.io` with questions.

## Building widgets

StreamBIM widgets are web apps loaded in an iframe inside the viewer. They use the official **[streambim-widget-api](https://github.com/streambim/streambim-widget-api)** package (v3: `connectToParent` / `connectToChild`, methods on `StreamBIM.API`).

- **Agent-oriented guide:** [AGENTS.md](AGENTS.md)
- **Full Widget API reference:** [api/widget-api.md](api/widget-api.md) (method index, ecosystem repos, examples)
- **Community catalog:** [StreamBIM Marketplace](https://streambim-marketplace.vercel.app/?widget=true)

Widgets require the **WIDGET** project feature and URL whitelisting (`support@rendra.io`). For server-side automation without a 3D viewer, use the REST sections below instead.

## API Sections

| Section | File | Description |
|---------|------|-------------|
| Authentication | [authentication.md](api/authentication.md) | Login, token refresh, MFA, federation, OAuth2 providers, password management |
| Users | [users.md](api/users.md) | User management, groups, organizations, customer user profiles, password reset |
| Projects | [projects.md](api/projects.md) | Project CRUD, members, links, templates |
| Topics | [topics.md](api/topics.md) | Topics (issues/RFIs), viewpoints, comments, labels, statuses, priorities, trends |
| Workflows | [workflows.md](api/workflows.md) | Workflow configuration and management |
| Checklists | [checklists.md](api/checklists.md) | Checklist management, export, grouped checklist resolution |
| Documents | [documents.md](api/documents.md) | Document management, revisions, download links, stars, labels, label groups, folders |
| Attachments | [attachments.md](api/attachments.md) | File attachments, upload tickets, S3 uploads, downloads, microtokens, floor downloads |
| Exports | [exports.md](api/exports.md) | JSON/XLSX export endpoints for documents, topics, checklists, users, IFC files (PowerBI) |
| IFC Searches | [ifc-searches.md](api/ifc-searches.md) | IFC model search, JSON/IFC export, freetext search, color coding |
| Converter Jobs | [converter-jobs.md](api/converter-jobs.md) | IFC model conversion job management and monitoring |
| Sync | [sync.md](api/sync.md) | External file source synchronization (e.g. Sharepoint, Interaxo) |
| Takt Planning | [takt-planning.md](api/takt-planning.md) | Trains and wagons for lean construction scheduling |
| Tileserver | [tileserver.md](api/tileserver.md) | 2D document images, 3D model tiles, document viewer |
| Realtime Events | [realtime.md](api/realtime.md) | Server-Sent Events (SSE) for status updates and notifications |
| Infrastructure | [infrastructure.md](api/infrastructure.md) | Health check, client logging, batch requests, cache invalidation |
| BCF | [bcf.md](api/bcf.md) | BCF 2.1 API for BIM Collaboration Format |
| Regions | [regions.md](api/regions.md) | Region/environment discovery |
| Widget API | [widget-api.md](api/widget-api.md) | JavaScript v3 SDK for widgets & embedded viewer (see [AGENTS.md](AGENTS.md)) |

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
