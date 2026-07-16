import { describe, expect, it } from 'bun:test';
import { DesignType } from '@jewellery-catalogue/types';
import { inferDesignType } from './inferDesignType';

describe('inferDesignType', () => {
    it('maps title keywords to a design type', () => {
        expect(inferDesignType('Adjustable Green Ring')).toBe(DesignType.RING);
        expect(inferDesignType('Sun Spiral Earrings')).toBe(DesignType.EARRINGS);
        expect(inferDesignType('Ear Cuff, no piercing')).toBe(DesignType.EARCUFF);
        expect(inferDesignType('Garnet Pendant Necklace')).toBe(DesignType.NECKLACE);
        expect(inferDesignType('Beaded Bangle')).toBe(DesignType.BRACELET);
    });

    it('returns undefined when nothing matches', () => {
        expect(inferDesignType('Mystery Trinket')).toBeUndefined();
    });

    it('prefers ear cuff over earring', () => {
        expect(inferDesignType('Earring-style Ear Cuff')).toBe(DesignType.EARCUFF);
    });
});
