export type ImportRunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface ImportRunFailure {
    name: string;
    reason: string;
}

export interface ImportRunImageProgress {
    done: number;
    total: number;
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
    startedAt: Date;
    finishedAt?: Date;
    cancelRequested: boolean;
    currentListing?: string;
    currentImageProgress?: ImportRunImageProgress;
}
