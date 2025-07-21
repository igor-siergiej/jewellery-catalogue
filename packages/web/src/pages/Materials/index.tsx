import { useQuery } from '@tanstack/react-query';

import { getMaterialsQuery } from '../../api/endpoints/getMaterials';
import LoadingScreen from '../../components/Loading';
import MaterialsTable from '../../components/MaterialsTable';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';

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
