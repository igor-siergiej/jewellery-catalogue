import type { Design, DesignVariant, Material, RequiredMaterial } from '@jewellery-catalogue/types';
import { MaterialType } from '@jewellery-catalogue/types';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface VariantAvailability {
    variant: DesignVariant;
    canMake: number;
    status: 'sufficient' | 'low' | 'insufficient';
    materialDetails: Array<{ name: string; required: number; available: number; unit: string }>;
}

function getRequiredAndAvailable(
    requiredMaterial: RequiredMaterial,
    allMaterials: Material[]
): { required: number; available: number; unit: string } | null {
    const material = allMaterials.find((m) => m.id === requiredMaterial.id);
    if (!material) return null;

    switch (material.type) {
        case MaterialType.WIRE:
        case MaterialType.CHAIN:
            return {
                required: (requiredMaterial as any).requiredLength,
                available: (material as any).totalLength,
                unit: 'm',
            };
        case MaterialType.BEAD:
        case MaterialType.EAR_HOOK:
            return {
                required: (requiredMaterial as any).requiredQuantity,
                available: (material as any).totalQuantity,
                unit: 'pcs',
            };
        default:
            return null;
    }
}

export interface VariantSelectorProps {
    design: Design;
    allMaterials: Material[];
    selectedVariantId: string | undefined;
    onSelect: (variantId: string) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
    design,
    allMaterials,
    selectedVariantId,
    onSelect,
}) => {
    const variants = design.variants ?? [];
    const groups = design.variationGroups ?? [];

    const variantAvailabilities: VariantAvailability[] = variants.map((variant) => {
        const optionMaterials: RequiredMaterial[] = [];
        for (const optionId of variant.optionIds) {
            for (const group of groups) {
                const option = group.options.find((o) => o.id === optionId);
                if (option) {
                    optionMaterials.push(option.material);
                    break;
                }
            }
        }

        const allRequired = [...design.materials, ...optionMaterials];
        const materialDetails: VariantAvailability['materialDetails'] = [];
        let canMake = Infinity;

        for (const rm of allRequired) {
            const info = getRequiredAndAvailable(rm, allMaterials);
            if (!info) {
                canMake = 0;
                continue;
            }
            const possible = info.required > 0 ? Math.floor(info.available / info.required) : 0;
            canMake = Math.min(canMake, possible);
            materialDetails.push({
                name: rm.name,
                required: info.required,
                available: info.available,
                unit: info.unit,
            });
        }

        if (!Number.isFinite(canMake)) canMake = 0;

        const status: VariantAvailability['status'] =
            canMake === 0 ? 'insufficient' : canMake < 5 ? 'low' : 'sufficient';

        return { variant, canMake, status, materialDetails };
    });

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>In Stock</TableHead>
                        <TableHead>Can Make</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {variantAvailabilities.map(({ variant, canMake, status }) => {
                        const isSelected = selectedVariantId === variant.id;
                        return (
                            <TableRow
                                key={variant.id}
                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                                onClick={() => onSelect(variant.id)}
                            >
                                <TableCell className="font-medium">
                                    {variant.name}
                                    {isSelected && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                            Selected
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>{variant.totalQuantity}</TableCell>
                                <TableCell className="font-semibold">{canMake}</TableCell>
                                <TableCell>
                                    {status === 'sufficient' && (
                                        <Badge variant="default" className="bg-green-600 gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Sufficient
                                        </Badge>
                                    )}
                                    {status === 'low' && (
                                        <Badge variant="default" className="bg-yellow-600 gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Low Stock
                                        </Badge>
                                    )}
                                    {status === 'insufficient' && (
                                        <Badge variant="destructive" className="gap-1">
                                            <XCircle className="h-3 w-3" />
                                            Insufficient
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="text-sm text-muted-foreground">£{variant.price.toFixed(2)}</span>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};
