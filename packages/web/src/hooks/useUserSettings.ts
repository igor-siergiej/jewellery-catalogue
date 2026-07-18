import { useAuth } from '@imapps/web-utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    makeGetUserSettingsRequest,
    makeRecalculatePricesRequest,
    makeUpdateUserSettingsRequest,
} from '../api/endpoints/userSettings';

const QUERY_KEY = ['user-settings'];

export const useUserSettings = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => makeGetUserSettingsRequest(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const updateMutation = useMutation({
        mutationFn: (updates: {
            hourlyWage: number;
            profitMargin: number;
            markupMultiplier: number;
            hourlyRate: number;
            etsyDescriptionTemplate: string;
            etsyTaxonomyMap: Record<string, number>;
        }) => makeUpdateUserSettingsRequest(updates, () => accessToken, login, logout),
        onSuccess: (updated) => {
            queryClient.setQueryData(QUERY_KEY, updated);
        },
    });

    const recalculateMutation = useMutation({
        mutationFn: () => makeRecalculatePricesRequest(() => accessToken, login, logout),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['designs'] });
        },
    });

    return {
        hourlyWage: data?.hourlyWage ?? 10,
        profitMargin: data?.profitMargin ?? 15,
        markupMultiplier: data?.markupMultiplier ?? 2.5,
        hourlyRate: data?.hourlyRate ?? 0,
        etsyDescriptionTemplate: data?.etsyDescriptionTemplate ?? '',
        etsyTaxonomyMap: data?.etsyTaxonomyMap ?? {},
        isLoading,
        updateSettings: updateMutation.mutateAsync,
        recalculate: recalculateMutation.mutateAsync,
        isRecalculating: recalculateMutation.isPending,
        recalculateResult: recalculateMutation.data,
        recalculateError: recalculateMutation.error,
    };
};
