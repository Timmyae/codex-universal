# OAuth Flow Diagram

## Complete OAuth 2.0 Flow with PKCE

```
┌─────────┐                                          ┌──────────┐                    ┌────────────┐
│ Client  │                                          │  OAuth   │                    │  GitHub    │
│  App    │                                          │  Server  │                    │  OAuth     │
└────┬────┘                                          └────┬─────┘                    └─────┬──────┘
     │                                                     │                                │
     │  1. GET /auth/github                               │                                │
     │  ?redirect_uri=...                                 │                                │
     ├────────────────────────────────────────────────────>                                │
     │                                                     │                                │
     │  2. Generate PKCE pair                             │                                │
     │     code_verifier (random 128 chars)               │                                │
     │     code_challenge = SHA256(code_verifier)         │                                │
     │     Store code_verifier in session                 │                                │
     │                                                     │                                │
     │  3. Redirect to GitHub                             │                                │
     │     with code_challenge & state                    │                                │
     │<────────────────────────────────────────────────────                                │
     │                                                     │                                │
     │  4. Authorization Request                          │                                │
     │     ?client_id=...                                 │                                │
     │     &redirect_uri=...                              │                                │
     │     &code_challenge=...                            │                                │
     │     &code_challenge_method=S256                    │                                │
     │     &state=...                                     │                                │
     ├─────────────────────────────────────────────────────────────────────────────────────>
     │                                                     │                                │
     │  5. User approves                                  │                                │
     │<─────────────────────────────────────────────────────────────────────────────────────
     │                                                     │                                │
     │  6. Callback with code                             │                                │
     │     ?code=...&state=...                            │                                │
     ├────────────────────────────────────────────────────>                                │
     │                                                     │                                │
     │  7. Validate state (CSRF protection)               │                                │
     │     Retrieve code_verifier from session            │                                │
     │                                                     │                                │
     │  8. Exchange code for GitHub token                 │                                │
     │     POST with code & code_verifier                 │                                │
     │                                                     ├───────────────────────────────>
     │                                                     │                                │
     │  9. GitHub validates code_verifier                 │                                │
     │     SHA256(code_verifier) == code_challenge        │                                │
     │                                                     │<───────────────────────────────
     │                                                     │                                │
     │  10. Get user profile from GitHub                  │                                │
     │                                                     ├───────────────────────────────>
     │                                                     │<───────────────────────────────
     │                                                     │                                │
     │  11. Generate JWT tokens                           │                                │
     │      - Access token (15 min)                       │                                │
     │      - Refresh token (30 days)                     │                                │
     │                                                     │                                │
     │  12. Return tokens                                 │                                │
     │      {                                              │                                │
     │        "access_token": "...",                      │                                │
     │        "refresh_token": "...",                     │                                │
     │        "token_type": "Bearer",                     │                                │
     │        "expires_in": 900                           │                                │
     │      }                                              │                                │
     │<────────────────────────────────────────────────────                                │
     │                                                     │                                │
     │  13. Store tokens in secure storage                │                                │
     │      (Keychain/KeyStore)                           │                                │
     │                                                     │                                │
```

## Token Refresh Flow

```
┌─────────┐                                          ┌──────────┐
│ Client  │                                          │  OAuth   │
│  App    │                                          │  Server  │
└────┬────┘                                          └────┬─────┘
     │                                                     │
     │  1. Access token expired/expiring                  │
     │                                                     │
     │  2. POST /auth/refresh                             │
     │     { "refresh_token": "..." }                     │
     ├────────────────────────────────────────────────────>
     │                                                     │
     │  3. Verify refresh token                           │
     │     - Check signature                              │
     │     - Check expiry                                 │
     │     - Check if already used                        │
     │     - Check if revoked                             │
     │                                                     │
     │  4. If valid:                                      │
     │     - Mark old token as used                       │
     │     - Add to blacklist                             │
     │     - Generate new access token                    │
     │     - Generate new refresh token                   │
     │                                                     │
     │  5. Return new tokens                              │
     │     {                                              │
     │       "access_token": "...",                       │
     │       "refresh_token": "...",                      │
     │       "token_type": "Bearer",                      │
     │       "expires_in": 900                            │
     │     }                                              │
     │<────────────────────────────────────────────────────
     │                                                     │
     │  6. Store new tokens                               │
     │     Replace old tokens in secure storage           │
     │                                                     │
```

## Token Reuse Detection (Security)

```
┌─────────┐                                          ┌──────────┐
│ Attacker│                                          │  OAuth   │
│         │                                          │  Server  │
└────┬────┘                                          └────┬─────┘
     │                                                     │
     │  1. Try to reuse old refresh token                 │
     │     POST /auth/refresh                             │
     │     { "refresh_token": "old_token" }               │
     ├────────────────────────────────────────────────────>
     │                                                     │
     │  2. Server checks metadata                         │
     │     - Token already marked as "used"               │
     │     - SECURITY VIOLATION DETECTED                  │
     │                                                     │
     │  3. Revoke entire token family                     │
     │     - Mark all tokens with same familyId as used   │
     │     - Add to blacklist                             │
     │     - Log security incident                        │
     │                                                     │
     │  4. Return error                                   │
     │     { "error": "invalid_grant" }                   │
     │<────────────────────────────────────────────────────
     │                                                     │
     │  5. User must re-authenticate                      │
     │                                                     │
```

## PKCE Challenge Verification

```
1. Client generates code_verifier:
   code_verifier = random(128 chars, base64url)
   Example: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

2. Client generates code_challenge:
   code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
   Example: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

3. Client sends code_challenge to server

4. Server stores code_challenge (associated with state)

5. Client receives authorization code

6. Client sends code + code_verifier to server

7. Server validates:
   calculated_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
   if calculated_challenge == stored_code_challenge:
       SUCCESS - Issue tokens
   else:
       FAIL - Reject request
```

## Security Events Flow

```
Event: Token Reuse Attempt
├── Detection: Server identifies used token
├── Log: Security violation logged
├── Action: Revoke token family
├── Alert: Send notification to monitoring system
└── Response: Return error to client

Event: Invalid Redirect URI
├── Detection: URI not in whitelist
├── Log: Security violation logged
├── Action: Reject request
├── Alert: Log IP address
└── Response: Return error to client

Event: Rate Limit Exceeded
├── Detection: Too many requests from IP
├── Log: Rate limit violation logged
├── Action: Block requests temporarily
├── Alert: Monitor for DDoS
└── Response: Return 429 Too Many Requests
```
