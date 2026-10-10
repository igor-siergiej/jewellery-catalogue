// Runs task for every item with at most `limit` in flight. Task errors are the task's to handle.
export const runWithConcurrency = async <T>(
    items: T[],
    limit: number,
    task: (item: T) => Promise<void>
): Promise<void> => {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const item = items[next++] as T;
            await task(item);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};
