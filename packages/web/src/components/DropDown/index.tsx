import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { Controller } from 'react-hook-form';
import MenuItem from '@mui/material/MenuItem';
import { type Control } from 'react-hook-form';
import { WireKeysEnum, BeadKeysEnum, ChainKeysEnum, EarHookKeysEnum } from '@jewellery-catalogue/types';
import FormControl from '@mui/material/FormControl';
import Box from '@mui/material/Box';

export interface IProps {
    options: Array<string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any, any>;
    label: string;
    name: keyof typeof WireKeysEnum | keyof typeof BeadKeysEnum | keyof typeof ChainKeysEnum | keyof typeof EarHookKeysEnum;
}

const DropDown: React.FC<IProps> = ({ control, options, label, name }) => {
    return (
        <Box
            sx={{
                marginBottom: 2,
            }}
        >
            <Controller
                name={name}
                control={control}
                defaultValue=""
                render={({ field }) => (
                    <FormControl variant="filled" fullWidth>
                        <InputLabel id={name}>{label}</InputLabel>
                        <Select
                            labelId={name}
                            sx={{
                                width: '200px',
                            }}
                            defaultValue=""
                            variant="filled"
                            color="secondary"
                            required
                            {...field}
                        >
                            {options.map(type => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            />
        </Box>
    );
};

export default DropDown;
