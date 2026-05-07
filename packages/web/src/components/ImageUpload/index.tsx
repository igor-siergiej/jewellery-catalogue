import type { FormDesign } from '@jewellery-catalogue/types';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import { Image } from '@/components/Image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    setImage: UseFormSetValue<FormDesign>;
    onChange?: (value: File | undefined) => void;
    hasError?: boolean;
    value?: File | string;
}

const baseClass =
    'border-2 rounded-lg w-[300px] h-[300px] flex items-center justify-center overflow-hidden relative transition-colors';

const ImageUpload: React.FC<ImageUploadProps> = ({ setImage, onChange, hasError = false, value }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (value instanceof File) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(value);
        } else {
            setPreview(null);
        }
    }, [value]);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setImage('image', file, { shouldDirty: true });
        onChange?.(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
    };

    const handleAreaClick = () => fileInputRef.current?.click();

    const clearImage = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setPreview(null);
        setImage('image', undefined as any, { shouldDirty: true });
        onChange?.(undefined);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const changeImage = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        fileInputRef.current?.click();
    };

    const hasImage = value instanceof File ? !!preview : !!value;

    const hiddenInput = (
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    );

    if (hasImage) {
        return (
            <div
                className={cn(
                    baseClass,
                    'border-solid border-border cursor-default',
                    hasError ? 'border-destructive' : 'border-border'
                )}
            >
                {hiddenInput}
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                ) : (
                    <div className="w-full h-full">
                        <Image imageId={value as string} />
                    </div>
                )}
                <div className="flex gap-2 z-10 absolute bottom-3 right-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={changeImage}
                        className="w-9 h-9 bg-card/80 backdrop-blur-sm"
                        title="Change image"
                    >
                        <ImagePlus className="w-4 h-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={clearImage}
                        className="w-9 h-9"
                        title="Remove image"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onDrop={handleDrop}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={handleAreaClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAreaClick();
                }
            }}
            className={cn(
                baseClass,
                'border-dashed cursor-pointer',
                isDragging
                    ? 'border-primary bg-muted/50'
                    : hasError
                      ? 'border-destructive bg-card'
                      : 'border-border bg-card'
            )}
        >
            {hiddenInput}
            <div className="flex flex-col items-center justify-center w-full">
                <ImagePlus className="w-8 h-8 text-gray-600 mb-2" />
                <span className="text-gray-600 text-center">Drag & Drop or Click to Upload</span>
            </div>
        </div>
    );
};

export default ImageUpload;
