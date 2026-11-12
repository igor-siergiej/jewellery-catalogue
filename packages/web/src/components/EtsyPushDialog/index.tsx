import {
    type Design,
    ETSY_TITLE_MAX,
    type EtsyListingCopy,
    etsyListingSchema,
    htmlToPlainText,
} from '@jewellery-catalogue/types';
import { useEffect, useState } from 'react';

import TagInput from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { aiErrorMessage } from '@/utils/aiErrorMessage';

import { useEtsyPush } from '../../hooks/useEtsyPush';
import { useEtsyTaxonomy } from '../../hooks/useEtsyTaxonomy';
import { useGenerateEtsyListing } from '../../hooks/useGenerateEtsyListing';
import { useUserSettings } from '../../hooks/useUserSettings';
import { DESIGN_TYPE_LABELS } from '../../lib/materialLabels';
import { ResponsiveDialog } from '../ResponsiveDialog';

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
    aiErrorMessage(error, "Couldn't generate the listing. Your text is unchanged; try again.");

export const describePhotoCount = (count: number): string => {
    if (count === 0) return 'No product photos. You can add them on Etsy before publishing.';

    return count === 1 ? '1 photo will be sent' : `${count} photos will be sent`;
};

const EtsyPushDialog: React.FC<EtsyPushDialogProps> = ({ design, open, onOpenChange }) => {
    const { etsyDescriptionTemplate, etsyTaxonomyMap } = useUserSettings();
    const { push, isPushing, pushError } = useEtsyPush(design.id);
    const { options: taxonomyOptions, isLoading: taxonomyLoading } = useEtsyTaxonomy(open);
    const { generate, isGenerating, generateError, resetGenerate } = useGenerateEtsyListing(design.id);

    const seed = (): EtsyListingCopy =>
        design.etsyListing ?? {
            title: design.name.slice(0, ETSY_TITLE_MAX),
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
    const typeLabel = design.designType ? DESIGN_TYPE_LABELS[design.designType].toLowerCase() : undefined;
    const categoryName = taxonomyOptions.find((option) => option.id === taxonomyId)?.label;
    // The server ignores title/description/tags when resuming an interrupted push.
    const resuming = !!design.etsy?.pushIncomplete;
    const titleValid = etsyListingSchema.shape.title.safeParse(title).success;
    const canSend = !!taxonomyId && (resuming || (titleValid && description.trim().length > 0));

    const handleGenerate = () => generate(undefined, { onSuccess: applyCopy });

    const handleSend = async () => {
        await push(resuming ? { price } : { title: title.trim(), description, tags, price });
        onOpenChange(false);
    };

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Send to Etsy"
            description="Review before creating the draft listing on Etsy."
            className="sm:max-w-xl"
            footer={
                <>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPushing}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSend} disabled={isPushing || isGenerating || !canSend}>
                        {isPushing ? 'Sending…' : 'Send to Etsy'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                        Write a title, description and tags from this design's materials and photos.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerate}
                        disabled={isGenerating || isPushing || resuming}
                    >
                        {isGenerating ? 'Writing…' : 'Write title and description'}
                    </Button>
                </div>
                {resuming && (
                    <p className="text-sm text-muted-foreground">
                        Resuming an interrupted upload. The listing text was already sent to Etsy.
                    </p>
                )}
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
                        disabled={resuming}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    {!resuming && title.trim().length > 0 && !titleValid && (
                        <p className="text-xs text-destructive">
                            {title.trim().length > ETSY_TITLE_MAX
                                ? `Etsy titles can be at most ${ETSY_TITLE_MAX} characters.`
                                : 'Etsy titles can use %, :, & and + once each, and no emoji or symbols like £ or ½.'}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="etsy-description">Description</Label>
                    <Textarea
                        id="etsy-description"
                        value={description}
                        disabled={resuming}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={8}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="etsy-tags">Tags</Label>
                    <TagInput id="etsy-tags" value={tags} onChange={setTags} disabled={resuming} />
                </div>

                <div className="space-y-1.5">
                    <Label>Category</Label>
                    {taxonomyId ? (
                        <>
                            <p className="text-sm">
                                {categoryName ?? (taxonomyLoading ? 'Loading category' : `Etsy category ${taxonomyId}`)}
                            </p>
                            <p className="text-xs text-muted-foreground">Set for {typeLabel} in Settings</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No category is set for {typeLabel ?? 'this design type'}. Set one in Settings before
                            sending.
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="etsy-price">Price</Label>
                    <InputGroup className="max-w-[160px]">
                        <InputGroupAddon align="inline-start">
                            <InputGroupText>£</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                            id="etsy-price"
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
                    <p className="text-sm text-muted-foreground">{describePhotoCount(design.imageIds.length)}</p>
                </div>

                {pushError && (
                    <p className="text-sm text-destructive">
                        {pushError instanceof Error ? pushError.message : 'Failed to send to Etsy.'}
                    </p>
                )}
            </div>
        </ResponsiveDialog>
    );
};

export default EtsyPushDialog;
