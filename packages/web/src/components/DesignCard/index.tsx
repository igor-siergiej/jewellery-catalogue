import { Design } from '@jewellery-catalogue/types';
import useStyles from './index.styles';
import { Button, Card, CardActions, Divider, Grid2, IconButton, Typography } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Image } from '../Image';

export interface DesignCardProps {
    design: Design;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design }) => {
    const { name, timeRequired, id, imageId, materials } = design;
    const { classes } = useStyles();

    const materialsLabels = materials.map(({ name, type }) => {
        return (
            <Grid2 direction="row" container sx={{ width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
                <Typography variant="subtitle2">
                    Name:
                    {' '}
                    {name}
                </Typography>

                <Typography variant="subtitle2">
                    Type:
                    {' '}
                    {type}
                </Typography>

                <Button>Go To Material</Button>
            </Grid2>
        );
    });

    return (
        <Card key={id} elevation={3} className={classes.container}>
            <Grid2 container direction="row" gap={2} wrap="nowrap" className={classes.topRowContainer}>
                <Grid2 className={classes.imageContainer} size={2}>
                    <Image imageId={imageId} />
                </Grid2>

                <Grid2 size={5} container direction="column" gap={1}>
                    <Typography variant="h5">
                        Name:
                        {' '}
                        {name}
                    </Typography>
                    <Divider />
                    <Typography variant="subtitle1">
                        Price:
                        {' '}
                        $15.00
                    </Typography>

                    <Typography variant="subtitle1">
                        Time to make:
                        {' '}
                        {timeRequired}
                    </Typography>

                    <Typography variant="subtitle1">
                        Material Costs:
                        {' '}
                        $10.00
                    </Typography>
                </Grid2>

                <Grid2 size={5} container direction="column" gap={1}>
                    <Typography variant="h5">
                        Materials
                    </Typography>

                    <Divider />
                    {materialsLabels}
                </Grid2>
            </Grid2>

            <CardActions disableSpacing sx={{ display: 'flex', width: '100%' }}>
                <IconButton>
                    <FavoriteIcon />
                </IconButton>

                <IconButton>
                    <ExpandMoreIcon />
                </IconButton>
            </CardActions>
        </Card>
    );
};
