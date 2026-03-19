import { describe, expect, it } from 'bun:test';
import * as materialHandlers from './index';

describe('Material Handlers', () => {
    it('should export getMaterials', () => {
        expect(materialHandlers.getMaterials).toBeDefined();
        expect(typeof materialHandlers.getMaterials).toBe('function');
    });

    it('should export getMaterial', () => {
        expect(materialHandlers.getMaterial).toBeDefined();
        expect(typeof materialHandlers.getMaterial).toBe('function');
    });

    it('should export addMaterial', () => {
        expect(materialHandlers.addMaterial).toBeDefined();
        expect(typeof materialHandlers.addMaterial).toBe('function');
    });

    it('should export updateMaterial', () => {
        expect(materialHandlers.updateMaterial).toBeDefined();
        expect(typeof materialHandlers.updateMaterial).toBe('function');
    });

    it('should export deleteMaterial', () => {
        expect(materialHandlers.deleteMaterial).toBeDefined();
        expect(typeof materialHandlers.deleteMaterial).toBe('function');
    });
});
