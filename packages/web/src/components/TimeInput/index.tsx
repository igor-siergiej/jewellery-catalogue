import { FormDesign } from '@jewellery-catalogue/types';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Dayjs } from 'dayjs';
import { UseFormSetValue } from 'react-hook-form';

export interface TimeInputProps {
    setValue: UseFormSetValue<FormDesign>;
}

const TimeInput: React.FC<TimeInputProps> = ({ setValue }) => {
    const onChange = (date: Dayjs | null) => {
        if (!date) {
            return null;
        }

        setValue('timeRequired', date.format('HH:mm'));
    };

    return (
        <TimePicker
            sx={{
                width: '100%',
            }}
            ampm={false}
            label="Time Spent Crafting"
            format="HH:mm"
            onChange={value => onChange(value)}
        />
    );
};

export default TimeInput;
