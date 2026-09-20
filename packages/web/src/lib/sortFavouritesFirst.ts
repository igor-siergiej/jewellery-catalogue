export const sortFavouritesFirst = <T extends { favourite?: boolean }>(items: Array<T>): Array<T> =>
    [...items].sort((a, b) => Number(!!b.favourite) - Number(!!a.favourite));
