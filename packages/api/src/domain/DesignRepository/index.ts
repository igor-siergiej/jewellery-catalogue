import type { Design } from '@jewellery-catalogue/types';

import type { BaseRepository } from '../BaseRepository';

export interface DesignRepository extends BaseRepository<Design> {
    getByUserId(userId: string): Promise<Array<Design>>;
    getByIdAndUserId(id: string, userId: string): Promise<Design | null>;
    findByMaterialId(materialId: string): Promise<Array<Design>>;
    imageBelongsToUser(imageId: string, userId: string): Promise<boolean>;
    // Deducts an Etsy sale from stock (never below zero), at most once per transactionId.
    applyEtsySale(args: ApplyEtsySaleArgs): Promise<ApplyEtsySaleResult>;
}

export interface ApplyEtsySaleArgs {
    designId: string;
    userId: string;
    variantId: string | null;
    transactionId: number;
    quantity: number;
}

export type ApplyEtsySaleResult = 'applied' | 'already_applied' | 'design_not_found';
