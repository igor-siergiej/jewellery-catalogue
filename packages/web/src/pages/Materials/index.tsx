import { useAuth, useUser } from '@igor-siergiej/web-utils';
import { useQuery } from '@tanstack/react-query';

import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import LoadingScreen from '../../components/Loading';
import MaterialsTable from '../../components/MaterialsTable';

const Materials = () => {
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();
    const { data, isError, error } = useQuery({
        ...getMaterialsQuery(user?.id || '', accessToken, login, logout),
        enabled: !!user?.id && !!accessToken,
    });

    if (isError) {
        return (
            <span>
                Something went wrong! :(
                {error.message}
            </span>
        );
    }

    if (!data || !user?.id) {
        return <LoadingScreen />;
    }

    return <MaterialsTable materials={data} />;
};

export default Materials;
