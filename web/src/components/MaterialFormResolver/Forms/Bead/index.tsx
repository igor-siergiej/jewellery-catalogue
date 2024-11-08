import { IMaterialFormProps } from '../types';
import { TextField } from '@mui/material';

const AddBeadForm: React.FC<IMaterialFormProps> = ({ register }) => {
    return (
        <>
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
        </>
    );
};

export default AddBeadForm;
