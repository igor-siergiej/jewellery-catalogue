import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

import type { IMaterialFormProps } from '../types';

const AddBeadForm: React.FC<IMaterialFormProps> = ({ form }) => {
    return (
        <div className="space-y-4">
            <FormField
                control={form.control}
                name="colour"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Colour</FormLabel>
                        <FormControl>
                            <Input className="max-w-[200px]" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="diameter"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Diameter</FormLabel>
                        <FormControl>
                            <InputGroup className="max-w-[100px]">
                                <InputGroupInput
                                    type="number"
                                    step="0.1"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        field.onChange(value === '' ? undefined : Number(value));
                                    }}
                                />
                                <InputGroupAddon align="inline-end">
                                    <InputGroupText>mm</InputGroupText>
                                </InputGroupAddon>
                            </InputGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                            <Input
                                className="max-w-[100px]"
                                type="number"
                                step="1"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    field.onChange(value === '' ? undefined : Number(value));
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Low Stock Threshold (Optional)</FormLabel>
                        <FormControl>
                            <InputGroup className="max-w-[150px]">
                                <InputGroupInput
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="e.g., 2"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value === '' ? undefined : Number(value));
                                    }}
                                />
                            </InputGroup>
                        </FormControl>
                        <FormDescription>Alert when stock drops below this many packs</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
};

export default AddBeadForm;
