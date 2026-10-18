import { expect, test } from '@playwright/test';

// @smoke — runs post-deploy against production. Verifies that scanner
// probes (dotfiles and server-side extensions) get a real 404 instead
// of the SPA shell. Without this, a 200-on-/wp-login.php floods the
// request count and tricks crawler-based scanners into thinking the
// service runs WordPress.
test.describe('@smoke nginx scanner probes', () => {
    test.describe('nginx-only 404 rules', () => {
        // These rules live in packages/web/nginx.conf. PR e2e serves the app with the
        // Vite dev server, whose SPA fallback returns 200 for every path, so they can
        // only be checked against a deployed (nginx-served) target.
        test.skip(
            !process.env.E2E_BASE_URL && !process.env.STAGING_BASE_URL,
            'needs an nginx-served target (E2E_BASE_URL / STAGING_BASE_URL)'
        );

        test('dotfile probes return 404', async ({ request }) => {
            for (const path of ['/.env', '/.git/HEAD', '/.htaccess']) {
                const res = await request.get(path, { maxRedirects: 0 });
                expect(res.status(), `${path} should be 404`).toBe(404);
            }
        });

        test('server-side extension probes return 404', async ({ request }) => {
            for (const path of ['/wp-login.php', '/xmlrpc.php', '/admin.asp']) {
                const res = await request.get(path, { maxRedirects: 0 });
                expect(res.status(), `${path} should be 404`).toBe(404);
            }
        });

        // /manifest.webmanifest is the real PWA manifest (nginx serves it if present), so it's not probed here.
        test('unknown manifest paths return 404', async ({ request }) => {
            for (const path of ['/sitemap.xml', '/favicon.ico', '/apple-touch-icon.png']) {
                const res = await request.get(path, { maxRedirects: 0 });
                expect(res.status(), `${path} should be 404`).toBe(404);
            }
        });
    });

    test('client-side routes still deep-link (SPA shell returns 200)', async ({ request }) => {
        for (const path of ['/', '/designs/abc123', '/board', '/home']) {
            const res = await request.get(path, { maxRedirects: 0 });
            expect(res.status(), `${path} should be 200`).toBe(200);
            // The SPA shell is index.html; a server-extension path would not match.
            expect(res.headers()['content-type'] ?? '').toContain('text/html');
        }
    });
});
