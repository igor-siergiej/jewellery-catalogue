import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../../components/Loading';
import { getDesignsQuery } from '../../api/endpoints/getDesigns';
import { DesignCard } from '../../components/DesignCard';

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
        return (<DesignCard design={design} />);
    });

    return (
        <div>
            {designs}
        </div>
    );
};

export default Designs;
