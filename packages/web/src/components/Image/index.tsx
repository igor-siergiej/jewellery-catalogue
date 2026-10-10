import { useAuth } from '@imapps/web-utils';
import { AlertTriangle } from 'lucide-react';
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
            <div className="flex items-center justify-center w-full h-full bg-muted rounded-md">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
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
