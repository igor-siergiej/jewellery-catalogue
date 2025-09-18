import { METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import DropDown from '../../../DropDown';
import { IMaterialFormProps } from '../types';

const AddWireForm: React.FC<IMaterialFormProps> = ({ register, control }) => {
    return (
        <div className="space-y-4">
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

            <div className="space-y-2">
                <Label htmlFor="diameter">Diameter (Millimeters)</Label>
                <Input
                    id="diameter"
                    type="number"
                    step="0.1"
                    {...register('diameter', {
                        required: {
                            value: true,
                            message: 'Please enter the diameter.',
                        },
                        validate: value => value > 0,
                        setValueAs: value => value === '' ? undefined : Number(value),
                    })}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="length">Length per pack (Meters)</Label>
                <Input
                    id="length"
                    type="number"
                    step="0.01"
                    {...register('length', {
                        required: {
                            value: true,
                            message: 'Please enter the wire length.',
                        },
                        validate: value => value > 0,
                        setValueAs: value => value === '' ? undefined : Number(value),
                    })}
                />
            </div>
        </div>
    );
};

export default AddWireForm;
