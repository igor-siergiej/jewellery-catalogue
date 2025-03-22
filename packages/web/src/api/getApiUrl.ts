export const getApiUrl = () => {
    const currentUrl = window.origin;

    // TODO: might have to remove this and do what we do in shoppingo?
    if (currentUrl === 'http://localhost:3000') {
        return 'https://jewellerycatalogue.imapps.co.uk';
    } else {
        return currentUrl;
    }
};
