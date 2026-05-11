import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Image } from '@/components/Image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MultiImageUploadProps {
    value: Array<File | string>;
    onChange: (images: Array<File | string>) => void;
    hasError?: boolean;
}

function Thumbnail({ item, onRemove }: { item: File | string; onRemove: () => void }) {
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (item instanceof File) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(item);
        } else {
            setPreview(null);
        }
    }, [item]);

    return (
        <div className="relative w-24 h-24 rounded-md overflow-hidden border border-border flex-shrink-0">
            {item instanceof File && preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : typeof item === 'string' ? (
                <Image imageId={item} />
            ) : null}
            <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={onRemove}
                className="absolute top-1 right-1 w-5 h-5 rounded-full"
            >
                <X className="w-3 h-3" />
            </Button>
        </div>
    );
}

function itemKey(item: File | string, i: number): string {
    return typeof item === 'string' ? item : `file-${i}-${item.name}-${item.size}`;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ value, onChange, hasError = false }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const addFiles = (files: FileList | null) => {
        if (!files) return;
        const newImages = Array.from(files).filter((f) => f.type.startsWith('image/'));
        onChange([...value, ...newImages]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => addFiles(e.target.files);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const remove = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-wrap gap-3 items-start">
            {value.map((item, i) => (
                <Thumbnail key={itemKey(item, i)} item={item} onRemove={() => remove(i)} />
            ))}

            <div
                role="button"
                tabIndex={0}
                onDrop={handleDrop}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                    }
                }}
                className={cn(
                    'w-24 h-24 rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors flex-shrink-0',
                    isDragging
                        ? 'border-primary bg-muted/50'
                        : hasError
                          ? 'border-destructive bg-card'
                          : 'border-border bg-card hover:border-primary/50'
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleChange}
                />
                <ImagePlus className="w-5 h-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground text-center leading-tight px-1">Add</span>
            </div>
        </div>
    );
};

export default MultiImageUpload;
