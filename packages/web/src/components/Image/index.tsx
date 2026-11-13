import { useAuth } from '@imapps/web-utils';
import { Gem } from 'lucide-react';
import { useState } from 'react';

import { getImageSrc, type ImageSize } from '../../utils/imageSrc';

export interface ImageProps {
    imageId: string;
    size?: ImageSize;
}

export const Image: React.FC<ImageProps> = ({ imageId, size }) => {
    const [error, setError] = useState(false);
    const { accessToken } = useAuth();

    if (error || !imageId) {
        return (
            <div
                className="flex h-full w-full items-center justify-center rounded-md bg-muted"
                data-testid="image-placeholder"
            >
                <Gem className="h-auto w-2/5 max-w-16 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            </div>
        );
    }

    return (
        <img
            src={getImageSrc(imageId, accessToken, size)}
            className="w-full h-full object-contain rounded-md"
            onError={() => setError(true)}
            alt={`${imageId}`}
        />
    );
};
