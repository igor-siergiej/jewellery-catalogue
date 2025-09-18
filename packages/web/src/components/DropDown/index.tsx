import { BeadKeysEnum, ChainKeysEnum, EarHookKeysEnum, WireKeysEnum } from '@jewellery-catalogue/types';
import { Controller } from 'react-hook-form';
import { type Control } from 'react-hook-form';

import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export interface IProps {
    options: Array<string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any, any>;
    label: string;
    name: keyof typeof WireKeysEnum | keyof typeof BeadKeysEnum | keyof typeof ChainKeysEnum | keyof typeof EarHookKeysEnum;
}

const DropDown: React.FC<IProps> = ({ control, options, label, name }) => {
    return (
        <div className="mb-4 space-y-2">
            <Controller
                name={name}
                control={control}
                defaultValue=""
                render={({ field }) => (
                    <div className="w-48">
                        <Label htmlFor={name}>{label}</Label>
                        <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            required
                        >
                            <SelectTrigger id={name}>
                                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            />
        </div>
    );
};

export default DropDown;
