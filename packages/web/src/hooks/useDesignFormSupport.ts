import { useAuth } from '@imapps/web-utils';
import type { FormDesign } from '@jewellery-catalogue/types';
import { useQuery } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';

import { getMaterialsQuery } from '../api/endpoints/getMaterials';
import { computeVariants } from '../components/VariationGroupBuilder';
import { useAlert } from '../context/Alert';
import { AlertStoreActions } from '../context/Alert/types';
import { errorContext, logger } from '../utils/logger';
import { useUserSettings } from './useUserSettings';

export const useDesignFormSupport = (form: UseFormReturn<FormDesign>) => {
    const { accessToken, login, logout } = useAuth();
    const { hourlyWage, profitMargin } = useUserSettings();
    const { dispatch } = useAlert();

    const materialsQuery = useQuery({
        ...getMaterialsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

    const selectedMaterials = form.watch('materials');
    const currentTimeRequired = form.watch('timeRequired');
    const variationGroups = form.watch('variationGroups') ?? [];

    const computeFormVariants = () =>
        computeVariants(variationGroups, selectedMaterials, hourlyWage, profitMargin, currentTimeRequired);

    const reportSaveError = (logMessage: string, e: unknown) => {
        logger.error(logMessage, errorContext(e));
        const message = e instanceof Error ? e.message : 'Unknown error';

        dispatch({
            type: AlertStoreActions.SHOW_ALERT,
            payload: {
                title: "Couldn't save the design. Try again.",
                message: `Details: ${message}`,
                severity: 'error',
                variant: 'standard',
            },
        });
    };

    return { accessToken, login, logout, dispatch, materialsQuery, computeFormVariants, reportSaveError };
};
