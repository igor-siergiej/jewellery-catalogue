import { useAuth, useUser } from '@igor-siergiej/web-utils';
import { useQuery } from '@tanstack/react-query';

import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';
import LoadingScreen from '../../components/Loading';
import { EmptyStateContainer, EmptyStateSubtitle, EmptyStateTitle } from './index.styles';

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
                        <EmptyStateContainer>
                            <EmptyStateTitle>
                                No Designs Yet...
                            </EmptyStateTitle>
                            <EmptyStateSubtitle>
                                Start creating beautiful jewellery designs to see them here!
                            </EmptyStateSubtitle>
                        </EmptyStateContainer>
                    )
                : (
                        designs
                    )}
        </div>
    );
};

export default Designs;
