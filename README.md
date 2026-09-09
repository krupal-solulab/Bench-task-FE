# Project & Task Management — Web

React 18 + TypeScript SPA for a Jira/Trello-style project & task management system. The backend is
a separate repository (`Bench-task-BE`), consumed over HTTP at `VITE_API_BASE_URL`.

> **Status:** Feature-complete. Auth (including self-service organization registration), role-based
> routing, Projects, Tasks & Comments, the Dashboard, the Admin user-management screen, and a
> separate Platform Admin area (multi-tenancy — see below) are all built, wired to the real backend,
> and covered by an automated test suite. See [Current state](#current-state) for what's covered.

## Multi-tenancy: Organisation Admin vs Platform Admin

The backend is multi-tenant: every `Admin`/`Manager`/`Developer` belongs to exactly one organization,
and a separate **PlatformAdmin** role manages organizations themselves (create/suspend/rename, add
org admins) without ever seeing any organization's projects/tasks/comments. The frontend mirrors this
with two structurally separate route trees, guarded in both directions so neither role can wander
into the other's app:

- `src/routes/OrgAppGuard.tsx` — wraps the existing org-facing app (`AppLayout` + all Projects/Tasks/
  Dashboard/Admin routes); redirects a PlatformAdmin straight to `/platform/organizations` instead of
  showing them a shell where every API call would 403.
- `src/routes/PlatformOnlyRoute.tsx` — wraps the new Platform Admin area (`PlatformLayout` +
  `/platform/organizations` list/detail pages); renders the shared `ForbiddenPage` for anyone who
  isn't a PlatformAdmin, the same pattern `RoleRoute` already used for `/admin/users`.
- `src/pages/auth/RegisterOrganizationPage.tsx` replaces the old plain "Register" page — self-service
  registration now always creates a brand-new **organization** (and its first Admin), not a bare
  Developer, matching the backend's `POST /auth/register-organization`.
- `src/types/user.types.ts` exports both `ROLES` (all four, for typing) and a separate `ORG_ROLES`
  (`Admin`/`Manager`/`Developer` only) — every role _picker_ (create-user form, role-change dropdown,
  the Users-page role filter) uses `ORG_ROLES` specifically so "PlatformAdmin" is never offered as a
  selectable option in an org-scoped screen (the backend would reject it anyway, but offering a choice
  that always fails is bad UX).
- `src/lib/permissions.ts`'s `ROLE_CAPABILITIES` map has a `PlatformAdmin` row that's deliberately
  empty of every org-data capability, mirroring the backend's hard block.

New files for the Platform Admin domain: `src/types/organization.types.ts`,
`src/services/organizations.service.ts`, `src/hooks/queries/useOrganizations.ts`,
`src/hooks/mutations/useOrganizationMutations.ts`, `src/schemas/organization.schema.ts`,
`src/components/layout/{PlatformLayout,PlatformSidebar}.tsx`, `src/components/platform/*.tsx`,
`src/pages/platform/*.tsx` — all following the exact same service → hook → page pattern as the
existing Users/Admin screens (see `src/services/users.service.ts` for the template).

## Tech stack

| Layer             | Technology                                              | Why                                                                   |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Library           | React 18 (function components + hooks)                  | Fixed by the brief                                                    |
| Build tool        | Vite 5                                                  | Fast dev server + build, native ESM                                   |
| Language          | TypeScript (strict)                                     | Typed API contracts, `noUncheckedIndexedAccess` on                    |
| Routing           | React Router v6                                         | Protected + role-based routes, including the platform/org split above |
| Server state      | TanStack Query v5                                       | Caching, background refetch, precise invalidation — see below         |
| Client/auth state | Context API + hooks                                     | Only genuine client state is auth/session and theme                   |
| Forms             | React Hook Form + Zod                                   | Type-safe schema validation, minimal re-renders                       |
| Styling           | Tailwind CSS + shadcn/ui                                | Utility-first + accessible unstyled primitives (Radix)                |
| Charts            | Recharts                                                | Dashboard aggregation charts                                          |
| HTTP              | Axios                                                   | Request/response interceptors for auth + error normalisation          |
| Testing           | Vitest + React Testing Library + MSW                    | Mocks the network, not Axios                                          |
| Quality           | ESLint + Prettier + Husky + lint-staged + commitlint    | Enforced pre-commit and in CI                                         |
| Container         | Docker (multi-stage → Nginx, non-root) + Docker Compose |                                                                       |
| CI                | GitHub Actions                                          | lint → format → typecheck → test → build                              |

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
├── app/               # router, providers composition, Query client config
├── components/
│   ├── ui/             # shadcn/Radix primitives (button, dialog, select, …)
│   ├── common/          # app-wide reusable components (DataTable, Modal, badges, …)
│   ├── layout/          # AppLayout/Sidebar/Topbar (org app) + PlatformLayout/PlatformSidebar (platform)
│   ├── projects/
│   ├── tasks/
│   ├── comments/
│   ├── dashboard/
│   ├── admin/           # org-scoped user management (Users page)
│   └── platform/        # PlatformAdmin's organization management components
├── pages/               # route-level components, incl. pages/auth/ and pages/platform/
├── routes/              # ProtectedRoute, RoleRoute, OrgAppGuard, PlatformOnlyRoute
├── services/            # axios instance + one service module per resource (incl. organizations.service.ts)
├── hooks/               # queries/, mutations/, and app-wide hooks
├── context/             # AuthContext, ThemeContext, ToastContext
├── types/               # one file per resource, mirrors the API contract
├── schemas/             # Zod schemas
├── lib/                 # constants, permissions, status-transitions, date, error, cn
└── test/                # Vitest setup, MSW handlers/server, render-with-providers helper
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

The backend lives in the sibling repository **`Bench-task-BE`** (NestJS/MongoDB/Redis — see its own
README for setup). To run both stacks together via Docker on a shared network:

```bash
docker network create ptm-network            # once
cd <path-to-Bench-task-BE> && docker compose up -d    # backend's compose file must join `ptm-network`
cd <path-to-this-repo>     && docker compose up -d
```

For local (non-Docker) development, simply run the backend's `npm run start:dev` and point this
repo's `.env` at it (`VITE_API_BASE_URL=http://localhost:3000/api/v1`) — this is the normal day-to-day
setup, the Docker network dance above is only needed when running both as containers.

## Environment variables

| Variable               | Description                                                                                                      | Example                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `VITE_API_BASE_URL`    | Base URL of the backend API                                                                                      | `http://localhost:3000/api/v1` |
| `VITE_APP_NAME`        | Display name shown in the Topbar/title                                                                           | `Project & Task Management`    |
| `VITE_ENABLE_DEVTOOLS` | Mounts the TanStack Query devtools panel                                                                         | `true`                         |
| `VITE_USE_MOCKS`       | Serves the MSW-mocked API in `npm run dev` instead of a real backend (dev-only, stripped from production builds) | `false`                        |

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

**34 tests currently passing** across permissions, status-transition rules, the API client
(interceptors/refresh-queue), and representative components/pages (`DataTable`, `Pagination`,
`StatusBadge`, `DashboardPage`). Coverage thresholds in `vitest.config.ts` are still intentionally
low (15% lines/statements, 50% branches, 30% functions) — the screens themselves are all built and
working, but broad component-level test coverage lagged behind feature delivery and hasn't been
caught up yet. Raising these thresholds and filling in coverage for the Projects/Tasks/Platform Admin
screens is the main piece of frontend work still open.

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

1. **DatePicker** wraps the native `<input type="date">` rather than a JS calendar widget
   (`react-day-picker` was not in the fixed dependency list). This gets full keyboard support and
   platform-consistent affordances for free, at the cost of styling control across browsers.
2. **Toasts** are a hand-rolled `role="status"`/`aria-live` stack (`ToastContext` + `Toast.tsx`)
   rather than Radix's `@radix-ui/react-toast` primitive — simpler to reason about and sufficient
   for the accessibility requirement (auto-dismiss, dismissible, screen-reader announced).
3. **UserSelect** loads the full assignable-users list once (`/users/assignable`) and filters
   client-side by name/email as the user types, rather than a server-side search-as-you-type. Given
   the expected scale of a single org's assignable users, this avoids a debounced-search
   round-trip for a picker that's opened frequently.
4. **PlatformAdmin's "Organizations" list has no server-side row-level test coverage from MSW** —
   the mock handlers (`src/test/mocks/handlers.ts`) were only updated for the auth flow
   (`register-organization`), not the `/platform/*` endpoints, since no existing test currently
   exercises those pages. Real API integration for Platform Admin is verified against the live
   backend, not through the mocked dev workflow.
5. **Coverage thresholds are still low** (see Testing above) — feature delivery outpaced test-writing
   across both the original build and the later multi-tenancy work; this is an open item, not an
   oversight being hidden.

## Current state

Everything in the original brief's frontend scope is built: Login, self-service organization
registration, Projects (list/detail/create/edit/members), Tasks & Comments (list/detail/board-style
status control/activity), the Dashboard (all charts, role-scoped), and the Admin user-management
screen — plus the Platform Admin area described above. Remaining open work is documentation/polish
rather than missing features: broader automated test coverage (see Testing), and a recorded product
walkthrough (tracked at the repo/organization level, not per-commit here).

## License

Internal bench project — not licensed for external distribution.
