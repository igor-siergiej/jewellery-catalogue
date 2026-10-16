import { getStorageItem } from '@imapps/web-utils';

import { getAuthConfig } from '../authConfig';

// Ships browser log lines to POST /api/logs, which writes them to the API's stdout for promtail → Loki.
// The endpoint needs a logged-in user, so lines logged with no access token are dropped.

type LogLevel = 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

interface LogEntry {
    level: LogLevel;
    message: string;
    context?: LogContext;
    url: string;
    timestamp: string;
}

const ENDPOINT = '/api/logs';
// Both match the API's limits in packages/api/src/handlers/Log.
const MAX_BATCH = 20;
const MAX_LINES_PER_MINUTE = 120;
const FLUSH_DELAY_MS = 5000;
const MAX_STACK_CHARS = 2000;

let queue: LogEntry[] = [];
let flushTimer: number | undefined;
let budgetWindowStart = 0;
let linesInWindow = 0;

const readAccessToken = (): string | null => {
    try {
        const { accessTokenKey, storageType } = getAuthConfig();
        return getStorageItem(accessTokenKey!, storageType);
    } catch {
        // Config isn't loaded yet (startup failure); there is no session to log against.
        return null;
    }
};

const flush = (keepalive = false) => {
    window.clearTimeout(flushTimer);
    flushTimer = undefined;
    if (queue.length === 0) return;

    const logs = queue;
    queue = [];
    const accessToken = readAccessToken();
    if (!accessToken) return;

    // The queue never exceeds MAX_BATCH: enqueue flushes as soon as it reaches it.
    fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ logs }),
        keepalive,
    }).catch(() => {
        // The API is unreachable, so there is nowhere to report this.
    });
};

const enqueue = (level: LogLevel, message: string, context?: LogContext) => {
    if (import.meta.env.DEV) {
        console[level](`[${level}] ${message}`, context ?? {});
    }

    // A render loop can throw thousands of errors a second; keep the client under the API's budget.
    const now = Date.now();
    if (now - budgetWindowStart >= 60_000) {
        budgetWindowStart = now;
        linesInWindow = 0;
    }
    if (linesInWindow >= MAX_LINES_PER_MINUTE) return;
    linesInWindow++;

    queue.push({ level, message, context, url: window.location.href, timestamp: new Date().toISOString() });
    if (queue.length >= MAX_BATCH) {
        flush();
    } else {
        flushTimer ??= window.setTimeout(flush, FLUSH_DELAY_MS);
    }
};

export const logger = {
    info: (message: string, context?: LogContext) => enqueue('info', message, context),
    warn: (message: string, context?: LogContext) => enqueue('warn', message, context),
    error: (message: string, context?: LogContext) => enqueue('error', message, context),
};

export const errorContext = (error: unknown): LogContext =>
    error instanceof Error
        ? { error: error.message, name: error.name, stack: error.stack?.slice(0, MAX_STACK_CHARS) }
        : { error: String(error) };

// React 19 reports uncaught render errors through window.reportError, so the 'error' listener covers them too.
export const installGlobalErrorLogging = () => {
    window.addEventListener('error', (event) => {
        logger.error('Uncaught error', {
            ...errorContext(event.error ?? event.message),
            location: `${event.filename}:${event.lineno}:${event.colno}`,
        });
    });
    window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection', errorContext(event.reason));
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush(true);
    });
    window.addEventListener('pagehide', () => flush(true));
};
