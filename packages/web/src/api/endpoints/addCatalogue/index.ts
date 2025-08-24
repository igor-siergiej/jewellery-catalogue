export const addCatalogue = async (userId: string) => {
    const response = await fetch('/api/catalogue', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId }),
    });

    if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || 'Failed to create catalogue');
    }

    return response.json();
};
