import { FormBead, FormChain, FormWire, MaterialType, METAL_TYPE, WIRE_TYPE } from '@jewellery-catalogue/types';
import { describe, expect, it } from 'vitest';

import { convertFormBeadToMaterial, convertFormChainToMaterial, convertFormDataToMaterial, convertFormWireToMaterial } from './material-conversion';

describe('material-conversion', () => {
    describe('convertFormDataToMaterial', () => {
        it('should convert FormWire to material', () => {
            const formWire: FormWire = {
                id: 'test-id',
                type: MaterialType.WIRE,
                name: 'Test Wire',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                wireType: WIRE_TYPE.FULL,
                metalType: METAL_TYPE.SILVER,
                diameter: 1.5,
                length: 10,
                pricePerPack: 25.0,
                packs: 2
            };

            const result = convertFormDataToMaterial(formWire);

            expect(result).toEqual({
                type: MaterialType.WIRE,
                name: 'Test Wire',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                diameter: 1.5,
                wireType: WIRE_TYPE.FULL,
                metalType: METAL_TYPE.SILVER,
                length: 10,
                pricePerMeter: 2.5
            });
        });

        it('should convert FormBead to material', () => {
            const formBead: FormBead = {
                id: 'test-id',
                type: MaterialType.BEAD,
                name: 'Test Bead',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                diameter: 8,
                colour: 'Blue',
                quantity: 50,
                pricePerPack: 15.0,
                packs: 3
            };

            const result = convertFormDataToMaterial(formBead);

            expect(result).toEqual({
                type: MaterialType.BEAD,
                name: 'Test Bead',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                diameter: 8,
                colour: 'Blue',
                quantity: 50,
                pricePerBead: 0.3
            });
        });

        it('should convert FormChain to material', () => {
            const formChain: FormChain = {
                id: 'test-id',
                type: MaterialType.CHAIN,
                name: 'Test Chain',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                metalType: METAL_TYPE.GOLD,
                wireType: WIRE_TYPE.FILLED,
                diameter: 2.0,
                length: 5,
                pricePerPack: 100.0,
                packs: 1
            };

            const result = convertFormDataToMaterial(formChain);

            expect(result).toEqual({
                type: MaterialType.CHAIN,
                name: 'Test Chain',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                metalType: METAL_TYPE.GOLD,
                wireType: WIRE_TYPE.FILLED,
                diameter: 2.0,
                length: 5
            });
        });

        it('should throw error for unsupported material type', () => {
            const invalidMaterial = {
                type: 'INVALID_TYPE' as MaterialType,
                name: 'Invalid',
                brand: 'Brand',
                purchaseUrl: 'url'
            };

            expect(() => convertFormDataToMaterial(invalidMaterial as any)).toThrow('Unsupported material type: INVALID_TYPE');
        });
    });

    describe('convertFormWireToMaterial', () => {
        it('should correctly calculate price per meter with single pack', () => {
            const formWire: FormWire = {
                id: 'test-id',
                type: MaterialType.WIRE,
                name: 'Single Pack Wire',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                wireType: WIRE_TYPE.PLATED,
                metalType: METAL_TYPE.COPPER,
                diameter: 0.8,
                length: 20,
                pricePerPack: 10.0,
                packs: 1
            };

            const result = convertFormWireToMaterial(formWire);

            expect(result.pricePerMeter).toBe(0.5);
        });

        it('should correctly calculate price per meter with multiple packs', () => {
            const formWire: FormWire = {
                id: 'test-id',
                type: MaterialType.WIRE,
                name: 'Multi Pack Wire',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                wireType: WIRE_TYPE.FULL,
                metalType: METAL_TYPE.BRASS,
                diameter: 1.2,
                length: 15,
                pricePerPack: 12.0,
                packs: 4
            };

            const result = convertFormWireToMaterial(formWire);

            const expectedTotalLength = 4 * 15; // 60
            const expectedTotalPrice = 4 * 12.0; // 48
            const expectedPricePerMeter = 48 / 60; // 0.8

            expect(result.pricePerMeter).toBe(expectedPricePerMeter);
        });

        it('should preserve all wire properties', () => {
            const formWire: FormWire = {
                id: 'test-id',
                type: MaterialType.WIRE,
                name: 'Complete Wire',
                brand: 'Premium Brand',
                purchaseUrl: 'https://premium.com',
                wireType: WIRE_TYPE.FILLED,
                metalType: METAL_TYPE.GILT,
                diameter: 2.5,
                length: 8,
                pricePerPack: 30.0,
                packs: 2
            };

            const result = convertFormWireToMaterial(formWire);

            expect(result).toEqual({
                type: MaterialType.WIRE,
                name: 'Complete Wire',
                brand: 'Premium Brand',
                purchaseUrl: 'https://premium.com',
                diameter: 2.5,
                wireType: WIRE_TYPE.FILLED,
                metalType: METAL_TYPE.GILT,
                length: 8,
                pricePerMeter: 3.75
            });
        });
    });

    describe('convertFormBeadToMaterial', () => {
        it('should correctly calculate price per bead with single pack', () => {
            const formBead: FormBead = {
                id: 'test-id',
                type: MaterialType.BEAD,
                name: 'Single Pack Bead',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                diameter: 6,
                colour: 'Red',
                quantity: 100,
                pricePerPack: 20.0,
                packs: 1
            };

            const result = convertFormBeadToMaterial(formBead);

            expect(result.pricePerBead).toBe(0.2);
        });

        it('should correctly calculate price per bead with multiple packs', () => {
            const formBead: FormBead = {
                id: 'test-id',
                type: MaterialType.BEAD,
                name: 'Multi Pack Bead',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                diameter: 10,
                colour: 'Green',
                quantity: 25,
                pricePerPack: 15.0,
                packs: 5
            };

            const result = convertFormBeadToMaterial(formBead);

            const expectedTotalQuantity = 5 * 25; // 125
            const expectedTotalPrice = 5 * 15.0; // 75
            const expectedPricePerBead = 75 / 125; // 0.6

            expect(result.pricePerBead).toBe(expectedPricePerBead);
        });

        it('should preserve all bead properties', () => {
            const formBead: FormBead = {
                id: 'test-id',
                type: MaterialType.BEAD,
                name: 'Complete Bead',
                brand: 'Artisan Brand',
                purchaseUrl: 'https://artisan.com',
                diameter: 12,
                colour: 'Multicolor',
                quantity: 40,
                pricePerPack: 18.0,
                packs: 3
            };

            const result = convertFormBeadToMaterial(formBead);

            expect(result).toEqual({
                type: MaterialType.BEAD,
                name: 'Complete Bead',
                brand: 'Artisan Brand',
                purchaseUrl: 'https://artisan.com',
                diameter: 12,
                colour: 'Multicolor',
                quantity: 40,
                pricePerBead: 0.45
            });
        });
    });

    describe('convertFormChainToMaterial', () => {
        it('should convert FormChain preserving all properties', () => {
            const formChain: FormChain = {
                id: 'test-id',
                type: MaterialType.CHAIN,
                name: 'Luxury Chain',
                brand: 'Luxury Brand',
                purchaseUrl: 'https://luxury.com',
                metalType: METAL_TYPE.SILVER,
                wireType: WIRE_TYPE.FULL,
                diameter: 1.8,
                length: 12,
                pricePerPack: 45.0,
                packs: 2
            };

            const result = convertFormChainToMaterial(formChain);

            expect(result).toEqual({
                type: MaterialType.CHAIN,
                name: 'Luxury Chain',
                brand: 'Luxury Brand',
                purchaseUrl: 'https://luxury.com',
                metalType: METAL_TYPE.SILVER,
                wireType: WIRE_TYPE.FULL,
                diameter: 1.8,
                length: 12
            });
        });

        it('should handle all metal types', () => {
            const baseFormChain = {
                id: 'test-id',
                type: MaterialType.CHAIN,
                name: 'Test Chain',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                wireType: WIRE_TYPE.PLATED,
                diameter: 1.0,
                length: 10,
                pricePerPack: 25.0,
                packs: 1
            };

            Object.values(METAL_TYPE).forEach(metalType => {
                const formChain: FormChain = {
                    ...baseFormChain,
                    metalType
                };

                const result = convertFormChainToMaterial(formChain);

                expect(result.metalType).toBe(metalType);
            });
        });

        it('should handle all wire types', () => {
            const baseFormChain = {
                id: 'test-id',
                type: MaterialType.CHAIN,
                name: 'Test Chain',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                metalType: METAL_TYPE.GOLD,
                diameter: 1.0,
                length: 10,
                pricePerPack: 25.0,
                packs: 1
            };

            Object.values(WIRE_TYPE).forEach(wireType => {
                const formChain: FormChain = {
                    ...baseFormChain,
                    wireType
                };

                const result = convertFormChainToMaterial(formChain);

                expect(result.wireType).toBe(wireType);
            });
        });
    });

    describe('edge cases and validation', () => {
        it('should handle zero packs for wire calculation', () => {
            const formWire: FormWire = {
                id: 'test-id',
                type: MaterialType.WIRE,
                name: 'Zero Packs Wire',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                wireType: WIRE_TYPE.FULL,
                metalType: METAL_TYPE.SILVER,
                diameter: 1.0,
                length: 10,
                pricePerPack: 10.0,
                packs: 0
            };

            const result = convertFormWireToMaterial(formWire);

            // 0 packs * 10 length = 0 total length, 0 packs * 10 price = 0 total price
            // 0 / 0 = NaN
            expect(Number.isNaN(result.pricePerMeter)).toBe(true);
        });

        it('should handle zero packs for bead calculation', () => {
            const formBead: FormBead = {
                id: 'test-id',
                type: MaterialType.BEAD,
                name: 'Zero Packs Bead',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                diameter: 8,
                colour: 'Blue',
                quantity: 50,
                pricePerPack: 15.0,
                packs: 0
            };

            const result = convertFormBeadToMaterial(formBead);

            // 0 packs * 50 quantity = 0 total quantity, 0 packs * 15 price = 0 total price
            // 0 / 0 = NaN
            expect(Number.isNaN(result.pricePerBead)).toBe(true);
        });

        it('should handle zero quantity for bead calculation', () => {
            const formBead: FormBead = {
                id: 'test-id',
                type: MaterialType.BEAD,
                name: 'Zero Quantity Bead',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                diameter: 8,
                colour: 'Blue',
                quantity: 0,
                pricePerPack: 15.0,
                packs: 2
            };

            const result = convertFormBeadToMaterial(formBead);

            expect(result.pricePerBead).toBe(Infinity);
        });

        it('should handle zero length for wire calculation', () => {
            const formWire: FormWire = {
                id: 'test-id',
                type: MaterialType.WIRE,
                name: 'Zero Length Wire',
                brand: 'Test Brand',
                purchaseUrl: 'https://example.com',
                wireType: WIRE_TYPE.FULL,
                metalType: METAL_TYPE.SILVER,
                diameter: 1.0,
                length: 0,
                pricePerPack: 10.0,
                packs: 2
            };

            const result = convertFormWireToMaterial(formWire);

            expect(result.pricePerMeter).toBe(Infinity);
        });
    });
});