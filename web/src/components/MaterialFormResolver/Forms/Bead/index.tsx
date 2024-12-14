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
                {...register('quantity', {
                    valueAsNumber: true,
                    required: {
                        value: true,
                        message: 'Please enter a quantity of beads.',
                    },
                    validate: (value) => value > 0,
                })}
                color="secondary"
                label={`Quantity`}
            />
        </>
    );
};

export default AddBeadForm;
