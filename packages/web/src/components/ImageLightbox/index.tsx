import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useRestoreFocus } from '@/hooks/useRestoreFocus';

import { Image } from '../Image';

/** A stored upload (`imageId`) or an external URL such as an Etsy listing photo. */
export interface GalleryImage {
    key: string;
    alt: string;
    imageId?: string;
    url?: string;
}

export const GalleryImageView: React.FC<{ image: GalleryImage }> = ({ image }) =>
    image.imageId ? (
        <Image imageId={image.imageId} size="display" alt={image.alt} />
    ) : (
        <img src={image.url} alt={image.alt} className="h-full w-full rounded-md object-contain" />
    );

interface ImageLightboxProps {
    images: GalleryImage[];
    index: number | null;
    onIndexChange: (index: number | null) => void;
    title: string;
}

const NAV_BUTTON =
    'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground hover:bg-card disabled:pointer-events-none disabled:opacity-0';

export function ImageLightbox({ images, index, onIndexChange, title }: ImageLightboxProps) {
    const open = index !== null && images.length > 0;
    const restoreFocus = useRestoreFocus(open);
    const current = open ? Math.min(index, images.length - 1) : 0;
    const go = (to: number) => onIndexChange(Math.max(0, Math.min(images.length - 1, to)));

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') go(current - 1);

        if (event.key === 'ArrowRight') go(current + 1);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
            <DialogContent
                className="flex h-dvh max-w-none flex-col gap-3 rounded-none p-4 sm:h-[90vh] sm:max-w-[min(92vw,1200px)] sm:rounded-lg"
                onKeyDown={onKeyDown}
                onCloseAutoFocus={restoreFocus}
            >
                <div className="pr-10">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {current + 1} of {images.length}
                    </DialogDescription>
                </div>
                {open && (
                    <div className="relative min-h-0 flex-1">
                        <GalleryImageView image={images[current]} />
                        {images.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Previous image"
                                    onClick={() => go(current - 1)}
                                    disabled={current === 0}
                                    className={`${NAV_BUTTON} left-2`}
                                >
                                    <ChevronLeft className="size-5" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next image"
                                    onClick={() => go(current + 1)}
                                    disabled={current === images.length - 1}
                                    className={`${NAV_BUTTON} right-2`}
                                >
                                    <ChevronRight className="size-5" aria-hidden />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
