import { CircularProgress, Grid } from '@mui/material';

const LoadingScreen = () => {
    console.log('loadin');
    return (
        <Grid
            container
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: '100vh' }}
        >
            <CircularProgress size={'10em'} />
        </Grid>
    );
};

export default LoadingScreen;
