# Authentication

All StreamBIM API requests (except login itself) require a Bearer token. This section covers all authentication-related endpoints.

**Base URL:** `https://{environment}.streambim.com`

**Environments:** `app`, `sweden`, `japan`, `australia`, `staging`, `dev`

---

## Login (v1 -- recommended)

### `POST /auth/v1/login`

Authenticates a user and returns tokens. This is the primary login endpoint.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | The user's email/username |
| password | string | Yes | The user's password |

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| result | string | `SUCCESS` for successful auth, `CHALLENGE_REQUESTED` if MFA is required |
| accessToken | string | OAuth2 access token |
| refreshToken | string | Token used to refresh the idToken when it expires |
| idToken | string | **The Bearer token to use for all API calls** |
| tokenType | string | Token type (e.g. `Bearer`) |
| expiresIn | integer | Token lifetime in seconds |
| scope | string | OAuth2 scope |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"username": "user@example.com", "password": "yourPassword"}' \
  "https://{environment}.streambim.com/auth/v1/login"
```

**Usage:** If `result` is `SUCCESS`, use the `idToken` as `Authorization: Bearer {idToken}` for all subsequent requests. If `result` is `CHALLENGE_REQUESTED`, proceed to MFA verification.

---

## Token Refresh

### `POST /auth/v1/refresh`

Refreshes an expired ID token using the refresh token obtained during login.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | The expired ID token |
| refreshToken | string | Yes | The refresh token from the original login |

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| result | string | `SUCCESS` or `CHALLENGE_REQUESTED` |
| session | string | If `CHALLENGE_REQUESTED`, the session for MFA verification |
| accessToken | string | New access token |
| idToken | string | **New Bearer token** |
| tokenType | string | Token type |
| expiresIn | integer | Token lifetime in seconds |
| scope | string | OAuth2 scope |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"token": "EXPIRED_ID_TOKEN", "refreshToken": "YOUR_REFRESH_TOKEN"}' \
  "https://{environment}.streambim.com/auth/v1/refresh"
```

---

## Change Password

### `POST /auth/v1/change-password/request`

Initiates a password change. Sends a verification code to the user's email via AWS Cognito.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | The user's username/email |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"username": "user@example.com"}' \
  "https://{environment}.streambim.com/auth/v1/change-password/request"
```

### `POST /auth/v1/change-password/confirm`

Completes the password change using the verification code received by email.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | The user's username/email |
| code | string | Yes | The verification code received by email from Cognito |
| newPassword | string | Yes | The new password |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"username": "user@example.com", "code": "123456", "newPassword": "newSecurePassword"}' \
  "https://{environment}.streambim.com/auth/v1/change-password/confirm"
```

---

## Federation Providers

### `GET /auth/v1/federation/providers`

Lists available Single Sign-On (SSO) federation providers. The default provider is `COGNITO` (the Cognito-powered OAuth2 server).

**Response (200):** Array of provider objects:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Provider name (e.g. `COGNITO`). The Cognito-provided name for the federation provider |
| loginURL | string | URL to redirect the user to for authentication through this provider |

**Example:**

```bash
curl -X GET "https://{environment}.streambim.com/auth/v1/federation/providers"
```

---

## Multi-Factor Authentication (MFA)

MFA uses TOTP (Time-based One-Time Password) applications. The flow is:
1. **Associate** -- Set up TOTP with an authenticator app.
2. **Enable** -- Confirm the setup with a TOTP code.
3. After enabling, `POST /auth/v1/login` returns `CHALLENGE_REQUESTED` requiring MFA **verify**.
4. **Disable** -- Optionally remove MFA.

### `POST /auth/v1/mfa/associate`

Starts the MFA association process. Returns a secret code and QR code value for setting up a TOTP application.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| accessToken | string | Yes | A valid **access** token (NOT the ID token) |

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | The same access token, echoed back |
| secretCode | string | Secret code to set up the TOTP application |
| qrCodeValue | string | Value that can be used to generate a QR code for TOTP setup |

### `POST /auth/v1/mfa/enable`

Completes the MFA association by verifying a TOTP code from the newly configured authenticator app.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| accessToken | string | Yes | A valid **access** token (NOT the ID token) |
| code | string | Yes | A 6-digit TOTP code from the authenticator app |

### `POST /auth/v1/mfa/disable`

Removes the MFA requirement from the user's account.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| accessToken | string | Yes | A valid **access** token (NOT the ID token) |

### `POST /auth/v1/mfa/verify`

Responds to the `CHALLENGE_REQUESTED` result from `/auth/v1/login` when MFA is enabled. Completes the second authentication leg.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | The user's username/email |
| session | string | Yes | The session string returned from the login response |
| code | string | Yes | A 6-digit TOTP code from the authenticator app |

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| result | string | Authentication result |
| accessToken | string | Access token |
| idToken | string | **The Bearer token to use for all API calls** |
| tokenType | string | Token type |
| expiresIn | integer | Token lifetime in seconds |
| scope | string | OAuth2 scope |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"username": "user@example.com", "session": "SESSION_STRING", "code": "123456"}' \
  "https://{environment}.streambim.com/auth/v1/mfa/verify"
```

---

## MFA Status

### `GET /auth/v1/mfa/status`

Checks whether MFA is currently enabled for the authenticated user. Not available when using federated authentication (SSO).

**Headers:**
- `Authorization: Bearer {idToken}`

**Response (200):**

Returns the current MFA enrollment status for the user.

**Example:**

```bash
curl -X GET \
  -H "Authorization: Bearer {idToken}" \
  "https://{environment}.streambim.com/auth/v1/mfa/status"
```

---

## OAuth2 Provider Login

### `GET /project-{projectId}/api/v1/oauth2/{provider}/login`

Initiates an OAuth2 login flow through a third-party provider within a project context. Requires a microtoken for authentication. The browser is redirected to the provider's login page.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| projectId | integer | The project ID |
| provider | string | OAuth2 provider identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| microtoken | string | Yes | Short-lived token obtained from `GET /microtoken` |

**Flow:**

1. Obtain a microtoken: `GET /project-{projectId}/api/v1/microtoken`
2. Redirect the browser to: `/project-{projectId}/api/v1/oauth2/{provider}/login?microtoken={microtoken}`

---

## Federation Redirect

### `GET /mgw/api/v2/federation/redirecttoexternallogin`

Redirects the user to an external SSO login page for a specific federation provider. Used when the user's account requires federated authentication.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| provider | string | Yes | The federation provider name (from `/auth/v1/federation/providers`) |

**Example:**

```bash
curl -L "https://{environment}.streambim.com/mgw/api/v2/federation/redirecttoexternallogin?provider=SAML_PROVIDER_NAME"
```

**Note:** This is a browser redirect endpoint, not a JSON API. It returns a 302 redirect to the external identity provider.

---

## Legacy Login (v2)

### `POST /mgw/api/v2/login`

Legacy login endpoint. Returns access and refresh tokens but not the full token set of the v1 endpoint.

**Headers:**
- `Content-Type: application/json; charset=utf-8`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | The user's username/email |
| password | string | Yes | The user's password |

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | Access token (required) |
| refreshToken | string | Refresh token |

**Example:**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"username": "username@email.com", "password": "yourPassword"}' \
  "https://{environment}.streambim.com/mgw/api/v2/login"
```
