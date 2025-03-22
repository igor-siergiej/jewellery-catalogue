import Button from '@mui/material/Button';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import useStyles from './index.styles';

const ImageUploadButton: React.FC = () => {
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
                className={classes.upload}
                type="file"
                onChange={(event) => console.log(event.target.files)}
                multiple
            />
        </Button>
    );
};
export default ImageUploadButton;
