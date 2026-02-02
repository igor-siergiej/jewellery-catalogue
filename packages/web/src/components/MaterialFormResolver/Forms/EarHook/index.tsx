import { METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from '@/lib/materialLabels';

import type { IMaterialFormProps } from '../types';

const AddEarHookForm: React.FC<IMaterialFormProps> = ({ form }) => {
    return (
        <div className="space-y-4">
            <FormField
                control={form.control}
                name="metalType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Metal Type</FormLabel>
                        <FormControl>
                            <ButtonGroup className="w-full sm:w-auto flex-wrap">
                                {(Object.keys(METAL_TYPE) as Array<METAL_TYPE>).map((type) => (
                                    <Button
                                        key={type}
                                        type="button"
                                        variant={field.value === type ? 'secondary' : 'outline'}
                                        onClick={() => field.onChange(type)}
                                        className="flex-1 sm:flex-none"
                                    >
                                        {METAL_TYPE_LABELS[type]}
                                    </Button>
                                ))}
                            </ButtonGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="wireType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Wire Type</FormLabel>
                        <FormControl>
                            <ButtonGroup className="w-full sm:w-auto">
                                {(Object.keys(WIRE_TYPE) as Array<WIRE_TYPE>).map((type) => (
                                    <Button
                                        key={type}
                                        type="button"
                                        variant={field.value === type ? 'secondary' : 'outline'}
                                        onClick={() => field.onChange(type)}
                                        className="flex-1 sm:flex-none"
                                    >
                                        {WIRE_TYPE_LABELS[type]}
                                    </Button>
                                ))}
                            </ButtonGroup>
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
                            <Input
                                className="max-w-[150px]"
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
                        </FormControl>
                        <FormDescription>Alert when stock drops below this many packs</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
};

export default AddEarHookForm;
