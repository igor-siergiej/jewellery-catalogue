import type { Material } from '@jewellery-catalogue/types';
import type { Control, UseFormReturn } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

export interface IUpdateBeadFieldsProps {
    control: Control<any>;
    form: UseFormReturn<any>;
    material: Material;
}

const UpdateBeadFields: React.FC<IUpdateBeadFieldsProps> = ({ control, material }) => {
    const bead = material as any;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Bead Properties</h3>

            <FormField
                control={control}
                name="colour"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Colour</FormLabel>
                        <FormControl>
                            <Input {...field} value={field.value ?? bead.colour ?? ''} className="max-w-[200px]" />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="diameter"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Diameter</FormLabel>
                        <FormControl>
                            <InputGroup className="max-w-[150px]">
                                <InputGroupInput
                                    type="number"
                                    step="0.1"
                                    {...field}
                                    value={field.value ?? bead.diameter ?? ''}
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
                                value={field.value ?? bead.quantityPerPack ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value === '' ? undefined : Number(value));
                                }}
                            />
                        </FormControl>
                        <FormDescription>How many beads come in each pack</FormDescription>
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
                                value={field.value ?? bead.totalQuantity ?? ''}
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

export default UpdateBeadFields;
