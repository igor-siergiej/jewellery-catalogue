interface MoreOptionsValues {
    variationGroups?: unknown[];
    description?: string;
    diagramImages?: unknown[];
    makingNotes?: string;
    lowStockThreshold?: number | null;
}

const isEmptyHtml = (html: string | undefined) => !html || html.replace(/<p><\/p>/g, '').trim() === '';

/** Whether any field under "More options" (variations, description, maker docs, stock alert) holds a value. */
export function hasMoreOptionsData(values: MoreOptionsValues): boolean {
    return (
        (values.variationGroups?.length ?? 0) > 0 ||
        !isEmptyHtml(values.description) ||
        (values.diagramImages?.length ?? 0) > 0 ||
        !!values.makingNotes?.trim() ||
        typeof values.lowStockThreshold === 'number'
    );
}
