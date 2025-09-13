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

### State Management (Pinia)
- **ProtocolStore**: Main protocol editing state
- **AuthStore**: User authentication
- **ProtocolRenderStore**: SVG rendering logic
- **SettingsStore**: UI preferences (bits per row, pixels per bit)

### Key Vue Patterns
- Composition API throughout
- Unplugin auto-imports for components
- Vuetify 3 with custom SCSS settings
- D3.js for protocol visualization

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

## Common Issues
- **CORS**: Backend must run on port 8000, frontend uses axios base URL
- **Auth**: JWT secret required in environment, cookies auto-included
- **File uploads**: SVG parsing extracts protocol definitions from XML
- **Encapsulation**: Parent/child relationships require careful field mapping

## Key Files for Context
- `backend/src/models.py` - Core data structure
- `frontend/src/contracts/models.ts` - TypeScript interfaces
- `frontend/src/store/ProtocolStore.ts` - State management
- `docker-compose.yml` - Service dependencies and health checks
- `examples/` - Sample protocols for testing