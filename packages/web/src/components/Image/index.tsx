import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export interface ImageProps {
    imageId: string;
}

export const Image: React.FC<ImageProps> = ({ imageId }) => {
    const [error, setError] = useState(false);
    const imgSrc = `/api/image/${imageId}`;

    if (error) {
        return (
            <div className="flex items-center justify-center w-full h-full bg-muted rounded-md">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            className="w-full h-full object-cover rounded-md"
            onError={() => setError(true)}
            alt={`${imageId}`}
        />
    );
};
