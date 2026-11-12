import { type Material, MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';
import { Link } from 'lucide-react';
import { useId } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { FormSection } from '@/components/FormSection';
import { OptionPicker } from '@/components/OptionPicker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { MATERIAL_TYPE_LABELS, METAL_TYPE_LABELS, WIRE_TYPE_LABELS } from '@/lib/materialLabels';

import { CREATE_FIELDS, EDIT_FIELDS, type MaterialFieldSpec } from './fields';
import { NumberField } from './NumberField';
import { useStockSummary } from './StockSummary';

const TYPE_OPTIONS = (Object.keys(MaterialType) as MaterialType[]).map((value) => ({
    value,
    label: MATERIAL_TYPE_LABELS[value],
}));

const WIRE_OPTIONS = (Object.keys(WIRE_TYPE) as WIRE_TYPE[]).map((value) => ({
    value,
    label: WIRE_TYPE_LABELS[value],
}));

const METAL_OPTIONS = (Object.keys(METAL_TYPE) as METAL_TYPE[]).map((value) => ({
    value,
    label: METAL_TYPE_LABELS[value],
}));

interface MaterialFormProps {
    form: UseFormReturn<any>;
    mode: 'create' | 'edit';
    /** Hide the type picker. Editing a material never changes its type. */
    lockType?: boolean;
    /** The saved material; edit forms show its values wherever the form holds none yet. */
    material?: Material;
}

interface PickerFieldProps<T extends string> {
    form: UseFormReturn<any>;
    name: string;
    label: string;
    options: ReadonlyArray<{ value: T; label: string }>;
}

/** Picks one option. Choosing the selected option again keeps it, because these fields are required. */
function PickerField<T extends string>({ form, name, label, options }: PickerFieldProps<T>) {
    const labelId = useId();

    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <span id={labelId} className="text-sm font-medium leading-none">
                        {label}
                    </span>
                    <FormControl>
                        <OptionPicker
                            options={options}
                            value={field.value}
                            onChange={(value) => value && field.onChange(value)}
                            aria-labelledby={labelId}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function TypeFields({
    form,
    specs,
    material,
}: {
    form: UseFormReturn<any>;
    specs: MaterialFieldSpec[];
    material?: Material;
}) {
    const saved = material as unknown as Record<string, number | string | undefined> | undefined;

    return (
        <>
            {specs.map((spec) => {
                switch (spec.kind) {
                    case 'wireType':
                        return (
                            <PickerField
                                key="wireType"
                                form={form}
                                name="wireType"
                                label="Wire type"
                                options={WIRE_OPTIONS}
                            />
                        );
                    case 'metalType':
                        return (
                            <PickerField
                                key="metalType"
                                form={form}
                                name="metalType"
                                label="Metal type"
                                options={METAL_OPTIONS}
                            />
                        );
                    case 'text':
                        return (
                            <FormField
                                key={spec.name}
                                control={form.control}
                                name={spec.name}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{spec.label}</FormLabel>
                                        <FormControl>
                                            <Input
                                                className={`h-11 md:h-9 ${spec.maxWidth}`}
                                                {...field}
                                                value={field.value ?? saved?.[spec.name] ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        );
                    case 'number':
                        return (
                            <NumberField
                                key={spec.name}
                                control={form.control}
                                name={spec.name}
                                label={spec.label}
                                step={spec.step}
                                suffix={spec.suffix}
                                description={spec.description}
                                fallback={saved?.[spec.name] as number | undefined}
                            />
                        );
                }
            })}
        </>
    );
}

function StockSummary({ form, material }: { form: UseFormReturn<any>; material: Material }) {
    const { currentStock, packSize, estimatedNewStock } = useStockSummary(form, material);

    return (
        <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
                <dt className="text-muted-foreground">Stock level</dt>
                <dd className="font-medium">{currentStock}</dd>
            </div>
            <div>
                <dt className="text-muted-foreground">Pack size</dt>
                <dd className="font-medium">{packSize}</dd>
            </div>
            {estimatedNewStock && (
                <div className="col-span-2 rounded-md bg-muted p-3">
                    <dt className="text-muted-foreground">New stock level will be:</dt>
                    <dd className="font-semibold">{estimatedNewStock}</dd>
                </div>
            )}
        </dl>
    );
}

export function MaterialForm({ form, mode, lockType = mode === 'edit', material }: MaterialFormProps) {
    const type: MaterialType = form.watch('type');
    const typeLabelId = useId();
    const editing = mode === 'edit' && material;
    const specs = (editing ? EDIT_FIELDS : CREATE_FIELDS)[type] ?? [];
    const saved = material as unknown as Record<string, number | string | undefined> | undefined;

    return (
        <Form {...form}>
            {editing && (
                <FormSection title="Current stock">
                    <StockSummary form={form} material={material} />
                </FormSection>
            )}

            <FormSection title="Details">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input className="h-11 max-w-sm md:h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                                <Input className="h-11 max-w-sm md:h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="materialCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Material code (optional)</FormLabel>
                            <FormControl>
                                <Input className="h-11 max-w-[200px] md:h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="purchaseUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{mode === 'edit' ? 'Purchase URL' : 'URL'}</FormLabel>
                            <InputGroup className="h-11 max-w-md md:h-9">
                                <InputGroupAddon align="inline-start">
                                    <InputGroupText>
                                        <Link className="size-4" />
                                    </InputGroupText>
                                </InputGroupAddon>
                                <FormControl>
                                    <InputGroupInput {...field} />
                                </FormControl>
                            </InputGroup>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </FormSection>

            <FormSection title="Type and size">
                {!lockType && (
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <span id={typeLabelId} className="text-sm font-medium leading-none">
                                    Material type
                                </span>
                                <FormControl>
                                    <OptionPicker
                                        options={TYPE_OPTIONS}
                                        value={field.value}
                                        onChange={(value) => value && field.onChange(value)}
                                        aria-labelledby={typeLabelId}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <TypeFields form={form} specs={specs} material={editing ? material : undefined} />
            </FormSection>

            <FormSection title="Price and stock">
                <NumberField
                    control={form.control}
                    name="pricePerPack"
                    label="Price per pack"
                    prefix="£"
                    step="0.01"
                    description={editing ? 'Current price for buying a new pack' : undefined}
                    fallback={editing ? (saved?.pricePerPack as number | undefined) : undefined}
                />
                {editing ? (
                    <NumberField
                        control={form.control}
                        name="addPacks"
                        label="Add packs"
                        step="1"
                        placeholder="0"
                        description="How many new packs did you buy?"
                    />
                ) : (
                    <NumberField control={form.control} name="packs" label="Number of new packs" step="1" />
                )}
            </FormSection>

            <FormSection title="Stock alert" description="Optional. Shows the material under Running low.">
                <NumberField
                    control={form.control}
                    name="lowStockThreshold"
                    label="Low stock threshold"
                    step="any"
                    min="0"
                    placeholder="e.g., 1.5"
                    description="Alert when stock drops below this many packs"
                    className="max-w-[10rem]"
                />
            </FormSection>
        </Form>
    );
}
