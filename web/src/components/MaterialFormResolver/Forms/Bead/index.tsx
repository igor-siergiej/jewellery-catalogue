import { IMaterialFormProps } from '../types';
import { TextField, Typography } from '@mui/material';

const AddBeadForm: React.FC<IMaterialFormProps> = ({ register }) => {
    return (
        <>
            <Typography variant="body2">Add Bead Form</Typography>

            <TextField
                {...register('colour')}
                color="secondary"
                label={`Colour`}
            />

            <TextField
                {...register('quantity')}
                color="secondary"
                label={`Quantity`}
            />

            <TextField
                {...register('pricePerBead')}
                color="secondary"
                label={`Price per pack (£/Pack)`}
            />
        </>
    );
};

export default AddBeadForm;
