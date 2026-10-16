#!/usr/bin/env bun
// fallow-ignore-file unused-file
// CLI: import an Etsy Listings CSV into the running etsy-mock.
//
//   bun packages/etsy-mock/scripts/import-listings.ts <path-to-csv> [--state=active] [--taxonomy-id=1200] [--mock-url=...] [--shop-name=...] [--shop-id=...]
//
// Reads the CSV, looks up the target shop on the mock, and POSTs to
// /__mock/import-listings. Prints the resulting summary.

import { buildParams, postCsv, printSummary, readFlag, resolveShop } from './import-csv-shared';

const argv = process.argv.slice(2);
const file = argv[0];
if (!file) {
    console.error(
        'usage: import-listings.ts <path-to-csv> [--state=...] [--taxonomy-id=...] [--mock-url=...] [--shop-name=...] [--shop-id=...]'
    );
    process.exit(2);
}

const flag = readFlag(argv);
const state = flag('state') ?? process.env.STATE;
const taxonomyId = Number(flag('taxonomy-id') ?? process.env.TAXONOMY_ID ?? '0') || undefined;
const csv = await Bun.file(file).text();
const { mockUrl, shopId } = await resolveShop(argv);

const params = buildParams(shopId, {
    ...(state ? { state } : {}),
    ...(taxonomyId ? { taxonomyId: String(taxonomyId) } : {}),
});

const summary = await postCsv(mockUrl, 'import-listings', csv, params);
printSummary('listings', shopId, summary);
