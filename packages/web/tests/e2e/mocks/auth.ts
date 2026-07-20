import type { Page } from '@playwright/test';

const makePart = (obj: object | string) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64');

export function makeMockToken(userId: string, username = 'testuser'): string {
    return [
        makePart({ alg: 'HS256', typ: 'JWT' }),
        makePart({ username, id: userId, catalogueId: `${userId.slice(0, -1)}7`, exp: 9999999999, iat: 1700000000 }),
        makePart('mock-signature'),
    ].join('.');
}

// Per-spec isolated userIds — each spec file uses its own so parallel workers don't share state
export const MOCK_TOKEN = makeMockToken('68c6f0f5b97c946129015116'); // materials-designs.spec
export const MOCK_TOKEN_MATERIALS_CRUD = makeMockToken('68c6f0f5b97c946129015119'); // materials-crud.spec
export const MOCK_TOKEN_DESIGN_INVENTORY = makeMockToken('68c6f0f5b97c946129015120'); // design-inventory.spec
export const MOCK_TOKEN_LISTINGS = makeMockToken('68c6f0f5b97c946129015121'); // listings.spec
export const MOCK_TOKEN_DESIGN_ETSY_IMAGE = makeMockToken('68c6f0f5b97c946129015122'); // design-etsy-image.spec
export const MOCK_TOKEN_DESIGN_EDIT_NO_PUSH = makeMockToken('68c6f0f5b97c946129015123'); // design-edit-no-etsy-push.spec

export const MOCK_USER = { id: '68c6f0f5b97c946129015116', username: 'testuser' };

export async function mockAuthRoutes(page: Page, token = MOCK_TOKEN) {
    const authBase = 'http://localhost:3008';
    const user = { id: 'testuser', username: 'testuser' };

    await page.route(`${authBase}/login`, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: token, user }),
        })
    );

    await page.route(`${authBase}/register`, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: token, user }),
        })
    );

    await page.route(`${authBase}/refresh`, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ accessToken: token }),
        })
    );

    await page.route(`${authBase}/logout`, (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Logout successful' }),
        })
    );
}
