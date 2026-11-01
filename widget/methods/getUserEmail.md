# getUserEmail

**Status:** ✅ works · **Category:** Project & user · [All methods](../README.md)

The signed-in user's id, which in StreamBIM is their e-mail address.

```ts
StreamBIM.API.getUserEmail(): Promise<string>
```

## Returns

`string`: User id / e-mail.

## What StreamBIM does

Reads `projectservice.user.id`.

## Errors

- Rejects `{ code: "unknown" }` when no user is signed in.

## Examples

#### Who is using the widget

```js
const email = await StreamBIM.API.getUserEmail();
return email.replace(/^(.).*(@.*)$/, '$1…$2'); // masked for the docs
```

<details open><summary>Output (verified 2026-11-01, 1 ms)</summary>

```json
"j…@example.com"
```

</details>

## Probe results (2026-11-01)

Raw calls from `harness/tools/probe-widget-api.mjs`, each raced against a 6 s timeout:

| Case | Args | Outcome | ms |
|---|---|---|---|
| normal call | `[]` | resolved `string` | 0 |
