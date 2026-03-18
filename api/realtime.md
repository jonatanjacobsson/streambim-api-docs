# Realtime Events (SSE)

Server-Sent Events (SSE) endpoints for receiving real-time notifications and status updates from StreamBIM. These endpoints use the [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) / `fetchEventSource` protocol for streaming events.

**Base URL:** `https://{environment}.streambim.com`

**Authentication:** `Authorization: Bearer {idToken}`

---

## Event Stream (Status)

### `GET /project-{projectId}/api/v1/sse/stat`

Opens a Server-Sent Events stream for receiving real-time status updates. Used for tracking the progress of asynchronous operations like report generation, user imports, and file exports.

**Headers**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {idToken}` |
| `Accept` | `text/event-stream` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | integer | The project ID |

**Event Format:**

Each event is a JSON object with the following structure:

```json
{
    "type": "report-export",
    "payload": {
        "ticket": "download-id-123"
    },
    "status": {
        "code": 1
    }
}
```

**Event Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Event type identifier |
| `payload` | object | Event-specific data |
| `payload.ticket` | string | Ticket/ID for correlating with the original request |
| `status.code` | number | `1` = success, `2` = error |

**Known Event Types:**

| Type | Description |
|------|-------------|
| `report-export` | Report or export file has been generated and is ready for download |
| `users-import` | User import operation completed |
| `report-import` | Report import operation completed |

**Subscription Pattern:**

The frontend subscribes to specific event types and tickets:

```javascript
// Subscribe to a report export event
storeservice.subscribeToEvent({
    type: "report-export",
    ticket: downloadId,
    handler: (payload) => {
        // Download is ready, fetch from /downloads/{id}/{fileName}
    },
    onError: (payload) => {
        // Handle error
    }
});
```

**Example (JavaScript):**

```javascript
const eventSource = new EventSource(
    `https://{environment}.streambim.com/project-42/api/v1/sse/stat`,
    { headers: { 'Authorization': `Bearer ${idToken}` } }
);

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'report-export' && data.payload.ticket === myTicket) {
        if (data.status.code === 1) {
            // Success -- download is ready
        } else if (data.status.code === 2) {
            // Error
        }
    }
};
```

---

## Notifications Stream

### `GET /project-{projectId}/api/v1/sse/notifications`

SSE stream for real-time user notifications (e.g. new topic assignments, comments, mentions).

**Headers**

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer {idToken}` |
| `Accept` | `text/event-stream` |

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | integer | The project ID |

**Query Parameters (for forced poll):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | Base64-encoded JSON filter for forced notification fetch |

**Filter Schema (for forced poll):**

```json
{
    "filter": { "ticket": "event-id" },
    "page": { "skip": 0, "limit": 0 }
}
```

---

## Typical Usage: Report Export with SSE

The following pattern is used when generating downloadable reports or exports:

1. **Create a report/export record** via JSON:API (e.g. `POST /v2/reports`)
2. **Subscribe to SSE** on `/sse/stat` for event type `report-export` with ticket = record ID
3. **Wait for the event** with `status.code === 1`
4. **Download the file** from `/downloads/{id}/{fileName}` using a microtoken

```javascript
// 1. Create the export
const report = await store.createRecord('report', { ... }).save();

// 2. Subscribe to completion event
storeservice.subscribeToEvent({
    type: 'report-export',
    ticket: report.id,
    handler: () => {
        // 3. Build download URL
        const url = storeservice.microtokenUrl(
            storeservice.fullUrl(`/downloads/${report.id}/${report.fileName}`)
        );
        // 4. Trigger download
        window.open(url);
    }
});
```

---

## Notes

- SSE connections are long-lived HTTP connections. The server sends events as they occur.
- Events are filtered client-side by `type` and `ticket` to match subscriptions.
- If the connection drops, the client should automatically reconnect (browsers handle this natively with `EventSource`).
- The `/sse/stat` endpoint is project-scoped -- you receive events for operations within that project only.
