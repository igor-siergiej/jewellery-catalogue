import { createEtsyMockApp } from './app';
import { MockStore } from './store';

const port = Number(process.env.PORT ?? 3010);
const publicUrl = process.env.ETSY_MOCK_PUBLIC_URL ?? `http://localhost:${port}`;
const store = new MockStore(Number(process.env.ETSY_MOCK_TOKEN_TTL ?? 3600));

Bun.serve({ port, fetch: createEtsyMockApp({ store, publicUrl }).fetch });
console.log(`Etsy mock running on ${publicUrl}`);
