# getProjectId

**Status:** ✅ works · **Category:** Project & user · [All methods](../README.md)

The numeric id of the open StreamBIM project, as a string.

```ts
StreamBIM.API.getProjectId(): Promise<string>
```

## Returns

`string`: Project id, e.g. `"15974"`. Use it to build REST paths like `/project-{id}/api/v1/...`.

## What StreamBIM does

Reads `projectservice.projectId`.

## Errors

- Rejects `{ code: "unknown" }` if no project is loaded (not observed in practice).

## Examples

#### Read the project id

```js
return await StreamBIM.API.getProjectId();
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
"15974"
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `string` | 0 |
