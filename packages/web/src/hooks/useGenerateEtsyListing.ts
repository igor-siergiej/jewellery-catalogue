import { useAuth } from '@imapps/web-utils';
import { useMutation } from '@tanstack/react-query';

import { makeGenerateEtsyListingRequest } from '../api/endpoints/etsyListingCopy';

export const useGenerateEtsyListing = (designId: string) => {
    const { accessToken, login, logout } = useAuth();

    const mutation = useMutation({
        mutationFn: () => makeGenerateEtsyListingRequest(designId, () => accessToken, login, logout),
    });

    return {
        generate: mutation.mutate,
        isGenerating: mutation.isPending,
        generateError: mutation.error,
        resetGenerate: mutation.reset,
    };
};
