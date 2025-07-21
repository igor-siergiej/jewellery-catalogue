import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()(() => ({
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
}));

export default useStyles;
