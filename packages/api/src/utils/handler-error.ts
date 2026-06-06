import type { Context } from 'koa';

// fallow-ignore-next-line complexity
export function handleHandlerError(ctx: Context, error: unknown): void {
    const err = error as { status?: number; message?: string } | null;

    ctx.status = err?.status ?? 500;
    ctx.body = { error: err?.message ?? 'Internal Server Error' };
}
