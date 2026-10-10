// Shared wording for every AI feature; the request helper only exposes the status code in the message.
export const aiErrorMessage = (error: unknown, fallback: string): string => {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('429')) return "You've reached the AI usage limit for now. Try again later.";
    if (message.includes('503')) return "AI features aren't set up yet. Add FAL_KEY to the API to enable them.";
    return fallback;
};
