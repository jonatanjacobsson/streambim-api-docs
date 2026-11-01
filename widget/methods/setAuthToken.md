# setAuthToken

**Status:** ✍️ writes data · **Category:** REST & auth · [All methods](../README.md)

Give an embedded viewer a bearer token (embedded mode, before the user is signed in).

```ts
StreamBIM.API.setAuthToken(token: string): Promise<true>
```

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | yes | StreamBIM `idToken` (see the REST authentication docs). |

## Returns

`true`: Resolves after the app accepts the token. If the token is accepted, the viewer loads the model and fires `modelReady`.

## What StreamBIM does

`window.rendrao.setAuthToken(token)`, then `triggerAction("modelReady")` on success.

## Note

Not run by the verifier: calling it inside an already signed-in session would replace that session's token. Meant for `connectToChild` embedding, called from `beforeInit`.

## Examples

#### Embedded host page (not executed)

```js
// In the page that embeds StreamBIM with ?embedded=true:
StreamBIM.connectToChild(iframe, {
  beforeInit: () => StreamBIM.API.setAuthToken(idToken),
  modelReady: () => console.log('model loaded'),
});
```

_Not executed: only runs in an embedding page, not in a side-panel widget._
