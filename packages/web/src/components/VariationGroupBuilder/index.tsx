import type {
    DesignVariant,
    Material,
    RequiredMaterial,
    VariationGroup,
    VariationOption,
} from '@jewellery-catalogue/types';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MATERIAL_TYPE_LABELS } from '@/lib/materialLabels';
import { getTotalMaterialCosts } from '@/utils/getPriceOfMaterials';
import { getSuggestedPrice } from '@/utils/getSuggestedPrice';
import { getWageCosts } from '@/utils/getWageCost';

export interface VariationGroupBuilderProps {
    availableMaterials: Material[];
    value: VariationGroup[];
    onChange: (groups: VariationGroup[]) => void;
    sharedMaterials: RequiredMaterial[];
    hourlyWage: number;
    profitMargin: number;
    timeRequired: string;
    markupMultiplier: number;
    hourlyRate: number;
}

function cartesian<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    return arrays.reduce<T[][]>((acc, curr) => acc.flatMap((x) => curr.map((y) => [...x, y])), [[]]);
}

export function computeVariants(
    groups: VariationGroup[],
    sharedMaterials: RequiredMaterial[],
    hourlyWage: number,
    profitMargin: number,
    timeRequired: string
): DesignVariant[] {
    if (groups.length === 0 || groups.some((g) => g.options.length === 0)) return [];

    const rawWage = getWageCosts(timeRequired) * hourlyWage;
    const wageCost = Number.isFinite(rawWage) ? rawWage : 0;
    const sharedCost = getTotalMaterialCosts(sharedMaterials, []);
    const combos = cartesian(groups.map((g) => g.options));

    return combos.map((options) => {
        const variantMaterials = options.map((o) => o.material);
        const variantCost = getTotalMaterialCosts(variantMaterials, []);
        const totalMaterialCosts = parseFloat((sharedCost + variantCost).toFixed(2));
        const price = parseFloat(((totalMaterialCosts + wageCost) * (1 + profitMargin / 100)).toFixed(2));

        return {
            id: crypto.randomUUID(),
            optionIds: options.map((o) => o.id),
            name: options.map((o) => o.material.name).join(' + '),
            totalQuantity: 0,
            totalMaterialCosts,
            price,
        };
    });
}

function getUnitLabel(material: Material): string {
    return material.type === 'WIRE' || material.type === 'CHAIN' ? 'cm' : 'pcs';
}

function getInputStep(material: Material): number {
    return material.type === 'WIRE' || material.type === 'CHAIN' ? 0.1 : 1;
}

function buildRequiredMaterial(material: Material, required: number): RequiredMaterial {
    if (material.type === 'WIRE' || material.type === 'CHAIN') {
        return { ...material, requiredLength: required } as RequiredMaterial;
    }
    return { ...material, requiredQuantity: required } as RequiredMaterial;
}

interface OptionRowProps {
    option: VariationOption;
    availableMaterials: Material[];
    usedMaterialIds: string[];
    onMaterialChange: (materialId: string) => void;
    onDelete: () => void;
}

const OptionRow: React.FC<OptionRowProps> = ({
    option,
    availableMaterials,
    usedMaterialIds,
    onMaterialChange,
    onDelete,
}) => {
    const currentMaterial = availableMaterials.find((m) => m.id === option.material.id);
    const selectableMaterials = availableMaterials.filter(
        (m) => !usedMaterialIds.includes(m.id) || m.id === option.material.id
    );

    return (
        <div className="grid grid-cols-12 gap-2 items-center py-2 px-3 border-b last:border-0 hover:bg-muted/20">
            <div className="col-span-8">
                <Select value={option.material.id || ''} onValueChange={onMaterialChange}>
                    <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                        {selectableMaterials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                                {m.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="col-span-3">
                {currentMaterial && (
                    <Badge variant="secondary" className="text-xs">
                        {MATERIAL_TYPE_LABELS[currentMaterial.type]}
                    </Badge>
                )}
            </div>
            <div className="col-span-1 flex justify-end">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
            </div>
        </div>
    );
};

interface GroupCardProps {
    group: VariationGroup;
    availableMaterials: Material[];
    onUpdate: (group: VariationGroup) => void;
    onDelete: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, availableMaterials, onUpdate, onDelete }) => {
    const [collapsed, setCollapsed] = useState(false);

    const usedMaterialIds = group.options.map((o) => o.material.id);
    const firstOptionMaterial =
        group.options.length > 0 ? availableMaterials.find((m) => m.id === group.options[0].material.id) : undefined;
    const unitLabel = firstOptionMaterial ? getUnitLabel(firstOptionMaterial) : '';
    const inputStep = firstOptionMaterial ? getInputStep(firstOptionMaterial) : 1;

    const rebuildOptions = (opts: VariationOption[], required: number) =>
        opts.map((o) => {
            const mat = availableMaterials.find((m) => m.id === o.material.id);
            return mat ? { ...o, material: buildRequiredMaterial(mat, required) } : o;
        });

    const handleRequiredChange = (required: number) => {
        onUpdate({ ...group, required, options: rebuildOptions(group.options, required) });
    };

    const addOption = () => {
        const unusedMaterial = availableMaterials.find((m) => !usedMaterialIds.includes(m.id));
        if (!unusedMaterial) return;
        const newOption: VariationOption = {
            id: crypto.randomUUID(),
            material: buildRequiredMaterial(unusedMaterial, group.required),
        };
        onUpdate({ ...group, options: [...group.options, newOption] });
    };

    const deleteOption = (index: number) => {
        onUpdate({ ...group, options: group.options.filter((_, i) => i !== index) });
    };

    const handleMaterialChange = (index: number, materialId: string) => {
        const material = availableMaterials.find((m) => m.id === materialId);
        if (!material) return;
        const updated: VariationOption = {
            ...group.options[index],
            material: buildRequiredMaterial(material, group.required),
        };
        const newOptions = group.options.map((o, i) => (i === index ? updated : o));
        onUpdate({ ...group, options: newOptions });
    };

    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-muted/30">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
                <Input
                    className="h-7 max-w-[160px] font-medium"
                    placeholder="Group name (e.g. Gemstone)"
                    value={group.name}
                    onChange={(e) => onUpdate({ ...group, name: e.target.value })}
                />
                <div className="flex items-center gap-1 ml-2">
                    <Input
                        type="number"
                        className="h-7 w-20"
                        placeholder="Qty"
                        value={group.required}
                        min={0}
                        step={inputStep}
                        onChange={(e) => handleRequiredChange(Number(e.target.value))}
                    />
                    {unitLabel && <span className="text-xs text-muted-foreground">{unitLabel}</span>}
                </div>
                <span className="text-xs text-muted-foreground ml-1">
                    {group.options.length} option{group.options.length !== 1 ? 's' : ''}
                </span>
                <div className="ml-auto">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </div>

            {!collapsed && (
                <div>
                    {group.options.length > 0 && (
                        <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-muted/10 border-b text-xs font-medium text-muted-foreground">
                            <div className="col-span-8">Material</div>
                            <div className="col-span-3">Type</div>
                            <div className="col-span-1" />
                        </div>
                    )}
                    {group.options.map((option, index) => (
                        <OptionRow
                            key={option.id}
                            option={option}
                            availableMaterials={availableMaterials}
                            usedMaterialIds={usedMaterialIds.filter((_, i) => i !== index)}
                            onMaterialChange={(id) => handleMaterialChange(index, id)}
                            onDelete={() => deleteOption(index)}
                        />
                    ))}
                    <div className="p-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs h-7"
                            onClick={addOption}
                            disabled={usedMaterialIds.length >= availableMaterials.length}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Option
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const VariantPreview: React.FC<{
    groups: VariationGroup[];
    sharedMaterials: RequiredMaterial[];
    hourlyWage: number;
    profitMargin: number;
    timeRequired: string;
    markupMultiplier: number;
    hourlyRate: number;
}> = ({ groups, sharedMaterials, hourlyWage, profitMargin, timeRequired, markupMultiplier, hourlyRate }) => {
    const variants = computeVariants(groups, sharedMaterials, hourlyWage, profitMargin, timeRequired);

    if (variants.length === 0) {
        const incomplete = groups.some((g) => g.options.length === 0);
        return (
            <p className="text-sm text-muted-foreground italic">
                {incomplete ? 'Add at least one option to each group to see variants.' : 'Add groups to see variants.'}
            </p>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>Material Costs</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Suggested</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {variants.map((v) => (
                        <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.name}</TableCell>
                            <TableCell>£{v.totalMaterialCosts.toFixed(2)}</TableCell>
                            <TableCell>£{v.price.toFixed(2)}</TableCell>
                            <TableCell>
                                £
                                {getSuggestedPrice({
                                    materialsCost: v.totalMaterialCosts,
                                    timeRequired,
                                    markupMultiplier,
                                    hourlyRate,
                                }).toFixed(2)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export const VariationGroupBuilder: React.FC<VariationGroupBuilderProps> = ({
    availableMaterials,
    value,
    onChange,
    sharedMaterials,
    hourlyWage,
    profitMargin,
    timeRequired,
    markupMultiplier,
    hourlyRate,
}) => {
    const addGroup = () => {
        const newGroup: VariationGroup = {
            id: crypto.randomUUID(),
            name: '',
            required: 0,
            options: [],
        };
        onChange([...value, newGroup]);
    };

    const updateGroup = (index: number, updated: VariationGroup) => {
        onChange(value.map((g, i) => (i === index ? updated : g)));
    };

    const deleteGroup = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {value.map((group, index) => (
                    <GroupCard
                        key={group.id}
                        group={group}
                        availableMaterials={availableMaterials}
                        onUpdate={(updated) => updateGroup(index, updated)}
                        onDelete={() => deleteGroup(index)}
                    />
                ))}
            </div>

            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addGroup}>
                <Plus className="h-4 w-4" />
                Add Variation Group
            </Button>

            {value.length > 0 && (
                <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-medium">Generated Variants</h4>
                    <VariantPreview
                        groups={value}
                        sharedMaterials={sharedMaterials}
                        hourlyWage={hourlyWage}
                        profitMargin={profitMargin}
                        timeRequired={timeRequired}
                        markupMultiplier={markupMultiplier}
                        hourlyRate={hourlyRate}
                    />
                </div>
            )}
        </div>
    );
};
