import { Button } from '@/components/ui/button';

import { getSuggestedPrice } from '../../utils/getSuggestedPrice';

interface SuggestedPriceProps {
    materialsCost: number;
    timeRequired: string;
    markupMultiplier: number;
    hourlyRate: number;
    onUse: (price: number) => void;
}

const SuggestedPrice: React.FC<SuggestedPriceProps> = ({
    materialsCost,
    timeRequired,
    markupMultiplier,
    hourlyRate,
    onUse,
}) => {
    const suggested = getSuggestedPrice({ materialsCost, timeRequired, markupMultiplier, hourlyRate });

    return (
        <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
                Suggested <span className="tabular-nums text-foreground">£{suggested.toFixed(2)}</span>
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => onUse(suggested)}>
                Use £{suggested.toFixed(2)}
            </Button>
        </div>
    );
};

export default SuggestedPrice;
