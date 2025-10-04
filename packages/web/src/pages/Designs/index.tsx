import { useAuth, useUser } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';
import LoadingScreen from '../../components/Loading';

const Designs = () => {
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();
    const { data, isError } = useQuery({
        ...getDesignsQuery(user?.id || '', accessToken, login, logout),
        enabled: !!user?.id && !!accessToken,
    });

    if (isError) {
        return <span>Something went wrong! :(</span>;
    }

    if (!data || !user?.id) {
        return <LoadingScreen />;
    }

    const designs = data.map((design) => {
        return (<DesignCard key={design.id} design={design} />);
    });

    return (
        <div>
            {data.length === 0
                ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Sparkles />
                                </EmptyMedia>
                                <EmptyTitle>No Designs Yet</EmptyTitle>
                                <EmptyDescription>
                                    Start creating beautiful jewellery designs to see them here!
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                : (
                        designs
                    )}
        </div>
    );
};

export default Designs;
