import { useEffect, useRef } from 'react';

import { useSearch } from '@/context/SearchContext';
import { track } from '@/utils/analytics';

export type SearchScope = 'designs' | 'materials' | 'listings';

const DEBOUNCE_MS = 500;

/**
 * Fires `search_performed` once the user stops typing. The search term itself is
 * never sent — only the scope and how many results the query matched.
 */
export const useSearchAnalytics = (scope: SearchScope, results: number): void => {
    const { searchQuery } = useSearch();
    const firedQuery = useRef<string | null>(null);

    useEffect(() => {
        const query = searchQuery.trim();
        if (!query) {
            firedQuery.current = null;
            return;
        }
        if (firedQuery.current === query) return;

        const timer = setTimeout(() => {
            firedQuery.current = query;
            track('search_performed', { scope, results });
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [searchQuery, scope, results]);
};
