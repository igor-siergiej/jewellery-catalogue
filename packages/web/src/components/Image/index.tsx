import { useState } from 'react';
import useStyles from './index.styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { origin } from '../../api/makeRequest';

export interface ImageProps {
    imageId: string;
}

export const Image: React.FC<ImageProps> = ({ imageId }) => {
    const { classes } = useStyles();
    const [error, setError] = useState(false);
    const imgSrc = `${origin}/api/image/${imageId}`;

    if (error) {
        return (<ErrorOutlineIcon />);
    }

    return (
        <img src={imgSrc} className={classes.image} onError={() => setError(true)} />
    );
};
