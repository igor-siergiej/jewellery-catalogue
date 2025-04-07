import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import useStyles from './index.styles';
import { UseFormRegister } from 'react-hook-form';
import { FormDesign } from '@jewellery-catalogue/types';
import { useState } from 'react';

export interface ImageUploadButtonProps {
    register: UseFormRegister<FormDesign>;
}

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ register }) => {
    const { classes } = useStyles();
    const [selectedImage, setSelectedImage] = useState<string>();

    return (
        <div>
            <Button
                component="label"
                role={undefined}
                variant="contained"
                tabIndex={-1}
                startIcon={<CloudUploadIcon />}
            >
                Upload files
                <input
                    {...register('image')}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        setSelectedImage(file ? URL.createObjectURL(file) : undefined);
                    }}
                    className={classes.upload}
                    type="file"
                />
            </Button>

            {selectedImage && (<img src={selectedImage} />)}

        </div>
    );
};

export default ImageUploadButton;
