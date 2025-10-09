import type { FormDesign } from '@jewellery-catalogue/types';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    setImage: UseFormSetValue<FormDesign>;
    hasError?: boolean;
    value?: File;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ setImage, hasError = false, value }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Clear preview when form is reset (value becomes undefined)
    useEffect(() => {
        if (!value) {
            setPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [value]);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();

        reader.onload = () => {
            setPreview(reader.result as string);
        };

        reader.readAsDataURL(file);
        setImage('image', file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const clearImage = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            className={cn(
                'border-2 border-dashed rounded-lg w-[300px] h-[300px] cursor-pointer flex items-center justify-center overflow-hidden relative transition-colors',
                isDragging
                    ? 'border-primary bg-muted/50'
                    : hasError
                      ? 'border-destructive bg-card'
                      : 'border-border bg-card'
            )}
        >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
            {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover absolute top-0 left-0" />
            ) : (
                <div className="flex flex-col items-center justify-center w-full">
                    <ImagePlus className="w-8 h-8 text-gray-600 mb-2" />
                    <span className="text-gray-600 text-center">Drag & Drop or Click to Upload</span>
                </div>
            )}

            {preview && (
                <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearImage}
                    className="w-9 h-9 z-10 absolute top-0 right-0"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
};

export default ImageUpload;
