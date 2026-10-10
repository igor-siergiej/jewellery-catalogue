import { useAuth } from '@imapps/web-utils';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';

import { makePriceSuggestionRequest } from '@/api/endpoints/priceSuggestion';
import { Button } from '@/components/ui/button';
import { aiErrorMessage } from '@/utils/aiErrorMessage';

const money = (value: number) => `£${value.toFixed(2)}`;

const errorMessage = (error: Error): string => aiErrorMessage(error, "Couldn't get a price suggestion. Try again.");

// An optional second opinion; the deterministic SuggestedPrice in the edit form stays the default.
export const PriceAdvice = ({ designId }: { designId: string }) => {
    const { accessToken, login, logout } = useAuth();
    const advice = useMutation({
        mutationFn: () => makePriceSuggestionRequest(designId, () => accessToken, login, logout),
    });
    const result = advice.data;

    return (
        <div className="space-y-2">
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={advice.isPending}
                onClick={() => advice.mutate()}
            >
                {advice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Ask AI for a price range
            </Button>
            {advice.isError && <p className="text-sm text-destructive">{errorMessage(advice.error)}</p>}
            {result && (
                <div className="rounded-xl border bg-card p-4 text-sm space-y-1" data-testid="price-advice">
                    <p className="text-lg font-semibold">
                        {money(result.low)} – {money(result.high)}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                            (suggests {money(result.recommended)})
                        </span>
                    </p>
                    <p>{result.rationale}</p>
                    <p className="text-xs text-muted-foreground">
                        Your formula price is {money(result.formulaPrice)}. Never below material cost of{' '}
                        {money(result.materialCost)}. Based only on your own designs and sales.
                    </p>
                </div>
            )}
        </div>
    );
};
