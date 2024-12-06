export const getApiUrl = () => {
    const currentUrl = window.origin;

    if (currentUrl === 'http://localhost:3000') {
        return 'https://jewellerycatalogue.onthewifi.com';
    } else {
        return currentUrl;
    }
};
