import { METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from '@/lib/materialLabels';

import type { IMaterialFormProps } from '../types';

const AddWireForm: React.FC<IMaterialFormProps> = ({ form }) => {
    return (
        <div className="space-y-4">
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
                name="length"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Length per pack</FormLabel>
                        <FormControl>
                            <InputGroup className="max-w-[100px]">
                                <InputGroupInput
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    value={field.value ?? ''}
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

export default AddWireForm;
