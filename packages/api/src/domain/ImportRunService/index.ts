import type { Logger } from '@imapps/api-utils';
import type { ImportCandidate, ImportCommitRequest, ImportRun } from '@jewellery-catalogue/types';

import type { DesignImportService } from '../DesignImportService';
import type { IdGenerator } from '../IdGenerator';
import type { ImportRunRepository } from '../ImportRunRepository';

const STALE_RUN_MS = 15 * 60 * 1000;

export class ImportRunService {
    // biome-ignore lint/correctness/noUnusedPrivateClassMembers: read externally by tests to await the in-flight loop deterministically
    private execution: Promise<void> | undefined;

    constructor(
        private readonly runRepo: ImportRunRepository,
        private readonly importService: DesignImportService,
        private readonly idGenerator: IdGenerator,
        private readonly logger: Logger
    ) {}

    async start(request: ImportCommitRequest, userId: string): Promise<ImportRun> {
        const running = await this.runRepo.findRunning(userId);
        if (running) {
            const age = Date.now() - new Date(running.startedAt).getTime();
            const isStale = Number.isFinite(age) && age >= STALE_RUN_MS;
            if (!isStale) {
                throw Object.assign(new Error('An import is already running'), { status: 409 });
            }
            this.logger.warn('Marking stale running import run as failed', {
                runId: running.id,
                startedAt: running.startedAt,
            });
            await this.runRepo.update(running.id, {
                ...running,
                status: 'failed',
                finishedAt: new Date(),
                currentListing: undefined,
                currentImageProgress: undefined,
            });
        }

        const run: ImportRun = {
            id: this.idGenerator.generate(),
            userId,
            status: 'running',
            fileName: request.fileName,
            total: request.candidates.length,
            processed: 0,
            created: 0,
            updated: 0,
            failed: [],
            startedAt: new Date(),
            cancelRequested: false,
        };
        await this.runRepo.insert(run);
        this.execution = this.execute(run, request.candidates);
        return run;
    }

    async getRuns(userId: string): Promise<ImportRun[]> {
        return this.runRepo.getByUserId(userId);
    }

    async getRun(id: string, userId: string): Promise<ImportRun> {
        const run = await this.runRepo.getByIdAndUserId(id, userId);
        if (!run) {
            throw Object.assign(new Error('Import run not found'), { status: 404 });
        }
        return run;
    }

    async cancel(id: string, userId: string): Promise<ImportRun> {
        const run = await this.getRun(id, userId);
        if (run.status !== 'running') return run;
        await this.runRepo.requestCancel(run.id);
        return (await this.runRepo.getByIdAndUserId(id, userId)) ?? run;
    }

    private async execute(run: ImportRun, candidates: ImportCandidate[]): Promise<void> {
        let current = run;
        const cleared = { currentListing: undefined, currentImageProgress: undefined };

        // Every write below is a full-document replace, and cancel() can land concurrently at any
        // point in the loop (including mid-commitCandidate, between two image-progress callbacks).
        // Routing all writes through this single helper — which re-reads the persisted flag and OR's
        // it in — guarantees an externally-set cancelRequested can never be clobbered back to false.
        const persist = async (patch: Partial<ImportRun> = {}): Promise<void> => {
            const latest = await this.runRepo.getById(run.id);
            current = {
                ...current,
                ...patch,
                cancelRequested: current.cancelRequested || !!latest?.cancelRequested || !!patch.cancelRequested,
            };
            await this.runRepo.update(run.id, current);
        };

        try {
            const ctx = await this.importService.createCommitContext(run.userId);
            for (const candidate of candidates) {
                const latest = await this.runRepo.getById(run.id);
                if (latest?.cancelRequested) {
                    await persist({ ...cleared, cancelRequested: true, status: 'cancelled', finishedAt: new Date() });
                    return;
                }

                await persist({ currentListing: candidate.row.title.trim(), currentImageProgress: undefined });

                const result = await this.importService.commitCandidate(candidate, ctx, async (done, total) => {
                    await persist({ currentImageProgress: { done, total } });
                });

                await persist({
                    processed: current.processed + 1,
                    created: current.created + (result.outcome === 'created' ? 1 : 0),
                    updated: current.updated + (result.outcome === 'updated' ? 1 : 0),
                    failed:
                        result.outcome === 'failed'
                            ? [...current.failed, { name: candidate.row.title.trim(), reason: result.reason }]
                            : current.failed,
                });
            }
            await persist({ ...cleared, status: 'completed', finishedAt: new Date() });
        } catch (error) {
            this.logger.error('Import run worker failed', { runId: run.id, error });
            try {
                await persist({ ...cleared, status: 'failed', finishedAt: new Date() });
            } catch (persistError) {
                this.logger.error('Failed to persist import run failure', { runId: run.id, error: persistError });
            }
        }
    }
}
