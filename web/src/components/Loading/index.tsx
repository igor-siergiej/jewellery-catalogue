import { CircularProgress, Grid } from '@mui/material';

const LoadingScreen = () => {
  console.log('loadin');
  return (
    <Grid
      container
      alignItems="center"
      justifyContent="center"
      sx={{ minHeight: '50vh' }}
    >
      {GradientCircularProgress()}
    </Grid>
  );
};

const GradientCircularProgress = () => (
  <>
    <svg width={0} height={0}>
      <defs>
        <linearGradient id="my_gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e01cd5" />
          <stop offset="100%" stopColor="#1CB5E0" />
        </linearGradient>
      </defs>
    </svg>
    <CircularProgress sx={{ width: '20% !important', height: '0% !important', 'svg circle': { stroke: 'url(#my_gradient)' } }} />
  </>
);

export default LoadingScreen;
