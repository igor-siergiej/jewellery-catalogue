import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { IMaterialFormProps } from '../types';

const AddBeadForm: React.FC<IMaterialFormProps> = ({ register }) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="colour">Colour</Label>
                <Input
                    id="colour"
                    {...register('colour')}
                />
            </div>

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
                        validate: value => value > -1,
                        setValueAs: value => value === '' ? undefined : Number(value),
                    })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                    id="quantity"
                    type="number"
                    step="1"
                    {...register('quantity', {
                        required: {
                            value: true,
                            message: 'Please enter a quantity of beads.',
                        },
                        validate: value => value > 0,
                        setValueAs: value => value === '' ? undefined : Number(value),
                    })}
                />
            </div>
        </div>
    );
};

export default AddBeadForm;
