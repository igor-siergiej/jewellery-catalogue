import type { DesignType } from '../design/enum';

export interface EtsyRow {
    title: string;
    description: string;
    price: number;
    quantity: number;
    materials: string[];
    imageUrls: string[];
    sku: string;
}

export type ImportStatus = 'NEW' | 'CHANGED' | 'SAME';

export interface ImportCandidate {
    importKey: string;
    name: string;
    status: ImportStatus;
    changedFields: string[];
    price: number;
    designType?: DesignType;
    imageUrls: string[];
    mappedMaterials: string[];
    row: EtsyRow;
}

export interface ImportInvalidRow {
    title: string;
    reason: string;
}

export interface ImportPreviewResult {
    candidates: ImportCandidate[];
    invalid: ImportInvalidRow[];
    summary: { new: number; changed: number; same: number; invalid: number };
}

export interface ImportCommitRequest {
    candidates: ImportCandidate[];
}

export interface ImportCommitResult {
    created: number;
    updated: number;
    failed: { name: string; reason: string }[];
}
