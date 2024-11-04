import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../../components/Loading';
import { getMaterialsQuery } from '../../api/getMaterials';
import MaterialsTable from '../../components/MaterialsTable';

const Materials = () => {
    const { data, isError, error } = useQuery({
        ...getMaterialsQuery(),
    });

    data && console.log(data);

    if (isError) {
        return <span>Something went wrong! :( {error.message}</span>;
    }

    if (!data) {
        return <LoadingScreen />;
    }

    return <MaterialsTable materials={data} />;
};

export default Materials;
