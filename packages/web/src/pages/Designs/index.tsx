import { useQuery } from '@tanstack/react-query';
import DesignTable from '../../components/DesignTable';
import LoadingScreen from '../../components/Loading';
import { getDesignsQuery } from '../../api/endpoints/getDesigns';

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

    return <DesignTable designs={data} />;
};

export default Designs;
