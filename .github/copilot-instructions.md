# Protocol Designer - AI Agent Instructions

## Project Overview
This is a web application for visually designing network protocol headers with encapsulation support. Users can create protocols, edit fields, set field options, and export to SVG/P4 formats. The system supports protocol stacking and encapsulation relationships.

## Architecture

### Multi-Service Docker Setup
- **Frontend**: Vue 3 + Vuetify + TypeScript (port 80)
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (port 8000)
- **Database**: PostgreSQL 16.3 (port 5432)

Start with: `docker compose up --build`

### Key Data Models
- **Protocol**: Core entity with UUID, fields array, user ownership
- **Field**: Contains length, options, encapsulation flags, endianness
- **ProtocolEncapsulation**: Links parent/child protocols for stacking
- **User**: Authentication with JWT cookies (30-day expiry)

## Backend Patterns (FastAPI)

### Structure Convention
```
src/
├── endpoints/          # Route handlers by domain
├── crud/              # Database operations
├── auth/              # JWT + OAuth2 cookie auth
├── models.py          # SQLAlchemy models
├── schemas.py         # Pydantic validation
└── database.py        # DB connection
```

### Authentication Flow
- Uses `OAuth2PasswordBearerCookie` for cookie-based auth
- JWT tokens stored in HTTP-only cookies
- All endpoints require `get_current_user` dependency
- Secret key from environment variable `SECRET_KEY`

### Database Patterns
- UUID primary keys for protocols/encapsulations
- Alembic migrations: `alembic upgrade head` in Dockerfile
- Environment-based config in `config.py`
- Cascade deletes on user → protocols relationship

## Frontend Patterns (Vue 3)

### UI: Vuetify 3 (REQUIRED)
- **Always use Vuetify components** for all UI elements — buttons, inputs, cards, dialogs, alerts, chips, lists, icons, etc.
- Never use plain HTML elements (`<button>`, `<input>`, `<select>`) when a Vuetify equivalent exists.
- Use the **Vuetify MCP server** (`vuetify-mcp`) to look up correct component APIs, props, and slots before implementing UI. Always check prop names via MCP rather than guessing.
- Icons use the `mdi-*` prefix (Material Design Icons).
- Layout: use `v-row`/`v-col` for grid, `v-spacer` for flex spacing, `d-flex`/`align-center`/`ga-*` utility classes.
- Density: prefer `density="compact"` in data-dense contexts (lists, analysis panels).

### State Management (Pinia)
- **ProtocolStore**: Main protocol editing state
- **AuthStore**: User authentication
- **ProtocolRenderStore**: SVG rendering logic
- **SettingsStore**: UI preferences (bits per row, pixels per bit)
- Store interfaces/types that are shared across components belong in `src/contracts/`, not inline in the store file.

### TypeScript & Contracts
- All shared interfaces and types live in `frontend/src/contracts/`:
  - `models.ts` — domain model interfaces (`Protocol`, `Field`, `ColoredPetriNet`, etc.)
  - `enums.ts` — all enums (`Endian`, `EditingMode`, `LengthUnit`, etc.)
  - `index.ts` — re-exports everything; always import from `@/contracts` not from individual files
- Store-local result types (e.g. `CPNPropertyResult`, `CPNAnalysisResults`) may stay in the store file if only used by that store and its direct consumers.
- Do not define interfaces inline inside `.vue` files for anything that crosses component boundaries.

### Composables
- Reusable stateful logic lives in `frontend/src/composables/` as `useXxx.ts` files.
- Composables are preferred over large inline `<script setup>` blocks when logic is reusable.
- Examples already present: `useFSMAnalysis.ts`, `useSidebar.ts`.

### Component Structure
- Use `<script setup lang="ts">` (Composition API) throughout.
- Components are in `frontend/src/components/`, grouped by domain subdirectory (e.g. `cpn/`, `behavior/`, `modals/`).
- Pages live in `frontend/src/pages/`.
- Components are auto-imported via unplugin — no need to manually import local components.

### Unit Testing (Vitest)
- All pure utility functions in `frontend/src/utils/` **must** have unit tests.
- Tests live in a `__tests__/` subfolder next to the module being tested (e.g. `utils/cpn/__tests__/karpMiller.test.ts`).
- Test runner: **Vitest** (`npm test` runs `vitest run`). Config is in `frontend/vitest.config.ts`.
- `globals: true` is configured — no need to import `describe`/`it`/`expect`.
- Test file naming: `<subject>.test.ts`.
- When adding a new utility module, add a corresponding test file covering: happy path, edge cases, and known boundary conditions.
- Vue components do not require unit tests unless they contain non-trivial logic that cannot be extracted to a utility function.

### Web Workers
- Long-running CPU-intensive tasks (state-space exploration, Karp-Miller DFS) run in **Web Workers** via `frontend/src/workers/`.
- Worker files are named `<subject>.worker.ts` and imported with the `?worker` Vite suffix.
- Always `JSON.parse(JSON.stringify(...))` reactive Pinia data before `postMessage` — Vue Proxies cannot be structured-cloned.
- Worker result/request types are exported from the worker file itself.

### API Integration
```typescript
// Base URL auto-detection with port switching
axios.defaults.baseURL = url + ":8000";
axios.defaults.withCredentials = true; // Critical for auth cookies
```

## Critical Workflows

### Development Setup
1. Ensure Docker is running
2. Copy `.env.example` to `.env`
3. Rename `apache.conf.example` to `apache.conf` in frontend/
4. Run `docker compose up --build`
5. Register at `http://localhost/`

### Protocol Field Structure
Fields have complex validation:
- `length` vs `max_length` for variable fields
- `field_options` array with value/name pairs
- `encapsulate` boolean for protocol stacking
- `endian` enum (big/little)

### SVG Upload/Export
- Custom XML schema in `examples/pdschema.xsd`
- SVG files contain embedded protocol definitions
- Static SVG storage in `backend/static/`

## Database Commands
```bash
# Inside backend container
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Frontend Testing

### Browser Testing (Chrome DevTools)
- Use the Chrome MCP tools (`mcp_io_github_chr_*`) to interact with the running frontend at `http://localhost/`.
- Default test account:
  - **Email**: `test@test.com`
  - **Password**: `12345678`
- Useful tools: `mcp_io_github_chr_take_screenshot` to inspect UI, `mcp_io_github_chr_navigate_page` to navigate, `mcp_io_github_chr_fill` / `mcp_io_github_chr_click` for interactions, `mcp_io_github_chr_get_console_message` to check for JS errors.

## Common Issues
- **CORS**: Backend must run on port 8000, frontend uses axios base URL
- **Auth**: JWT secret required in environment, cookies auto-included
- **File uploads**: SVG parsing extracts protocol definitions from XML
- **Encapsulation**: Parent/child relationships require careful field mapping
- **Reactive proxies in workers**: Always strip with `JSON.parse(JSON.stringify(...))` before `postMessage`

## Key Files for Context
- `backend/src/models.py` — Core data structure
- `frontend/src/contracts/models.ts` — TypeScript interfaces
- `frontend/src/contracts/enums.ts` — TypeScript enums
- `frontend/src/store/ProtocolStore.ts` — State management
- `frontend/src/utils/cpn/` — CPN analysis utilities (each with `__tests__/`)
- `frontend/src/workers/` — Web Worker entry points
- `docker-compose.yml` — Service dependencies and health checks
- `examples/` — Sample protocols for testing
