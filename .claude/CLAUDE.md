<!-- GSD:project-start source:PROJECT.md -->

## Project

**QuanLyQuan**

Web app quản lý quán ăn nhỏ ở Việt Nam, bán dạng **cho thuê** cho nhiều quán (tách từ hệ thống đang chạy thật của
Quán Bà Lùn ngày 2026-11-06). Gồm trang quản lý `apps/web` (POS bàn, bếp, đơn online, lịch sử, menu, NCC, cài đặt),
trang khách `apps/shop` (đặt online + QR gọi món tại bàn) và API NestJS dùng chung. Người dùng thật là **chủ quán và
nhân viên phục vụ, phần lớn lớn tuổi, dùng điện thoại** — chữ to, nút to, ít bước.

Milestone hiện tại: **Design System & Giao diện đợt 1** — đưa giao diện về một hệ thống thiết kế tập trung, thống nhất
mọi màn, và cho mỗi quán thuê đổi màu + logo của riêng mình.

**Core Value:** **Mọi màn hình nhìn và dùng như một sản phẩm, đổi màu thương hiệu cho cả hệ thống chỉ bằng một chỗ — mà không mất
bất kỳ tính năng nào nhân viên đang dùng hằng ngày.**

### Constraints

- **Người dùng**: chữ ≥ 16px, nút ≥ 48px (nút chính 64), không hover/tooltip là đường duy nhất, hộp thoại chồng ≤ 2 tầng — người dùng lớn tuổi, điện thoại.
- **Tính năng**: giữ đủ 100% tính năng hiện có của mỗi màn được sửa — đối chiếu inventory; thiếu một là lỗi.
- **Thiết kế trước**: mỗi màn có UI-SPEC được chủ repo duyệt trước khi code (DESIGN-SYSTEM §4 luật 7).
- **Tech stack**: CSS variables + CSS thường, không Tailwind/MUI (bundle có gác ngân sách trong CI); icon `lucide-react`.
- **Thiết bị**: mỗi màn chạy tốt ở 360 / 390 (điện thoại), iPad ngang 1180, máy tính 1440; mốc 640 / 900 / 1280.
- **Git**: làm trên nhánh `ui/dot-1`; commit được, **push chỉ khi chủ repo bảo**, không merge vào `main` khi chưa duyệt.
- **DB**: không thêm cột vào bảng có sẵn khi còn dùng chung DB với Bà Lùn (`synchronize` bên kia sẽ xoá).
- **Ngôn ngữ**: tiếng Việt ở UI, comment, commit message.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript ^5.7.0 - used across all workspaces (`apps/api`, `apps/web`, `apps/shop`, `packages/schemas`, `packages/utils`)
- SQL (MySQL dialect) - via TypeORM `synchronize: true` (no migration files currently used), `apps/api/src/data-source.ts`

## Runtime

- Node.js >= 20 (`engines.node` in root `package.json`; Dockerfile uses `node:20-alpine`)
- ESM (`"type": "module"` in every package.json) — all workspaces are pure ESM, imports require explicit `.js` extensions in compiled output (e.g. `./app.module.js`)
- pnpm 9.0.0 (`packageManager: "pnpm@9.0.0"`), workspace defined in `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- Lockfile: present (`pnpm-lock.yaml`)
- Monorepo task runner: Turborepo `^2.3.0` (`turbo.json`) — orchestrates `build`, `dev`, `typecheck`, `test`, `lint` across workspaces with dependency graph (`dependsOn: ["^build"]`)

## Frameworks

- NestJS `^10.4.0` (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`) - `apps/api` backend framework, Express adapter
- React `^19.0.0` + React Router `^7.0.0` - `apps/web` (POS/admin) and `apps/shop` (customer-facing) SPAs
- Vite `^6.0.0` with `@vitejs/plugin-react` - build tool/dev server for both `apps/web` and `apps/shop`
- Vitest `^2.1.0` - used in `apps/api` and `apps/web` (`test`/`test:watch` scripts); `apps/shop` has no test script defined yet
- TypeScript compiler (`tsc`) - build step for `apps/api`, `packages/schemas`, `packages/utils`; `apps/web`/`apps/shop` run `tsc --noEmit` before `vite build`
- `@swc-node/register` `^1.11.1` + `@swc/core` - fast dev-mode ESM loader for `apps/api` (`node --import @swc-node/register/esm-register --watch src/main.ts`)
- Prettier `^3.4.0` - root-level formatting (`pnpm format`)

## Key Dependencies

- `typeorm` `^0.3.20` + `@nestjs/typeorm` `^10.0.2` + `mysql2` `^3.11.0` - ORM and MySQL driver
- `jsonwebtoken` `^9.0.2` - JWT auth (custom, not `@nestjs/jwt`), `apps/api/src/modules/auth/jwt.service.ts`
- `bcrypt` `^5.1.1` - password hashing
- `class-validator` `^0.14.1` + `class-transformer` `^0.5.1` - DTO validation (global `ValidationPipe`, whitelist mode)
- `zod` `^3.23.0` - shared validation schemas (also used in `packages/schemas` and `apps/web`)
- `nestjs-pino` `^4.2.0` + `pino` `^9.5.0` + `pino-http` `^10.3.0` - structured logging
- `@nestjs/throttler` `^6.2.0` - rate limiting (global 600 req/min/IP + stricter overrides on auth routes)
- `@nestjs/event-emitter` `^2.1.0` - internal event bus
- `@nestjs/swagger` `^8.0.0` - OpenAPI docs generation
- `cookie-parser` `^1.4.7` - JWT extracted from HTTP-only cookie
- `multer` `^2.1.1` + `@types/multer` - file uploads (menu item images → `apps/api/uploads/menu/`)
- `uuid` `^11.0.0` - ID/token generation
- `axios` `^1.7.0` - HTTP client to API
- `xlsx` `^0.18.5` - Excel import/export (bulk menu import)
- `zxcvbn` `^4.4.2` - password strength estimation (setup wizard)
- Minimal dependency set: `react`, `react-dom`, `react-router-dom`, `@order/schemas` only; no `axios` yet (newly scaffolded, 4 placeholder pages: `/cart`, `/checkout`, `/o/:token`, `/history`)
- `@order/schemas` (`packages/schemas`) - shared Zod schemas, consumed by `apps/api`, `apps/web`, `apps/shop`
- `@order/utils` (`packages/utils`) - shared utilities (e.g. `apiOk` response helper), consumed by `apps/api`

## Configuration

- `.env` (git-ignored, local dev secrets — present, not read/quoted here)
- `.env.example` - documents dev vars: `MYSQL_*`, `API_PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_LIFETIME_DAYS`, `COOKIE_NAME`, `COOKIE_SECURE`, `BCRYPT_COST`, `SETUP_ALLOWED_IP`, `ALLOWED_ORIGIN`, `VITE_API_BASE_URL`
- `.env.production.example` - documents prod vars: `DOMAIN`, `MYSQL_*`, `JWT_SECRET`, `JWT_LIFETIME_DAYS`, `COOKIE_NAME`, `SETUP_ALLOWED_IP`
- `.env.deploy` (git-ignored, present) - deploy script credentials: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PORT`, `DEPLOY_PASS`, `DEPLOY_PATH` (consumed by `./deploy.sh`)
- Config loaded via `@nestjs/config` `ConfigModule.forRoot({ isGlobal: true })` in `apps/api/src/app.module.ts`, plus `dotenv/config` import in `apps/api/src/main.ts`
- `tsconfig.base.json` (root) - shared strict TS config (ES2022 target, `strict: true`, decorators enabled), extended by each workspace's `tsconfig.json`
- `apps/api/tsconfig.json` - `NodeNext` module/resolution, `outDir: dist`, `rootDir: src`
- `apps/web/vite.config.ts`, `apps/shop/vite.config.ts` - dev server proxy config forwarding API prefixes to `http://localhost:3001`; `apps/shop` runs on port 5174 (strict) vs `apps/web` on 5173, to keep `ALLOWED_ORIGIN` CSRF check consistent
- `turbo.json` - task pipeline (`build`, `dev`, `typecheck`, `test`, `lint`)

## Platform Requirements

- Node.js >= 20
- pnpm 9 (via corepack)
- MySQL 8.0 (via `docker-compose.yml`, `db:up`/`db:down` scripts, exposed on host port 3307 → container 3306)
- Docker multi-stage build (`Dockerfile`): pnpm install → build `@order/schemas` → build API + web → minimal Alpine runtime image serving API + static web build together
- `docker-compose.prod.yml` - 3-service stack: `mysql` (internal network only, 1GB innodb buffer pool, TZ UTC), `api` (Node container), `caddy` (reverse proxy, auto HTTPS via Let's Encrypt using `Caddyfile` + `DOMAIN` env, HSTS/security headers, zstd/gzip compression)
- Deployment automated via `./deploy.sh` (uses `.env.deploy` creds), target VPS reachable via SSH; VPS may reinstall/change IP (per project memory)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- kebab-case for most TS/TSX files: `menu-search.ts`, `csrf-origin.middleware.ts`, `global-exception.filter.ts`, `revoked-jti.entity.ts`
- NestJS suffix convention strictly followed: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.entity.ts`, `*.guard.ts`, `*.middleware.ts`, `*.filter.ts`, `*.interceptor.ts`, `*.dto.ts`
- React page components: PascalCase file matching component name, `Page` suffix — `LoginPage.tsx`, `OrdersPage.tsx`, `KitchenPage.tsx` in `apps/web/src/pages/` and `apps/shop/src/pages/`
- React reusable components: PascalCase, no suffix — `Toast.tsx`, `ConfirmDialog.tsx`, `MenuPickerModal.tsx` in `apps/web/src/components/`
- Test files colocated with source, `*.test.ts` suffix — `apps/web/src/lib/menu-search.test.ts` tests `apps/web/src/lib/menu-search.ts`
- Zod schema files in `packages/schemas/src/` named after domain, plural or singular matching module: `auth.ts`, `admin.ts`, `menu.ts`, `orders.ts`, `tables.ts`, `errors.ts`
- camelCase throughout: `apiOk`, `extractError`, `isTransientError`, `toTitleCase`
- Service methods read as verbs on the domain: `svc.addItem`, `svc.changeItemState`, `svc.cancelWholeOrder`, `svc.checkout` (`apps/api/src/modules/orders/orders.service.ts`)
- Guard/helper functions colocated in controller files when only used there, e.g. `staffHistoryWindowMs(req)` defined directly in `apps/api/src/modules/orders/orders.controller.ts:107`
- snake_case for wire-format fields (DB columns, DTO fields, API payload keys) to match DB schema and Vietnamese business vocabulary: `menu_item_id`, `full_name`, `is_out_of_stock`, `table_code`, `request_id`, `ts_ms`
- camelCase for local variables and internal-only state: `existingMap`, `groupNameByCode`, `wasOutOfStock`
- This produces a consistent rule: **anything that crosses a network/DB boundary is snake_case; anything purely internal to a function/component is camelCase.**
- PascalCase for Zod schema exports and their inferred types share the same name: `export const MenuItem = z.object({...}); export type MenuItem = z.infer<typeof MenuItem>;` (`packages/schemas/src/menu.ts`)
- Enum-like Zod schemas also share name with type: `OrderItemState`, `MenuGroup`, `TableKind`
- NestJS class-validator DTOs use `Dto` suffix: `CreateMenuItemDto`, `UpdateMenuItemDto`, `AddItemDto`, `ChangeStateDto`

## Code Style

- Prettier ^3.4.0 declared at root `package.json` (`pnpm format` = `prettier --write "**/*.{ts,tsx,md,json}"`)
- **No `.prettierrc` file exists anywhere in the repo** — Prettier runs with all-default settings (2-space indent, double quotes normalized to single per Prettier default... actually Prettier default is double quotes, but existing code consistently uses single quotes). Do not assume a specific print-width or quote style is enforced beyond Prettier defaults; match surrounding file style when editing by hand.
- Single quotes used consistently across `.ts`/`.tsx` files by convention (not by config) — follow this when adding code.
- Semicolons used throughout.
- `apps/api/package.json` declares `"lint": "eslint src --max-warnings 0"` but **no ESLint config file exists anywhere in the repo** (`.eslintrc*`, `eslint.config.*` all absent). Running `pnpm lint` in `apps/api` will fail/no-op until a config is added. Treat this as a known gap — do not assume lint enforcement catches style violations; rely on TypeScript strict mode and manual review instead.
- `apps/web` and `apps/shop` have no `lint` script at all.
- TypeScript `strict: true` is enforced repo-wide via `tsconfig.base.json` (`/Users/m1macbook/Desktop/OrderQuanBaLun/tsconfig.base.json`) — this is the primary safety net, not ESLint.

## Import Organization

- No `@/` or path-alias imports configured; all cross-file imports are relative (`../auth/guards/jwt-auth.guard.js`, `./entities/menu-item.entity.js`)
- Cross-package imports use workspace protocol names: `@order/schemas`, `@order/utils` (see `pnpm-workspace.yaml`, resolved via `workspace:*` in each `package.json`)
- `apps/api` (NodeNext module resolution) requires `.js` extensions on relative imports even though source is `.ts`: `import { toTitleCase } from '../../common/text.js';`
- `apps/web` / `apps/shop` (Vite bundler resolution, `allowImportingTsExtensions: true`) use `.ts`/`.tsx` extensions directly: `import { api, extractError } from '../lib/api.ts';`
- `packages/schemas` and `packages/utils` (also NodeNext-style build) use `.js` extensions in re-exports: `export * from './errors.js';` (`packages/schemas/src/index.ts`)
- When adding new files, match the extension convention of the app you're in — mixing them causes build failures.

## Error Handling

- Defined by `ErrorEnvelope` Zod schema in `packages/schemas/src/errors.ts` and implemented by `apps/api/src/common/filters/global-exception.filter.ts`.
- `ErrorCode` is a closed Zod enum (`packages/schemas/src/errors.ts:5-24`) shared between backend and frontend — **add new error codes here first**, then reference the string in NestJS exceptions.
- Controllers throw NestJS built-in exceptions (`BadRequestException`, `ConflictException`, `NotFoundException`, `ForbiddenException`) with a structured body `{ code: '<ErrorCode value>', message: '<Vietnamese message>' }`, e.g.:
- `GlobalExceptionFilter` also has a `FRIENDLY_VN` map (`global-exception.filter.ts:19-37`) that overrides `message` with a canned Vietnamese-language string keyed by error code — this always wins over the message passed at throw site once a code has an entry. When adding a new error code with a user-facing message, add it to both the throw-site AND `FRIENDLY_VN` if you want it to override.
- `class-validator` validation failures (array of strings) are auto-converted into `field_errors` array via `extractFieldFromMessage()` (`global-exception.filter.ts:103-107`), which parses the leading token before "must/should/has" out of each message.
- `packages/utils/src/index.ts` exports `ApiOk<T>` type and `apiOk<T>(data, message?)` helper — the ONLY helper in `@order/utils` as of this analysis. **There is no `apiErr` helper** — errors are always thrown as NestJS exceptions and handled centrally by `GlobalExceptionFilter`, never constructed manually via a helper function.
- `apiOk()` is used in exactly one place today: `apps/api/src/modules/public/public.controller.ts` (the `/api/public/health` endpoint). All other controllers (`menu.controller.ts`, `orders.controller.ts`, `tables.controller.ts`, `auth.controller.ts`) return a plain object literal `{ data: ... }` directly instead of calling `apiOk()`.
- **For new `/api/public/*` routes (shop-facing), use `apiOk()` explicitly** — this is documented as the required pattern for Phase 08+ in `public.controller.ts:23-25`: "success = `apiOk()`, error = giữ shape compact hiện có của `GlobalExceptionFilter`".
- For existing internal routes (`apps/web`-facing, under `/menu`, `/orders`, `/auth`, `/tables`), continue the existing `{ data: ... }` literal pattern for consistency with surrounding code — do not retrofit `apiOk()` into those controllers as part of unrelated work.
- `apps/web/src/lib/api.ts` exports `extractError(err)` which normalizes any thrown error (Axios or otherwise) into `{ code, message, field_errors? }`, falling back to Vietnamese generic messages (`'Lỗi mạng, thử lại sau ít phút nhé.'`) when the response has no structured error body.
- `isTransientError(err)` (`api.ts:68-77`) classifies 5xx/408/429/network errors as transient — used to suppress toast noise during polling loops.
- Components call `extractError(err)` in `catch` blocks and pass `.message` to a toast (`useToast().push('error', e.message)`), never rendering raw error objects.

## Logging

- Validation failures are logged at `warn` level with full field/message detail even though the client sees a friendlier generic message (`global-exception.filter.ts:74-78`).
- Unhandled `Error` instances are logged at `error` level with full stack trace (`global-exception.filter.ts:83`).
- `request_id` middleware (`apps/api/src/common/middleware/request-id.middleware.ts`) attaches a request ID used both in logs and in the error envelope for correlation.

## Comments

- Heavy use of Vietnamese-language business-rule comments explaining *why*, not *what* — e.g. state machine transition rationale in `packages/schemas/src/orders.ts:52-60` and `apps/api/src/modules/orders/orders.service.ts:17-25`. New business logic should follow this pattern: explain the business reason for a rule directly above the code implementing it.
- Ticket/task references embedded in comments as tags like `P01.D-09`, `P08.D-61`, `M2.D-64` — these map to planning docs (`docs/MILESTONE-02-ONLINE-ORDERING-SPEC.md`) and prior decisions. When implementing a phase task, tag the relevant code comment with the task ID if one exists in the plan.
- SQL fragments used as constants get an explanatory doc comment above them, e.g. `HAS_ALIVE_ITEMS_SQL` vs `HAS_ANY_ITEM_SQL` in `orders.controller.ts` area / `orders.service.ts` — both the SQL and the distinction between them are explained.
- `/** ... */` doc comments used above exported functions/classes/methods to describe route purpose, params, and edge cases — e.g. every controller method in `menu.controller.ts` and `orders.controller.ts` has a one-line route summary comment (`/** GET /menu — list menu items. ... */`).
- Not enforced by tooling (no ESLint `jsdoc` plugin), but consistently present — match this style for new endpoints.

## Function Design

## Module Design

- `packages/schemas/src/index.ts` is a barrel file re-exporting all domain schema modules: `export * from './errors.js'` etc. Add new schema domains here.
- `packages/utils` has a single flat `index.ts` with no barrel indirection (small surface area today).
- NestJS modules (`*.module.ts`) declare `controllers`, `providers`, and `imports` (TypeOrmModule.forFeature(...) for entities) — one module per bounded context (`auth`, `menu`, `orders`, `tables`, `admin`, `audit`, `public`, `setup`, `health`).
- `apps/api/src/modules/auth/dto/auth.dto.ts` — dedicated `dto/` subfolder, used only by `auth` module.
- `apps/api/src/modules/menu/menu.controller.ts` and `apps/api/src/modules/orders/orders.controller.ts` — class-validator DTOs declared **inline at the top of the controller file itself**, not in a separate `dto/` file. This is the dominant pattern for newer modules (menu, orders, tables).
- **When adding a new module, default to inline DTOs in the controller file** unless the DTO set grows large enough to warrant extraction (as auth did). Both patterns are acceptable; inline is more common and matches majority of the codebase.
- Note: `packages/schemas/src/*.ts` also defines Zod equivalents of some of these same DTOs (e.g. `AddItemDto` in both `packages/schemas/src/orders.ts` and inline in `orders.controller.ts`) — these are currently **not shared/unified**; the Zod schemas in `packages/schemas` describe the wire contract for docs/type-sharing with frontend, while NestJS uses its own separate class-validator DTOs at runtime for the same shape. Keep both in sync manually when changing a field.

## Entity Conventions (TypeORM)

- All entities use UUID primary keys: `@PrimaryGeneratedColumn('uuid')`.
- Money stored as integer VND (no decimals): `@Column({ type: 'int', unsigned: true }) price!: number;`
- Timestamps stored as MySQL `datetime(6)` but transformed to epoch-ms numbers for app code via shared transformers defined in `apps/api/src/modules/auth/entities/user.entity.ts`: `dateToMsTransformer` (Date ↔ ms) and `bigIntTransformer` (MySQL BIGINT string ↔ number). Reuse these transformers on any new entity with datetime or bigint columns — import from `user.entity.ts` as the other entities do (`menu-item.entity.ts:9`).
- Indexes declared with explicit names via `@Index('idx_<table>_<cols>', [...])` — follow the `idx_<table>_<column(s)>` naming pattern for new indexes.
- Nullable/soft-delete pattern: `is_active: boolean` column (default `true`) used for soft-delete instead of hard deletes, e.g. `MenuItem.is_active`, toggled by `DELETE /menu/:id` handler which sets `is_active = false` rather than removing the row.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Bootstrap | App creation, middleware wiring, static asset + SPA fallback serving | `apps/api/src/main.ts` |
| AppModule | Wires all feature modules, global guard (Throttler) + global interceptor (Audit) | `apps/api/src/app.module.ts` |
| OrdersController | HTTP surface for order/table lifecycle, DTO validation, role gating | `apps/api/src/modules/orders/orders.controller.ts` |
| OrdersService | Order lifecycle business logic: open/create order, item state machine, checkout, history, stats, table transfer | `apps/api/src/modules/orders/orders.service.ts` |
| Order / OrderItem / OrderActivityLog entities | TypeORM schema definitions for the order domain | `apps/api/src/modules/orders/entities/*.ts` |
| RestaurantTable entity | Table registry incl. KiotViet lock flag | `apps/api/src/modules/tables/entities/restaurant-table.entity.ts` |
| JwtAuthGuard | Cookie-based auth: verify JWT, check JTI blacklist, token_version, is_active, role assignment | `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` |
| AdminGuard / OwnerGuard / RequireRoles | Role-based authorization layered on top of JwtAuthGuard | `apps/api/src/modules/auth/guards/*.ts` |
| CsrfOriginGuard | Origin/Referer check on `/admin/*` + `/auth/*` mutations (defense-in-depth vs SameSite cookie) | `apps/api/src/common/middleware/csrf-origin.middleware.ts` |
| RequestIdMiddleware | Assigns/propagates `X-Request-Id` for correlation | `apps/api/src/common/middleware/request-id.middleware.ts` |
| GlobalExceptionFilter | Normalizes every thrown error into `{ error: { code, message, request_id, ts_ms, field_errors } }`, Vietnamese-friendly messages | `apps/api/src/common/filters/global-exception.filter.ts` |
| AuditInterceptor / AuditEventHandler | Derives action_kind from method+path, emits async event, persists to `audit_log` without blocking response | `apps/api/src/modules/audit/audit.interceptor.ts` |
| PublicController | Unauthenticated `/api/public/*` surface (currently only `health`); target namespace for Milestone 2 customer-facing endpoints | `apps/api/src/modules/public/public.controller.ts` |
| data-source.ts | TypeORM DataSource config — MySQL, UTC-forced timezone, `synchronize: true` (no migration files used) | `apps/api/src/data-source.ts` |
| CLI cron scripts | Standalone scripts invoked via `pnpm cron:*`, each bootstraps its own `AppDataSource` (not the Nest app) | `apps/api/src/cli/*.ts` |
| apps/web | Staff-facing POS/admin SPA (orders, kitchen, menu mgmt, tables, history, admin users/audit) | `apps/web/src/App.tsx` |
| apps/shop | Customer-facing SPA, currently placeholder pages only (Milestone 2 in progress) | `apps/shop/src/main.tsx`, `apps/shop/src/pages/*.tsx` |
| @order/schemas | Zod schemas + inferred types shared across all 3 apps (order state machine constants live here too) | `packages/schemas/src/orders.ts` |
| @order/utils | Minimal cross-runtime helpers (currently just `apiOk` envelope builder) | `packages/utils/src/index.ts` |

## Pattern Overview

- No microservices, no message queue — single Node process, single MySQL instance.
- No formal migrations: schema drift is handled entirely by TypeORM `synchronize: true`. Schema changes must be additive/backward-compatible in code review since there's no migration file to review.
- Business logic concentrated in `*.service.ts` files; controllers are thin (DTO validation + role checks + delegate to service).
- Heavy inline Vietnamese comments encode business rules directly in code — these comments ARE the spec for domain edge cases (e.g. order state sealing, SERVED→CANCELLED "trả món" flow). Do not strip them when refactoring.
- Snapshot-heavy entities: `Order`/`OrderItem` denormalize actor names (`created_by_full_name`, `served_by_full_name`, etc.) and price/name at time of action rather than joining live — protects historical/audit accuracy against later edits/deletes of Users or MenuItems.
- Post-commit side effects (activity log writes) are deliberately non-transactional and swallow failures (`writeActivity` catches + warns) so a logging failure never blocks the primary business operation.

## Layers

- Purpose: HTTP binding, DTO validation (`class-validator`), role/permission gating via guards, request/response shaping (`{ data: ... }` envelope for staff API, `apiOk()` envelope for `/api/public/*`).
- Location: `apps/api/src/modules/*/*.controller.ts`
- Contains: `@Controller`/`@Get`/`@Post` handlers, inline DTO classes with decorators.
- Depends on: Services (constructor injection), Guards.
- Used by: apps/web (staff, cookie session) and — planned — apps/shop (public/session-token API).
- Purpose: All business logic and transactional consistency (order state machine, checkout math, activity logging, retry-on-deadlock).
- Location: `apps/api/src/modules/*/*.service.ts`
- Contains: TypeORM repository calls, `DataSource.transaction()` blocks, domain validation, VN error messages with `code` fields.
- Depends on: TypeORM repositories/DataSource, other services rarely (mostly self-contained per module).
- Used by: Controllers only (no service-to-service HTTP calls; direct DI within the same process).
- Purpose: TypeORM entity classes define table schema (columns, indexes, relations) that `synchronize: true` applies directly to MySQL.
- Location: `apps/api/src/modules/*/entities/*.entity.ts`
- Contains: `@Entity`, `@Column`, `@Index`, `@OneToMany`/`@ManyToOne` decorators; `dateToMsTransformer` (converts MySQL datetime ⇄ epoch ms, defined in `apps/api/src/modules/auth/entities/user.entity.ts`) used across all entities for consistent number-based timestamps.
- Depends on: TypeORM only.
- Used by: `data-source.ts` (entities array), repositories injected into services.
- Purpose: App-wide middleware, guards, filters not owned by a single feature module.
- Location: `apps/api/src/common/`
- Contains: `filters/global-exception.filter.ts`, `middleware/request-id.middleware.ts`, `middleware/csrf-origin.middleware.ts`, `text.ts` (string helpers).
- Depends on: Nest core, `@order/schemas` (ErrorCode type).
- Used by: `main.ts` (middleware registration), `app.module.ts` (global filter/interceptor providers).
- Purpose: One-off/scheduled maintenance jobs run outside the HTTP server (invoked via `pnpm cron:*` / `pnpm seed:*`).
- Location: `apps/api/src/cli/*.ts`
- Contains: `main()` functions that call `AppDataSource.initialize()` directly (bypassing Nest DI entirely), then `AppDataSource.destroy()`.
- Depends on: `data-source.ts`, relevant entities directly.
- Used by: `package.json` root scripts (`cron:audit-retention`, `cron:jti-cleanup`), external OS cron/scheduler (not wired into the codebase — invocation is external).

## Data Flow

### Primary Request Path (staff order flow)

### Order Item State Machine Flow

- No client-side or server-side in-memory session state for orders — all state lives in MySQL (`orders.closed_at`/`is_paid`, `order_items.state`). Frontend polls REST endpoints (no websockets) — see comments in `apps/web/src/lib/api.ts` about disabling HTTP caching for polling correctness.
- Auth state: JWT in httpOnly cookie + server-side `revoked_jwt_jti` blacklist + `users.token_version` for force-logout-everywhere.

## Key Abstractions

- Purpose: A closed order is defined ONLY by `closed_at IS NOT NULL`; whether it was paid vs cancelled is disambiguated by `is_paid` (`PAID_SQL` / `CANCELLED_SQL` constants).
- Examples: `sealAsCancelled()` helper, `checkout()`, `cancelWholeOrder()` — all in `apps/api/src/modules/orders/orders.service.ts`.
- Pattern: Once `closed_at` is set, `changeItemState`/`addItem`/`removeItemUnits`/`transferTable` all refuse further mutation ("Đơn đã thanh toán — không sửa được nữa").
- Purpose: Avoid `pessimistic_write` lock contention under 2-second client polling while still preventing duplicate "open order" creation races.
- Examples: `getOrCreateOpenOrder` → `getOrCreateOpenOrderImpl` (`orders.service.ts:183-288`).
- Pattern: unlocked SELECT first; only fall into `ds.transaction()` + `pessimistic_write` when a create or dedupe is actually needed. Wrapped in `runWithRetry` (2 attempts) for transient deadlock/lock-timeout errors.
- Purpose: Preserve historical accuracy (who did what, at what price/name) independent of later User/MenuItem edits or deletes.
- Examples: `created_by_full_name`, `served_by_full_name`, `cancelled_by_full_name` on `OrderItem`; `menu_item_name`/`menu_item_price` snapshot at add-time; `table_code` snapshot on `Order`.
- Pattern: Always copy the human-readable value into the transactional row at write time rather than joining live at read time.
- Purpose: Per-order human-readable audit trail distinct from the system-wide `audit_log`.
- Examples: `OrderActivityLog` entity (`apps/api/src/modules/orders/entities/order-activity-log.entity.ts`), `writeActivity()` private method.
- Pattern: Best-effort insert, post-commit, failures logged but never surfaced to the caller.
- Purpose: Every thrown `HttpException` carries a machine-readable `code` (e.g. `CONFLICT`, `NOT_FOUND`, `TABLE_KIOTVIET_LOCKED`) plus a human Vietnamese `message`.
- Examples: throughout `orders.service.ts` (`throw new BadRequestException({ code: 'CONFLICT', message: '...' })`); consumed by `GlobalExceptionFilter` and `FRIENDLY_VN` map.
- Pattern: `ErrorCode` type shared via `@order/schemas` (`packages/schemas/src/errors.ts`) — new codes must be added there to stay type-safe on the FE.

## Entry Points

- Location: `apps/api/src/main.ts`
- Triggers: `pnpm --filter @order/api dev` (swc-node watch) or `node dist/main.js` in production.
- Responsibilities: Nest app bootstrap, static asset serving (`/uploads/*` → `apps/api/uploads/`), production SPA serving + fallback (`web-dist` mounted, Accept-header-based routing between SPA shell and API JSON), body parser limits (10MB), Swagger (`/api/docs`, dev only), global pipes/filters, port from `API_PORT` env (default 3001).
- Location: `apps/api/src/cli/*.ts` (`seed-owner.ts`, `seed-menu-tables.ts`, `cron-audit-retention.ts`, `cron-jti-cleanup.ts`)
- Triggers: `pnpm cron:audit-retention`, `pnpm cron:jti-cleanup`, `pnpm seed:owner`, `pnpm seed:demo` (root `package.json` scripts, each `pnpm --filter @order/api`).
- Responsibilities: Each script independently calls `AppDataSource.initialize()` (raw TypeORM, not Nest DI), performs its task, then `AppDataSource.destroy()`. Not scheduled internally — external cron/scheduler must invoke them (nothing in-repo triggers these on a timer).
- Location: `apps/web/src/main.tsx` → `App.tsx`
- Triggers: `pnpm --filter @order/web dev` (Vite dev server, port 5173, proxies 9 path prefixes to API at `localhost:3001`).
- Responsibilities: Staff-facing router with `AuthProvider`, role-gated routes (`admin`/`order`/`kitchen`), bottom nav per role.
- Location: `apps/shop/src/main.tsx`
- Triggers: `pnpm --filter @order/shop dev` (Vite dev server, port 5174, proxies only `/api` and `/uploads`).
- Responsibilities: Currently a placeholder root render ("Trang khách đang được dựng — phase 07"); page components exist (`CartPage`, `CheckoutPage`, `HistoryPage`, `OrderTrackPage`) but are not yet wired into a router — see `docs/MILESTONE-02-ONLINE-ORDERING-SPEC.md` for the target build-out.

## Architectural Constraints

- **Threading:** Single-threaded Node event loop per app (no worker_threads, no cluster mode observed). Concurrency correctness for the order flow depends entirely on MySQL row locks (`pessimistic_write`), not in-process mutexes.
- **Global state:** `apps/api/src/modules/public/public.controller.ts` keeps a module-level `start_at = Date.now()` singleton for uptime reporting. `data-source.ts` exports a singleton `AppDataSource` used directly by CLI scripts (parallel to the Nest-managed `TypeOrmModule.forRoot()` instance used by the HTTP server — two separate DataSource instances exist in the process space depending on entry point).
- **No migrations:** `data-source.ts` sets `synchronize: true` and `migrations: ['src/migrations/*.ts']` but no migration files exist in the repo — schema changes happen by editing entity decorators and letting `synchronize` apply them directly to MySQL. Destructive column changes require manual care (no rollback path).
- **No shared UI component package:** `packages/ui` was explicitly rejected (see comment header in `packages/utils/src/index.ts`) — apps/web and apps/shop each own their UI code independently; only `@order/schemas` (types) and `@order/utils` (pure helpers) are shared.
- **Route prefix collision handling:** `main.ts` uses `Accept: text/html` header sniffing to disambiguate between "browser navigating to a client route that happens to share a path with an API route" (e.g. `/orders`) vs an actual API call — this is load-bearing for both apps/web (9 prefixes) and apps/shop (target: `/api/*` only) SPA fallback correctness. New API namespaces added under `/api/*` avoid this collision problem entirely (apps/shop's proxy config already narrows to `/api` + `/uploads` for this reason).

## Anti-Patterns

### Dual DataSource lifecycles

### Inline route-prefix allowlists

## Error Handling

- Domain errors carry a `code` from the shared `ErrorCode` union (`packages/schemas/src/errors.ts`) — always throw `new XException({ code: 'SOME_CODE', message: '...' })`, never a bare string.
- `class-validator` validation failures (400/422) are converted into `field_errors: [{ field, message }]` via regex extraction (`extractFieldFromMessage`) rather than left as raw string arrays.
- A `FRIENDLY_VN` lookup table overrides technical messages with user-facing Vietnamese text for known codes; unknown codes fall back to `'Lỗi không xác định'`/`'Internal server error'`.
- Transient DB errors (deadlock, lock wait timeout) are retried transparently at the service layer (`OrdersService.runWithRetry`) rather than surfaced as errors — only exhausted retries propagate.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| accessibility | Design, implement, and audit accessible UI to WCAG 2.2 Level AA across Web, iOS, and Android — semantic ARIA roles and labels, accessibility traits and hints, focus management, contrast, target size, and screen-reader support. Use when building or auditing UI for accessibility compliance, keyboard navigation, or screen-reader support. | `.claude/skills/accessibility/SKILL.md` |
| design-system | "Generate a design system from an existing codebase or audit one for visual consistency: extract tokens (colors, typography, spacing, shadows) into design-tokens.json and CSS custom properties with DESIGN.md rationale and an interactive HTML preview, score the UI across 10 dimensions, and flag AI-slop patterns. Use when starting a design system, auditing visual consistency before a redesign, or reviewing a PR that touches styling." | `.claude/skills/design-system/SKILL.md` |
| frontend-a11y | Accessibility patterns for React and Next.js — semantic HTML, ARIA attributes, form labeling, keyboard navigation, focus management, and screen reader support. Use when building or reviewing forms, modals, dropdowns, tooltips, or tabs, fixing a11y lint or code-review findings, or wiring up keyboard navigation and focus management. | `.claude/skills/frontend-a11y/SKILL.md` |
| frontend-design-direction | Set an ECC-specific frontend design direction for production UI work. Use when building or improving websites, dashboards, applications, components, landing pages, visual tools, or any web UI that needs stronger product-specific design judgment. | `.claude/skills/frontend-design-direction/SKILL.md` |
| frontend-patterns | Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices. Use when building or reviewing React or Next.js components, state, or render performance. | `.claude/skills/frontend-patterns/SKILL.md` |
| make-interfaces-feel-better | Apply concrete design-engineering details that make interfaces feel polished. Use when reviewing or improving UI spacing, typography, borders, shadows, motion, hit areas, icons, text wrapping, and interaction states. | `.claude/skills/make-interfaces-feel-better/SKILL.md` |
| react-patterns | React 18/19 patterns including hooks discipline, server/client component boundaries, Suspense + error boundaries, form actions, data fetching, state management decision trees, and accessibility-first composition. Use when writing or reviewing React components. | `.claude/skills/react-patterns/SKILL.md` |
| react-performance | React and Next.js performance optimization patterns adapted from Vercel Engineering's React Best Practices (https://github.com/vercel-labs/agent-skills). Organizes 70+ rules across 8 priority categories — waterfalls, bundle size, server-side, client fetching, re-render, rendering, JS micro-perf, advanced. Use when writing, reviewing, or refactoring React/Next.js code for performance. | `.claude/skills/react-performance/SKILL.md` |
| taste | Creative-direction layer for music videos and short-form edits in the angelcore / cloud-trance / hyperpop family — a named-genre aesthetic vocabulary, mood + color + light system, beat-synced editing grammar, and a pipeline chaining ECC's video skills from b-roll generation to distribution. Use when a video must feel intentional rather than merely functional — music videos, fancams, moodboard-driven reels, or giving AI-generated b-roll a coherent visual direction. | `.claude/skills/taste/SKILL.md` |
| taste-application | Generate new video against a distilled style pack and cut it into a finished piece - plan takes from the reference's cut rhythm, generate on fal, grade with the pack's measured LUT, cut at the measured cadence, weave in existing footage, composite overlay plates, mint 3D props, and verify the result numerically. Use when the user wants to make a video in a captured style, supplement existing footage, or assemble generated clips into a real edit. | `.claude/skills/taste-application/SKILL.md` |
| vite-patterns | Vite build tool patterns including config, plugins, HMR, env variables, proxy setup, SSR, library mode, dependency pre-bundling, and build optimization. Activate when working with vite.config.ts, Vite plugins, or Vite-based projects. | `.claude/skills/vite-patterns/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
