import { Hono } from 'hono';

export * from './fixtures';
export * from './store';

// Placeholder app factory; the full Bun.serve / route wiring lands in the
// next task alongside `app.ts` and `routes/`.
export const createMockAppPlaceholder = () => new Hono();
