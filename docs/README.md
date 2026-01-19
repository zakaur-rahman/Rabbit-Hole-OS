# Cognode Authentication System Documentation

Complete documentation for the enterprise-grade authentication system.

## 📚 Documentation Index

### Setup & Configuration
- **[Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)** - Step-by-step guide to configure Google OAuth
- **[Complete Setup Guide](./AUTH_SETUP_GUIDE.md)** - Full setup instructions for the entire system
- **[Implementation Summary](./AUTH_IMPLEMENTATION_SUMMARY.md)** - Overview of all components and features

### Architecture & Security
- **[Auth Flow Diagrams](./AUTH_FLOW_DIAGRAM.md)** - Visual representation of authentication flows
- **[Threat Model](./THREAT_MODEL.md)** - Security analysis and mitigations

## 🚀 Quick Start

1. **Follow [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)** to configure Google OAuth credentials
2. **Follow [Complete Setup Guide](./AUTH_SETUP_GUIDE.md)** to set up the entire system
3. **Review [Implementation Summary](./AUTH_IMPLEMENTATION_SUMMARY.md)** for architecture overview

## 🏗️ Architecture

The authentication system consists of:

### Frontend (Next.js)
- PKCE implementation for secure OAuth
- Sign-in pages with Google OAuth integration
- Electron-specific auth handlers

### Backend (FastAPI)
- OAuth code exchange
- JWT token generation and validation
- Session management
- Token refresh and rotation

### Desktop App (Electron)
- Custom URI scheme handler (`cognode://`)
- System browser integration
- Deep link handling

### Database (PostgreSQL/Neon)
- User and session storage
- Secure token hashing

### Cache (Redis)
- Token revocation tracking
- Session caching
- Rate limiting (ready for implementation)

## 🔒 Security Features

- ✅ PKCE (Proof Key for Code Exchange)
- ✅ CSRF protection with state parameter
- ✅ Refresh token rotation
- ✅ Token revocation tracking
- ✅ Short-lived access tokens (1 hour)
- ✅ Secure token storage
- ✅ HTTPS ready

## 📋 Requirements

- Node.js 20+
- Python 3.11+
- PostgreSQL (Neon Postgres recommended)
- Redis server
- Google Cloud account

## 🎯 Key Features

1. **Browser-based Login** - No passwords handled by desktop app
2. **PKCE Security** - Prevents authorization code interception
3. **Token Rotation** - Refresh tokens rotated on use
4. **Session Management** - Track and revoke sessions
5. **Cross-platform** - Works on Windows, macOS, Linux

## 📞 Support

For setup issues, see [AUTH_SETUP_GUIDE.md](./AUTH_SETUP_GUIDE.md).

For security concerns, see [THREAT_MODEL.md](./THREAT_MODEL.md).
