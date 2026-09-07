# Project & Task Management — Web

React 18 + TypeScript SPA for a Jira/Trello-style project & task management system. The backend is
a separate repository, consumed over HTTP at `VITE_API_BASE_URL`.

> **Status:** Phase 1 (Foundation) complete. See [Build phases](#build-phases) for what's done vs.
> pending. This README is updated as each phase lands.

## Tech stack

| Layer             | Technology                                           | Why                                                           |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Library           | React 18 (function components + hooks)               | Fixed by the brief                                            |
| Build tool        | Vite 5                                               | Fast dev server + build, native ESM                           |
| Language          | TypeScript (strict)                                  | Typed API contracts, `noUncheckedIndexedAccess` on            |
| Routing           | React Router v6                                      | Protected + role-based routes                                 |
| Server state      | TanStack Query v5                                    | Caching, background refetch, precise invalidation — see below |
| Client/auth state | Context API + hooks                                  | Only genuine client state is auth/session and theme           |
| Forms             | React Hook Form + Zod                                | Type-safe schema validation, minimal re-renders               |
| Styling           | Tailwind CSS + shadcn/ui                             | Utility-first + accessible unstyled primitives (Radix)        |
| Charts            | Recharts                                             | Dashboard aggregation charts (Phase 5)                        |
| HTTP              | Axios                                                | Request/response interceptors for auth + error normalisation  |
| Testing           | Vitest + React Testing Library + MSW                 | Mocks the network, not Axios                                  |
| Quality           | ESLint + Prettier + Husky + lint-staged + commitlint | Enforced pre-commit and in CI                                 |
| Container         | Docker (multi-stage → Nginx) + Docker Compose        |                                                               |
| CI                | GitHub Actions                                       | lint → format → typecheck → test → build                      |

### State management decision

TanStack Query for all server state, Context for auth/session and theme. Nearly everything in this
app is server-derived data, so Query's cache/refetch/invalidate machinery covers almost the whole
surface; Redux (or similar) would mostly be a duplicate cache with none of Query's request
lifecycle features. The two genuinely client-only pieces of state — "who is logged in" and "which
theme is active" — are small enough that Context + hooks handle them without boilerplate.
**Trade-off:** no single global store and no time-travel debugging; acceptable given how little
state is actually client-owned.

### Token storage & refresh strategy

Access token lives **in memory only** (React state inside `AuthContext`, relayed to the Axios
client via `setAccessToken`); the refresh token lives in `localStorage`. On boot, if a refresh
token is present, the app calls `/auth/refresh` before rendering any protected route, showing a
full-page loader so the login screen never flashes for an already-authenticated user.

**Trade-off, stated honestly:** `httpOnly` cookies issued by the backend would remove the XSS
blast radius entirely. The brief specifies bearer-token auth with Axios interceptors, so this
in-memory + localStorage split was chosen as the best available compromise under that constraint —
it keeps the access token out of persistent storage (a script that reads localStorage never gets a
usable access token) but the refresh token itself is still readable by any script that runs on the
page.

## Project structure

```
src/
├── app/            # router, providers composition, Query client config
├── components/
│   ├── ui/          # shadcn/Radix primitives (button, dialog, select, …)
│   ├── common/       # app-wide reusable components (DataTable, Modal, badges, …)
│   ├── layout/       # AppLayout, Sidebar, Topbar, PageHeader
│   ├── projects/     # (Phase 3)
│   ├── tasks/        # (Phase 4)
│   ├── comments/      # (Phase 4)
│   ├── dashboard/     # (Phase 5)
│   └── admin/         # (Phase 6)
├── pages/           # route-level components
├── routes/           # ProtectedRoute / RoleRoute (Phase 2)
├── services/         # axios instance + one service module per resource
├── hooks/            # queries/, mutations/, and app-wide hooks
├── context/          # AuthContext, ThemeContext, ToastContext
├── types/            # one file per resource, mirrors the API contract
├── schemas/          # Zod schemas (Phase 2+)
├── lib/              # constants, permissions, status-transitions, date, error, cn
└── test/             # Vitest setup, MSW handlers/server, render-with-providers helper
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose (optional, for containerised runs)

## Local setup

### Without Docker

```bash
npm install
cp .env.example .env   # edit VITE_API_BASE_URL to point at your running backend
npm run dev             # http://localhost:5173
```

### With Docker

`VITE_*` variables are baked into the static bundle **at build time** — the API URL is a Docker
**build argument**, not a runtime environment variable:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=http://localhost:3000/api/v1 \
  --build-arg VITE_APP_NAME="Project & Task Management" \
  -t ptm-web .
docker run -p 8080:8080 ptm-web
```

Or via Compose (reads the same args from your shell env / `.env`):

```bash
docker compose build
docker compose up
```

### Running against the backend repo together

The backend lives in a separate repository:
`<TODO: add backend repo link once confirmed — see Assumptions §1 below>`.

To run both stacks together via Docker on a shared network:

```bash
docker network create ptm-network            # once
cd <backend-repo> && docker compose up -d    # backend's compose file must join `ptm-network`
cd <this-repo>    && docker compose up -d
```

## Environment variables

| Variable               | Description                              | Example                        |
| ---------------------- | ---------------------------------------- | ------------------------------ |
| `VITE_API_BASE_URL`    | Base URL of the backend API              | `http://localhost:3000/api/v1` |
| `VITE_APP_NAME`        | Display name shown in the Topbar/title   | `Project & Task Management`    |
| `VITE_ENABLE_DEVTOOLS` | Mounts the TanStack Query devtools panel | `true`                         |

## Scripts

```bash
npm run dev             # start dev server
npm run build            # tsc -b && vite build
npm run preview          # preview the production build locally
npm run lint             # eslint . --max-warnings 0
npm run lint:fix
npm run format            # prettier --write .
npm run format:check
npm run typecheck        # tsc -b (project-references build)
npm test                 # vitest run
npm run test:watch
npm run test:coverage    # vitest run --coverage
```

## Testing

Vitest + React Testing Library + MSW. The API is mocked at the network layer (`src/test/mocks`),
never by stubbing Axios directly, so tests exercise the real request/response/interceptor path.
`src/test/utils/render.tsx` wraps components in Query/Auth/Theme/Toast/Router providers.

Coverage thresholds are enforced in `vitest.config.ts` and in CI, and are being **raised
progressively as each build phase lands** (Phase 6 — "Fill test coverage" — is the point at which
they reach their final target of 60%+ lines/statements). Phase 1 ships thresholds around 25% since
most page-level and mutation-flow tests are written alongside the screens that don't exist yet.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main`/`develop`: install → lint → format check
→ typecheck → test with coverage → build → upload the `dist` artifact. Any failing step fails the
pipeline. Husky's `pre-commit` runs `lint-staged` (ESLint + Prettier on staged files); `commit-msg`
runs commitlint against Conventional Commits.

## Accessibility notes

- All interactive `ui/` primitives are Radix-based (Dialog, Select, DropdownMenu, Popover, Tabs,
  Checkbox), which provides focus trapping, Escape-to-close, and correct ARIA roles out of the box.
- `Modal` (wrapping Radix `Dialog`) inherits focus trap + Escape/backdrop-close for free.
- Toasts render in a `role="status"` / `aria-live="polite"` region (`ToastViewport`).
- `FormField` wires `aria-invalid` and `aria-describedby` to its error/hint text.
- Visible focus rings via Tailwind's `focus-visible` utilities on every interactive primitive.

## Assumptions & trade-offs

1. **Backend contract.** The only backend repository available in this workspace
   (`Internal-solulab-re-mvp-be-admin`) is an unrelated real-estate-tokenization admin API (Express,
   `/api/v2`, Admin/Property/Cashflow modules — no Projects/Tasks/Comments/Dashboard-aggregation
   endpoints at all). There is currently no real backend implementing the Projects/Tasks contract
   this frontend targets. Per the brief's own fallback ("adapt the service layer... code against
   exactly this"), the frontend is built strictly against the contract in the original spec
   (envelope `{success, data, message}` / `{success, data, meta}`, the exact endpoint list, and the
   `Role`/`ProjectStatus`/`TaskStatus`/`TaskPriority` enum values), backed by MSW for
   development/testing. **If/when the real backend repo is identified, the service layer
   (`src/services/*.ts`) is the only place that should need to change** — components consume typed
   service methods, not raw HTTP shapes.
2. **DatePicker** wraps the native `<input type="date">` rather than a JS calendar widget
   (`react-day-picker` was not in the fixed dependency list). This gets full keyboard support and
   platform-consistent affordances for free, at the cost of styling control across browsers.
3. **Toasts** are a hand-rolled `role="status"`/`aria-live` stack (`ToastContext` + `Toast.tsx`)
   rather than Radix's `@radix-ui/react-toast` primitive — simpler to reason about and sufficient
   for the accessibility requirement (auto-dismiss, dismissible, screen-reader announced).
4. **UserSelect** loads the full assignable-users list once (`/users/assignable`) and filters
   client-side by name/email as the user types, rather than a server-side search-as-you-type. Given
   the expected scale of a single org's assignable users, this avoids a debounced-search
   round-trip for a picker that's opened frequently.
5. **Coverage thresholds** start low (~25%) in Phase 1 and are raised in each subsequent phase's
   commits as the corresponding screens/flows land; Phase 6 is where they reach the brief's
   effective target.

## Build phases

- [x] **Phase 1 — Foundation.** Vite/TS-strict/Tailwind/shadcn scaffold, ESLint/Prettier/Husky/
      commitlint, provider composition, Axios client with both interceptors (refresh-queue, 403
      toast, network/timeout normalisation), all typed API contracts, every `components/common`
      primitive, `AppLayout`/`Sidebar`/`Topbar`, error pages, `ErrorBoundary`, Vitest+MSW harness,
      Dockerfile+nginx, CI workflow.
- [ ] **Phase 2 — Auth.** `AuthContext` boot-time refresh (scaffolded in Phase 1, needs Login/
      Register pages), `ProtectedRoute`/`RoleRoute`, role-filtered nav wiring, refresh-queue
      end-to-end against real login.
- [ ] **Phase 3 — Projects.** List (search/filter/sort/pagination, URL-synced), card/table views,
      create/edit modal, delete confirm, detail page, member management, status control.
- [ ] **Phase 4 — Tasks & Comments.** List/kanban board, task form, detail with permission-gated
      inline editing, optimistic comments, activity feed, My Tasks.
- [ ] **Phase 5 — Dashboard.** Stat cards + all five charts from aggregation endpoints, sortable
      developer workload, overdue list, project filter.
- [ ] **Phase 6 — Polish & Docs.** Full test coverage, accessibility pass, responsive pass,
      screenshots in this README, `v1.0.0` tag.

## License

Internal bench project — not licensed for external distribution.
