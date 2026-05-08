import type { ReactNode } from 'react';

import { Separator } from '@/components/ui/separator';

import { getWageCosts } from '../../utils/getWageCost';

interface PriceBreakdownProps {
    materialsCost: number;
    timeRequired: string;
    hourlyWage: number;
    profitMargin: number;
    priceField: ReactNode;
}

const formatTime = (timeRequired: string): string => {
    const [hoursStr, minutesStr] = timeRequired.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return '0 min';

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hr`);
    if (minutes > 0) parts.push(`${minutes} min`);
    return parts.length > 0 ? parts.join(' ') : '0 min';
};

const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
    materialsCost,
    timeRequired,
    hourlyWage,
    profitMargin,
    priceField,
}) => {
    const labourHours = timeRequired ? getWageCosts(timeRequired) : 0;
    const labourCost = parseFloat((labourHours * hourlyWage).toFixed(2));
    const subtotal = parseFloat((materialsCost + labourCost).toFixed(2));
    const profitAmount = parseFloat((subtotal * (profitMargin / 100)).toFixed(2));
    const calculatedPrice = parseFloat((subtotal + profitAmount).toFixed(2));

    const timeDisplay = timeRequired ? formatTime(timeRequired) : '0 min';

    return (
        <div className="space-y-4">
            {/* Step-by-step breakdown */}
            <div className="rounded-md border bg-muted/50 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Materials cost</span>
                    <span className="font-mono">£{materialsCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">
                        Labour cost{' '}
                        <span className="text-xs">
                            ({timeDisplay} × £{hourlyWage}/hr)
                        </span>
                    </span>
                    <span className="font-mono">£{labourCost.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono">£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit ({profitMargin}%)</span>
                    <span className="font-mono">+£{profitAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                    <span>Calculated Price</span>
                    <span className="font-mono">£{calculatedPrice.toFixed(2)}</span>
                </div>
            </div>

            {/* Final price field (manually editable override) */}
            {priceField}
        </div>
    );
};

export default PriceBreakdown;
