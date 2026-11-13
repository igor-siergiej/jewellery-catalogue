import type { Page } from '@playwright/test';

/** A row of the materials ledger, whichever tab is open. */
export const materialRow = (page: Page, name: string) =>
    page.getByRole('tabpanel').getByRole('row', { name: new RegExp(name) });

export async function openMaterialMenu(page: Page, name: string) {
    await page.getByRole('button', { name: `More actions for ${name}` }).click();
}

export async function chooseMaterialAction(page: Page, name: string, action: 'Buy' | 'Edit' | 'Delete') {
    await openMaterialMenu(page, name);
    await page.getByRole('menuitem', { name: action }).click();
}
