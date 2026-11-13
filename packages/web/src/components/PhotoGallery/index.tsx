import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Image } from '../Image';
import { type GalleryImage, GalleryImageView, ImageLightbox } from '../ImageLightbox';

interface PhotoGalleryProps {
    images: GalleryImage[];
    title: string;
    index: number;
    onIndexChange: (index: number) => void;
}

const NAV_BUTTON =
    'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground transition-opacity hover:bg-card disabled:pointer-events-none disabled:opacity-0';

/** Square photo carousel; selecting the photo opens it full size. */
export function PhotoGallery({ images, title, index, onIndexChange }: PhotoGalleryProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const count = images.length;

    return (
        <div className="relative">
            <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                {count > 0 ? (
                    <div
                        className="flex h-full transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${index * 100}%)` }}
                    >
                        {images.map((image, i) => (
                            <button
                                key={image.key}
                                type="button"
                                aria-label={`Open photo ${i + 1} of ${count} full size`}
                                aria-hidden={i !== index}
                                tabIndex={i === index ? 0 : -1}
                                onClick={() => setLightboxIndex(i)}
                                className="h-full w-full flex-shrink-0 cursor-zoom-in"
                            >
                                <GalleryImageView image={image} />
                            </button>
                        ))}
                    </div>
                ) : (
                    <Image imageId="" />
                )}
            </div>
            {count > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous photo"
                        onClick={() => onIndexChange(Math.max(0, index - 1))}
                        disabled={index === 0}
                        className={`${NAV_BUTTON} left-2`}
                    >
                        <ChevronLeft className="size-5" aria-hidden />
                    </button>
                    <button
                        type="button"
                        aria-label="Next photo"
                        onClick={() => onIndexChange(Math.min(count - 1, index + 1))}
                        disabled={index === count - 1}
                        className={`${NAV_BUTTON} right-2`}
                    >
                        <ChevronRight className="size-5" aria-hidden />
                    </button>
                    <div className="absolute inset-x-0 bottom-1 flex overflow-x-auto">
                        <div className="mx-auto flex">
                            {images.map((image, i) => (
                                <button
                                    key={image.key}
                                    type="button"
                                    aria-label={`Show photo ${i + 1} of ${count}`}
                                    aria-current={i === index}
                                    onClick={() => onIndexChange(i)}
                                    className="flex size-6 shrink-0 items-center justify-center max-md:h-11 max-md:w-11"
                                >
                                    <span
                                        className={cn(
                                            'h-1.5 rounded-full border border-border transition-all',
                                            i === index ? 'w-4 bg-foreground' : 'w-1.5 bg-card'
                                        )}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
            <ImageLightbox
                images={images}
                index={lightboxIndex}
                onIndexChange={(i) => {
                    setLightboxIndex(i);

                    if (i !== null) onIndexChange(i);
                }}
                title={title}
            />
        </div>
    );
}
