# HomeTracker Improvement Tracker

This document tracks identified issues, potential improvements, and technical debt that should be addressed in future releases.

---

## 🔴 High Priority

### Architecture Issues

| ID | Issue | Current State | Recommended Fix | Effort |
|----|-------|---------------|-----------------|--------|
| A1 | **Scattered Demo Data** | Demo data defined in each store file separately | ✅ FIXED: Centralized in `lib/demoData.ts` | Low |
| A2 | **Inconsistent Storage Keys** | Some stores use separate localStorage keys (e.g., `hometracker_diagrams`, `hometracker_settings`) | Consolidate all data under single `hometracker_data` key | Medium |
| A3 | **No Data Versioning/Migration** | Storage version is static `1.0`, no migration system | Implement proper data migration system for schema changes | High |
| A4 | **LocalStorage Size Limits** | LocalStorage limited to ~5-10MB per domain | Consider IndexedDB for larger datasets, implement compression | High |

### Performance Issues

| ID | Issue | Current State | Recommended Fix | Effort |
|----|-------|---------------|-----------------|--------|
| P1 | **Full Data Reload on Every Save** | `getAllData()` called on every collection save | Implement partial updates, debounced saves | Medium |
| P2 | **No Memoization** | Component re-renders on unrelated state changes | Add React.memo, useMemo for expensive computations | Medium |
| P3 | **Large Bundle Size** | tldraw adds significant JS weight | Lazy load diagram editor, code split | Medium |

---

## 🟡 Medium Priority

### UX/UI Issues

| ID | Issue | Current State | Recommended Fix | Effort |
|----|-------|---------------|-----------------|--------|
| U1 | **No Onboarding Flow** | New users see empty app | Add first-time wizard to set up property | Medium |
| U2 | **Missing Loading States** | Some async operations lack feedback | Add skeleton loaders, progress indicators | Low |
| U3 | **No Offline Indicator** | App doesn't show when backend is offline | Add connection status indicator | Low |
| U4 | **Inconsistent Empty States** | Some pages have better empty states than others | Standardize empty state component | Low |

### Code Quality

| ID | Issue | Current State | Recommended Fix | Effort |
|----|-------|---------------|-----------------|--------|
| C1 | **TypeScript `any` Usage** | Storage layer uses `any` types | Add proper generics and type definitions | Medium |
| C2 | **No Input Validation** | Forms rely on HTML5 validation only | Add Zod or Yup schema validation | Medium |
| C3 | **Missing Error Boundaries** | Only tldraw has error boundary | Add error boundaries to main sections | Low |
| C4 | **Console Logs in Production** | Debug logs remain in code | Add proper logging system, remove in prod | Low |

---

## 🟢 Low Priority / Nice to Have

### Features

| ID | Feature | Description | Effort |
|----|---------|-------------|--------|
| F1 | **Data Export Formats** | Export to CSV, PDF reports | Medium |
| F2 | **Multi-Property Support** | Track multiple properties | High |
| F3 | **Recurring Transaction Auto-Create** | Auto-generate recurring expenses | Medium |
| F4 | **Photo Gallery View** | Grid view of all uploaded photos | Low |
| F5 | **Calendar View** | Visual calendar for maintenance/projects | Medium |
| F6 | **Vendor Comparison** | Side-by-side vendor quote comparison | Low |

### Technical Debt

| ID | Issue | Description | Effort |
|----|-------|-------------|--------|
| T1 | **Test Coverage** | Some modules lack comprehensive tests | High |
| T2 | **API Documentation** | Backend routes not documented | Medium |
| T3 | **Accessibility Audit** | Full WCAG compliance review needed | Medium |
| T4 | **Performance Profiling** | No baseline performance metrics | Low |

---

## Architecture Overview

### Current Storage Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React UI      │────▶│   Zustand Store  │────▶│  localStorage   │
│  (Components)   │◀────│  (State + Logic) │◀────│  (Persistence)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Backend API     │  (Optional sync)
                        │  (Express + JSON)│
                        └──────────────────┘
```

### Storage Keys

| Key | Purpose | Notes |
|-----|---------|-------|
| `hometracker_data` | Main app data | Primary storage |
| `hometracker_settings` | Property settings | Should be merged into main |
| `hometracker_diagrams` | Diagram data (legacy) | Should be removed |

### Recommended Architecture Changes

1. **Single Source of Truth**: Move all data to `hometracker_data`
2. **Add Migration System**: Version schema, auto-migrate on load
3. **Implement IndexedDB**: For photos/large documents
4. **Add Sync Queue**: For offline-first with eventual consistency

---

## Completed Improvements

| Date | ID | Description |
|------|----|-------------|
| 2024-12-21 | A1 | Centralized demo data in `lib/demoData.ts` |
| 2024-12-21 | - | Fixed tldraw v3 compatibility issues |
| 2024-12-21 | - | Fixed broken `/warranties` routes |
| 2024-12-21 | - | Made property module dynamic and clickable |
| 2024-12-21 | - | Added comprehensive store tests |
| 2024-12-21 | - | Fixed git CRLF line ending warnings |

---

## How to Contribute

1. Pick an issue from this tracker
2. Create a branch: `fix/issue-id-description` or `feat/feature-id`
3. Implement the fix with tests
4. Update this tracker when complete
5. Submit PR for review

---

*Last Updated: December 21, 2024*
