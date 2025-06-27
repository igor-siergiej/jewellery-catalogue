import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../../components/Loading';
import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';
import { EmptyStateContainer, EmptyStateTitle, EmptyStateSubtitle } from './index.styles';

const Designs = () => {
    const { data, isError } = useQuery({
        ...getDesignsQuery(),
    });

    if (isError) {
        return <span>Something went wrong! :(</span>;
    }

    if (!data) {
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
