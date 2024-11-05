export const getApiUrl = () => {
    const currentUrl = window.origin;

    if (currentUrl === 'http://localhost:3000') {
        return 'http://localhost:3001';
    } else {
        return currentUrl;
    }
};
