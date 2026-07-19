import { DesignType } from '@jewellery-catalogue/types';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import { useEtsyShippingProfiles } from '../../hooks/useEtsyShippingProfiles';
import { useEtsyTaxonomy } from '../../hooks/useEtsyTaxonomy';
import { useUserSettings } from '../../hooks/useUserSettings';

const Settings = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    // Captured once on mount: the query param gets stripped from the URL right after,
    // so the banner has to live in state rather than being derived from searchParams directly.
    const [etsyRedirectResult] = useState(() => searchParams.get('etsy'));

    const {
        connected,
        shopName,
        broken,
        isLoading: etsyLoading,
        connect,
        isConnecting,
        disconnect,
        isDisconnecting,
    } = useEtsyConnection();
    const {
        hourlyWage,
        profitMargin,
        markupMultiplier,
        hourlyRate,
        etsyDescriptionTemplate,
        etsyTaxonomyMap,
        etsyShippingProfileId,
        updateSettings,
        recalculate,
        isLoading: pricingLoading,
    } = useUserSettings();
    const { options: taxonomyOptions, isLoading: taxonomyLoading } = useEtsyTaxonomy(connected);
    const { profiles: shippingProfiles, isLoading: shippingProfilesLoading } = useEtsyShippingProfiles(connected);

    const [localWage, setLocalWage] = useState<number | ''>(hourlyWage);
    const [localMargin, setLocalMargin] = useState<number | ''>(profitMargin);
    const [localMarkupMultiplier, setLocalMarkupMultiplier] = useState<number | ''>(markupMultiplier);
    const [localHourlyRate, setLocalHourlyRate] = useState<number | ''>(hourlyRate);
    const [localEtsyDescriptionTemplate, setLocalEtsyDescriptionTemplate] = useState(etsyDescriptionTemplate);
    const [localEtsyTaxonomyMap, setLocalEtsyTaxonomyMap] = useState<Record<string, number>>(etsyTaxonomyMap);
    const [localEtsyShippingProfileId, setLocalEtsyShippingProfileId] = useState<number | null>(etsyShippingProfileId);
    const [pricingStatus, setPricingStatus] = useState<'idle' | 'saving' | 'recalculating' | 'success' | 'error'>(
        'idle'
    );
    const [pricingError, setPricingError] = useState('');
    const [pricingAction, setPricingAction] = useState<'save' | 'recalculate' | null>(null);
    const [recalculateResult, setRecalculateResult] = useState<{ updated: number; total: number } | null>(null);
    const pricingBusy = pricingStatus === 'saving' || pricingStatus === 'recalculating';

    useEffect(() => {
        setLocalWage(hourlyWage);
        setLocalMargin(profitMargin);
        setLocalMarkupMultiplier(markupMultiplier);
        setLocalHourlyRate(hourlyRate);
        setLocalEtsyDescriptionTemplate(etsyDescriptionTemplate);
        setLocalEtsyTaxonomyMap(etsyTaxonomyMap);
        setLocalEtsyShippingProfileId(etsyShippingProfileId);
    }, [
        hourlyWage,
        profitMargin,
        markupMultiplier,
        hourlyRate,
        etsyDescriptionTemplate,
        etsyTaxonomyMap,
        etsyShippingProfileId,
    ]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount to strip the ?etsy param from the URL
    useEffect(() => {
        if (etsyRedirectResult) {
            const next = new URLSearchParams(searchParams);
            next.delete('etsy');
            setSearchParams(next, { replace: true });
        }
    }, []);

    const handleConnect = async () => {
        const { url } = await connect();
        window.location.href = url;
    };

    const handleSavePricing = async (thenRecalculate: boolean) => {
        const wage = Number(localWage);
        const margin = Number(localMargin);
        if (Number.isNaN(wage) || Number.isNaN(margin)) return;

        setPricingAction(thenRecalculate ? 'recalculate' : 'save');
        setPricingStatus('saving');
        try {
            await updateSettings({
                hourlyWage: wage,
                profitMargin: margin,
                markupMultiplier: Number(localMarkupMultiplier),
                hourlyRate: Number(localHourlyRate),
                etsyDescriptionTemplate: localEtsyDescriptionTemplate,
                etsyTaxonomyMap: localEtsyTaxonomyMap,
                etsyShippingProfileId: localEtsyShippingProfileId,
            });
            if (thenRecalculate) {
                setPricingStatus('recalculating');
                const result = await recalculate();
                setRecalculateResult(result);
            } else {
                setRecalculateResult(null);
            }
            setPricingStatus('success');
        } catch (err) {
            setPricingError(err instanceof Error ? err.message : 'Unknown error');
            setPricingStatus('error');
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <h1 className="text-2xl font-semibold">Settings</h1>

            {etsyRedirectResult === 'connected' && (
                <div className="flex items-center gap-2 rounded-md border border-green-500 bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Etsy connected successfully.
                </div>
            )}
            {etsyRedirectResult === 'error' && (
                <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> Failed to connect to Etsy. Please try again.
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Etsy Connection</CardTitle>
                </CardHeader>
                <CardContent>
                    {etsyLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : connected ? (
                        <div className="space-y-2">
                            {broken && (
                                <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4" /> Etsy connection needs to be re-authorized.
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                                    {shopName} <ExternalLink className="h-3 w-3" />
                                </span>
                                <Button
                                    variant="outline"
                                    disabled={broken ? isConnecting : isDisconnecting}
                                    onClick={broken ? handleConnect : () => disconnect()}
                                >
                                    {broken
                                        ? isConnecting
                                            ? 'Redirecting…'
                                            : 'Reconnect Etsy'
                                        : isDisconnecting
                                          ? 'Disconnecting…'
                                          : 'Disconnect'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button disabled={isConnecting} onClick={handleConnect}>
                            {isConnecting ? 'Redirecting…' : 'Connect Etsy'}
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Hourly Wage</Label>
                        <InputGroup className="max-w-[160px]">
                            <InputGroupAddon align="inline-start">
                                <InputGroupText>£</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                type="number"
                                min="0"
                                step="0.50"
                                disabled={pricingLoading}
                                value={localWage}
                                onChange={(e) => setLocalWage(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            />
                            <InputGroupAddon align="inline-end">
                                <InputGroupText>/hr</InputGroupText>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Profit Margin</Label>
                        <InputGroup className="max-w-[140px]">
                            <InputGroupInput
                                type="number"
                                min="0"
                                step="1"
                                disabled={pricingLoading}
                                value={localMargin}
                                onChange={(e) =>
                                    setLocalMargin(e.target.value === '' ? '' : parseFloat(e.target.value))
                                }
                            />
                            <InputGroupAddon align="inline-end">
                                <InputGroupText>%</InputGroupText>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Etsy Price Suggestion — Markup Multiplier</Label>
                        <InputGroup className="max-w-[140px]">
                            <InputGroupInput
                                type="number"
                                min="0"
                                step="0.1"
                                disabled={pricingBusy}
                                value={localMarkupMultiplier}
                                onChange={(e) =>
                                    setLocalMarkupMultiplier(e.target.value === '' ? '' : parseFloat(e.target.value))
                                }
                            />
                            <InputGroupAddon align="inline-end">
                                <InputGroupText>×</InputGroupText>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Etsy Price Suggestion — Hourly Rate</Label>
                        <InputGroup className="max-w-[160px]">
                            <InputGroupAddon align="inline-start">
                                <InputGroupText>£</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                type="number"
                                min="0"
                                step="0.50"
                                disabled={pricingBusy}
                                value={localHourlyRate}
                                onChange={(e) =>
                                    setLocalHourlyRate(e.target.value === '' ? '' : parseFloat(e.target.value))
                                }
                            />
                            <InputGroupAddon align="inline-end">
                                <InputGroupText>/hr</InputGroupText>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                    <div className="flex gap-2">
                        <Button disabled={pricingBusy} onClick={() => handleSavePricing(true)}>
                            {pricingAction === 'recalculate' && pricingStatus === 'saving'
                                ? 'Saving…'
                                : pricingAction === 'recalculate' && pricingStatus === 'recalculating'
                                  ? 'Recalculating…'
                                  : 'Save & Recalculate All Designs'}
                        </Button>
                        <Button variant="outline" disabled={pricingBusy} onClick={() => handleSavePricing(false)}>
                            {pricingAction === 'save' && pricingStatus === 'saving' ? 'Saving…' : 'Save Only'}
                        </Button>
                    </div>
                    {pricingStatus === 'recalculating' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Updating prices for all your designs…
                        </div>
                    )}
                    {pricingStatus === 'success' && pricingAction === 'recalculate' && recalculateResult && (
                        <p className="text-sm text-green-600">
                            Updated {recalculateResult.updated} of {recalculateResult.total} designs
                        </p>
                    )}
                    {pricingStatus === 'success' && pricingAction === 'save' && (
                        <p className="text-sm text-green-600">Saved.</p>
                    )}
                    {pricingStatus === 'error' && <p className="text-sm text-destructive">{pricingError}</p>}
                </CardContent>
            </Card>

            {connected && (
                <Card>
                    <CardHeader>
                        <CardTitle>Etsy Defaults</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Description template</Label>
                            <Textarea
                                value={localEtsyDescriptionTemplate}
                                onChange={(e) => setLocalEtsyDescriptionTemplate(e.target.value)}
                                placeholder={'{description}\n\nMaterials: {materials}'}
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                                Use {'{description}'} and {'{materials}'} as placeholders.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Label>Category by design type</Label>
                            {Object.values(DesignType).map((designType) => (
                                <div key={designType} className="flex items-center gap-3">
                                    <span className="w-28 text-sm">{designType}</span>
                                    <select
                                        className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                                        disabled={taxonomyLoading}
                                        value={localEtsyTaxonomyMap[designType] ?? ''}
                                        onChange={(e) =>
                                            setLocalEtsyTaxonomyMap((prev) => ({
                                                ...prev,
                                                [designType]: Number(e.target.value),
                                            }))
                                        }
                                    >
                                        <option value="" disabled>
                                            Select a category…
                                        </option>
                                        {taxonomyOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Shipping profile</Label>
                            <select
                                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                                disabled={shippingProfilesLoading}
                                value={localEtsyShippingProfileId ?? ''}
                                onChange={(e) =>
                                    setLocalEtsyShippingProfileId(e.target.value === '' ? null : Number(e.target.value))
                                }
                            >
                                <option value="">
                                    {shippingProfiles.length > 1
                                        ? 'Select a shipping profile…'
                                        : "Auto (use the shop's only profile)"}
                                </option>
                                {shippingProfiles.map((profile) => (
                                    <option key={profile.shippingProfileId} value={profile.shippingProfileId}>
                                        {profile.title}
                                    </option>
                                ))}
                            </select>
                            {shippingProfiles.length > 1 && (
                                <p className="text-xs text-muted-foreground">
                                    Your shop has multiple shipping profiles — pick one, otherwise sending to Etsy will
                                    fail.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Settings;
