import { Design } from '@jewellery-catalogue/types';
import useStyles from './index.styles';
import { Card, CardActions, Grid2, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface DesignCardProps {
    design: Design;
}

export const DesignCard: React.FC<DesignCardProps> = ({ design }) => {
    const { classes } = useStyles();
    return (
        <Card elevation={3} className={classes.container}>

            <Grid2 container gap={4}>

                <span>
                    {design.name}
                </span>

                <span>
                    {design.timeRequired}
                </span>
                <span>
                    {design.description}
                </span>

            </Grid2>

            <CardActions disableSpacing>
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
