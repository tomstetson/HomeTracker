# HomeTracker Cleanup Plan

> **Created**: 2024-12-21
> **Purpose**: Remove bloat, optimize dependencies, and establish local testing best practices

---

## 🔍 Audit Summary

### Current State
| Metric | Value |
|--------|-------|
| Frontend dependencies | 21 production + 24 dev |
| Backend dependencies | 22 production + 21 dev |
| Root dependencies | 4 dev |
| Total `node_modules` size | ~500MB+ |
| Docker image size | ~350MB |

---

## 🗑️ Identified Bloat

### Backend - REMOVE
| Package | Reason | Savings |
|---------|--------|---------|
| `@prisma/client` | Never used - no Prisma schema exists | ~15MB |

### Backend - Empty Directories to Remove
```
backend/src/config/      # Empty
backend/src/controllers/ # Empty
backend/src/middleware/  # Empty
backend/src/utils/       # Empty
```

### Frontend - REMOVE (Unused)
| Package | Reason | Savings |
|---------|--------|---------|
| `framer-motion` | Not imported anywhere | ~150KB |
| `@radix-ui/react-avatar` | Not imported anywhere | ~20KB |
| `@radix-ui/react-tooltip` | Not imported anywhere | ~30KB |
| `@radix-ui/react-popover` | Not imported anywhere | ~30KB |
| `@radix-ui/react-tabs` | Not imported anywhere | ~25KB |
| `@radix-ui/react-dialog` | Not imported anywhere | ~30KB |
| `@radix-ui/react-select` | Not imported anywhere | ~40KB |
| `@radix-ui/react-dropdown-menu` | Not imported anywhere | ~35KB |

### Frontend - EVALUATE
| Package | Usage | Recommendation |
|---------|-------|----------------|
| `@headlessui/react` | 1 file (GlobalSearch.tsx) | Keep - used for Combobox |

### Root - CONSOLIDATE
| Issue | Fix |
|-------|-----|
| `husky` in 3 package.json | Keep only in root |
| `lint-staged` in 3 package.json | Keep only in root |
| `@secretlint/quick-start` in 3 package.json | Keep only in root |

---

## 📋 Cleanup Tasks

### Phase 1: Remove Unused Dependencies (Safe)

```bash
# Backend - Remove unused packages
cd backend
npm uninstall @prisma/client

# Frontend - Remove unused packages
cd ../frontend
npm uninstall framer-motion @radix-ui/react-avatar @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-tabs @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-dropdown-menu
```

### Phase 2: Remove Empty Directories

```bash
# Backend empty directories
rmdir backend/src/config
rmdir backend/src/controllers
rmdir backend/src/middleware
rmdir backend/src/utils
```

### Phase 3: Consolidate Dev Dependencies

Move husky, lint-staged, and secretlint to root only:

```bash
# Remove duplicates from frontend/backend
cd frontend && npm uninstall husky lint-staged @secretlint/quick-start
cd ../backend && npm uninstall husky lint-staged @secretlint/quick-start

# Already in root package.json - no action needed there
```

### Phase 4: Update @types Packages

Move `@types/*` from dependencies to devDependencies in backend:
- `@types/node-cron` should be in devDependencies
- `@types/nodemailer` should be in devDependencies

---

## 🧪 Local Testing Strategy

### Option 1: Native Development (Recommended for Dev)

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend (auto-proxies to backend)
cd frontend && npm run dev

# Run tests
cd frontend && npm test
```

**Pros**: Fast hot reload, easy debugging
**Cons**: Need Node.js installed

### Option 2: Docker Development

```bash
# Use dev compose (backend in Docker, frontend native for HMR)
docker-compose -f docker-compose.dev.yml up -d
cd frontend && npm run dev
```

**Pros**: Consistent environment
**Cons**: Slower rebuilds

### Option 3: Full Docker (Production-like)

```bash
docker-compose up --build
# Access at http://localhost:8080
```

**Pros**: Exact production environment
**Cons**: No hot reload, slow iteration

### Recommended Workflow

1. **Daily development**: Option 1 (native)
2. **Pre-commit testing**: Run tests + security audit
3. **Pre-release testing**: Option 3 (full Docker build)
4. **CI/CD**: GitHub Actions handles Docker builds

---

## 🔧 Post-Cleanup Verification

After cleanup, verify:

```bash
# 1. All tests pass
cd frontend && npm test -- --run

# 2. Build succeeds
cd frontend && npm run build
cd ../backend && npm run build

# 3. Docker build works
docker-compose build

# 4. Security audit passes
.\scripts\security-audit.ps1

# 5. App runs correctly
docker-compose up -d
# Test all features manually
```

---

## 📊 Expected Results

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Frontend deps | 21 | 13 | -8 packages |
| Backend deps | 22 | 21 | -1 package |
| node_modules (frontend) | ~400MB | ~350MB | ~50MB |
| node_modules (backend) | ~150MB | ~135MB | ~15MB |
| Docker image | ~350MB | ~320MB | ~30MB |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Removing actually-used package | Run `npm test` and full app test after each removal |
| Breaking Docker build | Test `docker-compose build` after changes |
| Git conflicts | Make cleanup in single commit, push promptly |

---

## 🚀 Execution Order

1. [ ] Create git branch: `cleanup/remove-bloat`
2. [ ] Run all tests to establish baseline
3. [ ] Execute Phase 1 (remove unused deps)
4. [ ] Run tests
5. [ ] Execute Phase 2 (remove empty dirs)
6. [ ] Execute Phase 3 (consolidate dev deps)
7. [ ] Execute Phase 4 (fix @types)
8. [ ] Run full test suite
9. [ ] Test Docker build
10. [ ] Commit and push
11. [ ] Merge to main

---

*This plan was generated by analyzing the codebase for unused imports and dependencies.*
