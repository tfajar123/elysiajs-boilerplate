# AGENTS.md

Guide for AI agents (and developers) working in this codebase.
Primary goal: **keep the folder & file structure consistent** across the project, following the patterns already established in the `auth` module.

All code, comments, commit messages, and documentation in this repo must be written in **English**.

---

## 1. Stack

- **Runtime**: Bun
- **Framework**: Elysia (1.x) + TypeBox (`t` from elysia) for validation
- **Database**: PostgreSQL + Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Cache/Session**: Redis (`ioredis`)
- **Auth**: JWT (`jose`) + argon2 (password hashing)
- **Logger**: pino (+ pino-pretty in development)

---

## 2. Folder Structure

```text
elysia/app
├── docker-compose.yml          # infra: postgres + redis
├── drizzle.config.ts
├── AGENTS.md
├── .env / .env.example
└── src/
    ├── index.ts                # entry point: app.listen + side-effect imports (pattern: import './config/redis')
    ├── app.ts                  # main Elysia instance: /api/v1 prefix, registers all routes & global middleware
    ├── config/                 # infrastructure connections & configuration (1 file per infrastructure)
    │   ├── database.ts         # postgres connection (postgres-js)
    │   ├── redis.ts            # redis connection (ioredis)
    │   └── env.ts              # the ONLY place that reads environment variables
    ├── db/
    │   ├── index.ts            # drizzle instance (db)
    │   └── schema/
    │       ├── index.ts        # re-exports all schemas
    │       ├── users.schema.ts # 1 file per table: <name>.schema.ts
    │       └── refresh-token.schema.ts
    ├── middleware/             # global middleware (Elysia instances)
    │   ├── auth.middleware.ts
    │   └── logger.middleware.ts
    ├── modules/                # ALL features/domains live here (feature modules)
    │   ├── auth/               # primary reference module
    │   └── users/
    └── utils/                  # reusable helpers shared across modules
        ├── jwt.ts
        ├── logger.ts
        ├── pagination.ts       # pagination: parsePagination, paginate, paginationQuery
        ├── password.ts
        ├── redis.ts            # per-infrastructure service helpers (NOT raw connections)
        └── response.ts
```

---

## 3. Module Structure (must follow the `auth` pattern)

Every new feature MUST be a single folder in `src/modules/<module-name>/` with exactly these 5 files:

```text
src/modules/<module-name>/
├── <module-name>.route.ts        # Elysia endpoint definitions (prefix, schemas, middleware)
├── <module-name>.controller.ts   # handlers: receive context, call service, wrap response
├── <module-name>.service.ts      # business logic + orchestration
├── <module-name>.repository.ts   # database access (Drizzle) for this domain
└── <module-name>.validation.ts   # TypeBox schemas for body/headers/params
```

### Request flow (do not skip layers)

```text
route → controller → service → repository → db
                        └→ utils (jwt, redis, password, ...)
```

- **route**: only registers endpoints + schemas + middleware. No logic.
- **controller**: only receives context (`{ body, headers, params, userId, ... }`), calls the service, and returns `response.*`.
- **service**: the single place for business logic (existence checks, password verification, token generation, storing sessions in Redis, etc).
- **repository**: the only place for Drizzle queries. Services MUST NOT import `db` directly.
- **validation**: all TypeBox schemas. Routes MUST use a validation schema for every body/headers/params they accept.

---

## 4. Naming Conventions

| Item | Convention | Example (`orders` module) |
|---|---|---|
| Module folder | kebab-case | `src/modules/orders/` |
| Module file names | `<module-name>.<type>.ts` | `orders.route.ts`, `orders.service.ts` |
| Route | `export const <name>Routes = new Elysia({ prefix: '/<name>' })` | `export const ordersRoutes` |
| Controller | `export const <name>Controller = { async action({ body }: any) {...} }` | `export const ordersController` |
| Service | `export const <name>Services = { async action(...) {...} }` (plural, existing pattern) | `export const ordersServices` |
| Repository | `export const <name>Repository = { async findX(...) {...} }` | `export const ordersRepository` |
| Validation | `<action>Body`, `<action>Params`, `<action>Headers` | `createOrderBody` |
| Table schema | `<name>.schema.ts`, plural exported const (pattern: `users`) | `orders` |
| Utils helpers | named exports, camelCase | `createAccessToken`, `redisService` |
| Config instances | named exports matching the infrastructure | `sql`, `redis`, `db`, `env` |

Note: the existing pattern uses plain object literals (`export const xServices = {...}`) — do NOT introduce classes or DI frameworks for the sake of consistency.

---

## 5. Response Format

Always use the helpers from `src/utils/response.ts` — never build response objects manually:

```ts
return response.success(data, 'Message');
return response.created(data, 'Message');
return response.error(data, 'Message');
```

Shape: `{ success: boolean, message: string, data: T }`.

### Paginated endpoints

List endpoints MUST use the pagination helpers from `src/utils/pagination.ts` and return `{ items, pagination }` inside `data`:

```ts
// validation: spread the shared query properties
export const listUsersQuery = t.Object({ ...paginationQuery });

// service: parse params, fetch a page + total count, build meta
async listUsers(query: { page?: number; limit?: number }) {
  const params = parsePagination(query);
  const { items, totalItems } = await usersRepository.findUsers(params);
  return paginate(items, totalItems, params);
}
```

- The repository returns `{ items, totalItems }` and uses `params.limit` / `params.offset` (count query runs in parallel via `Promise.all`).
- The shared `paginationQuery` TypeBox properties enforce `page >= 1` and `1 <= limit <= 100` at the route level; `parsePagination` additionally clamps values as a safety net for programmatic calls.

---

## 6. New Module Template (copy-paste & rename)

```ts
// src/modules/orders/orders.route.ts
import Elysia from 'elysia';
import { ordersController } from './orders.controller';
import { createOrderBody } from './orders.validation';

export const ordersRoutes = new Elysia({
  prefix: '/orders',
})
  .post('/', ordersController.create, { body: createOrderBody });
// Routes that need auth: call .use(authMiddleware) BEFORE the protected endpoints.
```

```ts
// src/modules/orders/orders.controller.ts
import { response } from '../../utils/response';
import { ordersServices } from './orders.service';

export const ordersController = {
  async create({ body }: any) {
    const order = await ordersServices.create(body);
    return response.created(order, 'Order created successfully');
  },
};
```

```ts
// src/modules/orders/orders.service.ts
import { ordersRepository } from './orders.repository';

export const ordersServices = {
  async create(data: { userId: string; total: number }) {
    // business logic here
    return ordersRepository.createOrder(data);
  },
};
```

```ts
// src/modules/orders/orders.repository.ts
import { db } from '../../db';
import { orders } from '../../db/schema';

export const ordersRepository = {
  async createOrder(data: { userId: string; total: number }) {
    const result = await db.insert(orders).values(data).returning();
    return result[0];
  },
};
```

```ts
// src/modules/orders/orders.validation.ts
import { t } from 'elysia';

export const createOrderBody = t.Object({
  total: t.Number({ minimum: 0 }),
});
```

Finally: register the routes in `src/app.ts` (`.use(ordersRoutes)`); if you added a new table, create `<name>.schema.ts` in `src/db/schema/` and re-export it in `src/db/schema/index.ts`.

---

## 7. Infrastructure Rules

- **New env vars**: add them to `.env`, `.env.example`, and `src/config/env.ts` (use `requiredEnv()` for mandatory, `?? default` for optional). Never read `process.env`/`Bun.env` outside `env.ts`.
- **New infrastructure**: raw connections go in `src/config/<name>.ts`; functional helpers go in `src/utils/<name>.ts` (pattern: `config/redis.ts` = connection, `utils/redis.ts` = `redisService`).
- **Redis keys**: always define key prefixes as constants at the top of the helper file and document their patterns (see the header of `src/utils/redis.ts`). Every `SET` MUST include a TTL (`EX`).
- **New connections** are initialized via side-effect imports in `src/index.ts` (pattern: `import './config/redis';`).

---

## 8. Auth & Security Rules

- Passwords are always hashed via `src/utils/password.ts` (argon2) — never store plain text.
- JWTs are only created/verified via `src/utils/jwt.ts`; every token MUST have a `jti`.
- Refresh tokens MUST be whitelisted in Redis (key `refresh-token:{jti}`) and rotated on refresh.
- Protected endpoints use `authMiddleware` (Bearer access token + Redis blacklist check). Logout always blacklists the access token + deletes the refresh token from Redis.
- Errors are thrown with `throw new Error('message')` — consistent with the existing pattern.

---

## 9. Don'ts

- ❌ Never query the DB directly from controllers/services.
- ❌ Never put business logic in routes/controllers.
- ❌ Never create module files outside the `<name>.<type>.ts` pattern; colocate types/helpers with their consumers.
- ❌ Never build responses manually outside `utils/response.ts`.
- ❌ Never add a new dependency without confirming no similar library is already installed.
- ✅ After every code change, run `bun x tsc --noEmit` — it must pass with zero errors.

---

## 10. Useful Commands

```bash
bun run dev                # start server (watch mode)
bun x tsc --noEmit         # typecheck
bun run db:generate        # generate drizzle migrations
bun run db:migrate         # run migrations
bun run db:push            # push schema directly to DB
docker compose up -d       # start postgres + redis
```
