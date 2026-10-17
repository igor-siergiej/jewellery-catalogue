import { expect, test } from '@playwright/test';

// @smoke — runs post-deploy against production. Verifies that scanner
// probes (dotfiles and server-side extensions) get a real 404 instead
// of the SPA shell. Without this, a 200-on-/wp-login.php floods the
// request count and tricks crawler-based scanners into thinking the
// service runs WordPress.
test.describe('@smoke nginx scanner probes', () => {
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

    test('unknown manifest paths return 404', async ({ request }) => {
        for (const path of ['/sitemap.xml', '/favicon.ico', '/apple-touch-icon.png', '/manifest.webmanifest']) {
            const res = await request.get(path, { maxRedirects: 0 });
            expect(res.status(), `${path} should be 404`).toBe(404);
        }
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
