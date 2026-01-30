import type { UseFormReturn } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import type { AddDesignFormData } from '../../schemas/addDesignSchema';

export interface TimeInputProps {
    form: UseFormReturn<AddDesignFormData>;
}

const TimeInput: React.FC<TimeInputProps> = ({ form }) => {
    return (
        <FormField
            control={form.control}
            name="timeRequired"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Time Spent Crafting</FormLabel>
                    <FormControl>
                        <Input
                            type="time"
                            className="max-w-[200px] bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                            {...field}
                        />
                    </FormControl>
                    <FormDescription>Format: HH:MM (e.g., 01:30 for 1 hour 30 min)</FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

export default TimeInput;
