# 🔧 CI/CD Guide — Cognode

This guide covers how the CI/CD pipeline works, when workflows run, how to test locally, and the cost optimization strategy.

---

## 📋 Workflow Overview

| Workflow | File | Trigger | Purpose | Estimated Time |
|---|---|---|---|---|
| **CI** | `ci.yml` | PR + push to `main` (path-filtered) | Change detection → lint → test → build | ~5-8 min |
| **Docker Build & Deploy** | `docker.yml` | Push to `main` (path-filtered) + manual | Build & push Docker images, deploy to Render | ~5 min |
| **Desktop CI & Release** | `desktop.yml` | PR + push to `main` (path-filtered) + tags | Build Electron desktop app (Win + Mac) | ~15 min |

---

## 🚦 When Do Workflows Run?

### Pull Request

| Event | CI | Docker | Desktop |
|---|---|---|---|
| **Draft PR opened** | ❌ | ❌ | ❌ |
| **PR opened (code changes)** | ✅ | ❌ | ✅ (if desktop/frontend/backend changed) |
| **PR opened (docs only)** | ❌ | ❌ | ❌ |
| **PR sync (new push)** | ✅ | ❌ | ✅ (if desktop/frontend/backend changed) |

### Push to `main`

| Event | CI | Docker | Desktop |
|---|---|---|---|
| **Code changes merged** | ✅ | ✅ (only changed services) | ✅ (if desktop/frontend/backend changed) |
| **Docs/config only** | ❌ | ❌ | ❌ |
| **Tag pushed (v*)** | ❌ | ❌ | ✅ (full release build) |

### CI Job Details (`ci.yml`)

The CI workflow uses intelligent change detection to skip unnecessary work:

| Job | Runs When | Depends On |
|---|---|---|
| **Analyze** | Always (unless draft PR) | — |
| **Lint & Typecheck** | Node or Python code changed | Analyze |
| **Test** | Node code changed | Analyze |
| **Build** | Node code changed | Lint + Test |

### Docker Job Details (`docker.yml`)

| Job | Runs When | Depends On |
|---|---|---|
| **Detect** | Always | — |
| **Docker Web** | `apps/web/**` or `packages/**` changed | Detect |
| **Docker Backend** | `apps/backend/**` changed | Detect |
| **Deploy** | At least one image built | Web + Backend |

---

## 🏠 Local Testing

### Quick Lint Check

```bash
# Bash / Git Bash / WSL
./scripts/ci-local.sh --lint-only

# PowerShell
.\scripts\ci-local.ps1 -LintOnly
```

### Full CI Pipeline

```bash
# Bash
./scripts/ci-local.sh

# PowerShell
.\scripts\ci-local.ps1
```

### Full CI + Docker Builds

```bash
# Bash
./scripts/ci-local.sh --docker

# PowerShell
.\scripts\ci-local.ps1 -Docker
```

### npm Shortcuts

```bash
npm run ci:local           # Full lint + test + build
npm run ci:local:lint      # Lint only (fastest)
npm run ci:local:docker    # Full CI + Docker builds
```

---

## 🧪 Testing with `act`

[`act`](https://github.com/nektos/act) lets you run GitHub Actions workflows locally using Docker.

### Install

```bash
# macOS
brew install act

# Windows (via Chocolatey)
choco install act-cli

# Linux
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Running Workflows

```bash
# Dry-run (validate YAML without executing)
act --dryrun pull_request

# Run CI workflow
act pull_request -W .github/workflows/ci.yml

# Run with secrets file
act pull_request -W .github/workflows/ci.yml --secret-file .secrets
```

### Secrets for `act`

Create a `.secrets` file (already in `.gitignore`):

```env
GITHUB_TOKEN=your_github_token
RENDER_API_KEY=your_render_key
```

> **Note**: Some workflows use GitHub-specific actions (like `dorny/paths-filter`) that may behave differently with `act`. The core turbo tasks (lint, test, build) are fully `act`-compatible.

---

## 💰 Cost Optimization Strategy

### Architecture Decisions

1. **Unified CI workflow**: `lint.yml`, `test.yml`, and `build.yml` were consolidated into a single `ci.yml` with change detection. This eliminates duplicate `npm ci` runs (was 3×, now 1× per job) and runs typecheck only once.

2. **Smart change detection**: All workflows use `dorny/paths-filter` to detect which apps changed. Jobs are skipped entirely if their code hasn't changed.

3. **Path-filtered triggers**: Both PR and push-to-main triggers use path filtering. Documentation-only changes never trigger any workflow.

4. **Conditional Docker builds**: `docker.yml` only builds images for services that actually changed. If only the web app changed, the backend image is not rebuilt.

5. **Concurrency groups**: Each workflow cancels in-progress runs when new commits are pushed, preventing queue buildup.

6. **Label-gated desktop builds**: Desktop builds on PRs only run when desktop/frontend/backend code changed. Full release builds only trigger on version tags.

### Estimated Impact

| Scenario | Before | After | Savings |
|---|---|---|---|
| PR (code change) | ~24 min / 5 runners | ~8 min / 3 runners | **67%** |
| PR (docs only) | ~24 min / 5 runners | 0 min | **100%** |
| Push to main (docs) | ~29 min / 7 runners | 0 min | **100%** |
| Push to main (web only) | ~29 min / 7 runners | ~13 min / 4 runners | **55%** |
| Push to main (all code) | ~29 min / 7 runners | ~13 min / 5 runners | **55%** |

---

## 🪝 Pre-push Hook

A Husky pre-push hook runs `ci-local.sh --lint-only` before every `git push`. This catches lint and type errors before they hit CI.

To skip the hook temporarily:

```bash
git push --no-verify
```

---

## 🐛 Troubleshooting

### "Workflow didn't run on my PR"

- Check if the PR is in **draft** mode — all workflows skip drafts
- Check if you changed files in the **path filter** — docs-only changes are skipped
- Check the **Actions** tab for cancelled runs (concurrency may have cancelled it)

### "CI passed but Docker didn't build"

- Docker only runs on pushes to `main`, never on PRs
- Docker only builds images for services whose code changed
- Use `workflow_dispatch` to force a manual Docker build

### "Desktop build didn't trigger"

- Desktop builds require changes in `apps/desktop/`, `apps/frontend/`, `apps/backend/`, or `packages/`
- Full release builds require a version tag (`v*`)

### Running individual checks locally

```bash
# Node lint
npx turbo run lint

# TypeScript check
npx turbo run typecheck

# Python lint
ruff check apps/backend/ --select E,W,F --ignore E501,E402,E701,F841

# Tests
npx turbo run test

# Build
npx turbo run build
```

---

## 🏗️ Branch Protection

If you have branch protection rules, update the required status checks to use the new job names:

| Old Status Check | New Status Check |
|---|---|
| `lint / Node Lint & Typecheck` | `CI / Lint & Typecheck` |
| `test / Unit & Integration Tests` | `CI / Test` |
| `build / TypeScript Typecheck` | _(removed, merged into Lint)_ |
| `build / Production Build` | `CI / Build` |
