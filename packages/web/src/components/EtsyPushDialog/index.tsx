import { type Design, ETSY_TITLE_MAX, type EtsyListingCopy, htmlToPlainText } from '@jewellery-catalogue/types';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import TagInput from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useEtsyPush } from '../../hooks/useEtsyPush';
import { useGenerateEtsyListing } from '../../hooks/useGenerateEtsyListing';
import { useUserSettings } from '../../hooks/useUserSettings';

interface EtsyPushDialogProps {
    design: Design;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const renderTemplate = (template: string, description: string, materials: Array<{ name: string }>): string =>
    template
        .replace(/\{description\}/g, htmlToPlainText(description))
        .replace(/\{materials\}/g, materials.map((m) => m.name).join(', '));

const generateErrorMessage = (error: Error): string =>
    error.message.includes('503')
        ? "AI generation isn't set up yet. Add FAL_KEY to the API to enable it."
        : "Couldn't generate the listing. Your text is unchanged; try again.";

const EtsyPushDialog: React.FC<EtsyPushDialogProps> = ({ design, open, onOpenChange }) => {
    const { etsyDescriptionTemplate, etsyTaxonomyMap } = useUserSettings();
    const { push, isPushing, pushError } = useEtsyPush(design.id);
    const { generate, isGenerating, generateError, resetGenerate } = useGenerateEtsyListing(design.id);

    const seed = (): EtsyListingCopy =>
        design.etsyListing ?? {
            title: design.name,
            description: renderTemplate(etsyDescriptionTemplate, design.description, design.materials),
            tags: [],
        };

    const [title, setTitle] = useState(() => seed().title);
    const [description, setDescription] = useState(() => seed().description);
    const [tags, setTags] = useState<string[]>(() => seed().tags);
    const [price, setPrice] = useState(design.price);

    const applyCopy = (copy: EtsyListingCopy) => {
        setTitle(copy.title);
        setDescription(copy.description);
        setTags(copy.tags);
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: only re-seed on open/design change, not on every template or materials change
    useEffect(() => {
        if (open) {
            applyCopy(seed());
            setPrice(design.price);
            resetGenerate();
        }
    }, [open, design.id]);

    const taxonomyId = design.designType ? etsyTaxonomyMap[design.designType] : undefined;
    const canSend = !!taxonomyId && title.trim().length > 0 && description.trim().length > 0;

    const handleGenerate = () => generate(undefined, { onSuccess: applyCopy });

    const handleSend = async () => {
        await push({ title: title.trim(), description, tags, price });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Send to Etsy</DialogTitle>
                    <DialogDescription>Review before creating the draft listing on Etsy.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Generate a title, description and tags from this design's materials and photos.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGenerate}
                            disabled={isGenerating || isPushing}
                        >
                            <Sparkles className="h-4 w-4" />
                            {isGenerating ? 'Generating…' : 'Generate with AI'}
                        </Button>
                    </div>
                    {generateError && (
                        <p role="alert" className="text-sm text-destructive">
                            {generateErrorMessage(generateError)}
                        </p>
                    )}

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="etsy-title">Title</Label>
                            <span className="text-xs text-muted-foreground">
                                {title.length}/{ETSY_TITLE_MAX}
                            </span>
                        </div>
                        <Input
                            id="etsy-title"
                            value={title}
                            maxLength={ETSY_TITLE_MAX}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="etsy-description">Description</Label>
                        <Textarea
                            id="etsy-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={8}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="etsy-tags">Tags</Label>
                        <TagInput id="etsy-tags" value={tags} onChange={setTags} />
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
                    <Button type="button" onClick={handleSend} disabled={isPushing || isGenerating || !canSend}>
                        {isPushing ? 'Sending…' : 'Send to Etsy'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EtsyPushDialog;
