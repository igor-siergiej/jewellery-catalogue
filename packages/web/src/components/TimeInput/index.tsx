import { FormDesign } from '@jewellery-catalogue/types';
import { UseFormSetValue } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface TimeInputProps {
    setValue: UseFormSetValue<FormDesign>;
}

const TimeInput: React.FC<TimeInputProps> = ({ setValue }) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setValue('timeRequired', value);
    };

    return (
        <div className="w-full space-y-2">
            <Label htmlFor="time-input">Time Spent Crafting</Label>
            <Input
                id="time-input"
                type="time"
                className="w-full"
                onChange={handleChange}
            />
        </div>
    );
};

export default TimeInput;
