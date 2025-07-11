import { Box, Button, Card, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import IMAGES from '../../img';
import { LoginForm } from '../../components/LoginForm';
import { useRedirectIfAuthenticated } from '../../hooks/useAuthRedirect';

const Start = () => {
    const navigate = useNavigate();

    useRedirectIfAuthenticated();

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                height: '100vh',
                width: '100vw',
            }}
        >
            <Card
                raised
                sx={{
                    backgroundColor: '#fff',
                    width: '1000px',

                    height: '800px',
                }}
            >
                <Grid container spacing={0} sx={{ height: '100%', width: '100%' }}>
                    <Grid size={7}>
                        <Grid container sx={{ display: 'flex', height: '100%', padding: '3em 1em 1em 1em', alignItems: 'center', flexDirection: 'column' }}>
                            <Typography
                                variant="h3"
                            >
                                Jewellery Catalogue
                            </Typography>

                            <Typography
                                variant="h5"
                                sx={{ padding: '2em 0 1em 0' }}
                            >
                                Welcome back Goldsmith!
                            </Typography>

                            <Box sx={{ width: '60%', gap: '1em', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                                <LoginForm />

                                <Typography
                                    variant="body2"
                                    paddingTop={8}
                                >
                                    Haven't joined the goldsmith empire yet?
                                </Typography>

                                <Button
                                    fullWidth
                                    color="secondary"
                                    variant="contained"
                                    onClick={() => {
                                        navigate('home');
                                    }}
                                >
                                    Register!
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid size={5} sx={{ overflow: 'hidden' }}>
                        <Box
                            component="img"
                            sx={{ objectFit: 'cover', width: '100%', height: '100%' }}
                            src={IMAGES.startImage}
                            alt="jewellery"
                        />
                    </Grid>
                </Grid>
            </Card>
        </Box>
    );
};

export default Start;
