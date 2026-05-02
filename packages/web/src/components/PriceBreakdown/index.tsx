import type { ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { getWageCosts } from '../../utils/getWageCost';

interface PriceBreakdownProps {
    materialsCost: number;
    timeRequired: string;
    hourlyWage: number;
    profitMargin: number;
    onHourlyWageChange: (value: number) => void;
    onProfitMarginChange: (value: number) => void;
    priceField: ReactNode;
}

const formatTime = (timeRequired: string): string => {
    const [hoursStr, minutesStr] = timeRequired.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return '0 min';

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
    onHourlyWageChange,
    onProfitMarginChange,
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
            {/* Editable settings row */}
            <div className="flex gap-6">
                <div className="space-y-1.5">
                    <Label className="text-sm">Hourly Wage</Label>
                    <InputGroup className="max-w-[140px]">
                        <InputGroupAddon align="inline-start">
                            <InputGroupText>£</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                            type="number"
                            min="0"
                            step="0.50"
                            value={hourlyWage}
                            onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v >= 0) onHourlyWageChange(v);
                            }}
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>/hr</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-sm">Profit Margin</Label>
                    <InputGroup className="max-w-[120px]">
                        <InputGroupInput
                            type="number"
                            min="0"
                            step="1"
                            value={profitMargin}
                            onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v >= 0) onProfitMarginChange(v);
                            }}
                        />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>%</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </div>
            </div>

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
