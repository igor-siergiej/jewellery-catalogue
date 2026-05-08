import { AlertCircle, CheckCircle2, Loader2, Settings } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { useUserSettings } from '../../hooks/useUserSettings';

type DialogState = 'settings' | 'recalculating' | 'success' | 'error';

export const UserSettingsDialog = () => {
    const { hourlyWage, profitMargin, updateSettings, recalculate, isLoading } = useUserSettings();
    const [open, setOpen] = useState(false);
    const [localWage, setLocalWage] = useState<number | ''>('');
    const [localMargin, setLocalMargin] = useState<number | ''>('');
    const [dialogState, setDialogState] = useState<DialogState>('settings');
    const [recalculateResult, setRecalculateResult] = useState<{ updated: number; total: number } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const onOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setLocalWage(hourlyWage);
            setLocalMargin(profitMargin);
            setDialogState('settings');
            setRecalculateResult(null);
        }
        setOpen(isOpen);
    };

    const handleSave = async () => {
        const wage = Number(localWage);
        const margin = Number(localMargin);
        if (Number.isNaN(wage) || Number.isNaN(margin)) return;
        await updateSettings({ hourlyWage: wage, profitMargin: margin });
        setOpen(false);
    };

    const handleSaveAndRecalculate = async () => {
        const wage = Number(localWage);
        const margin = Number(localMargin);
        if (Number.isNaN(wage) || Number.isNaN(margin)) return;

        await updateSettings({ hourlyWage: wage, profitMargin: margin });
        setDialogState('recalculating');

        try {
            const result = await recalculate();
            setRecalculateResult(result);
            setDialogState('success');
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
            setDialogState('error');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Settings">
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                {dialogState === 'settings' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Pricing Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
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
                                        disabled={isLoading}
                                        value={localWage}
                                        onChange={(e) =>
                                            setLocalWage(e.target.value === '' ? '' : parseFloat(e.target.value))
                                        }
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
                                        disabled={isLoading}
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
                        </div>
                        <DialogFooter className="flex-col sm:flex-col gap-2">
                            <Button onClick={handleSaveAndRecalculate} className="w-full">
                                Save &amp; Recalculate All Designs
                            </Button>
                            <Button variant="outline" onClick={handleSave} className="w-full">
                                Save Only
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {dialogState === 'recalculating' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Updating prices for all your designs…</p>
                    </div>
                )}

                {dialogState === 'success' && recalculateResult && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                        <p className="text-sm font-medium">
                            Updated {recalculateResult.updated} of {recalculateResult.total} designs
                        </p>
                        <Button onClick={() => setOpen(false)}>Close</Button>
                    </div>
                )}

                {dialogState === 'error' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                        <p className="text-sm text-destructive">{errorMessage || 'Recalculation failed'}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setDialogState('settings')}>
                                Back
                            </Button>
                            <Button onClick={handleSaveAndRecalculate}>Retry</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
