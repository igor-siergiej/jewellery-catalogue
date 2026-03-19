# Jewellery Catalogue

A modern jewellery catalogue application for browsing and managing jewellery collections. Built with React (frontend), Koa (API), MongoDB, and MinIO.

## Tech Stack

- **Frontend**: React 19 with Vite, TypeScript, TailwindCSS
- **Backend API**: Koa 3, TypeScript, Bun
- **Database**: MongoDB
- **Storage**: MinIO (object storage)
- **Package Manager**: Bun 1
- **Linting**: Biome 2.2.5
- **Testing**: Bun test (API), Playwright (E2E)
- **CI/CD**: GitHub Actions with Semgrep security scanning

## Prerequisites

- **Bun 1+** - JavaScript runtime and package manager
- **Node.js 22+** - Required for some tooling (optional if using Bun)
- **MongoDB** - Local instance or cloud (Atlas)
- **MinIO** - Object storage for images
- **.env file** - Configuration (see [.env.example](.env.example))

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

All npm packages (@imapps/* utilities) are published to the public npm registry.

### 2. Setup Environment

Copy `.env.example` and configure:
```bash
cp packages/api/.env.example packages/api/.env
```

### 3. Start Development Servers

**Both API and Web (concurrently):**
```bash
bun start
```

**Web only (with mock auth):**
```bash
bun start:web:with-mock
```

**API only (watch mode):**
```bash
bun start:api
```

**Web only (Vite dev server):**
```bash
bun start:web
```

## Development

### Linting & Formatting

```bash
bun lint          # Check for linting issues
bun lint:fix      # Auto-fix issues
bun format        # Format code with Biome
```

### Type Checking

```bash
bun tsc --noEmit
```

### Testing

**API tests (Bun test):**
```bash
bun --filter @jewellery-catalogue/api test
```

**With coverage:**
```bash
bun --filter @jewellery-catalogue/api test:coverage
```

**E2E tests (Playwright):**
```bash
cd packages/web
bun pw:e2e              # Run all E2E tests
bun pw:e2e:headed      # Run with visible browser
bun pw:e2e:debug       # Debug mode
bun pw:open            # Interactive test UI
```

### Building

**API (Bun build):**
```bash
bun --filter @jewellery-catalogue/api build
```
Outputs optimized bundle to `packages/api/build/index.js`

**Web (Vite build):**
```bash
bun --filter @jewellery-catalogue/web build
```
Outputs static site to `packages/web/build/`

## Project Structure

```
.
├── packages/
│   ├── api/              # Koa API server
│   │   ├── src/
│   │   │   ├── handlers/   # API route handlers
│   │   │   ├── domain/     # Business logic
│   │   │   ├── repositories/ # Data access
│   │   │   └── dependencies/ # DI container setup
│   │   ├── Dockerfile    # Bun-based API container
│   │   └── package.json
│   ├── web/              # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── api/      # API client
│   │   ├── Dockerfile    # Nginx + static build
│   │   └── package.json
│   └── types/            # Shared TypeScript types
├── bunfig.toml          # Bun configuration
├── biome.json           # Linting/formatting rules
└── .github/workflows/   # CI/CD pipelines
```

## Bun Migration Notes

This project was migrated from Yarn to Bun for package management and runtime. Key changes:

- **Package Manager**: `yarn` → `bun`
- **Script Filtering**: `yarn workspace` → `bun --filter`
- **API Dev Server**: `vite-node` → `bun --watch`
- **API Build**: `tsup` → `bun build`
- **Testing**: `vitest` → `bun test`
- **Docker**: Uses `oven/bun:1-alpine` base image

The web frontend still uses Vite for development (Bun doesn't replace Vite for frontend).

## Environment Variables

### API Server (`packages/api/.env`)

```env
PORT=4001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/jewellery-catalogue

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=jewellery-catalogue
```

### Web App (`packages/web/.env`)

```env
VITE_API_URL=http://localhost:4001
VITE_AUTH_URL=http://localhost:3001
```

## Docker

### Build Images

**API (Bun-based):**
```bash
docker build -f packages/api/Dockerfile \
  --secret id=CI_JOB_TOKEN=<github-token> \
  -t jewellery-api:latest .
```

**Web (Nginx + static):**
```bash
docker build -f packages/web/Dockerfile \
  --secret id=CI_JOB_TOKEN=<github-token> \
  -t jewellery-web:latest .
```

### Run Containers

```bash
# API (port 4001)
docker run -p 4001:4001 jewellery-api:latest

# Web (port 3000)
docker run -p 3000:80 jewellery-web:latest
```

## CI/CD

GitHub Actions workflows handle:
- **Linting** - Biome code style checks
- **Type Checking** - TypeScript strict mode
- **Testing** - Bun test suite
- **Security Scanning** - Semgrep (security-audit, TypeScript, OWASP rules)
- **Release** - Semantic versioning and NPM publishing

## Troubleshooting

### Tests Failing with Mock Issues

The API uses `bun:test` with `mock()` for module mocking. If tests fail:

1. Ensure `packages/api/src/test-setup.ts` is properly configured
2. Check `bunfig.toml` has correct test preload path
3. Run `bun --filter @jewellery-catalogue/api test` with verbose output

### Biome Configuration Errors

If linting fails with configuration errors:

1. Verify `biome.json` is valid (use `biome migrate --write`)
2. Ensure `@imapps/biome-config` is installed (`bun install`)
3. GitHub Actions workflows disable submodule checkout to avoid config conflicts

## Development Tips

- Use `bun install --no-cache` to refresh dependencies if seeing stale packages
- `bun run` automatically respects `.env` files in the workspace
- Watch mode: `bun --watch src/index.ts` for TypeScript files
- Filter by workspace: `bun --filter @jewellery-catalogue/api <script>`

## License

See LICENSE file for details.
