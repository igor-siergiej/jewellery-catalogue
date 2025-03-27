import { useQuery } from '@tanstack/react-query';
import LoadingScreen from '../../components/Loading';
import MaterialsTable from '../../components/MaterialsTable';
import { getMaterialsQuery } from '../../api/endpoints/getMaterials';

const Materials = () => {
    const { data, isError, error } = useQuery({
        ...getMaterialsQuery(),
    });

    if (isError) {
        return (
            <span>
                Something went wrong! :(
                {error.message}
            </span>
        );
    }

    if (!data) {
        return <LoadingScreen />;
    }

    return <MaterialsTable materials={data} />;
};

export default Materials;
