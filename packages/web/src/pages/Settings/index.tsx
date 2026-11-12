import { useAuth } from '@imapps/web-utils';
import { DesignType } from '@jewellery-catalogue/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getDesignsQuery } from '@/api/endpoints/getDesigns';
import AppVersionCard from '@/components/AppVersionCard';
import { FormSection } from '@/components/FormSection';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DESIGN_TYPE_LABELS } from '@/lib/materialLabels';

import { DataExport } from '../../components/DataExport';
import { useEtsyConnection } from '../../hooks/useEtsyConnection';
import { useEtsyShippingProfiles } from '../../hooks/useEtsyShippingProfiles';
import { useEtsyTaxonomy } from '../../hooks/useEtsyTaxonomy';
import { useUserSettings } from '../../hooks/useUserSettings';
import { getDefaultTaxonomyId } from '../../utils/getDefaultTaxonomyId';

const AUTO_SHIPPING = 'auto';

interface NumberFieldProps {
    id: string;
    label: string;
    maxWidth: string;
    prefix?: string;
    suffix: string;
    step: string;
    disabled: boolean;
    value: number | '';
    onChange: (value: number | '') => void;
}

const NumberField = ({ id, label, maxWidth, prefix, suffix, step, disabled, value, onChange }: NumberFieldProps) => (
    <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <InputGroup className={maxWidth}>
            {prefix && (
                <InputGroupAddon align="inline-start">
                    <InputGroupText>{prefix}</InputGroupText>
                </InputGroupAddon>
            )}
            <InputGroupInput
                id={id}
                type="number"
                min="0"
                step={step}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
            <InputGroupAddon align="inline-end">
                <InputGroupText>{suffix}</InputGroupText>
            </InputGroupAddon>
        </InputGroup>
    </div>
);

const Settings = () => {
    const { accessToken, login, logout } = useAuth();
    const queryClient = useQueryClient();
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

    const { data: cachedDesigns } = useQuery({
        ...getDesignsQuery(() => accessToken, login, logout),
        enabled: !!accessToken,
    });

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
    const [countWarning, setCountWarning] = useState(false);
    const [pendingPriceUpdate, setPendingPriceUpdate] = useState<{ count: number; standalone?: boolean } | null>(null);
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

    useEffect(() => {
        if (taxonomyLoading || taxonomyOptions.length === 0) return;

        setLocalEtsyTaxonomyMap((prev) => {
            let changed = false;
            const next = { ...prev };

            for (const designType of Object.values(DesignType)) {
                if (next[designType] === undefined) {
                    const defaultId = getDefaultTaxonomyId(designType, taxonomyOptions);

                    if (defaultId !== undefined) {
                        next[designType] = defaultId;
                        changed = true;
                    }
                }
            }

            return changed ? next : prev;
        });
    }, [taxonomyOptions, taxonomyLoading]);

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

    const fetchDesignCount = () =>
        queryClient
            .fetchQuery({ ...getDesignsQuery(() => accessToken, login, logout), staleTime: 0 })
            .then((designs) => designs.length);

    const handleSave = async (event: FormEvent) => {
        event.preventDefault();

        const wage = Number(localWage);
        const margin = Number(localMargin);

        if (Number.isNaN(wage) || Number.isNaN(margin)) return;

        setCountWarning(false);

        if (wage === hourlyWage && margin === profitMargin) {
            await handleSavePricing(false);

            return;
        }

        let count: number;

        try {
            count = await fetchDesignCount();
        } catch {
            await handleSavePricing(false);
            setCountWarning(true);

            return;
        }

        if (count === 0) {
            await handleSavePricing(false);

            return;
        }

        setPendingPriceUpdate({ count });
    };

    const handleUpdateAllPrices = async () => {
        setCountWarning(false);

        try {
            const count = await fetchDesignCount();

            if (count > 0) setPendingPriceUpdate({ count, standalone: true });
        } catch {
            setPricingError("Couldn't count your designs. Try again.");
            setPricingStatus('error');
        }
    };

    const shippingProfileLabel =
        localEtsyShippingProfileId === null
            ? shippingProfiles.length > 1
                ? undefined
                : "Auto (use the shop's only profile)"
            : shippingProfiles.find((p) => p.shippingProfileId === localEtsyShippingProfileId)?.title;

    const saveLabel =
        pricingStatus === 'saving' ? 'Saving…' : pricingStatus === 'recalculating' ? 'Updating prices…' : 'Save';

    const pendingCount = pendingPriceUpdate?.count ?? 0;

    return (
        <div className="max-w-3xl space-y-2 p-4 md:p-6">
            <h1 className="font-display text-3xl font-semibold">Settings</h1>

            {etsyRedirectResult === 'connected' && (
                <div
                    role="status"
                    className="flex items-center gap-2 rounded-md border border-success bg-card p-3 text-sm text-success"
                >
                    <CheckCircle2 className="h-4 w-4" /> Etsy connected successfully.
                </div>
            )}
            {etsyRedirectResult === 'error' && (
                <div
                    role="alert"
                    className="flex items-center gap-2 rounded-md border border-destructive bg-card p-3 text-sm text-destructive"
                >
                    <AlertCircle className="h-4 w-4" /> Failed to connect to Etsy. Please try again.
                </div>
            )}

            <FormSection title="Etsy connection">
                {etsyLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : connected ? (
                    <div className="space-y-3">
                        {broken && (
                            <div
                                role="alert"
                                className="flex items-center gap-2 rounded-md border border-destructive bg-card p-3 text-sm text-destructive"
                            >
                                <AlertCircle className="h-4 w-4" /> Etsy connection needs to be re-authorized.
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            <a
                                href={`https://www.etsy.com/shop/${encodeURIComponent(shopName ?? '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-1 rounded-md border px-3 text-sm font-medium hover:bg-accent md:min-h-9"
                            >
                                {shopName} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                            <Button
                                type="button"
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
                    <Button type="button" disabled={isConnecting} onClick={handleConnect}>
                        {isConnecting ? 'Redirecting…' : 'Connect Etsy'}
                    </Button>
                )}
            </FormSection>

            <form onSubmit={handleSave} noValidate>
                <FormSection
                    title="Pricing"
                    description="Used to work out design prices. Private, never shown on Etsy."
                >
                    <NumberField
                        id="hourly-wage"
                        label="Hourly wage"
                        maxWidth="max-w-[160px]"
                        prefix="£"
                        suffix="/hr"
                        step="0.50"
                        disabled={pricingLoading}
                        value={localWage}
                        onChange={setLocalWage}
                    />
                    <NumberField
                        id="profit-margin"
                        label="Profit margin"
                        maxWidth="max-w-[140px]"
                        suffix="%"
                        step="1"
                        disabled={pricingLoading}
                        value={localMargin}
                        onChange={setLocalMargin}
                    />
                    <NumberField
                        id="markup-multiplier"
                        label="Etsy price suggestion: markup multiplier"
                        maxWidth="max-w-[140px]"
                        suffix="×"
                        step="0.1"
                        disabled={pricingLoading || pricingBusy}
                        value={localMarkupMultiplier}
                        onChange={setLocalMarkupMultiplier}
                    />
                    <NumberField
                        id="suggestion-hourly-rate"
                        label="Etsy price suggestion: hourly rate"
                        maxWidth="max-w-[160px]"
                        prefix="£"
                        suffix="/hr"
                        step="0.50"
                        disabled={pricingLoading || pricingBusy}
                        value={localHourlyRate}
                        onChange={setLocalHourlyRate}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pricingBusy || cachedDesigns?.length === 0}
                        onClick={handleUpdateAllPrices}
                    >
                        Update all design prices
                    </Button>
                </FormSection>

                {connected && (
                    <FormSection title="Etsy defaults" description="Used when you send a design to Etsy.">
                        <div className="space-y-1.5">
                            <Label htmlFor="etsy-description-template">Description template</Label>
                            <Textarea
                                id="etsy-description-template"
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
                            <p className="text-sm font-medium">Category by design type</p>
                            {Object.values(DesignType).map((designType) => {
                                const typeLabel = DESIGN_TYPE_LABELS[designType];

                                return (
                                    <div
                                        key={designType}
                                        className="grid grid-cols-1 gap-1.5 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-3"
                                    >
                                        <span className="text-sm">{typeLabel}</span>
                                        <Select
                                            disabled={taxonomyLoading}
                                            value={
                                                localEtsyTaxonomyMap[designType] === undefined
                                                    ? ''
                                                    : String(localEtsyTaxonomyMap[designType])
                                            }
                                            onValueChange={(value) => {
                                                // Radix reports '' when its items change under a selected value
                                                if (!value) return;

                                                setLocalEtsyTaxonomyMap((prev) => ({
                                                    ...prev,
                                                    [designType]: Number(value),
                                                }));
                                            }}
                                        >
                                            <SelectTrigger
                                                aria-label={`Etsy category for ${typeLabel}`}
                                                className="min-h-11 md:min-h-9"
                                            >
                                                <SelectValue placeholder="Select a category">
                                                    {
                                                        taxonomyOptions.find(
                                                            (opt) => opt.id === localEtsyTaxonomyMap[designType]
                                                        )?.label
                                                    }
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {taxonomyOptions.map((opt) => (
                                                    <SelectItem key={opt.id} value={String(opt.id)}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="etsy-shipping-profile">Shipping profile</Label>
                            <Select
                                disabled={shippingProfilesLoading}
                                value={
                                    localEtsyShippingProfileId === null
                                        ? shippingProfiles.length > 1
                                            ? ''
                                            : AUTO_SHIPPING
                                        : String(localEtsyShippingProfileId)
                                }
                                onValueChange={(value) => {
                                    if (!value) return;

                                    setLocalEtsyShippingProfileId(value === AUTO_SHIPPING ? null : Number(value));
                                }}
                            >
                                <SelectTrigger id="etsy-shipping-profile" className="min-h-11 md:min-h-9">
                                    <SelectValue placeholder="Select a shipping profile">
                                        {shippingProfileLabel}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {shippingProfiles.length <= 1 && (
                                        <SelectItem value={AUTO_SHIPPING}>
                                            Auto (use the shop's only profile)
                                        </SelectItem>
                                    )}
                                    {shippingProfiles.map((profile) => (
                                        <SelectItem
                                            key={profile.shippingProfileId}
                                            value={String(profile.shippingProfileId)}
                                        >
                                            {profile.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {shippingProfiles.length > 1 && (
                                <p className="text-xs text-muted-foreground">
                                    Your shop has multiple shipping profiles. Pick one, otherwise sending to Etsy will
                                    fail.
                                </p>
                            )}
                        </div>
                    </FormSection>
                )}

                <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background px-4 py-3 md:static md:mx-0 md:px-0">
                    <Button type="submit" disabled={pricingBusy}>
                        {saveLabel}
                    </Button>
                    {pricingStatus === 'recalculating' && (
                        <span role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Updating prices for all your designs…
                        </span>
                    )}
                    {pricingStatus === 'success' && pricingAction === 'recalculate' && recalculateResult && (
                        <p role="status" className="text-sm text-success">
                            Updated {recalculateResult.updated} of {recalculateResult.total}{' '}
                            {recalculateResult.total === 1 ? 'design' : 'designs'}
                        </p>
                    )}
                    {pricingStatus === 'success' && pricingAction === 'save' && (
                        <p role="status" className="text-sm text-success">
                            Saved.
                        </p>
                    )}
                    {countWarning && (
                        <p role="alert" className="text-sm text-destructive">
                            Couldn't count your designs, settings saved without updating prices.
                        </p>
                    )}
                    {pricingStatus === 'error' && (
                        <p role="alert" className="text-sm text-destructive">
                            {pricingError}
                        </p>
                    )}
                </div>
            </form>

            <FormSection title="App">
                <AppVersionCard />
            </FormSection>
            <FormSection title="Your data">
                <DataExport />
            </FormSection>

            <AlertDialog open={!!pendingPriceUpdate} onOpenChange={(open) => !open && setPendingPriceUpdate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Update prices for {pendingCount} {pendingCount === 1 ? 'design' : 'designs'}?
                        </AlertDialogTitle>
                        {pendingPriceUpdate?.standalone ? (
                            <AlertDialogDescription>
                                This recalculates {pendingCount === 1 ? "your design's" : "every design's"} price from
                                your current hourly wage and margin.
                            </AlertDialogDescription>
                        ) : (
                            <AlertDialogDescription>
                                Your hourly wage or profit margin changed. Update prices recalculates the selling price
                                of {pendingCount === 1 ? 'your design' : 'every design'} with the new values. Save
                                without updating keeps the current prices.
                            </AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => handleSavePricing(false)}>
                            Save without updating
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSavePricing(true)}>Update prices</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Settings;
