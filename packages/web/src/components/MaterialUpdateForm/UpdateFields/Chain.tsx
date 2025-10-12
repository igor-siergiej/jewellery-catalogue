import type { Material } from '@jewellery-catalogue/types';
import type { Control, UseFormReturn } from 'react-hook-form';

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';

export interface IUpdateChainFieldsProps {
    control: Control<any>;
    form: UseFormReturn<any>;
    material: Material;
}

const UpdateChainFields: React.FC<IUpdateChainFieldsProps> = ({ control, material }) => {
    const chain = material as any;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold">Chain Properties</h3>

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
                                    value={field.value ?? chain.diameter ?? ''}
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
                name="lengthPerPack"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Length per Pack</FormLabel>
                        <FormControl>
                            <InputGroup className="max-w-[150px]">
                                <InputGroupInput
                                    type="number"
                                    step="0.1"
                                    {...field}
                                    value={field.value ?? chain.lengthPerPack ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value === '' ? undefined : Number(value));
                                    }}
                                />
                                <InputGroupAddon align="inline-end">
                                    <InputGroupText>m</InputGroupText>
                                </InputGroupAddon>
                            </InputGroup>
                        </FormControl>
                        <FormDescription>How much chain comes in each pack</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="totalLength"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Total Length (Manual Adjustment)</FormLabel>
                        <FormControl>
                            <InputGroup className="max-w-[150px]">
                                <InputGroupInput
                                    type="number"
                                    step="0.1"
                                    {...field}
                                    value={field.value ?? chain.totalLength ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value === '' ? undefined : Number(value));
                                    }}
                                />
                                <InputGroupAddon align="inline-end">
                                    <InputGroupText>m</InputGroupText>
                                </InputGroupAddon>
                            </InputGroup>
                        </FormControl>
                        <FormDescription>Manually correct stock if needed</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
};

export default UpdateChainFields;
