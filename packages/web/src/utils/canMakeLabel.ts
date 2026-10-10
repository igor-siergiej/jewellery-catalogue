import type { ProducibleSummary } from '@jewellery-catalogue/types';

// null means the design lists no materials, so stock is no limit and there is nothing useful to show.
export const canMakeLabel = (summary: ProducibleSummary | undefined): string | null => {
    if (!summary || summary.canMake === null) return null;
    return summary.variants.length > 0 ? `Can make up to ${summary.canMake}` : `Can make ${summary.canMake}`;
};
