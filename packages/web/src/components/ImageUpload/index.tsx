import type { FormDesign } from '@jewellery-catalogue/types';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';

import { Image } from '@/components/Image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    setImage: UseFormSetValue<FormDesign>;
    hasError?: boolean;
    value?: File | string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ setImage, hasError = false, value }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditingImage, setIsEditingImage] = useState(false);

    // Handle initial value (existing image or new file)
    useEffect(() => {
        if (value instanceof File) {
            // New file selected - show preview
            const reader = new FileReader();
            reader.onload = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(value);
            setIsEditingImage(false);
        } else if (typeof value === 'string' && value) {
            // Existing image ID - don't show preview, show the existing image
            setPreview(null);
            setIsEditingImage(false);
        } else {
            // No value - show upload UI
            setPreview(null);
            setIsEditingImage(false);
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
        setIsEditingImage(false);
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
        setImage('image', undefined as any);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const startEditing = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditingImage(true);
    };

    // Show existing image (from edit mode)
    const hasExistingImage = typeof value === 'string' && value;
    const showEditButton = hasExistingImage && !isEditingImage;

    return (
        <div
            role="button"
            tabIndex={showEditButton ? -1 : 0}
            onDrop={!showEditButton ? handleDrop : undefined}
            onDragOver={!showEditButton ? handleDragOver : undefined}
            onDragLeave={!showEditButton ? handleDragLeave : undefined}
            onClick={!showEditButton ? handleClick : undefined}
            onKeyDown={(e) => {
                if (!showEditButton && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleClick();
                }
            }}
            className={cn(
                'border-2 border-dashed rounded-lg w-[300px] h-[300px] cursor-pointer flex items-center justify-center overflow-hidden relative transition-colors',
                showEditButton ? 'border-solid border-border cursor-default' : '',
                isDragging && !showEditButton
                    ? 'border-primary bg-muted/50'
                    : hasError
                      ? 'border-destructive bg-card'
                      : 'border-border bg-card'
            )}
        >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

            {/* Show new file preview */}
            {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover absolute top-0 left-0" />
            ) : showEditButton ? (
                // Show existing image for edit mode
                <div className="w-full h-full">
                    <Image imageId={value as string} />
                </div>
            ) : isEditingImage ? (
                // Show upload UI when editing existing image
                <div className="flex flex-col items-center justify-center w-full">
                    <ImagePlus className="w-8 h-8 text-gray-600 mb-2" />
                    <span className="text-gray-600 text-center">Drag & Drop or Click to Upload</span>
                </div>
            ) : (
                // Show upload UI for new images
                <div className="flex flex-col items-center justify-center w-full">
                    <ImagePlus className="w-8 h-8 text-gray-600 mb-2" />
                    <span className="text-gray-600 text-center">Drag & Drop or Click to Upload</span>
                </div>
            )}

            {/* Clear button for new preview */}
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

            {/* Edit/Clear buttons for existing image */}
            {showEditButton && (
                <div className="flex gap-2 z-10 absolute bottom-3 right-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={startEditing}
                        className="w-9 h-9 bg-card/80 backdrop-blur-sm"
                        title="Change image"
                    >
                        <ImagePlus className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={clearImage}
                        className="w-9 h-9"
                        title="Remove image"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
