import { type DesignType, DesignType as DT } from '@jewellery-catalogue/types';

export const inferDesignType = (title: string): DesignType | undefined => {
    const t = title.toLowerCase();
    if (t.includes('ear cuff') || t.includes('earcuff')) return DT.EARCUFF;
    if (t.includes('earring')) return DT.EARRINGS;
    if (t.includes('necklace') || t.includes('pendant')) return DT.NECKLACE;
    if (t.includes('bracelet') || t.includes('bangle')) return DT.BRACELET;
    if (t.includes('ring')) return DT.RING;
    return undefined;
};
