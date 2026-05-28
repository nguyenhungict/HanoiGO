# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HanoiGO is a travel companion app for exploring Hanoi's heritage sites. It's a **monorepo** with:
- `actions/` — NestJS backend (port 8888)
- `client/` — Next.js 14 frontend (port 3000)

## Commands

### Root
```bash
npm run dev           # Start both backend + frontend concurrently
npm run install:all   # Install deps for both actions/ and client/
```

### Backend (`actions/`)
```bash
npm run start:dev     # NestJS watch mode
npm run build         # Compile to dist/
npm run lint          # ESLint with auto-fix
npm test              # Jest unit tests
npm run test:e2e      # E2E tests
npm run seed:places   # Seed places data
```

### Frontend (`client/`)
```bash
npm run dev           # Next.js dev server
npm run build         # Production build
npm run lint          # ESLint
```

### Database (run inside `actions/`)
```bash
npx prisma migrate dev --name <description>   # Create migration
npx prisma db push                            # Fast schema sync (no migration file)
npx prisma generate                           # Regenerate Prisma Client
npx prisma studio                             # Visual DB editor
```

## Architecture

### Request Flow
```
Next.js Component
  → Server Action (client/lib/actions/*.ts)  [use server]
  → Axios → http://localhost:8888
  → NestJS Controller → Service
  → Prisma ORM → PostgreSQL (port 5433)
```

### Frontend–Backend Communication
All API calls go through **Next.js Server Actions** in `client/lib/actions/`. These:
- Are marked `'use server'`
- Retrieve auth token via `getToken()` → passed as Bearer header
- Return `{ success: boolean, data?, error? }`

### Authentication
- JWT stored in `accessToken` httpOnly cookie
- `tokenVersion` field on User model for invalidation
- JWT payload contains `role` (ADMIN | USER), decoded in `client/middleware.ts` for routing
- Backend: `JwtAuthGuard` + `RolesGuard` with `@Roles()` decorator from `common/`

### State Management
Zustand stores in `client/store/`, auto-persisted to localStorage.

### Real-time
Socket.io + Redis for group chat (`GroupChatModule`).

## Key Backend Modules

| Module | Purpose |
|--------|---------|
| `auth` | JWT login, OTP email, password reset |
| `trips` | Itinerary planner with daily stops |
| `activities` | Group activities linked to trips/places |
| `places` | Heritage landmarks with PostGIS geospatial queries |
| `users` | Profiles, follow/unfollow relationships |
| `group-chat` | WebSocket messaging |
| `ai-chat` | Google Gemini AI assistant |
| `admin` | User moderation, reports, bans |
| `media` | Multer file uploads |
| `prisma` | Global DB module exported to all other modules |

## Database

- PostgreSQL with **PostGIS** extension (geospatial queries)
- Prisma schema: `actions/prisma/schema.prisma`
- Migrations: `actions/prisma/migrations/`
- Geospatial: use `ST_DWithin` / `ST_Distance` for radius queries; `lat/lng` stored as `Float` on most models

## Non-obvious Patterns

- **Time format**: stored as minutes-from-midnight (integer), not as `Date` or string
- **Activity location**: can link to a `Place` OR a `Trip`, mutually exclusive
- **Maps**: Goong Maps API (primary) + Leaflet.js; fallback to Haversine formula if Goong fails
- **Swagger**: backend API docs at `http://localhost:8888/docs`
- **Validation**: `ValidationPipe` globally strips unknown properties — DTOs must declare all accepted fields

## Frontend Conventions

- Tailwind with custom semantic tokens defined in `globals.css` (`--color-primary`, etc.)
- Design: glassmorphism, Manrope font, rose/champagne/green palette (see `THEME.md`)
- Map components using Leaflet must be dynamically imported (`next/dynamic`) to avoid SSR errors
- Feature components in `components/{feature}/`; shared primitives in `components/ui/`

## Environment Variables

**Backend** (`.env` in `actions/`):
`DATABASE_URL`, `JWT_SECRET`, `MAIL_USER`, `MAIL_PASS`, `GOONG_API_KEY`, `GEMINI_API_KEY`

**Frontend** (`.env.local` in `client/`):
`NEXT_PUBLIC_ACTIONS_URL`, `NEXT_PUBLIC_GOONG_API_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`
