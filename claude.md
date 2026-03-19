# Jewellery Catalogue - Claude Code Context

## Project Overview

Jewellery Catalogue is a modern full-stack application for browsing and managing jewelry collections. It features a React web frontend for customers and administrators, a Koa-based REST API backend, MongoDB for data persistence, and MinIO for image storage.

## Tech Stack & Key Technologies

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7 (stays with Vite, not replaced by Bun)
- **Styling**: TailwindCSS 4 with @tailwindcss/vite
- **Form Management**: React Hook Form with Zod validation
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Router**: React Router 7
- **Testing**: Playwright E2E tests
- **Package Manager**: Bun 1 (for dependency installation)

### Backend API
- **Runtime/Package Manager**: Bun 1 (replaces Node.js + Yarn)
- **Framework**: Koa 3 with TypeScript
- **Database Driver**: MongoDB native driver (v6.13)
- **Object Storage**: MinIO client (v8)
- **Build Tool**: `bun build` (replaces tsup)
- **Testing**: Bun test (replaces vitest)
- **Utilities**: @imapps/api-utils (0.5.1)

### Development & Infrastructure
- **Monorepo**: Bun workspaces (replaces Yarn workspaces)
- **Linting**: Biome 2.2.5 (strict TypeScript, formatting, a11y rules)
- **Git Hooks**: Husky + lint-staged for pre-commit checks
- **Release**: Semantic Release for automated versioning
- **CI/CD**: GitHub Actions with:
  - Semgrep security scanning (security-audit, TypeScript, OWASP Top 10)
  - Dedicated PR workflow (lint → test → semgrep)
  - Main branch workflow (lint → semgrep → test → release → build-publish)
- **Container Registry**: GitHub Container Registry (ghcr.io)
- **Dockerization**: oven/bun:1-alpine for API, nginx:alpine for web

## Recent Bun Migration (v1.14.0+)

The project was migrated from Yarn Berry 4.9.2 to Bun 1 to simplify the toolchain and improve development experience.

### What Changed
1. **Package Manager**: Replaced `yarn install --immutable` with `bun install --frozen-lockfile`
2. **Workspace Commands**: `yarn workspace` → `bun --filter`
3. **API Dev Server**: `vite-node` → `bun --watch src/index.ts`
4. **API Build**: `tsup` → `bun build src/index.ts --target bun --minify`
5. **Testing**: `vitest` → `bun test`
6. **ESM Only**: Changed `type: "commonjs"` → `"type": "module"` in API package.json
7. **Docker Base**: Updated to `oven/bun:1-alpine`

### Configuration Files
- **bunfig.toml** (root): Test setup preload configuration
- **biome.json**: Inlined configuration (previously extended @imapps/biome-config/base)

### Test Migration Details
- Replaced 13 test files from vitest to bun:test
- `vi.fn()` → `mock()` from 'bun:test'
- `vi.mock()` → `mock.module()` with factory functions
- `vi.clearAllMocks()` → `jest.clearAllMocks()` (bun:test exports jest API)
- All 127 API tests passing

### Known Limitations & Workarounds
1. **Submodule Configuration Conflict**:
   - `.github/workflows-utils` is an external submodule with biome.json referencing invalid package
   - Workaround: CI/CD workflows use `submodules: false` in checkout to avoid loading conflicting config
   - Root biome.json excludes submodule with override rules

2. **Pre-existing Code Style Issues**:
   - API code has `as any` casts in dependency injection (DI container setup)
   - Web components use non-null assertions (`!`) and hardcoded element IDs
   - biome.json overrides suppress these with warnings off (not errors) for packages/api and packages/web
   - These are architectural (intentional for DI patterns) not bugs

## Project Structure

```
jewellery-catalogue/
├── packages/
│   ├── api/                     # Koa REST API
│   │   ├── src/
│   │   │   ├── index.ts         # Express-like setup, MongoDB/MinIO init
│   │   │   ├── dependencies/    # Dependency injection container setup
│   │   │   ├── domain/          # Business logic (services for materials, designs)
│   │   │   │   ├── DesignService.ts
│   │   │   │   ├── MaterialService.ts
│   │   │   │   └── ImageService.ts
│   │   │   ├── handlers/        # Route handlers
│   │   │   │   ├── Design/      # Design CRUD & bulk operations
│   │   │   │   ├── Material/    # Material CRUD
│   │   │   │   └── Image/       # Image upload
│   │   │   ├── repositories/    # MongoDB data access layer
│   │   │   ├── **/*.test.ts     # Bun test files
│   │   │   └── test-setup.ts    # Test environment init (loaded by bunfig.toml)
│   │   ├── Dockerfile          # oven/bun:1-alpine based
│   │   ├── package.json         # Scripts use bun build, bun test
│   │   └── tsconfig.json
│   ├── web/                     # React 19 frontend
│   │   ├── src/
│   │   │   ├── components/      # React components (AppSidebar, LoginForm, etc)
│   │   │   ├── pages/           # Route pages
│   │   │   ├── api/             # API client (makeRequest, hooks)
│   │   │   └── test/            # Playwright E2E tests (pw:e2e)
│   │   ├── Dockerfile          # Nginx + static build
│   │   ├── package.json         # Scripts use Vite, Playwright
│   │   ├── playwright.config.ts
│   │   └── vite.config.ts
│   └── types/                   # Shared TypeScript interfaces
├── .github/
│   ├── workflows/
│   │   ├── ci-cd.yml           # Main branch: lint → semgrep → test → release → docker build
│   │   └── pull-request.yml    # PR checks: lint → test → semgrep
│   └── workflows-utils/        # Git submodule (external, biome conflicts handled)
├── bunfig.toml                 # Bun config: @imapps npm scope + test preload
├── biome.json                  # Linting rules (inlined from @imapps/biome-config/base)
├── package.json                # Root workspace with scripts using bun --filter
├── .releaserc.json             # Semantic Release config (updates all package.json versions)
├── tsconfig.json               # Strict TypeScript settings
└── README.md                   # Setup & development guide

```

## API Architecture

### Dependency Injection
- **DependencyContainer**: Custom lightweight DI system (from @imapps/api-utils)
- Registered Singletons: Logger, MongoDB connection, MinIO connection
- Registered Factories: Repositories, Services, Stores
- Injection via `dependencyContainer.resolve(token)`

### Data Models
- **Design**: Jewelry design with materials, costs, price
- **Material**: Polymorphic (Wire, Bead, Chain, EarHook) with quantity/length tracking
- **Image**: Uploaded design images stored in MinIO

### Key Handlers
- `POST /design` - Create design with materials
- `PUT /design/{id}` - Update design (merges material arrays, prevents duplicates)
- `DELETE /design/{id}` - Remove design
- `POST /image` - Upload image to MinIO
- `GET /material` - List all materials (with stock level calculations)

## Frontend Architecture

### Pages & Workflows
- **Login**: Form submission to mock auth server or real API
- **Dashboard**: Lists designs (with filtering, search)
- **Design Editor**: Form with dynamic material fields (wire/bead/etc selectors)
- **Material Manager**: Bulk upload, inventory tracking, low-stock alerts
- **Image Upload**: Drag-drop or file picker integration

### Key Components
- **AppSidebar**: Navigation with mobile/desktop modes
- **DesignForm**: React Hook Form with Zod validation
- **MaterialTable**: Data grid with filtering, pagination
- **LoginForm**: Auth form with password visibility toggle

### Data Fetching
- React Query for server state
- Custom API client in `packages/web/src/api/makeRequest`
- Token management via localStorage
- Request interceptor for authentication headers

## Development Standards

### Code Style
- **Linting**: Biome (strict) - enforced via lint-staged pre-commit
- **Formatting**: Single quotes, 4-space indent, 120 line width
- **TypeScript**: Strict mode, no explicit any (suppressed in select files)
- **Testing**: Bun test for API, Playwright for E2E

### Git Workflow
- **Commits**: Conventional commits (feat:, fix:, chore:, ci:)
- **Branching**: Feature branches from main, PRs with CI checks
- **Releases**: Semantic versioning via Semantic Release (automated)
- **Hooks**: Husky pre-commit runs biome lint-staged

### Testing Requirements
- **API**: Unit tests for services, repositories, handlers (127 passing)
- **E2E**: Playwright tests for critical workflows (login, design creation, etc)
- **CI**: All checks must pass before merge

## Testing Credentials (Development Only)

For auth testing during local development:
- **Username**: test
- **Password**: testing123

For mock auth server: Use `bun start:web:with-mock` to run local auth endpoint on port 3001.

## Environment Variables

### API (`packages/api/.env`)
```env
PORT=4001
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/jewellery-catalogue
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=jewellery-catalogue
```

### Web (`packages/web/.env`)
```env
VITE_API_URL=http://localhost:4001
VITE_AUTH_URL=http://localhost:3001
```

### CI/CD Secrets
- `GH_TOKEN`: GitHub token for @imapps npm registry, semantic-release, git operations
- `GITHUB_TOKEN`: Auto-provided by GitHub Actions

## Useful Commands

```bash
# Development
bun install                                      # Install deps
bun start                                        # Start both API & web
bun start:web:with-mock                         # Web + local auth
bun --filter @jewellery-catalogue/api start     # API only

# Linting & Formatting
bun lint                                         # Check code style
bun lint:fix                                     # Auto-fix issues
bun format                                       # Format with Biome

# Testing
bun --filter @jewellery-catalogue/api test      # Run all API tests
bun --filter @jewellery-catalogue/web pw:e2e   # Run E2E tests
bun --filter @jewellery-catalogue/api test:coverage  # With coverage

# Building
bun --filter @jewellery-catalogue/api build     # Build API for production
bun --filter @jewellery-catalogue/web build     # Build web static files

# Git & Releases (automated by CI)
bun x semantic-release                          # Manual release (normally CI only)
```

## Common Issues & Solutions

### Tests Failing with "Cannot find module"
**Problem**: Tests can't resolve bun:test mocks
**Solution**:
1. Check `packages/api/src/test-setup.ts` exists
2. Verify `bunfig.toml` test preload path is correct
3. Clear: `rm -rf node_modules bun.lockb` and `bun install`

### Biome Configuration Errors
**Problem**: "Failed to resolve configuration from @imapps/biome-config/base"
**Solution**:
1. CI workflows have `submodules: false` to prevent submodule config loading
2. Root biome.json is inlined (not using extends)
3. Run `biome migrate --write` to validate config

### Bun vs Node Differences
- Bun has its own test API (compatible with Jest)
- `import.meta.env` for environment variables (not `process.env` in web)
- Bun doesn't support CJS natively (API uses ESM only)
- Bun lockfile: `bun.lockb` (binary, not checked in; regenerate via `bun install`)

## Next Steps & Future Improvements

1. **Migrate Dockerfiles**: Old `Dockerfile.api` and `Dockerfile.web` at root should be removed (using packages/api/Dockerfile and packages/web/Dockerfile instead)
2. **Add .env.example**: Create example files for local setup
3. **Expand E2E Tests**: Add more Playwright coverage for design workflows
4. **Performance**: Profile API startup with `bun --import-profile`
5. **Type Safety**: Consider strict null checks in web components (useSemanticElements warnings)

## Deployment

### Docker Build (Local)
```bash
docker build -f packages/api/Dockerfile \
  --secret id=CI_JOB_TOKEN=<token> \
  -t ghcr.io/igor-siergiej/jewellery-api:latest .

docker build -f packages/web/Dockerfile \
  --secret id=CI_JOB_TOKEN=<token> \
  -t ghcr.io/igor-siergiej/jewellery-web:latest .
```

### Automated Deployment (CI)
- GitHub Actions `build-publish` job triggers on main branch after release
- Builds images with `oven/bun` and `nginx` base layers
- Pushes to GitHub Container Registry (ghcr.io)
- Uses public npm packages (@imapps packages from public npm registry)
- Updates Kubernetes manifests via GitOps (if configured)

## Related Services & Repositories

- **@imapps/api-utils**: Backend utility library (MongoDB, MinIO, logging, DI)
- **@imapps/web-utils**: Frontend utility library (class names, browser detection, math)
- **@imapps/biome-config**: Shared linting configuration
- **im-apps-utils**: Monorepo containing the above packages (published to GitHub Packages)

See `.github/workflows-utils/CLAUDE.md` for utilities submodule context.
