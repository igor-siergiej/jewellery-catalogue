import { useQuery } from '@tanstack/react-query';
import { getDesignsQuery } from '../../api/getDesigns';
import DesignTable from '../../components/DesignTable';
import LoadingScreen from '../../components/Loading';

const Designs = () => {
    const { data, isError } = useQuery({
        ...getDesignsQuery(),
    });

    data && console.log(data);

    if (isError) {
        return <span>Something went wrong! :(</span>;
    }

    if (!data) {
        return <LoadingScreen />;
    }

    return <DesignTable designs={data} />;
};

export default Designs;
