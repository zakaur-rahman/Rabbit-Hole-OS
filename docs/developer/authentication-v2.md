# Authentication Architecture (v2)

This document outlines the modern authentication flow for the Cognode ecosystem, encompassing the Next.js Web Application, FastAPI Backend, and Electron Desktop Application.

We recently transitioned from a loopback local server architecture to a **Deep Link PCKE (Proof Key for Code Exchange)** architecture for massive security and UX improvements.

## Core Components
1. **Web App (`apps/web`)**: The primary authentication surface. Handles the initial Google OAuth trigger, PKCE challenge generation, and renders the Desktop handoff UI.
2. **Backend (`apps/backend`)**: The source of truth for token issuance, validation, and user profile management.
3. **Desktop App (`apps/desktop`)**: Listens to the custom OS-level protocol (`cognode://`) to receive one-time authentication hand-offs from the Web App.

---

## The PCKE Web Flow
When a user visits the standard web application (`http://localhost:3001/login`):
1. **Initiation**: The user clicks "Continue with Google".
2. **PCKE Generation**: The client generates a random `code_verifier` (stored in `sessionStorage`) and a SHA-256 `code_challenge`.
3. **Google Redirect**: The user is sent to the Google OAuth consent screen with the `code_challenge`.
4. **Callback**: Google redirects back to `/auth/google` with an authorization `code`.
5. **Exchange (`POST /oauth/google/exchange`)**: The Web App sends the `code` and the `code_verifier` to the backend.
6. **Token Issuance**: The backend contacts Google to verify the code/verifier pair. If successful, it issues a JWT `access_token` and `refresh_token` to the Web App.
7. **Storage**: The Web App stores these tokens in `sessionStorage`.

---

## The Desktop Deep-Link Handoff Flow
The Desktop App cannot securely store long-lived Client Secrets, nor should it spawn arbitrary background servers to listen for OAuth callbacks. Instead, it delegates the login UI to the Web App and requests a handoff.

1. **Trigger**: The Desktop App opens the default OS browser to `http://localhost:3001/login?source=desktop&device_id=XYZ`.
2. **Web Context**: The Web App detects the `source=desktop` parameter and stores this context in `sessionStorage`. It then executes the standard PCKE flow described above.
3. **Backend Injection (`POST /oauth/google/exchange`)**: When the Web App exchanges the code with the backend, it includes the `desktop_device_id` in the payload.
4. **One-Time Code Generation**: The Backend recognizes desktop context. Alongside returning the standard Web JWT tokens to the Web App, it generates a highly secure **`desktop_auth_code`** (a 32-byte URL-safe string).
   - This code is stored in the Backend's Redis instance with a strict **5-minute TTL**.
   - The value stored in Redis contains the user's ID and tokens.
5. **Web Handoff UI**: The Web App receives the `desktop_auth_code` in the response payload. It immediately mounts a blocker UI (the `DesktopBanner` component) with a button: "Open in Cognode App".
6. **Deep Linking (`cognode://`)**: Clicking the button triggers the OS custom protocol link: `cognode://auth/callback?code=<desktop_auth_code>`.
7. **Desktop Resolution (`POST /oauth/desktop/exchange`)**: The Desktop App intercepts the protocol link, extracts the `code`, and hits the backend `/oauth/desktop/exchange` endpoint.
8. **Finalization**: The Backend pops the code from Redis (ensuring one-time use), and returns the tokens directly to the Electron shell.

## Security Advantages
- **No Client Secrets in Desktop**: Only the Backend holds the Google Client Secret.
- **No Loopback Servers**: We no longer rely on brittle `localhost` port-binding (which commonly conflicted or triggered strict firewall blocks).
- **Protection Against Interception**: Because the deep-link code requires a short-lived, backend-verified Redis token, a malicious app intercepting `cognode://` cannot replay historical tokens.
- **PCKE Mitigations**: Mitigates Authorization Code Interception Attacks by cryptographically tying the initial consent request to the final code exchange.

## Key Environment Variables
Ensure these are set properly across all environments:

**Backend (`apps/backend/.env`)**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET_KEY`
- `REDIS_URL`

**Web (`apps/web/.env.local`)**
- `NEXT_PUBLIC_API_URL`: Points to the backend.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_OAUTH_REDIRECT_URI`: Must explicitly be `http://localhost:3001/auth/google`.

**Frontend/Desktop (`apps/frontend/.env` - *for legacy reference or cross-env mapping*)**
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_DESKTOP_PROTOCOL=cognode`
