import type { FormMaterial } from '@jewellery-catalogue/types';
import type { Context } from 'hono';

import { dependencyContainer } from '../../dependencies';
import { DependencyToken } from '../../dependencies/types';
import type { MaterialService } from '../../domain/MaterialService';
import type { UserSettingsService } from '../../domain/UserSettingsService';

type Ctx = Context<{ Variables: { userId: string } }>;

const getMaterialService = (): MaterialService => dependencyContainer.resolve(DependencyToken.MaterialService);
const getUserSettingsService = (): UserSettingsService =>
    dependencyContainer.resolve(DependencyToken.UserSettingsService);

export const getMaterials = async (c: Ctx) => {
    const materials = await getMaterialService().getMaterialsByUserId(c.get('userId'));
    return c.json(materials);
};

export const getMaterial = async (c: Ctx) => {
    const material = await getMaterialService().getMaterial(c.req.param('id'), c.get('userId'));
    return c.json(material);
};

export const addMaterial = async (c: Ctx) => {
    const materialData = (await c.req.json()) as FormMaterial;
    const material = await getMaterialService().addMaterial(materialData, c.get('userId'));
    return c.json(material, 200);
};

export const updateMaterial = async (c: Ctx) => {
    const updates = await c.req.json();
    const result = await getMaterialService().updateMaterial(c.req.param('id'), updates, c.get('userId'));
    return c.json(result);
};

export const recalculateMaterialPrices = async (c: Ctx) => {
    const result = await getUserSettingsService().recalculatePricesForMaterial(c.req.param('id'), c.get('userId'));
    return c.json(result);
};

export const deleteMaterial = async (c: Ctx) => {
    await getMaterialService().deleteMaterial(c.req.param('id'), c.get('userId'));
    return c.json({ message: 'Material deleted successfully' }, 200);
};
