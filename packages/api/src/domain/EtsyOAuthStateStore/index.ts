interface PendingOAuthState {
    userId: string;
    codeVerifier: string;
    expiresAt: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class EtsyOAuthStateStore {
    private readonly states = new Map<string, PendingOAuthState>();

    constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

    save(state: string, data: { userId: string; codeVerifier: string }): void {
        this.states.set(state, { ...data, expiresAt: Date.now() + this.ttlMs });
    }

    consume(state: string): { userId: string; codeVerifier: string } | null {
        const entry = this.states.get(state);
        this.states.delete(state);

        if (!entry || entry.expiresAt < Date.now()) return null;

        return { userId: entry.userId, codeVerifier: entry.codeVerifier };
    }
}
