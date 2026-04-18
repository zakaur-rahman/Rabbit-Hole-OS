---
trigger: always_on
---

# WORKSPACE RULES — Rabbit-Hole-OS

## 1. Repo Awareness

- This is a monorepo with:
  - apps/backend
  - - apps/web (Next.js)
  - apps/frontend (Next.js)
  - apps/desktop
- Uses TurboRepo, Docker, and GitHub Actions.

Always analyze:

- turbo.json
- package.json (root + apps)
- .github/workflows/\*
  before making changes.

---

## 2. CI/CD Rules

### General

- Never trigger full pipeline unless necessary.
- Use path-based triggers wherever possible.
- Separate workflows by concern:
  - lint
  - test
  - build
  - deploy

### Optimization

- Use caching:
  - node_modules
  - turbo cache
  - docker layers
- Avoid rebuilding unchanged apps.

### PR Strategy

- On PR:
  - Run lint + test only
  - Optional preview deploy
- On merge to main:
  - Run full build + deploy

---

## 3. Local-First Testing (CRITICAL)

- Always prefer local execution before GitHub Actions.

### Required:

- Provide Docker-based local CI runner when possible
- Use:
  - act (GitHub Actions local runner)
  - docker-compose for services

---

## 4. Docker Rules

- Ensure every app is containerizable.
- Use multi-stage builds.
- Keep images lightweight.
- Sync Docker config with CI pipelines.

---

## 5. Frontend Rules (Next.js)

- Use App Router best practices.
- Optimize:
  - SSR vs CSR usage
  - bundle size
  - SEO (important for your SaaS)

---

## 6. Backend Rules

- Maintain clean API structure.
- Ensure scalability and modular services.
- Validate all endpoints and schemas.

---

## 7. Graphify Workflow Rules

- When `/graphify` command is used:
  - Scan entire repo or provided path
  - Build dependency graph of:
    - files
    - modules
    - workflows
  - Output structured knowledge graph
- Default path = current directory

---

## 8. Git Strategy

- Always:
  1. Check current branch
  2. Compare with main
  3. Identify diff
- For merge:
  - Ensure lint + test pass
  - Resolve conflicts safely
  - Keep commit history clean

---

## 9. Automation Priority

- If a task is repeated → convert to script or workflow
- Prefer:
  - npm scripts
  - turbo pipelines
  - GitHub Actions

---

## 10. Cost Control (IMPORTANT for you)

- Minimize GitHub Actions usage:
  - Skip workflows on docs-only changes
  - Use `if:` conditions aggressively
  - Avoid duplicate jobs

---

## 11. Error Handling

- When something fails:
  - Analyze logs deeply
  - Do not guess
  - Suggest exact fix with reasoning

---

## 13. CI Trigger Guard (very important)

- Do NOT run workflows if:
  - only markdown/docs changed
  - only frontend changed → skip backend jobs
  - only backend changed → skip frontend build

---

## 12. Output Format

- Prefer:
  - exact commands
  - full config files
  - diff patches
- Avoid vague instructions
