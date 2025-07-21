import { METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';
import TextField from '@mui/material/TextField';

import DropDown from '../../../DropDown';
import { IMaterialFormProps } from '../types';

const AddEarHookForm: React.FC<IMaterialFormProps> = ({ register, control }) => {
    return (
        <>
            <DropDown
                label="Metal Type"
                name="metalType"
                options={Object.keys(METAL_TYPE) as Array<METAL_TYPE>}
                control={control}
            />

            <DropDown
                label="Wire Type"
                name="wireType"
                options={Object.keys(WIRE_TYPE) as Array<WIRE_TYPE>}
                control={control}
            />

            <TextField
                color="secondary"
                label="Quantity"
                type="number"
                inputProps={{ step: '1' }}
                {...register('quantity', {
                    required: {
                        value: true,
                        message: 'Please enter the quantity.',
                    },
                    validate: value => value > 0,
                    setValueAs: value => value === '' ? undefined : Number(value),
                })}
            />

            <TextField
                color="secondary"
                label="Diameter (Millimeters)"
                type="number"
                inputProps={{ step: '0.1' }}
                {...register('diameter', {
                    required: {
                        value: true,
                        message: 'Please enter the diameter.',
                    },
                    validate: value => value > 0,
                    setValueAs: value => value === '' ? undefined : Number(value),
                })}
            />

            <TextField
                color="secondary"
                label="Length per hook (Millimeters)"
                type="number"
                inputProps={{ step: '0.1' }}
                {...register('length', {
                    required: {
                        value: true,
                        message: 'Please enter the hook length.',
                    },
                    validate: value => value > 0,
                    setValueAs: value => value === '' ? undefined : Number(value),
                })}
            />
        </>
    );
};

export default AddEarHookForm;
