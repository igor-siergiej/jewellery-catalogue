import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import { Controller } from 'react-hook-form';
import MenuItem from '@mui/material/MenuItem';
import { type Control } from 'react-hook-form';

export interface IProps {
    options: Array<string>;
    control: Control<any, any>;
    label: string;
}

const DropDown: React.FC<IProps> = ({ control, options, label }) => {
    return (
        <Controller
            name="type"
            control={control}
            render={({ field }) => (
                <>
                    <InputLabel
                        sx={{ marginY: 2, color: 'black' }}
                        id="typeLabel"
                    >
                        {label}
                    </InputLabel>
                    <Select
                        labelId="typeLabel"
                        sx={{
                            lineHeight: '1.4em',
                            width: '250px',
                            '.MuiSelect-select': { paddingTop: 1.5 },
                        }}
                        defaultValue={''}
                        variant="filled"
                        color="secondary"
                        label="Material Type"
                        {...field}
                    >
                        {options.map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </Select>
                </>
            )}
        />
    );
};

export default DropDown;
