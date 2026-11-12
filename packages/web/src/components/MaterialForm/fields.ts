import { MaterialType } from '@jewellery-catalogue/types';

export type MaterialFieldSpec =
    | { kind: 'wireType' | 'metalType' }
    | { kind: 'text'; name: string; label: string; maxWidth: string }
    | {
          kind: 'number';
          name: string;
          label: string;
          step: string;
          suffix?: string;
          description?: string;
      };

const wireType: MaterialFieldSpec = { kind: 'wireType' };
const metalType: MaterialFieldSpec = { kind: 'metalType' };
const colour: MaterialFieldSpec = { kind: 'text', name: 'colour', label: 'Colour', maxWidth: 'max-w-[200px]' };
const diameter: MaterialFieldSpec = { kind: 'number', name: 'diameter', label: 'Diameter', step: '0.1', suffix: 'mm' };

/** Fields asked for when adding a material, per type. */
export const CREATE_FIELDS: Record<MaterialType, MaterialFieldSpec[]> = {
    [MaterialType.WIRE]: [
        wireType,
        metalType,
        diameter,
        { kind: 'number', name: 'length', label: 'Length per pack', step: '0.01', suffix: 'm' },
    ],
    [MaterialType.BEAD]: [
        colour,
        diameter,
        { kind: 'number', name: 'quantity', label: 'Quantity per pack', step: '1' },
    ],
    [MaterialType.CHAIN]: [
        wireType,
        metalType,
        { kind: 'number', name: 'length', label: 'Length per pack', step: '0.01', suffix: 'm' },
        diameter,
    ],
    [MaterialType.EAR_HOOK]: [
        metalType,
        wireType,
        { kind: 'number', name: 'quantity', label: 'Quantity per pack', step: '1' },
    ],
};

const lengthPerPack: MaterialFieldSpec = {
    kind: 'number',
    name: 'lengthPerPack',
    label: 'Length per pack',
    step: '0.1',
    suffix: 'm',
    description: 'How much comes in each pack',
};

const totalLength: MaterialFieldSpec = {
    kind: 'number',
    name: 'totalLength',
    label: 'Total length',
    step: '0.1',
    suffix: 'm',
    description: 'Manually correct stock if needed',
};

const quantityPerPack: MaterialFieldSpec = {
    kind: 'number',
    name: 'quantityPerPack',
    label: 'Quantity per pack',
    step: '1',
    description: 'How many come in each pack',
};

const totalQuantity: MaterialFieldSpec = {
    kind: 'number',
    name: 'totalQuantity',
    label: 'Total quantity',
    step: '1',
    description: 'Manually correct stock if needed',
};

/** Fields editable on an existing material. Wire and metal type are fixed once created. */
export const EDIT_FIELDS: Record<MaterialType, MaterialFieldSpec[]> = {
    [MaterialType.WIRE]: [diameter, lengthPerPack, totalLength],
    [MaterialType.BEAD]: [colour, diameter, quantityPerPack, totalQuantity],
    [MaterialType.CHAIN]: [diameter, lengthPerPack, totalLength],
    [MaterialType.EAR_HOOK]: [quantityPerPack, totalQuantity],
};
