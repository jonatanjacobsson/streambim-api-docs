# resetObjectSearch

**Status:** ✅ works · **Category:** Search · [All methods](../README.md)

Clear the active search (and any colour coding that started one).

```ts
StreamBIM.API.resetObjectSearch(): Promise<true>
```

## Returns

`true`

## What StreamBIM does

`viewerController.send("resetIfcSearch")`.

## Examples

#### Clear

```js
return await StreamBIM.API.resetObjectSearch();
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
true
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `boolean` | 4 |
| after colorCodeByProperty | `[]` | resolved `boolean` | 9 |
