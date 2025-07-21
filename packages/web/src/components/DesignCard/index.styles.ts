import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()(() => ({
    container: {
        width: '100%',
        padding: 8,
        marginBottom: 24,
        maxHeight: 400,
        justifyContent: 'space-around',
        alignItems: 'center',
        display: 'flex',
        overflow: 'hidden',
        flexWrap: 'wrap'
    },
    topRowContainer: {
        width: '100%'
    },
    imageContainer: {
        height: 200,
        width: 200
    },
    materialsTable: {
        gap: 1
    }
}));

export default useStyles;
