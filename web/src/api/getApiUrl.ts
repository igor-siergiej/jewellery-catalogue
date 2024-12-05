export const getApiUrl = () => {
    const currentUrl = window.origin;

    return 'http://localhost:3001';

    if (currentUrl === 'http://localhost:3000') {
        return 'https://jewellerycatalogue.onthewifi.com';
    } else {
        return currentUrl;
    }
};
