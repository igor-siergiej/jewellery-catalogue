type Material = Record<string, unknown> & { id: string; name: string };
type Design = Record<string, unknown> & { id: string; name: string; variants?: DesignVariant[] };
type DesignVariant = Record<string, unknown> & { id: string; totalMaterialCosts: number };

const getApiUrl = () => process.env.E2E_API_SERVICE_URL || 'http://localhost:3001';

const authHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
});

export async function apiGetMaterials(token: string): Promise<Material[]> {
    const res = await fetch(`${getApiUrl()}/api/materials`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`apiGetMaterials failed: ${await res.text()}`);
    return res.json();
}

export async function apiDeleteMaterial(token: string, id: string): Promise<void> {
    const res = await fetch(`${getApiUrl()}/api/materials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) throw new Error(`apiDeleteMaterial failed: ${await res.text()}`);
}

export async function apiCreateBead(
    token: string,
    overrides: {
        name?: string;
        brand?: string;
        purchaseUrl?: string;
        colour?: string;
        diameter?: number;
        quantity?: number;
        packs?: number;
        pricePerPack?: number;
    } = {}
): Promise<Material> {
    const res = await fetch(`${getApiUrl()}/api/materials`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
            type: 'BEAD',
            name: 'Test Bead',
            brand: 'TestBrand',
            purchaseUrl: 'http://example.com',
            colour: 'red',
            diameter: 4,
            quantity: 100,
            packs: 1,
            pricePerPack: 5.0,
            ...overrides,
        }),
    });
    if (!res.ok) throw new Error(`apiCreateBead failed: ${await res.text()}`);
    return res.json();
}

export async function apiGetDesigns(token: string): Promise<Design[]> {
    const res = await fetch(`${getApiUrl()}/api/designs`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`apiGetDesigns failed: ${await res.text()}`);
    return res.json();
}

export async function apiDeleteDesign(token: string, id: string): Promise<void> {
    const res = await fetch(`${getApiUrl()}/api/designs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 404) throw new Error(`apiDeleteDesign failed: ${await res.text()}`);
}

export async function apiCreateDesign(
    token: string,
    design: {
        name: string;
        timeRequired?: string;
        description?: string;
        materials?: object[];
        totalMaterialCosts?: number;
        price?: number;
        lowStockThreshold?: number;
        variationGroups?: object[];
        variants?: object[];
    }
): Promise<Design> {
    const res = await fetch(`${getApiUrl()}/api/designs`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
            timeRequired: '0:30',
            description: '',
            materials: [],
            totalMaterialCosts: 0,
            price: 1.0,
            // existingImageIds is parsed by the handler with JSON.parse(), so pass as a string
            existingImageIds: JSON.stringify(['test-placeholder']),
            ...design,
        }),
    });
    if (!res.ok) throw new Error(`apiCreateDesign failed: ${await res.text()}`);
    return res.json();
}

export async function apiProduceDesignVariant(
    token: string,
    designId: string,
    variantId: string,
    quantity: number
): Promise<Design> {
    const res = await fetch(`${getApiUrl()}/api/designs/${designId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ addQuantity: quantity, variantId }),
    });
    if (!res.ok) throw new Error(`apiProduceDesignVariant failed: ${await res.text()}`);
    return res.json();
}

export async function apiCleanup(token: string): Promise<void> {
    const [materials, designs] = await Promise.all([apiGetMaterials(token), apiGetDesigns(token)]);
    await Promise.all([
        ...materials.map((m) => apiDeleteMaterial(token, m.id)),
        ...designs.map((d) => apiDeleteDesign(token, d.id)),
    ]);
}
