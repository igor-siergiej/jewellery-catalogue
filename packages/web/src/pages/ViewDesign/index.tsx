import { useAuth, useUser } from '@imapps/web-utils';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { getDesignQuery } from '../../api/endpoints/getDesign';
import { Image } from '../../components/Image';
import LoadingScreen from '../../components/Loading';

const ViewDesign = () => {
    const { id } = useParams<{ id: string }>();
    const { accessToken, login, logout } = useAuth();
    const { user } = useUser();

    const { data: design, isError, isLoading } = useQuery({
        ...getDesignQuery(id || '', accessToken, login, logout),
        enabled: !!id && !!accessToken && !!user?.id,
    });

    if (isLoading || !user?.id) {
        return <LoadingScreen />;
    }

    if (isError || !design) {
        return <span>Design not found</span>;
    }

    return (
        <div className="flex justify-center items-start p-8">
            <div className="bg-card rounded-lg border border-border shadow-lg overflow-hidden max-w-2xl w-full">
                <div className="w-full h-96">
                    <Image imageId={design.imageId} />
                </div>
                <div className="p-6">
                    <h1 className="text-3xl font-bold">{design.name}</h1>
                </div>
            </div>
        </div>
    );
};

export default ViewDesign;
