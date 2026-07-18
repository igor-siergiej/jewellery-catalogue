import { getWageCosts } from '../getWageCost';

interface GetSuggestedPriceArgs {
    materialsCost: number;
    timeRequired: string;
    markupMultiplier: number;
    hourlyRate: number;
}

export const getSuggestedPrice = ({
    materialsCost,
    timeRequired,
    markupMultiplier,
    hourlyRate,
}: GetSuggestedPriceArgs): number => {
    const hours = timeRequired ? getWageCosts(timeRequired) : 0;
    const safeHours = Number.isFinite(hours) ? hours : 0;
    const suggested = materialsCost * markupMultiplier + safeHours * hourlyRate;
    return parseFloat(suggested.toFixed(2));
};
