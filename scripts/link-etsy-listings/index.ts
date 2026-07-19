// scripts/link-etsy-listings/index.ts
import { createInterface } from 'node:readline/promises';

import { MongoDbConnection } from '@imapps/api-utils';

import { config } from '../../packages/api/src/config';
import { CollectionNames, type Collections } from '../../packages/api/src/dependencies/types';
import { EtsyClient, type EtsyListingSummary } from '../../packages/api/src/domain/EtsyClient';
import { MongoDesignRepository } from '../../packages/api/src/infrastructure/MongoDesignRepository';
import type { Design } from '../../packages/types/src';
import {
    applyOverrides,
    buildSuggestions,
    formatSuggestionsTable,
    type LinkSuggestion,
    validateSuggestions,
} from './mappers';

const isDryRun = process.argv.includes('--dry-run');

async function promptOverrides(
    suggestions: LinkSuggestion[],
    listings: EtsyListingSummary[],
    rl: ReturnType<typeof createInterface>
): Promise<Record<string, number | null>> {
    const overrides: Record<string, number | null> = {};

    for (;;) {
        console.log(`\nProposed links:\n${formatSuggestionsTable(applyOverrides(suggestions, overrides, listings))}`);
        const answer = await rl.question('\nEnter a row number to edit, or press Enter to continue: ');
        if (answer.trim() === '') break;

        const rowIndex = Number(answer.trim());
        if (Number.isNaN(rowIndex) || !suggestions[rowIndex]) {
            console.log(`No such row: ${answer}`);
            continue;
        }

        const value = await rl.question(`  New listingId for "${suggestions[rowIndex].design.name}" (or "skip"): `);
        const trimmed = value.trim();
        if (trimmed.toLowerCase() === 'skip') {
            overrides[suggestions[rowIndex].design.id] = null;
            continue;
        }

        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
            console.log(`"${trimmed}" is not a valid listingId — enter a number or "skip".`);
            continue;
        }
        overrides[suggestions[rowIndex].design.id] = parsed;
    }

    return overrides;
}

async function main() {
    const database = new MongoDbConnection<Collections>();
    await database.connect({ connectionUri: config.get('connectionUri'), databaseName: config.get('databaseName') });

    await database
        .getCollection(CollectionNames.Designs)
        .createIndex({ 'etsy.listingId': 1 }, { unique: true, sparse: true });

    const designRepo = new MongoDesignRepository(database);
    const etsyClient = new EtsyClient(config.get('etsyApiKey'), config.get('etsySharedSecret'));

    const connection = await database
        .getCollection(CollectionNames.EtsyConnections)
        .findOne({}, { projection: { _id: 0 } });

    if (!connection) {
        console.error('No Etsy connection found — connect Etsy from the app Settings page first.');
        process.exit(1);
    }

    const [listings, designs] = await Promise.all([
        etsyClient.getShopListingsActive(connection.shopId),
        designRepo.getByUserId(connection.userId),
    ]);

    const unlinkedCount = designs.filter((d) => !d.etsy?.listingId).length;
    console.log(
        `Found ${listings.length} active Etsy listings and ${designs.length} designs (${unlinkedCount} unlinked).`
    );

    const initialSuggestions = buildSuggestions(designs, listings);

    if (initialSuggestions.length === 0) {
        console.log('No unlinked designs — nothing to do.');
        process.exit(0);
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const overrides = await promptOverrides(initialSuggestions, listings, rl);
    const finalSuggestions = applyOverrides(initialSuggestions, overrides, listings);

    const errors = validateSuggestions(finalSuggestions);
    if (errors.length > 0) {
        console.error('\nCannot proceed — validation errors:');
        for (const e of errors) console.error(`  - ${e}`);
        rl.close();
        process.exit(1);
    }

    const toLink = finalSuggestions.filter((s) => s.listingId !== null);
    console.log(`\nFinal plan:\n${formatSuggestionsTable(finalSuggestions)}`);

    if (isDryRun) {
        console.log(`\n[dry-run] Would link ${toLink.length} design(s). No changes written.`);
        rl.close();
        process.exit(0);
    }

    const confirmation = await rl.question(`\nWrite ${toLink.length} link(s) to the database? (y/N): `);
    rl.close();

    if (confirmation.trim().toLowerCase() !== 'y') {
        console.log('Aborted — no changes written.');
        process.exit(0);
    }

    for (const s of toLink) {
        const listingId = s.listingId as number;
        const updated: Design = { ...s.design, etsy: { listingId, state: 'active', lastPushedAt: null } };

        try {
            await designRepo.update(s.design.id, updated);
            console.log(`Linked "${s.design.name}" -> listing ${listingId}`);
        } catch (error) {
            console.error(`Failed to link "${s.design.name}" -> listing ${listingId}:`, error);
            console.error('Stopping — designs linked before this point were saved; rerun the script to resume.');
            process.exit(1);
        }
    }

    console.log(`\nDone — linked ${toLink.length} design(s).`);
    process.exit(0);
}

main().catch((error) => {
    console.error('link-etsy-listings failed:', error);
    process.exit(1);
});
