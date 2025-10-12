import type { Material } from '@jewellery-catalogue/types';
import type { Control, UseFormReturn } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export interface IUpdateEarHookFieldsProps {
    control: Control<any>;
    form: UseFormReturn<any>;
    material: Material;
}

const UpdateEarHookFields: React.FC<IUpdateEarHookFieldsProps> = ({ control, material }) => {
    const earHook = material as any;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Ear Hook Properties</h3>

            <FormField
                control={control}
                name="quantityPerPack"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantity per Pack</FormLabel>
                        <FormControl>
                            <Input
                                className="max-w-[150px]"
                                type="number"
                                step="1"
                                {...field}
                                value={field.value ?? earHook.quantityPerPack ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value === '' ? undefined : Number(value));
                                }}
                            />
                        </FormControl>
                        <FormDescription>How many ear hooks come in each pack</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="totalQuantity"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Quantity (Manual Adjustment)</FormLabel>
                        <FormControl>
                            <Input
                                className="max-w-[150px]"
                                type="number"
                                step="1"
                                {...field}
                                value={field.value ?? earHook.totalQuantity ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value === '' ? undefined : Number(value));
                                }}
                            />
                        </FormControl>
                        <FormDescription>Manually correct stock if needed</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
};

export default UpdateEarHookFields;
