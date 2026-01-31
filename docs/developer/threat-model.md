# Authentication System Threat Model

## Overview

This document outlines potential security threats and mitigations for the Cognode authentication system.

## Threat Categories

### 1. Authorization Code Interception

**Threat:** Attacker intercepts authorization code during OAuth redirect.

**Mitigation:**
- ✅ PKCE (Proof Key for Code Exchange) implementation
- ✅ Code verifier stored securely in sessionStorage
- ✅ Code challenge sent to authorization server
- ✅ Verifier required for token exchange

**Risk Level:** Low (with PKCE)

### 2. CSRF Attacks

**Threat:** Attacker tricks user into authorizing attacker's account.

**Mitigation:**
- ✅ State parameter generated per request
- ✅ State validated on callback
- ✅ State tied to code verifier storage

**Risk Level:** Low

### 3. Token Theft

**Threat:** Attacker steals access or refresh tokens.

**Mitigation:**
- ✅ Access tokens: Short expiration (1 hour)
- ✅ Refresh tokens: Rotated on use
- ✅ Tokens stored securely (OS keychain in Electron)
- ✅ HTTPS only in production
- ✅ HttpOnly cookies (if used)
- ✅ No tokens in localStorage (use sessionStorage or keychain)

**Risk Level:** Medium (mitigated by short expiration and rotation)

### 4. Token Replay Attacks

**Threat:** Attacker reuses a stolen token.

**Mitigation:**
- ✅ Refresh token rotation
- ✅ Revoked tokens tracked in Redis
- ✅ Session expiration
- ✅ Token expiration validation

**Risk Level:** Low

### 5. Man-in-the-Middle (MITM)

**Threat:** Attacker intercepts traffic between client and server.

**Mitigation:**
- ✅ HTTPS/TLS for all communication
- ✅ Certificate pinning (consider for production)
- ✅ HSTS headers

**Risk Level:** Low (with HTTPS)

### 6. Database Breach

**Threat:** Attacker gains access to database.

**Mitigation:**
- ✅ Refresh tokens hashed (SHA256) before storage
- ✅ Passwords not stored (OAuth only)
- ✅ User data encrypted at rest (database-level)
- ✅ Database access restricted

**Risk Level:** Medium (mitigated by token hashing)

### 7. Redis Breach

**Threat:** Attacker gains access to Redis cache.

**Mitigation:**
- ✅ No sensitive data in Redis
- ✅ Revocation lists only (token hashes)
- ✅ Redis password protection
- ✅ Network isolation

**Risk Level:** Low (no sensitive data stored)

### 8. ID Token Forgery

**Threat:** Attacker creates fake Google ID token.

**Mitigation:**
- ⚠️ TODO: Implement proper ID token verification
- ✅ Verify issuer (accounts.google.com)
- ✅ Verify audience (client ID)
- ✅ Verify expiration
- ✅ Verify signature (requires Google public keys)

**Risk Level:** Medium (requires proper verification)

### 9. Session Hijacking

**Threat:** Attacker hijacks user session.

**Mitigation:**
- ✅ Session IDs in JWT (not predictable)
- ✅ Session expiration
- ✅ Session revocation on logout
- ✅ Device tracking (optional)

**Risk Level:** Medium

### 10. Brute Force Attacks

**Threat:** Attacker attempts to guess tokens or codes.

**Mitigation:**
- ✅ Long, random tokens (JWT)
- ✅ Rate limiting (Redis-based)
- ✅ Code expiration (short-lived)
- ✅ Account lockout (consider)

**Risk Level:** Low

### 11. Redirect URI Manipulation

**Threat:** Attacker redirects OAuth callback to malicious site.

**Mitigation:**
- ✅ Strict redirect URI validation
- ✅ Whitelist of allowed redirect URIs
- ✅ Custom URI scheme for desktop (cognode://)
- ✅ HTTPS for web redirects

**Risk Level:** Low

### 12. Client Secret Exposure

**Threat:** Client secret exposed in client-side code.

**Mitigation:**
- ✅ No client secret in Electron app
- ✅ Client secret only in backend
- ✅ Environment variables (not committed)
- ✅ Secret rotation capability

**Risk Level:** Low (no secret in client)

## Security Checklist

### Implementation

- [x] PKCE implementation
- [x] State parameter for CSRF protection
- [x] JWT token generation
- [x] Refresh token rotation
- [x] Token revocation tracking
- [x] Session management
- [x] Secure token storage
- [ ] ID token signature verification (TODO)
- [ ] Rate limiting implementation
- [ ] Audit logging
- [ ] Certificate pinning

### Configuration

- [ ] Strong JWT secret (32+ characters)
- [ ] HTTPS enabled in production
- [ ] CORS properly configured
- [ ] Redis password set
- [ ] Database credentials secured
- [ ] Environment variables secured
- [ ] Google OAuth client secret secured

### Monitoring

- [ ] Failed login attempts tracking
- [ ] Token usage monitoring
- [ ] Anomaly detection
- [ ] Security event logging
- [ ] Alert system

## Recommendations

1. **Implement ID Token Verification**
   - Fetch Google's public keys
   - Verify token signature
   - Verify all claims

2. **Add Rate Limiting**
   - Limit login attempts per IP
   - Limit token refresh requests
   - Use Redis for rate limiting

3. **Implement Audit Logging**
   - Log all authentication events
   - Log token usage
   - Log security events

4. **Add Device Management**
   - Track device IDs
   - Allow device revocation
   - Show active devices to user

5. **Implement Account Lockout**
   - Lock account after failed attempts
   - Temporary lockout period
   - Admin unlock capability

6. **Add Two-Factor Authentication (Future)**
   - TOTP support
   - SMS backup codes
   - Recovery options

## Compliance

- **GDPR**: User data handling, right to deletion
- **SOC 2**: Security controls, audit logging
- **OWASP Top 10**: Addresses common vulnerabilities

## Incident Response

1. **Token Compromise**
   - Revoke all user sessions
   - Force re-authentication
   - Investigate breach source

2. **Database Breach**
   - Rotate all secrets
   - Revoke all tokens
   - Notify affected users

3. **OAuth Provider Breach**
   - Rotate OAuth credentials
   - Review all recent authentications
   - Consider additional verification
