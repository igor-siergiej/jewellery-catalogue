import { Design } from '@jewellery-catalogue/types';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Button, Card, CardActions, Divider, Grid, IconButton, Typography } from '@mui/material';

import { Image } from '../Image';
import useStyles from './index.styles';

export interface DesignCardProps {
    design: Design;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design }) => {
    const { name, timeRequired, id, imageId, materials } = design;
    const { classes } = useStyles();

    const materialsLabels = materials.map(({ id }) => {
        return (
            <Grid direction="row" container sx={{ width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
                <Typography variant="subtitle2">
                    id:
                    {' '}
                    {id}
                </Typography>

                <Button>Go To Material</Button>
            </Grid>
        );
    });

    return (
        <Card key={id} elevation={3} className={classes.container}>
            <Grid container direction="row" gap={2} wrap="nowrap" className={classes.topRowContainer}>
                <Grid className={classes.imageContainer} size={2}>
                    <Image imageId={imageId} />
                </Grid>

                <Grid size={5} container direction="column" gap={1}>
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
                </Grid>

                <Grid size={5} container direction="column" gap={1}>
                    <Typography variant="h5">
                        Materials
                    </Typography>

                    <Divider />
                    {materialsLabels}
                </Grid>
            </Grid>

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
