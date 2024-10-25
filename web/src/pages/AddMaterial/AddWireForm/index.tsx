import { UseFormRegister } from 'react-hook-form';
import { Material } from '../../Materials/types';
import TextField from '@mui/material/TextField';

export interface IProps {
    register: UseFormRegister<Material>;
}

const AddWireForm: React.FC<IProps> = ({ register }) => {
    const test = 2;

    return <TextField {...register('name')} color="secondary" label="Name" />;
};

export default AddWireForm;
