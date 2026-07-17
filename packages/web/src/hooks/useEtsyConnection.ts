import { useAuth } from '@imapps/web-utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    makeDisconnectEtsyRequest,
    makeGetEtsyConnectionStatusRequest,
    makeStartEtsyOAuthRequest,
} from '../api/endpoints/etsyConnection';

const QUERY_KEY = ['etsy-connection'];

export const useEtsyConnection = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => makeGetEtsyConnectionStatusRequest(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const connectMutation = useMutation({
        mutationFn: () => makeStartEtsyOAuthRequest(() => accessToken, login, logout),
    });

    const disconnectMutation = useMutation({
        mutationFn: () => makeDisconnectEtsyRequest(() => accessToken, login, logout),
        onSuccess: () => {
            queryClient.setQueryData(QUERY_KEY, { connected: false });
        },
    });

    return {
        connected: data?.connected ?? false,
        shopName: data?.shopName,
        broken: data?.broken,
        isLoading,
        connect: connectMutation.mutateAsync,
        isConnecting: connectMutation.isPending,
        disconnect: disconnectMutation.mutateAsync,
        isDisconnecting: disconnectMutation.isPending,
    };
};
