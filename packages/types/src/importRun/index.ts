export type ImportRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ImportRunFailure {
    name: string;
    reason: string;
}

export interface ImportRunImageProgress {
    done: number;
    total: number;
}

export interface ImportRunResult {
    name: string;
    outcome: 'created' | 'updated' | 'skipped';
    designId?: string;
}

export interface ImportRun {
    id: string;
    userId: string;
    status: ImportRunStatus;
    fileName: string;
    total: number;
    processed: number;
    created: number;
    updated: number;
    failed: ImportRunFailure[];
    results: ImportRunResult[];
    startedAt: Date;
    finishedAt?: Date;
    cancelRequested: boolean;
    currentListing?: string;
    currentImageProgress?: ImportRunImageProgress;
}
