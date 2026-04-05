# 🔧 CI/CD Guide — Cognode

This guide covers how the CI/CD pipeline works, when workflows run, how to test locally, and the cost optimization strategy.

---

## 📋 Workflow Overview

| Workflow | File | Trigger | Purpose | Estimated Time |
|---|---|---|---|---|
| **Lint & Typecheck** | `lint.yml` | PR + push to `main` (path-filtered) | Node lint, TS typecheck, Python ruff | ~2 min |
| **Tests** | `test.yml` | PR + push to `main` (path-filtered) | Turbo test runner | ~3 min |
| **Build Validation** | `build.yml` | PR + push to `main` (path-filtered) | Turbo build validation | ~3 min |
| **Docker (Reusable)** | `docker.yml` | Called by other workflows | Build & push Docker images | ~5 min |
| **Preview** | `preview.yml` | PR with `preview` label | Ephemeral preview environments on Render | ~10 min |
| **Release & Deploy** | `release.yml` | Push to `main` (on release) | Semantic versioning + production deploy | ~15 min |
| **Security** | `security.yml` | PR + push + weekly cron | CodeQL, TruffleHog, Trivy | ~5 min |

---

## 🚦 When Do Workflows Run?

### Pull Request

| Event | lint | test | build | preview | security |
|---|---|---|---|---|---|
| **Draft PR opened** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PR opened (code changes)** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **PR opened (docs only)** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PR with `preview` label** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PR sync (new push)** | ✅ | ✅ | ✅ | Only if labeled | ✅ |

### Push to `main`

| Event | lint | test | build | release | security |
|---|---|---|---|---|---|
| **Code changes merged** | ✅ | ✅ | ✅ | ✅ (release-please) | ✅ |
| **Docs/config only** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Release PR merged** | ✅ | ✅ | ✅ | ✅ (Docker + Deploy) | ✅ |

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

# Run lint workflow
act pull_request -W .github/workflows/lint.yml

# Run build workflow
act pull_request -W .github/workflows/build.yml

# Run with secrets file
act pull_request -W .github/workflows/lint.yml --secret-file .secrets
```

### Secrets for `act`

Create a `.secrets` file (already in `.gitignore`):

```env
GITHUB_TOKEN=your_github_token
RENDER_API_KEY=your_render_key
```

> **Note**: Some workflows use GitHub-specific actions (like `github/codeql-action`) that don't work with `act`. The lint, test, and build workflows are fully `act`-compatible.

---

## 💰 Cost Optimization Strategy

### What Changed

| Optimization | Minutes Saved |
|---|---|
| **Removed Docker dry-runs on every PR** | ~18 min per PR |
| **Preview builds gated by `preview` label** | ~20 min per PR sync |
| **Removed redundant CI re-run in release** | ~8 min per release |
| **Path-filtered all workflows** | 100% on docs-only changes |
| **Draft PR filtering** | 100% on draft PRs |
| **Parallel lint/test/build** | ~40% faster wall-clock |

### Estimated Impact

- **Before**: ~50+ min of CI per PR (worst case)
- **After**: ~8 min for code changes, 0 min for docs

### Key Design Decisions

1. **No Docker dry-runs on PRs**: Dockerfile issues are caught during preview builds (labeled PRs) or on the release pipeline. The tradeoff is worth the ~18 min per PR savings.

2. **Label-gated previews**: Adding a `preview` label to a PR triggers full Docker builds + Render preview deployments. Without the label, only lint/test/build run.

3. **Independent workflows instead of orchestrator**: `lint.yml`, `test.yml`, and `build.yml` run in parallel instead of sequentially through `ci.yml`. This means all three start immediately rather than waiting for each previous step.

4. **Concurrency groups**: Each workflow has its own concurrency group that cancels in-progress runs when new commits are pushed, preventing queue buildup.

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

### "Preview environment not created"

- Ensure the PR has the **`preview`** label
- Check `preview.yml` in the Actions tab for errors
- Previews take 3-5 minutes to boot on Render

### "Release didn't deploy"

- Verify `release-please` created a release — check for a "Release PR" in open PRs
- Only code changes in `apps/`, `packages/`, or core config files trigger the release pipeline
- Check the `production` environment in GitHub Settings for required reviewers

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
