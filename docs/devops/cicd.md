# 🧠 Cognode CI/CD & DevOps Guide

Welcome to the definitive guide for Cognode's CI/CD infrastructure, developer workflows, and release systems. This system is designed to be **elite, cost-efficient, and deterministic.**

---

## 📘 1. Overview

Cognode utilizes a **Release-Driven Architecture**. We differentiate strictly between *validation* and *deployment*.

*   **Continuous Integration (CI)**: Validates every Pull Request to ensure the codebase remains stable.
*   **Continuous Deployment (CD)**: Triggers only on official version tags to deliver artifacts and update production.

### Core Philosophy:
1.  **PRs Validate**: No code enters `main` without passing lint, tests, and build checks.
2.  **Main stays clean**: Direct pushes to `main` are restricted. CI doesn't run on `main` to save costs; we trust the PR validation.
3.  **Tags Deploy**: Pushing a `v*` tag is the **sole** trigger for production releases.

---

## 🔄 2. Workflows Explained

### 1. Unified CI (PR Validation)
*   **Workflow**: `ci.yml`
*   **Trigger**: `pull_request` (opened, synchronize, reopened).
*   **Logic**:
    *   **Intelligent filtering**: Uses `dorny/paths-filter` to skip backend tests if only frontend code changed.
    *   **Parallelism**: `lint` and `test` run in parallel to maximize speed.
    *   **Caching**: Fully utilizes TurboRepo (`.turbo`) and Global npm caches.
*   **Skip Logic**: Skips if only docs (`.md`) or irrelevant directories are modified.

### 2. Desktop CI & Release
*   **Workflow**: `desktop.yml`
*   **PR Mode**: Runs a "Smoke Build" to verify Electron packaging without creating a release.
*   **Tag Mode**: Compiles for Windows and macOS, packages the app, generates a changelog, and creates a GitHub Release.

### 3. Production Deployment (Docker + Render)
*   **Workflow**: `deploy.yml` (Replaces `docker.yml`)
*   **Trigger**: `push: tags: ['v*']`
*   **Selective Build**: Detects if `web` or `backend` changed since the last release.
*   **Tagging**: Images are pushed to GHCR with `vX.X.X`, `latest`, and `sha-XXXX` tags.
*   **Render Deploy**: Triggers Render services using explicit versioned image URLs.

---

## ⚙️ 3. How to Trigger Everything

### 1. Submitting a Pull Request
Simply push your branch and open a PR on GitHub.
*   **Triggered**: `ci.yml`, `desktop.yml` (Smoke Build).
*   **Requirement**: All status checks must be green before merging.

### 2. Triggering Production Deployment
When you are ready to ship `v1.7.0`:
```powershell
git checkout main
git pull origin main
git tag v1.7.0
git push origin v1.7.0
```
This triggers the **Production Deployment** and **Desktop Release** simultaneously.

---

## 🏷️ 4. Versioning & Tag System

*   **Format**: Semantic Versioning (**SemVer**) prefixed with "v" (e.g., `v1.0.0`, `v1.2.1-beta`).
*   **Automation**: The `desktop.yml` workflow automatically extracts the version from the tag and injects it into the build.
*   **Changelogs**: Automatically generated for GitHub Releases based on PR titles since the last tag.

---

## 🧑‍💻 5. Developer Workflow

### Daily Workflow:
1.  **Sync**: `git pull --rebase origin main`
2.  **Branch**: `git checkout -b feature/your-feature-name`
3.  **Work**: Make atomic commits.
4.  **Push**: `git push origin feature/your-feature-name`
5.  **PR**: Create via GitHub UI or `gh pr create`.

### Essential Commands:
| Command | When to use |
| :--- | :--- |
| `git commit -m "..."` | Record atomic changes with clear messages. |
| `git push` | Upload to remote. |
| `git pull --rebase` | Update branch without creating merge commits. |
| `git rebase -i main` | Clean up/squash your commits before merging. |
| `git reset --soft HEAD~1`| Undo the last commit but keep your work staged. |
| `git revert <sha>` | Undo a pushed commit by creating a new inverse commit. |

---

## 🔁 6. Advanced Git Operations

*   **Rebase vs Merge**: We prefer **Rebase** for local work to keep a linear history. Use **Merge** only when integrating a feature branch into `main` via PR.
*   **Squashing**: Always squash your fixup commits (`fix: typo`, `fix: oops`) before requesting review.
*   **Force Push**: Only safe on your specific feature branch (`git push --force-with-lease`). **NEVER** force push to `main`.

---

## 🧪 7. Running Locally

Before creating a PR, simulate the CI:

```powershell
# Run everything (Recommended)
npx turbo run lint typecheck test

# Run specific app
npx turbo run lint --filter=frontend
```

> [!TIP]
> Running these locally saves GitHub Actions minutes and provides instant feedback.

---

## 🐳 8. Docker & Deployment

### Tagging Logic:
1.  **Semantic**: `ghcr.io/cognode-web:v1.1.0` (Fixed version).
2.  **Latest**: `ghcr.io/cognode-web:latest` (Points to newest release).
3.  **SHA**: `ghcr.io/cognode-web:sha-abc123` (Traceable to specific code).

### Selective Deploy:
The `deploy` workflow compares the new tag with the previous one. If `apps/backend` hasn't changed, the backend Docker build is skipped and the Render deploy for the backend is not re-triggered.

---

## 🧠 9. Debugging CI/CD

If a job fails:
1.  Go to the **Actions** tab on GitHub.
2.  Select the failed run.
3.  Click the failing job (e.g., `Lint & Typecheck`).
4.  Expand the red step to see the error.

### Common Failures:
*   **Lint Errors**: Use `npm run lint:fix` (if available) or fix manually.
*   **Typecheck**: Fix TypeScript definition mismatches.
*   **Turbo Cache**: If something feels "stale," use `npx turbo run ... --force`.

---

## 🚨 10. Troubleshooting

*   **CI not running**: Check if you are in a "Draft" PR. CI skips drafts to save costs.
*   **Workflow skipped**: Verify the `paths-filter` documentation in `ci.yml`. You might be editing files that don't trigger that specific job.
*   **Deploy not triggered**: Ensure your tag matches the `v*` pattern correctly.

---

## 🔐 11. Safety Rules

1.  **Protect `main`**: No direct pushes. Use PRs.
2.  **Tag-Driven**: Never deploy manually via CLI if the CI should handle it.
3.  **Atomic PRs**: Keep PRs focused. Smaller PRs = faster CI + easier review.

---

## 📊 12. System Design

*   **Concurrency**: All workflows use `concurrency` groups to cancel previous runs on the same branch.
*   **Dependency Graph**:
    *   `build` depends on `lint` + `test` success.
    *   `deploy` (Tag) depends on successful Docker image generation.

---

## 📦 13. Scripts & Commands

### Root Commands:
*   `npm run dev`: Launch the full local stack (Frontend + Backend + Electron).
*   `npm run ci:local`: Simulate the full CI pipeline in your terminal.
*   `npx turbo run build`: Build all workspaces using caching.

### App-Specific:
*   `turbo run test --filter=backend`: Test only the FastAPI backend.
*   `turbo run build --filter=frontend`: Build only the Next.js frontend.

---

## 🎯 14. Best Practices

*   **Commit Messages**: Use Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`).
*   **No Waste**: Don't push to a PR every 2 minutes. Group your changes.
*   **Review**: Read your own diff in the PR before asking others.

---

> [!NOTE]
> This guide is maintained by the DevOps team. For updates, please contribute to the `ci.yml` or `deploy.yml` files.
