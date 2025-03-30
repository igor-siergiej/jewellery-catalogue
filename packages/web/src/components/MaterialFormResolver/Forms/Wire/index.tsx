import { IMaterialFormProps } from '../types';
import DropDown from '../../../DropDown';
import TextField from '@mui/material/TextField';
import { METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';

const AddWireForm: React.FC<IMaterialFormProps> = ({ register, control }) => {
    return (
        <>
            <DropDown
                name="wireType"
                label="Wire Type"
                options={Object.keys(WIRE_TYPE) as Array<WIRE_TYPE>}
                control={control}
            />
            <DropDown
                label="Metal Type"
                name="metalType"
                options={Object.keys(METAL_TYPE) as Array<METAL_TYPE>}
                control={control}
            />

            <TextField
                color="secondary"
                label="Length per pack (Meters)"
                {...register('length', {
                    valueAsNumber: true,
                    required: {
                        value: true,
                        message: 'Please enter the wire length.',
                    },
                    validate: value => value > 0,
                })}
            />
        </>
    );
};

export default AddWireForm;
