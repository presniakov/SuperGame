# Security & Access Control

## Admin Dashboard Access

The Admin Dashboard is isolated in a separate Multi-Page Application (MPA) structure to minimize the risk of unauthorized access or code exposure.

### 1. Architecture: Physical Isolation
- The Admin Dashboard operates as a completely separate application (`admin.html`) from the main game (`index.html`).
- **Benefit:** Regular users interact only with the `main` bundle. The `admin` JavaScript bundle is **never downloaded** to their browser during normal gameplay, significantly reducing the attack surface.

### 2. Secure Access Flow
Accessing the admin dashboard requires a secure handshake sequence:
1.  **User Trigger**: The user clicks "ADMIN ACCESS" on the Personal Page.
2.  **Verification**: The client sends a `POST /auth/admin-session` request with the user's JWT.
3.  **Session Creation**: The server verifies the token and role (`admin`). If valid, it sets a secure **HTTP-only cookie** (`admin_token`).
4.  **Navigation**: Only after the cookie is set does the browser redirect to `/admin.html`.

### 3. Layers of Defense

#### Layer 1: Server-Side Protection
- The server (`server.ts`) inspects every request for `admin.html`.
- It validates the `admin_token` cookie.
- **Result:** If a regular user (or bot) tries to access `https://game.com/admin.html` directly, the request is rejected at the server level before any HTML or JS is sent.

#### Layer 2: Client-Side Guard (Defense in Depth)
- Even if the server protection is bypassed (e.g., in a local development environment), the `admin.tsx` entry point includes an `<AdminGuard>`.
- This component immediately calls the backend (`/api/user/me`) to verify the user's role.
- If the user is not an admin, they are forcefully redirected to the home page.

### 4. API Security
- **The ultimate source of truth is the API.**
- All sensitive operations (like "Delete Database") are protected by middleware that independently verifies the user's role on every single request.
- The UI isolation is a convenience and obfuscation layer; the API authorization is the hard security boundary.
