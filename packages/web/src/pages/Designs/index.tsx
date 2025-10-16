import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';
import LoadingScreen from '../../components/Loading';
import { useSearch } from '../../context/SearchContext';

const Designs = () => {
    const { accessToken, login, logout } = useAuth();
    const { searchQuery } = useSearch();
    const { data, isError, refetch } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const fuse = useMemo(() => {
        if (!data) return null;

        return new Fuse(data, {
            keys: ['name'],
            threshold: 0.4,
            includeScore: true,
        });
    }, [data]);

    if (isError) {
        return <span>Something went wrong! :(</span>;
    }

    if (!data) {
        return <LoadingScreen />;
    }

    const filteredData = searchQuery && fuse ? fuse.search(searchQuery).map((result) => result.item) : data;

    const designs = filteredData.map((design) => {
        return <DesignCard key={design.id} design={design} onDesignUpdated={() => refetch()} />;
    });

    return (
        <div>
            {filteredData.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Sparkles />
                        </EmptyMedia>
                        <EmptyTitle>{data.length === 0 ? 'No Designs Yet' : 'No Matching Designs'}</EmptyTitle>
                        <EmptyDescription>
                            {data.length === 0
                                ? 'Start creating beautiful jewellery designs to see them here!'
                                : 'Try adjusting your search query'}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className="flex flex-wrap justify-center gap-6">{designs}</div>
            )}
        </div>
    );
};

export default Designs;
