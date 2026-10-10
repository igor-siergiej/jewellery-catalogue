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
export const MOCK_TOKEN_STOCK_QUANTITY = makeMockToken('68c6f0f5b97c946129015124'); // design-stock-quantity.spec
export const MOCK_TOKEN_BOARD_FAVOURITE = makeMockToken('68c6f0f5b97c946129015125'); // board-favourite.spec
export const MOCK_TOKEN_EDIT_GOAL = makeMockToken('68c6f0f5b97c946129015126'); // board-edit-goal.spec
export const MOCK_TOKEN_GOAL_DATE = makeMockToken('68c6f0f5b97c946129015127'); // board-goal-date.spec
export const MOCK_TOKEN_EDIT_TASK = makeMockToken('68c6f0f5b97c946129015128'); // board-edit-task.spec
export const MOCK_TOKEN_TASK_DESCRIPTION = makeMockToken('68c6f0f5b97c946129015129'); // board-task-description.spec
export const MOCK_TOKEN_DESIGN_FAVOURITE = makeMockToken('68c6f0f5b97c94612901512a'); // design-favourite.spec
export const MOCK_TOKEN_GOAL_FAVOURITE = makeMockToken('68c6f0f5b97c94612901512b'); // board-goal-favourite.spec
export const MOCK_TOKEN_CATALOGUE_ONLY = makeMockToken('68c6f0f5b97c94612901512c'); // catalogue-only-design.spec
export const MOCK_TOKEN_TASK_CHECKLIST = makeMockToken('68c6f0f5b97c94612901512d'); // board-task-checklist.spec
export const MOCK_TOKEN_ETSY_LISTING_COPY = makeMockToken('68c6f0f5b97c94612901512e'); // etsy-listing-copy.spec

// Visual specs run once per visual project, so each project gets its own user to keep parallel workers isolated
export const MOCK_TOKEN_VISUAL_START_MOBILE = makeMockToken('68c6f0f5b97c946129015130'); // start.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_START_DESKTOP = makeMockToken('68c6f0f5b97c946129015131'); // start.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_HOME_MOBILE = makeMockToken('68c6f0f5b97c946129015132'); // home.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_HOME_DESKTOP = makeMockToken('68c6f0f5b97c946129015133'); // home.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_DESIGNS_MOBILE = makeMockToken('68c6f0f5b97c946129015134'); // designs.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_DESIGNS_DESKTOP = makeMockToken('68c6f0f5b97c946129015135'); // designs.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_VIEW_DESIGN_MOBILE = makeMockToken('68c6f0f5b97c946129015136'); // view_design.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_VIEW_DESIGN_DESKTOP = makeMockToken('68c6f0f5b97c946129015137'); // view_design.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_ADD_DESIGN_MOBILE = makeMockToken('68c6f0f5b97c946129015138'); // add_design.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_ADD_DESIGN_DESKTOP = makeMockToken('68c6f0f5b97c946129015139'); // add_design.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_MATERIALS_MOBILE = makeMockToken('68c6f0f5b97c94612901513a'); // materials.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_MATERIALS_DESKTOP = makeMockToken('68c6f0f5b97c94612901513b'); // materials.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_ADD_MATERIAL_MOBILE = makeMockToken('68c6f0f5b97c94612901513c'); // add_material.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_ADD_MATERIAL_DESKTOP = makeMockToken('68c6f0f5b97c94612901513d'); // add_material.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_LISTINGS_MOBILE = makeMockToken('68c6f0f5b97c94612901513e'); // listings.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_LISTINGS_DESKTOP = makeMockToken('68c6f0f5b97c94612901513f'); // listings.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_BOARD_MOBILE = makeMockToken('68c6f0f5b97c946129015140'); // board.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_BOARD_DESKTOP = makeMockToken('68c6f0f5b97c946129015141'); // board.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_SETTINGS_MOBILE = makeMockToken('68c6f0f5b97c946129015142'); // settings.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_SETTINGS_DESKTOP = makeMockToken('68c6f0f5b97c946129015143'); // settings.visual.spec (desktop)
export const MOCK_TOKEN_VISUAL_SALES_MOBILE = makeMockToken('68c6f0f5b97c946129015144'); // sales-dashboard.visual.spec (mobile)
export const MOCK_TOKEN_VISUAL_SALES_DESKTOP = makeMockToken('68c6f0f5b97c946129015145'); // sales-dashboard.visual.spec (desktop)
export const MOCK_TOKEN_SIDEBAR_MOBILE = makeMockToken('68c6f0f5b97c946129015150'); // sidebar-mobile.spec
export const MOCK_TOKEN_SALES_DASHBOARD = makeMockToken('68c6f0f5b97c946129015151'); // sales-dashboard.spec
export const MOCK_TOKEN_PRODUCTION_PLAN = makeMockToken('68c6f0f5b97c946129015152'); // production-plan.spec

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
