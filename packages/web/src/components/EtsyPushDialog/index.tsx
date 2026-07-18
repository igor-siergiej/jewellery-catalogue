import type { Design } from '@jewellery-catalogue/types';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useEtsyPush } from '../../hooks/useEtsyPush';
import { useUserSettings } from '../../hooks/useUserSettings';

interface EtsyPushDialogProps {
    design: Design;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const renderTemplate = (template: string, description: string, materials: Array<{ name: string }>): string =>
    template
        .replace(/\{description\}/g, description)
        .replace(/\{materials\}/g, materials.map((m) => m.name).join(', '));

const EtsyPushDialog: React.FC<EtsyPushDialogProps> = ({ design, open, onOpenChange }) => {
    const { etsyDescriptionTemplate, etsyTaxonomyMap } = useUserSettings();
    const { push, isPushing, pushError } = useEtsyPush(design.id);

    const [description, setDescription] = useState(() =>
        renderTemplate(etsyDescriptionTemplate, design.description, design.materials)
    );
    const [price, setPrice] = useState(design.price);

    // biome-ignore lint/correctness/useExhaustiveDependencies: only re-seed on open/design change, not on every template or materials change
    useEffect(() => {
        if (open) {
            setDescription(renderTemplate(etsyDescriptionTemplate, design.description, design.materials));
            setPrice(design.price);
        }
    }, [open, design.id]);

    const taxonomyId = design.designType ? etsyTaxonomyMap[design.designType] : undefined;

    const handleSend = async () => {
        await push({ description, price });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send to Etsy</DialogTitle>
                    <DialogDescription>Review before creating the draft listing on Etsy.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Category</Label>
                        <p className="text-sm text-muted-foreground">
                            {taxonomyId
                                ? `Taxonomy #${taxonomyId} (set for ${design.designType} in Settings)`
                                : 'No category mapped for this design type — set one in Settings before sending.'}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Price</Label>
                        <InputGroup className="max-w-[160px]">
                            <InputGroupAddon align="inline-start">
                                <InputGroupText>£</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                            />
                        </InputGroup>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Photos</Label>
                        <p className="text-sm text-muted-foreground">
                            {design.imageIds.length > 0
                                ? `${design.imageIds.length} product photo(s) will be sent.`
                                : 'No product photos — you can add them on Etsy before publishing.'}
                        </p>
                    </div>

                    {pushError && (
                        <p className="text-sm text-destructive">
                            {pushError instanceof Error ? pushError.message : 'Failed to send to Etsy.'}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPushing}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSend} disabled={isPushing || !taxonomyId}>
                        {isPushing ? 'Sending…' : 'Send to Etsy'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EtsyPushDialog;
