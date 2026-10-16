#!/usr/bin/env bun
// fallow-ignore-file unused-file
// CLI: import an Etsy Sold Orders CSV into the running etsy-mock.
//
//   bun packages/etsy-mock/scripts/import-receipts.ts <path-to-csv> [--mock-url=...] [--shop-name=...] [--shop-id=...]
//
// Each row is one order; the script POSTs the CSV to /__mock/import-receipts
// which writes one MockReceipt per row, keyed by the Order ID.

import { buildParams, postCsv, printSummary, resolveShop } from './import-csv-shared';

const argv = process.argv.slice(2);
const file = argv[0];
if (!file) {
    console.error('usage: import-receipts.ts <path-to-csv> [--mock-url=...] [--shop-name=...] [--shop-id=...]');
    process.exit(2);
}

const csv = await Bun.file(file).text();
const { mockUrl, shopId } = await resolveShop(argv);

const params = buildParams(shopId);

const summary = await postCsv(mockUrl, 'import-receipts', csv, params);
printSummary('receipts', shopId, summary);
