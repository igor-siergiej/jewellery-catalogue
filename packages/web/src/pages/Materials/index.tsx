import { useAuth } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';

import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import LoadingScreen from '../../components/Loading';
import MaterialsTable from '../../components/MaterialsTable';

const Materials = () => {
    const { accessToken, login, logout } = useAuth();
    const { data, isError, error, refetch } = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
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

    return <MaterialsTable materials={data} onMaterialUpdated={() => refetch()} />;
};

export default Materials;
