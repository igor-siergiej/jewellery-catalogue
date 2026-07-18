import type { EtsyTaxonomyNode } from '../../api/endpoints/etsyTaxonomy';

export interface FlatTaxonomyOption {
    id: number;
    label: string;
}

export const flattenTaxonomyNodes = (nodes: EtsyTaxonomyNode[], prefix = ''): FlatTaxonomyOption[] =>
    nodes.flatMap((node) => {
        const label = prefix ? `${prefix} > ${node.name}` : node.name;
        return [{ id: node.id, label }, ...flattenTaxonomyNodes(node.children, label)];
    });
