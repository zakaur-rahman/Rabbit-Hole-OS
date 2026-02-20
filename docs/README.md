# Cognode Documentation Center

Welcome to the official Cognode documentation. Organized into two tracks:

---

## 🌎 User Documentation

For researchers, writers, and analysts using the platform.

- **[Platform Overview & Philosophy](./public/system-guide.md)**: What is Cognode and why it exists.
- **[User Guide Index](./public/README.md)**: Feature guides and workflows.

---

## 🛠️ Developer Documentation

For contributors, AI engineers, and system designers.

### Core Architecture
- **[System Architecture](./developer/architecture.md)**: Frontend hooks, backend services, data flow diagrams.
- **[Research Synthesis Engine](./developer/research-synthesis.md)**: Multi-agent pipeline technical specs.

### Component Guides
- **[Agent Reference](../apps/backend/AGENTS.md)**: All 7 agents — inputs, outputs, failure modes.
- **[Node Types Reference](../apps/backend/NODES.md)**: All 15 node types and their synthesis influence.

### Setup & Operations
- **[Auth Setup Guide](./developer/auth-setup.md)**: Clerk + Google OAuth configuration.
- **[Google OAuth Specifics](./developer/google-oauth-setup.md)**: Step-by-step GCloud setup.
- **[Auth Flow Diagrams](./developer/auth-flow.md)**: PKCE and redirect handler flows.
- **[Desktop Setup](./developer/desktop-setup.md)**: Building and configuring the Electron app.
- **[Deployment Guide](./developer/deployment-guide.md)**: Production backend, DB, Redis, and Electron.
- **[Loopback Handling](./developer/loopback-setup.md)**: Local auth redirect for desktop.
- **[Troubleshooting](./developer/troubleshooting.md)**: Common environment issues.
- **[Threat Model](./developer/threat-model.md)**: Security analysis and mitigations.

---

## Project Structure

```
docs/
├── public/     User-facing guides
└── developer/  Technical specifications
apps/
├── backend/AGENTS.md   Agent pipeline reference
└── backend/NODES.md    Node types reference
```

---

*Questions? See the [Troubleshooting Guide](./developer/troubleshooting.md).*
