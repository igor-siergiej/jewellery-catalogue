import { IMaterialFormProps } from '../types';
import { TextField } from '@mui/material';

const AddBeadForm: React.FC<IMaterialFormProps> = ({ register }) => {
    return (
        <>
            <TextField
                {...register('colour')}
                color="secondary"
                label="Colour"
            />

            <TextField
                color="secondary"
                label="Diameter (Millimeters)"
                type="number"
                inputProps={{ step: "0.1" }}
                {...register('diameter', {
                    required: {
                        value: true,
                        message: 'Please enter the diameter.',
                    },
                    validate: value => value > -1,
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                })}
            />

            <TextField
                {...register('quantity', {
                    required: {
                        value: true,
                        message: 'Please enter a quantity of beads.',
                    },
                    validate: value => value > 0,
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                })}
                type="number"
                inputProps={{ step: "1" }}
                color="secondary"
                label="Quantity"
            />
        </>
    );
};

export default AddBeadForm;
