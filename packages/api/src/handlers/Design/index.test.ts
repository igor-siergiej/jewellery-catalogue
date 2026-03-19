import { describe, expect, it } from 'bun:test';
import * as designHandlers from './index';

describe('Design Handlers', () => {
    it('should export getDesigns', () => {
        expect(designHandlers.getDesigns).toBeDefined();
        expect(typeof designHandlers.getDesigns).toBe('function');
    });

    it('should export getDesign', () => {
        expect(designHandlers.getDesign).toBeDefined();
        expect(typeof designHandlers.getDesign).toBe('function');
    });

    it('should export addDesign', () => {
        expect(designHandlers.addDesign).toBeDefined();
        expect(typeof designHandlers.addDesign).toBe('function');
    });

    it('should export updateDesign', () => {
        expect(designHandlers.updateDesign).toBeDefined();
        expect(typeof designHandlers.updateDesign).toBe('function');
    });

    it('should export editDesignProperties', () => {
        expect(designHandlers.editDesignProperties).toBeDefined();
        expect(typeof designHandlers.editDesignProperties).toBe('function');
    });

    it('should export deleteDesign', () => {
        expect(designHandlers.deleteDesign).toBeDefined();
        expect(typeof designHandlers.deleteDesign).toBe('function');
    });
});
