import { FormDesign } from '@jewellery-catalogue/types';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ClearIcon from '@mui/icons-material/Clear';
import { Button, Grid } from '@mui/material';
import Box from '@mui/material/Box';
import { useRef, useState } from 'react';
import { UseFormSetValue } from 'react-hook-form';

interface ImageUploadProps {
    setImage: UseFormSetValue<FormDesign>;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ setImage }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
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
        if (e.target.files && e.target.files[0]) {
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
        <Box
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
            sx={{
                border: isDragging ? '2px dashed #0070f3' : '2px dashed #ccc',
                borderRadius: '8px',
                width: '300px',
                height: '300px',
                cursor: 'pointer',
                backgroundColor: isDragging ? '#f0f8ff' : '#e6efff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleChange}
            />
            {preview
                ? (
                        <img
                            src={preview}
                            alt="Preview"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                            }}
                        />
                    )
                : (
                        <Grid container direction="column" display="flex" justifyContent="center" alignItems="center" sx={{ width: '100%' }}>
                            <AddPhotoAlternateIcon sx={{ width: 32, height: 32, color: '#666' }} />
                            <span style={{ color: '#666', textAlign: 'center' }}>
                                Drag & Drop or Click to Upload
                            </span>
                        </Grid>
                    )}

            {preview && (
                <Button
                    variant="contained"
                    color="error"
                    onClick={clearImage}
                    style={{
                        width: 36,
                        minWidth: 36,
                        zIndex: 2,
                        borderRadius: '4px',
                        border: 'none',
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        right: 0
                    }}
                >
                    <ClearIcon />
                </Button>
            )}
        </Box>
    );
};

export default ImageUpload;
