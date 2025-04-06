import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import useStyles from './index.styles';
import { UseFormRegister } from 'react-hook-form';
import { FormDesign } from '@jewellery-catalogue/types';

export interface ImageUploadButtonProps {
    register: UseFormRegister<FormDesign>
}

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ register }) => {
    const { classes } = useStyles();

    return (
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
                className={classes.upload}
                type="file"
            />
        </Button>
    );
};

export default ImageUploadButton;
