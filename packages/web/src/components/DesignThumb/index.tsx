import type { Design } from '@jewellery-catalogue/types';

import { Image } from '@/components/Image';

/** A 40px thumbnail: the design's own photo, else its Etsy photo, else the neutral placeholder. */
export const DesignThumb = ({ design }: { design: Design }) => {
    const etsyImageUrl = design.etsy?.imageUrls?.[0];

    return (
        <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
            {design.imageIds?.[0] ? (
                <Image imageId={design.imageIds[0]} size="thumb" />
            ) : etsyImageUrl ? (
                <img src={etsyImageUrl} alt="" className="h-full w-full object-contain" />
            ) : (
                <Image imageId="" />
            )}
        </div>
    );
};
