import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { UseFormSetValue } from 'react-hook-form';
import { Dayjs } from 'dayjs';
import { FormDesign } from '@jewellery-catalogue/types';

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
                maxWidth: 200,
            }}
            ampm={false}
            label="Time Spent Crafting"
            format="HH:mm"
            onChange={value => onChange(value)}
        />
    );
};

export default TimeInput;
